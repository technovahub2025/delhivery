import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { api } from '../../services/api';
import RtoManagementPage from './RtoManagementPage';

jest.mock('../../services/api', () => ({ api: { rtoCases: jest.fn(), rtoDashboardCases: jest.fn(), rtoCase: jest.fn(), syncRtoCase: jest.fn(), linkRtoReturnShipment: jest.fn() } }));

const row = { id: 'rto-a', originalShipmentId: 'shipment-a', originalWaybill: 'MOCK-ORIGINAL-A', originalReference: 'ORDER-A', providerCode: 'MOCK', reason: 'RTO initiated', status: 'RTO In Transit', lifecycleState: 'ACTIVE', occurredAt: '2026-09-01T10:00:00Z', statusHistory: [] };

beforeEach(() => {
  jest.clearAllMocks();
  api.rtoCases.mockResolvedValue({ success: true, data: { cases: [row, { ...row, id: 'rto-b', originalWaybill: 'MOCK-ORIGINAL-B', status: 'RTO Delivered', lifecycleState: 'COMPLETED', occurredAt: '2026-09-02T10:00:00Z' }], shipmentsChecked: 2 } });
  api.rtoDashboardCases.mockResolvedValue({ success: true, data: { cases: [row, { ...row, id: 'rto-b', originalWaybill: 'MOCK-ORIGINAL-A', status: 'RTO Delivered', lifecycleState: 'COMPLETED' }], shipments: [{ shipmentId: 'shipment-a', originalWaybill: 'MOCK-ORIGINAL-A', originalReference: 'ORDER-A', providerCode: 'MOCK', occurredAt: row.occurredAt, cases: [row, { ...row, id: 'rto-b', originalWaybill: 'MOCK-ORIGINAL-A', status: 'RTO Delivered', lifecycleState: 'COMPLETED' }] }], total: 1, readOnly: true } });
});

test('RTO dashboard shipment target groups repeated events to one shipment row while preserving related events', async () => {
  render(<RtoManagementPage dashboardFilter={{ target: 'shipments', from: '2026-09-01', to: '2026-09-02', status: 'inTransit' }} />);
  expect(await screen.findByText('MOCK-ORIGINAL-A')).toBeInTheDocument();
  expect(screen.getByText('2')).toBeInTheDocument();
  expect(screen.getAllByRole('row')).toHaveLength(2);
  expect(api.rtoDashboardCases).toHaveBeenCalledWith({ from: '2026-09-01', to: '2026-09-02', status: 'inTransit', target: 'shipments' });
  fireEvent.click(screen.getByRole('button', { name: 'Related events' }));
  expect(screen.getByLabelText('Related RTO events')).toHaveTextContent('RTO In Transit');
  expect(screen.getByLabelText('Related RTO events')).toHaveTextContent('RTO Delivered');
});
test('lists, searches and filters persistent RTO records and displays detailed status history', async () => {
  api.rtoCase.mockResolvedValue({ success: true, data: { rto: row, originalShipment: { customer: 'Dummy Customer', destination: 'Test City' }, originalTrackingEvents: [{ status: 'RTO In Transit' }], returnTrackingEvents: [] } });
  render(<RtoManagementPage />);
  expect(await screen.findByText('MOCK-ORIGINAL-A')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('RTO status'), { target: { value: 'RTO Delivered' } });
  expect(screen.queryByText('MOCK-ORIGINAL-A')).not.toBeInTheDocument();
  expect(screen.getByText('MOCK-ORIGINAL-B')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('RTO status'), { target: { value: 'All statuses' } });
  fireEvent.click(screen.getAllByRole('button', { name: 'Details' })[0]);
  await waitFor(() => expect(screen.getByLabelText('RTO details')).toHaveTextContent('Dummy Customer'));
  expect(screen.getByLabelText('RTO details')).toHaveTextContent('RTO initiated');
  expect(api.rtoCase).toHaveBeenCalledWith('rto-a');
});

test('active RTO dashboard filter shows only ACTIVE lifecycle cases while normal list shows all', async () => {
  const { unmount } = render(<RtoManagementPage />);
  expect(await screen.findByText('MOCK-ORIGINAL-A')).toBeInTheDocument();
  expect(screen.getByText('MOCK-ORIGINAL-B')).toBeInTheDocument();
  unmount();

  render(<RtoManagementPage dashboardFilter={{ target: 'active', from: '2026-09-01', to: '2026-09-02' }} />);
  expect(await screen.findByText('MOCK-ORIGINAL-A')).toBeInTheDocument();
  expect(screen.queryByText('MOCK-ORIGINAL-B')).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('RTO status'), { target: { value: 'RTO In Transit' } });
  expect(screen.getByText('MOCK-ORIGINAL-A')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Search RTO records'), { target: { value: 'no-match' } });
  expect(screen.queryByText('MOCK-ORIGINAL-A')).not.toBeInTheDocument();
});

test('explicitly syncs through the API and links only an existing return shipment', async () => {
  api.rtoCase.mockResolvedValue({ success: true, data: { rto: row, originalShipment: {}, originalTrackingEvents: [], returnTrackingEvents: [] } });
  api.syncRtoCase.mockResolvedValue({ success: true, data: { rto: { ...row, status: 'RTO Delivered' } } });
  api.linkRtoReturnShipment.mockResolvedValue({ success: true, data: { rto: { ...row, returnShipment: { id: 'reverse-a', waybill: 'MOCK-RETURN-A' } } } });
  render(<RtoManagementPage />);
  await screen.findByText('MOCK-ORIGINAL-A');
  fireEvent.click(screen.getAllByRole('button', { name: 'Details' })[0]);
  await screen.findByLabelText('RTO details');
  fireEvent.click(screen.getByRole('button', { name: 'Sync status' }));
  await waitFor(() => expect(api.syncRtoCase).toHaveBeenCalledWith('rto-a'));
  fireEvent.change(screen.getByLabelText('Link existing reverse shipment AWB'), { target: { value: 'MOCK-RETURN-A' } });
  fireEvent.click(screen.getByRole('button', { name: 'Link shipment' }));
  await waitFor(() => expect(api.linkRtoReturnShipment).toHaveBeenCalledWith('rto-a', 'MOCK-RETURN-A'));
});
