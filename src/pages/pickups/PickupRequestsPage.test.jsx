import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import PickupRequestsPage from './PickupRequestsPage';
import { api } from '../../services/api';

const warehouse = { id: 'hub-1', name: 'Test Hub', address: '1 Hub Road', pincode: '400001', contact: 'Test Contact', phone: '9000000000', email: 'hub@example.test', city: 'Test City', state: 'Test State' };
const linkedShipment = { id: 'MOCK-AWB-1', waybill: 'MOCK-AWB-1', reference: 'MOCK-ORDER-1' };

function renderPage(props = {}) {
  return render(<PickupRequestsPage warehouses={[warehouse]} pickups={[]} setPickups={jest.fn()} shipments={[linkedShipment]} pickupLoad={{ status: 'success' }} notify={jest.fn()} {...props} />);
}

afterEach(() => jest.restoreAllMocks());

test('creates a local pickup with contact/address, package weight and validated shipment links', async () => {
  const created = { id: 'pickup-1', recordId: 'pickup-1', date: '2030-05-12', time: '14:30:00', warehouse: 'Test Hub', count: 2, shipmentCount: 2, totalWeightKg: 3.5, location: { name: 'Test Hub', address: '1 Hub Road', contactName: 'Test Contact', phone: '9000000000', pincode: '400001' }, shipmentRefs: [{ waybill: 'MOCK-AWB-1', reference: 'MOCK-ORDER-1' }], status: 'Pending', workflow: 'LOCAL', history: [{ action: 'CREATED', status: 'Pending', description: 'Saved locally' }] };
  const create = jest.spyOn(api, 'createPickupRequest').mockRejectedValueOnce(new Error('The response was interrupted.')).mockResolvedValue({ data: { pickup: created, carrierSubmission: 'NOT_CONFIGURED' } });
  const legacy = jest.spyOn(api, 'pickup').mockResolvedValue({ data: {} });
  const setPickups = jest.fn();
  renderPage({ setPickups });
  fireEvent.click(screen.getByRole('button', { name: 'Request pickup' }));
  fireEvent.change(screen.getByLabelText('Pickup date'), { target: { value: '2030-05-12' } });
  fireEvent.change(screen.getByLabelText('Pickup time'), { target: { value: '14:30' } });
  fireEvent.change(screen.getByLabelText('Shipment count (optional)'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Package count'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Total weight (kg)'), { target: { value: '3.5' } });
  fireEvent.click(screen.getByLabelText(/MOCK-AWB-1/));
  fireEvent.click(screen.getByRole('button', { name: 'Save pickup request' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('The response was interrupted.');
  fireEvent.click(screen.getByRole('button', { name: 'Save pickup request' }));
  await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
  expect(create.mock.calls[1][0].idempotencyKey).toEqual(create.mock.calls[0][0].idempotencyKey);
  await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({
    pickupDate: '2030-05-12', pickupTime: '14:30', packageCount: 2, shipmentCount: 2, totalWeightKg: 3.5, shipmentRefs: ['MOCK-AWB-1'],
    location: expect.objectContaining({ name: 'Test Hub', contactName: 'Test Contact', phone: '9000000000', address: '1 Hub Road', pincode: '400001' }),
  })));
  expect(legacy).not.toHaveBeenCalled();
  expect(setPickups).toHaveBeenCalled();
});

test('reschedules with history and cancels without deleting the request', async () => {
  const current = { id: 'pickup-2', recordId: 'pickup-2', date: '2030-05-12', time: '14:30:00', warehouse: 'Test Hub', count: 1, totalWeightKg: 1.2, location: { name: 'Test Hub', contactName: 'Test Contact', phone: '9000000000', address: '1 Hub Road', pincode: '400001' }, shipmentRefs: [], status: 'Pending', workflow: 'LOCAL', history: [{ action: 'CREATED', status: 'Pending' }] };
  const updated = { ...current, date: '2030-05-13', history: [...current.history, { action: 'RESCHEDULED', status: 'Pending' }] };
  const update = jest.spyOn(api, 'updatePickupRequest').mockResolvedValue({ data: { pickup: updated } });
  const cancel = jest.spyOn(api, 'cancelPickupRequest').mockResolvedValue({ data: { pickup: { ...updated, status: 'Cancelled', history: [...updated.history, { action: 'CANCELLED', status: 'Cancelled' }] } } });
  const setPickups = jest.fn();
  renderPage({ pickups: [current], setPickups });
  fireEvent.click(screen.getByRole('button', { name: 'Reschedule / edit' }));
  const dialog = screen.getByRole('dialog', { name: 'Reschedule pickup' });
  fireEvent.change(within(dialog).getByLabelText('Pickup date'), { target: { value: '2030-05-13' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save pickup changes' }));
  await waitFor(() => expect(update).toHaveBeenCalledWith('pickup-2', expect.objectContaining({ pickupDate: '2030-05-13' })));
  await waitFor(() => expect(setPickups).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  await waitFor(() => expect(cancel).toHaveBeenCalledWith('pickup-2'));
  expect(setPickups).toHaveBeenCalledTimes(2);
});

test('shows recovery only for safe failed submissions and refreshes after recovery', async () => {
  const safe = { id: 'failed-1', recordId: 'failed-1', warehouse: 'Test Hub', date: '2030-05-12', time: '14:30:00', count: 1, totalWeightKg: 0.6, location: { name: 'Test Hub', contactName: 'Test Contact', phone: '9000000000', address: '1 Hub Road', pincode: '400001' }, shipmentRefs: [{ waybill: '58063010002343' }], status: 'Submission failed', workflow: 'LOCAL', carrierSubmissionStatus: 'FAILED', submissionAttempt: { providerDispatched: false } };
  const recover = jest.spyOn(api, 'recoverPickupRequest').mockResolvedValue({ data: { pickup: { ...safe, status: 'Pending', carrierSubmissionStatus: '' }, recovery: 'AUTHORIZED' } });
  const submit = jest.spyOn(api, 'submitPickupRequest').mockResolvedValue({ data: {} });
  const setPickups = jest.fn(); const notify = jest.fn();
  const oldPrompt = global.prompt; global.prompt = jest.fn(() => 'Reviewed safe pre-dispatch failure');
  renderPage({ pickups: [safe], setPickups, notify });
  expect(screen.getByRole('button', { name: 'Recover failed submission' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Recover failed submission' }));
  await waitFor(() => expect(recover).toHaveBeenCalledWith('failed-1', 'Reviewed safe pre-dispatch failure'));
  expect(submit).not.toHaveBeenCalled();
  expect(setPickups).toHaveBeenCalled(); expect(notify).toHaveBeenCalledWith('Pickup recovery authorized. Review it before submitting again.');
  global.prompt = oldPrompt;
});

test('hides recovery for unsafe states and requires an operator reason', async () => {
  const rows = [
    { id: 'submitting', status: 'Submitting', carrierSubmissionStatus: 'SUBMITTING' },
    { id: 'uncertain', status: 'Outcome unconfirmed', carrierSubmissionStatus: 'OUTCOME_UNCONFIRMED' },
    { id: 'confirmed', status: 'Scheduled', carrierSubmissionStatus: 'CONFIRMED' },
    { id: 'missing-evidence', status: 'Submission failed', carrierSubmissionStatus: 'FAILED' },
  ].map(row => ({ ...row, warehouse: 'Test Hub', date: '2030-05-12', time: '14:30:00', count: 1, totalWeightKg: 1, location: { name: 'Test Hub' }, workflow: 'LOCAL' }));
  const recover = jest.spyOn(api, 'recoverPickupRequest'); const oldPrompt = global.prompt; global.prompt = jest.fn(() => '');
  renderPage({ pickups: rows });
  expect(screen.queryByRole('button', { name: 'Recover failed submission' })).not.toBeInTheDocument();
  global.prompt = oldPrompt;
  expect(recover).not.toHaveBeenCalled();
});

test('requires explicit carrier submission and sends warehouse scheduling fields', async () => {
  const carrier = jest.spyOn(api, 'pickup').mockResolvedValue({
    data: { pickup: { id: 'PUR-1', recordId: 'pickup-record-1', carrierRequestId: 'PUR-1', workflow: 'CARRIER' } },
  });
  const local = jest.spyOn(api, 'createPickupRequest').mockResolvedValue({ data: {} });
  const setPickups = jest.fn();
  renderPage({ warehouses: [{ ...warehouse, registrationStatus: 'REGISTERED' }], setPickups });
  fireEvent.click(screen.getByRole('button', { name: 'Request pickup' }));
  const optIn = screen.getByLabelText('Submit this pickup to Delhivery');
  expect(optIn).not.toBeChecked();
  expect(carrier).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Pickup date'), { target: { value: '2030-05-12' } });
  fireEvent.change(screen.getByLabelText('Pickup time'), { target: { value: '14:30' } });
  fireEvent.change(screen.getByLabelText('Package count'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Total weight (kg)'), { target: { value: '3.5' } });
  fireEvent.click(optIn);
  fireEvent.click(screen.getByRole('button', { name: 'Save pickup request' }));
  await waitFor(() => expect(carrier).toHaveBeenCalledWith({
    pickup_date: '2030-05-12', pickup_time: '14:30',
    pickup_location: 'Test Hub', expected_package_count: 2,
    localDetails: { pickupTimeTo: null, instructions: '', totalWeightKg: 3.5, shipmentRefs: [], shipmentCount: null },
  }));
  expect(local).not.toHaveBeenCalled();
  await waitFor(() => expect(setPickups).toHaveBeenCalled());
  expect(setPickups.mock.calls[0][0]([])[0]).toMatchObject({ id: 'pickup-record-1', carrierRequestId: 'PUR-1' });
});
