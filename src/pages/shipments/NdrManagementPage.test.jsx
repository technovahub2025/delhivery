import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { api } from '../../services/api';
import NdrManagementPage from './NdrManagementPage';

jest.mock('../../services/api', () => ({
  api: { ndrCases: jest.fn(), ndrDashboardShipments: jest.fn(), ndrCase: jest.fn(), ndrCaseAction: jest.fn(), ndrStatus: jest.fn() },
}));

const caseRecord = {
  id: 'case-a', shipmentId: 'shipment-a', waybill: 'MOCK-AWB-A', reference: 'DUMMY-REF-A',
  customer: 'Dummy Customer', destination: 'Test City', payment: 'Prepaid', reason: 'Undelivered | Consignee unavailable',
  status: 'OPEN', occurredAt: '2026-08-10T10:00:00Z', lastUpdated: '2026-08-10T10:00:00Z', actions: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  api.ndrCases.mockResolvedValue({ success: true, data: { cases: [caseRecord], checked: 1, trackingFailed: 0, complete: true } });
});

test('dashboard NDR click-through renders one row per shipment and exposes persisted and derived cases', async () => {
  const second = { ...caseRecord, id: null, persisted: false, reason: 'Undelivered | Address issue', occurredAt: '2026-08-11T10:00:00Z' };
  api.ndrDashboardShipments.mockResolvedValue({ success: true, data: { shipments: [{ shipmentId: 'shipment-a', waybill: 'MOCK-AWB-A', reference: 'DUMMY-REF-A', customer: 'Dummy Customer', destination: 'Test City', payment: 'Prepaid', cases: [caseRecord, second] }], total: 1, readOnly: true } });
  render(<NdrManagementPage dashboardFilter={{ target: 'shipments', from: '2026-08-10', to: '2026-08-11', status: 'inTransit' }} />);
  expect(await screen.findByText('MOCK-AWB-A')).toBeInTheDocument();
  expect(screen.getByText('2')).toBeInTheDocument();
  expect(screen.getAllByRole('row')).toHaveLength(2);
  expect(api.ndrDashboardShipments).toHaveBeenCalledWith({ from: '2026-08-10', to: '2026-08-11', status: 'inTransit', target: 'shipments' });
  fireEvent.click(screen.getByRole('button', { name: 'Related cases' }));
  expect(screen.getByLabelText('Related NDR cases')).toHaveTextContent('Derived observation');
  expect(screen.getByLabelText('Related NDR cases')).toHaveTextContent('Persisted case');
});
test('lists persisted cases, filters by status/search and opens tracking plus action details', async () => {
  api.ndrCase.mockResolvedValue({ success: true, data: { case: caseRecord, trackingEvents: [{ eventKey: 'e1', status: 'Undelivered', location: 'Test Hub', occurredAt: caseRecord.occurredAt }] } });
  render(<NdrManagementPage />);
  expect(await screen.findByText('MOCK-AWB-A')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('NDR status'), { target: { value: 'RESOLVED' } });
  expect(screen.queryByText('MOCK-AWB-A')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('NDR status'), { target: { value: 'All statuses' } });
  fireEvent.click(screen.getByRole('button', { name: 'Details' }));
  await waitFor(() => expect(screen.getByLabelText('NDR case details')).toHaveTextContent('Test Hub'));
  expect(screen.getByLabelText('NDR case details')).toHaveTextContent('Undelivered');
  expect(api.ndrCase).toHaveBeenCalledWith('case-a');
});

test('records a customer contact action with detail and refreshes persistent cases', async () => {
  api.ndrCaseAction.mockResolvedValue({ success: true, data: { case: { ...caseRecord, actions: [{ id: 'action-1', action: 'CUSTOMER_CONTACT', status: 'RECORDED', details: 'Reached dummy recipient' }] }, action: { id: 'action-1' } } });
  render(<NdrManagementPage />);
  expect(await screen.findByText('MOCK-AWB-A')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /NDR action/i }));
  fireEvent.change(screen.getByLabelText('Shipment waybill (AWB)'), { target: { value: 'MOCK-AWB-A' } });
  fireEvent.change(screen.getByLabelText('Action'), { target: { value: 'CUSTOMER_CONTACT' } });
  fireEvent.change(screen.getByLabelText('Action details'), { target: { value: 'Reached dummy recipient' } });
  fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
  await waitFor(() => expect(api.ndrCaseAction).toHaveBeenCalledWith('case-a', { action: 'CUSTOMER_CONTACT', details: 'Reached dummy recipient' }));
  expect(await screen.findByText(/Reached dummy recipient/)).toBeInTheDocument();
});
