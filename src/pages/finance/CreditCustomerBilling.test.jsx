import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CreditCustomerBilling from './CreditCustomerBilling';
import { api } from '../../services/api';

jest.mock('../../services/api', () => ({
  api: {
    creditBillingCustomers: jest.fn(), creditBillingEligibleShipments: jest.fn(), creditInvoices: jest.fn(),
    generateCreditInvoice: jest.fn(), creditInvoice: jest.fn(),
  },
  unwrap: value => value?.data ?? value,
}));

beforeEach(() => {
  jest.clearAllMocks();
  api.creditBillingCustomers.mockResolvedValue({ data: { customers: [{ id: 'customer-1', category: 'CREDIT', displayName: 'Dummy Credit Account' }] } });
  api.creditBillingEligibleShipments.mockResolvedValue({ data: { eligibleShipments: [{ shipmentId: 'shipment-1', reference: 'DUMMY-ORDER-1', waybill: 'MOCK-AWB-1', mode: 'SURFACE', amount: '42.50', currency: 'INR', pricingStatus: 'READY' }], blockedShipments: [], blockers: [], configuration: { status: 'READY' } } });
  api.creditInvoices.mockResolvedValue({ data: { invoices: [] } });
});

test('selects credit customer and period, lists snapshot-eligible shipments and generates with explicit invoice inputs', async () => {
  api.generateCreditInvoice.mockResolvedValue({ data: { invoice: { invoiceNumber: 'DUMMY-INV-1' } } });
  render(<CreditCustomerBilling />);
  expect(await screen.findByText('DUMMY-ORDER-1')).toBeInTheDocument();
  expect(screen.getByText('INR 42.50')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Invoice number'), { target: { value: 'DUMMY-INV-1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Generate monthly invoice' }));
  await waitFor(() => expect(api.generateCreditInvoice).toHaveBeenCalledWith(expect.objectContaining({ customerId: 'customer-1', invoiceNumber: 'DUMMY-INV-1', period: expect.stringMatching(/^\d{4}-\d{2}$/) })));
  expect(await screen.findByRole('status')).toHaveTextContent(/generated from saved shipment pricing snapshots/i);
});

test('displays configuration blockers and prevents invoice generation', async () => {
  api.creditBillingEligibleShipments.mockResolvedValue({ data: { eligibleShipments: [], blockedShipments: [], blockers: ['GST treatment is not configured.'], configuration: { status: 'CONFIGURATION_REQUIRED' } } });
  render(<CreditCustomerBilling />);
  expect(await screen.findByText('GST treatment is not configured.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Generate monthly invoice' })).toBeDisabled();
  expect(api.generateCreditInvoice).not.toHaveBeenCalled();
});

test('opens invoice history details from the customer billing view', async () => {
  api.creditInvoices.mockResolvedValue({ data: { invoices: [{ id: 'invoice-1', invoiceNumber: 'DUMMY-INV-2', period: { key: '2026-09' }, invoiceDate: '2026-10-01', dueDate: null, status: 'GENERATED', totalAmount: '42.50', currency: 'INR' }] } });
  api.creditInvoice.mockResolvedValue({ data: { invoice: { id: 'invoice-1', invoiceNumber: 'DUMMY-INV-2', customerSnapshot: { displayName: 'Dummy Credit Account' }, period: { key: '2026-09' }, invoiceDate: '2026-10-01', dueDate: null, status: 'GENERATED', totalAmount: '42.50', currency: 'INR', lineItems: [{ shipmentId: 'shipment-1', reference: 'DUMMY-ORDER-1', waybill: 'MOCK-AWB-1', mode: 'SURFACE', chargeBreakdown: { baseRate: '42.50' }, taxAmount: '0', totalAmount: '42.50', currency: 'INR' }] } } });
  render(<CreditCustomerBilling />);
  expect(await screen.findByText('DUMMY-INV-2')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'View details' }));
  expect(await screen.findByRole('dialog', { name: 'Invoice DUMMY-INV-2' })).toHaveTextContent('MOCK-AWB-1');
  expect(api.creditInvoice).toHaveBeenCalledWith('invoice-1');
});

test('shows the configured period statement independently of invoice eligibility', async () => {
  api.creditBillingEligibleShipments.mockResolvedValue({ data: {
    period: { start: '2026-09-10', endExclusive: '2026-10-10' },
    configuration: { status: 'READY' }, eligibleShipments: [], blockers: [],
    statement: { dateBasis: 'createdAt', entries: [{ shipmentId: 'statement-1', reference: 'STATEMENT-ORDER', billingStatus: 'NOT_ELIGIBLE', shipmentStatus: 'Pending pickup', amount: '55', currency: 'INR', sample: true }] },
  } });
  render(<CreditCustomerBilling />);
  fireEvent.click(await screen.findByText('Customer shipment statement'));
  expect(screen.getByText('STATEMENT-ORDER')).toBeInTheDocument();
  expect(screen.getByText('NOT ELIGIBLE')).toBeInTheDocument();
  expect(screen.getByText('SAMPLE INR 55')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Generate monthly invoice' })).toBeDisabled();
});
