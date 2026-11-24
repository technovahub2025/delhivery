import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PaymentManagement from './PaymentManagement';
import { api } from '../../services/api';

jest.mock('../../services/api', () => ({
  api: { creditBillingCustomers: jest.fn(), paymentInvoices: jest.fn(), customerPayments: jest.fn(), customerOutstanding: jest.fn(), recordCustomerPayment: jest.fn(), customerPayment: jest.fn() },
  unwrap: value => value?.data ?? value,
}));

beforeEach(() => {
  jest.clearAllMocks();
  api.creditBillingCustomers.mockResolvedValue({ data: { customers: [{ id: 'customer-1', category: 'CREDIT', displayName: 'Dummy Credit' }] } });
  api.paymentInvoices.mockResolvedValue({ data: { invoices: [{ id: 'invoice-1', invoiceNumber: 'DUMMY-INV-1', currency: 'INR', totalAmount: '120.00', paidAmount: '20.00', outstandingAmount: '100.00', status: 'PARTIALLY_PAID', dueDate: null, invoiceDate: '2026-10-01' }] } });
  api.customerPayments.mockResolvedValue({ data: { payments: [] } });
  api.customerOutstanding.mockResolvedValue({ data: { totalOutstanding: '100.00', currency: 'INR', mixedCurrencies: false, invoices: [] } });
});

test('records a partial allocation and refreshes outstanding invoices', async () => {
  api.recordCustomerPayment.mockResolvedValue({ data: { payment: { id: 'payment-1', amount: '25.00', currency: 'INR', allocations: [] } } });
  render(<PaymentManagement />);
  expect(await screen.findByText('DUMMY-INV-1')).toBeInTheDocument();
  expect(screen.getAllByText('INR 100.00')).toHaveLength(2);
  fireEvent.change(screen.getByLabelText('Allocate to DUMMY-INV-1'), { target: { value: '25.00' } });
  fireEvent.change(screen.getByLabelText('Payment amount'), { target: { value: '25.00' } });
  fireEvent.click(screen.getByRole('button', { name: 'Record payment' }));
  await waitFor(() => expect(api.recordCustomerPayment).toHaveBeenCalledWith(expect.objectContaining({ customerId: 'customer-1', amount: '25.00', currency: 'INR', allocations: [{ invoiceId: 'invoice-1', amount: '25.00' }], idempotencyKey: expect.any(String) })));
  expect(await screen.findByRole('status')).toHaveTextContent('Payment recorded');
});

test('prevents submission when allocation total differs from payment amount', async () => {
  render(<PaymentManagement />);
  await screen.findByText('DUMMY-INV-1');
  fireEvent.change(screen.getByLabelText('Allocate to DUMMY-INV-1'), { target: { value: '25.00' } });
  fireEvent.change(screen.getByLabelText('Payment amount'), { target: { value: '30.00' } });
  expect(screen.getByRole('button', { name: 'Record payment' })).toBeDisabled();
  expect(api.recordCustomerPayment).not.toHaveBeenCalled();
});

test('shows payment allocation details with printable detail action', async () => {
  api.customerPayments.mockResolvedValue({ data: { payments: [{ id: 'payment-1', amount: '20.00', currency: 'INR', receivedAt: '2026-10-05', reference: 'DUMMY-REF', allocations: [{ invoiceId: 'invoice-1', invoiceNumber: 'DUMMY-INV-1', amount: '20.00', currency: 'INR' }] }] } });
  api.customerPayment.mockResolvedValue({ data: { payment: { id: 'payment-1', amount: '20.00', currency: 'INR', receivedAt: '2026-10-05', reference: 'DUMMY-REF', customerSnapshot: { displayName: 'Dummy Credit' }, allocations: [{ invoiceId: 'invoice-1', invoiceNumber: 'DUMMY-INV-1', amount: '20.00', currency: 'INR' }] } } });
  render(<PaymentManagement />);
  await screen.findByText('DUMMY-REF');
  fireEvent.click(screen.getByRole('button', { name: 'Receipt details' }));
  expect(await screen.findByRole('dialog', { name: 'Payment details' })).toHaveTextContent('DUMMY-INV-1');
  expect(screen.getByRole('button', { name: 'Print payment details' })).toBeInTheDocument();
});
