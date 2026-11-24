import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PartnerCostManagement from './PartnerCostManagement';
import { api } from '../../services/api';

jest.mock('../../services/api', () => ({
  api: { partnerCosts: jest.fn(), partnerCost: jest.fn(), recordFinalPartnerCost: jest.fn() },
  unwrap: value => value?.data ?? value,
}));

const pending = { shipmentId: 'shipment-1', reference: 'DUMMY-ORDER-1', waybill: 'MOCK-AWB-1', partnerCode: 'MOCK', partnerName: 'Mock Carrier', estimatedCost: { amount: '125.50', currency: 'INR', source: 'PARTNER_QUOTE', chargeBreakdown: { baseFreight: '100.00', fuelSurcharge: '25.50' } }, finalCost: null, reconciliationStatus: 'PENDING', reconciliationHistory: [], costAuditTrail: [] };

beforeEach(() => {
  jest.clearAllMocks();
  api.partnerCosts.mockResolvedValue({ data: { costs: [pending] } });
  api.partnerCost.mockResolvedValue({ data: { cost: pending } });
});

test('shows estimates as pending and supports reconciliation filters', async () => {
  render(<PartnerCostManagement />);
  expect(await screen.findByText('INR 125.50')).toBeInTheDocument();
  expect(screen.getAllByText('Pending final cost').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0);
  fireEvent.change(screen.getByLabelText('Reconciliation status'), { target: { value: 'PENDING' } });
  await waitFor(() => expect(api.partnerCosts).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'PENDING' })));
});

test('shows estimate and breakdown separately, records sourced final cost and refreshes', async () => {
  api.recordFinalPartnerCost.mockResolvedValue({ data: { cost: { ...pending, finalCost: { amount: '130.75', currency: 'INR', sourceReference: 'DUMMY-INVOICE-1', source: 'PROVIDER_INVOICE_OPERATOR_RECORDED', gstRecoverability: null }, reconciliationStatus: 'DISCREPANT', variance: '5.25', varianceCurrency: 'INR', reconciliationHistory: [{ id: 'r1', status: 'DISCREPANT', estimatedAmount: '125.50', estimatedCurrency: 'INR', finalAmount: '130.75', finalCurrency: 'INR', sourceReference: 'DUMMY-INVOICE-1', reconciledAt: '2026-10-01' }], costAuditTrail: [{ at: '2026-10-01', action: 'FINAL_COST_RECORDED_AND_RECONCILED', actor: 'test', sourceReference: 'DUMMY-INVOICE-1' }] } } });
  render(<PartnerCostManagement />);
  fireEvent.click(await screen.findByRole('button', { name: 'View cost' }));
  expect(await screen.findByRole('dialog', { name: 'Partner cost details' })).toHaveTextContent('Estimated partner quotation');
  expect(screen.getByText('Fuel surcharge')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Final total amount'), { target: { value: '130.75' } });
  fireEvent.change(screen.getByLabelText('Provider invoice reference'), { target: { value: 'DUMMY-INVOICE-1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Record final cost and reconcile' }));
  await waitFor(() => expect(api.recordFinalPartnerCost).toHaveBeenCalledWith('shipment-1', expect.objectContaining({ amount: '130.75', sourceReference: 'DUMMY-INVOICE-1', currency: 'INR' })));
  expect(await screen.findByText('Final cost recorded and compared with the preserved estimate.')).toBeInTheDocument();
  expect(screen.getByText('Variance (final minus estimate): INR 5.25. Tax recoverability: Not determined.')).toBeInTheDocument();
});
