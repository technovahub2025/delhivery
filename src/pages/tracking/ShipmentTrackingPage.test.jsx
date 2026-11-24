import { fireEvent, render, screen } from '@testing-library/react';
import { api } from '../../services/api';
import ShipmentTrackingPage from './ShipmentTrackingPage';

jest.mock('../../services/api', () => ({
  api: { track: jest.fn(), syncShipmentTracking: jest.fn() },
  unwrap: (result) => result.data ?? result,
}));

beforeEach(() => jest.clearAllMocks());

test('loads and displays the persistent event timeline for an owner shipment', async () => {
  api.track.mockResolvedValue({ success: true, data: { shipment: { id: 'shipment-1', waybill: 'MOCK-AWB' }, events: [
    { eventKey: 'e1', status: 'Picked up', location: 'Test Hub', occurredAt: '2026-05-01T10:00:00Z', description: 'Collected' },
    { eventKey: 'e2', status: 'In transit', location: 'Test City', occurredAt: '2026-05-02T10:00:00Z', description: 'Departed' },
  ] } });
  render(<ShipmentTrackingPage />);
  fireEvent.change(screen.getByLabelText('Waybill or reference number'), { target: { value: 'MOCK-AWB' } });
  fireEvent.click(screen.getByRole('button', { name: 'Track shipment' }));
  expect(await screen.findByText('Picked up')).toBeInTheDocument();
  expect(screen.getByText('In transit')).toBeInTheDocument();
  expect(screen.getByText('Test Hub')).toBeInTheDocument();
  expect(screen.getByText('Collected')).toBeInTheDocument();
  expect(api.track).toHaveBeenCalledWith({ waybill: 'MOCK-AWB' });
});

test('shows an empty timeline and supports explicit mocked synchronization', async () => {
  api.track.mockResolvedValue({ success: true, data: { shipment: { id: 'shipment-2', reference: 'TEST-REF' }, events: [] } });
  api.syncShipmentTracking.mockResolvedValue({ success: true, data: { shipment: { id: 'shipment-2', reference: 'TEST-REF' }, events: [
    { eventKey: 'e1', status: 'In transit', occurredAt: '2026-05-02T10:00:00Z' },
  ] } });
  render(<ShipmentTrackingPage />);
  fireEvent.change(screen.getByLabelText('Search by'), { target: { value: 'ref_ids' } });
  fireEvent.change(screen.getByLabelText('Waybill or reference number'), { target: { value: 'TEST-REF' } });
  fireEvent.click(screen.getByRole('button', { name: 'Track shipment' }));
  expect(await screen.findByText('No tracking events yet')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Sync from courier' }));
  expect(await screen.findByText('In transit')).toBeInTheDocument();
  expect(api.syncShipmentTracking).toHaveBeenCalledWith('shipment-2');
});

test('keeps the search available and offers retry after a tracking error', async () => {
  api.track.mockRejectedValueOnce(new Error('Temporary tracking failure')).mockResolvedValueOnce({ success: true, data: { shipment: { id: 'shipment-3', waybill: 'RETRY-AWB' }, events: [] } });
  render(<ShipmentTrackingPage />);
  fireEvent.change(screen.getByLabelText('Waybill or reference number'), { target: { value: 'RETRY-AWB' } });
  fireEvent.click(screen.getByRole('button', { name: 'Track shipment' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Temporary tracking failure');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('No tracking events yet')).toBeInTheDocument();
  expect(api.track).toHaveBeenCalledTimes(2);
});
