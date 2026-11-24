import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomersPage from '../../pages/customers/CustomersPage';
import { api } from '../../services/api';

jest.mock('../../services/api', () => ({ api: { customers: jest.fn(), createCustomer: jest.fn(), updateCustomer: jest.fn(), rateCards: jest.fn(), customerOutstanding: jest.fn() }, unwrap: value => value?.data ?? value }));

const existing = {
  id: 'cust-1', category: 'CREDIT', displayName: 'Acme Freight', companyName: 'Acme Ltd', gstin: '22AAAAA0000A1Z5',
  primaryContact: { name: 'A Contact', phone: '9876543210', email: 'a@example.com' }, creditLimit: 1000,
  creditTerms: { days: 30 }, monthlyBillingConfig: { cycle: 'month-end' }, outstandingBalance: 50,
};
const listed = customers => ({ success: true, data: { customers, total: customers.length, page: 1, limit: 10 } });

beforeEach(() => {
  jest.clearAllMocks();
  api.customers.mockResolvedValue(listed([existing]));
  api.createCustomer.mockResolvedValue({ success: true, data: { customer: {} } });
  api.updateCustomer.mockResolvedValue({ success: true, data: { customer: existing } });
  api.rateCards.mockResolvedValue({ success: true, data: { rateCards: [{ id: 'walkin-standard', scope: 'WALK_IN_STANDARD', name: 'Standard walk-in' }], total: 1 } });
});

test('loads searchable Credit and Walk-In customers and sends paging/filter query', async () => {
  render(<CustomersPage />);
  expect(await screen.findByText('Acme Freight')).toBeInTheDocument();
  expect(screen.getByText('Credit', { selector: 'span.customer-category-badge' })).toBeInTheDocument();
  expect(api.customers).toHaveBeenCalledWith({ search: '', category: '', page: 1, limit: 10 }, expect.any(AbortSignal));
  await userEvent.type(screen.getByRole('searchbox', { name: /search customers/i }), 'Acme');
  await waitFor(() => expect(api.customers).toHaveBeenLastCalledWith({ search: 'Acme', category: '', page: 1, limit: 10 }, expect.any(AbortSignal)));
  fireEvent.change(screen.getByRole('combobox', { name: 'Filter by category' }), { target: { value: 'WALK_IN' } });
  await waitFor(() => expect(api.customers).toHaveBeenLastCalledWith({ search: 'Acme', category: 'WALK_IN', page: 1, limit: 10 }, expect.any(AbortSignal)));
});

test('shows a loading state followed by the empty state', async () => {
  let finishLoading;
  api.customers.mockImplementationOnce(() => new Promise(resolve => { finishLoading = resolve; }));
  render(<CustomersPage />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading customers');
  await act(async () => { finishLoading(listed([])); });
  expect(screen.getByText('No customers yet')).toBeInTheDocument();
});

test('opens a create form with optional identity fields and category-conditional credit fields', async () => {
  render(<CustomersPage />);
  await screen.findByText('Acme Freight');
  await userEvent.click(screen.getByRole('button', { name: 'Add customer' }));
  const dialog = screen.getByRole('dialog', { name: 'Add customer' });
  expect(within(dialog).getByLabelText('Category')).toHaveValue('WALK_IN');
  expect(within(dialog).queryByLabelText('Credit limit')).not.toBeInTheDocument();
  await userEvent.selectOptions(within(dialog).getByLabelText('Category'), 'CREDIT');
  expect(within(dialog).getByLabelText('Credit limit')).toBeInTheDocument();
  expect(within(dialog).getByLabelText('Credit terms (JSON)')).toBeInTheDocument();
  await userEvent.type(within(dialog).getByLabelText('Display name'), 'New account');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Create customer' }));
  await waitFor(() => expect(api.createCustomer).toHaveBeenCalledWith(expect.objectContaining({ category: 'CREDIT', displayName: 'New account', creditLimit: null, creditTerms: null })));
});

test('shows client validation and backend errors without submitting invalid customer data', async () => {
  render(<CustomersPage />);
  await screen.findByText('Acme Freight');
  await userEvent.click(screen.getByRole('button', { name: 'Add customer' }));
  const dialog = screen.getByRole('dialog', { name: 'Add customer' });
  await userEvent.selectOptions(within(dialog).getByLabelText('Category'), 'CREDIT');
  fireEvent.change(within(dialog).getByLabelText('Credit terms (JSON)'), { target: { value: '{bad json' } });
  await userEvent.click(within(dialog).getByRole('button', { name: 'Create customer' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Credit terms must be valid JSON.');
  expect(api.createCustomer).not.toHaveBeenCalled();
  fireEvent.change(within(dialog).getByLabelText('Credit terms (JSON)'), { target: { value: '' } });
  api.createCustomer.mockRejectedValueOnce(new Error('Customer could not be saved.'));
  await userEvent.click(within(dialog).getByRole('button', { name: 'Create customer' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Customer could not be saved.');
});

test('editing preserves data and clears credit-only values when changing to Walk-In', async () => {
  render(<CustomersPage />);
  await userEvent.click(await screen.findByRole('button', { name: 'Edit Acme Freight' }));
  const dialog = screen.getByRole('dialog', { name: 'Edit customer' });
  expect(within(dialog).getByLabelText('Credit limit')).toHaveValue(1000);
  await userEvent.selectOptions(within(dialog).getByLabelText('Category'), 'WALK_IN');
  expect(within(dialog).queryByLabelText('Credit limit')).not.toBeInTheDocument();
  await waitFor(() => expect(within(dialog).getByLabelText('Standard walk-in rate card')).toBeEnabled());
  await userEvent.selectOptions(within(dialog).getByLabelText('Standard walk-in rate card'), 'walkin-standard');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(api.updateCustomer).toHaveBeenCalledWith('cust-1', expect.objectContaining({ category: 'WALK_IN', creditLimit: null, creditTerms: null, monthlyBillingConfig: null, outstandingBalance: null })));
});

test('shows a retryable server error when the customer list fails', async () => {
  api.customers.mockRejectedValueOnce(new Error('Customers could not be loaded.'));
  render(<CustomersPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Customers could not be loaded.');
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
});

test('offers only a customer-owned matching CUSTOMER card and requires a standard card for Walk-In', async () => {
  api.rateCards.mockResolvedValue({ success: true, data: { rateCards: [
    { id: 'card-own', scope: 'CUSTOMER', customerId: 'cust-1', name: 'Acme card' },
    { id: 'card-other', scope: 'CUSTOMER', customerId: 'other-customer', name: 'Other customer card' },
    { id: 'card-standard', scope: 'WALK_IN_STANDARD', name: 'Standard' },
  ] } });
  render(<CustomersPage />);
  await userEvent.click(await screen.findByRole('button', { name: 'Edit Acme Freight' }));
  const dialog = screen.getByRole('dialog', { name: 'Edit customer' });
  await waitFor(() => expect(within(dialog).getByLabelText('Customer rate card')).toBeEnabled());
  const cardSelect = within(dialog).getByLabelText('Customer rate card');
  expect(within(cardSelect).getByRole('option', { name: 'Acme card' })).toBeInTheDocument();
  expect(within(cardSelect).queryByRole('option', { name: 'Other customer card' })).not.toBeInTheDocument();
  await userEvent.selectOptions(within(dialog).getByLabelText('Category'), 'WALK_IN');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Select the applicable standard walk-in rate card.');
  await userEvent.selectOptions(within(dialog).getByLabelText('Standard walk-in rate card'), 'card-standard');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(api.updateCustomer).toHaveBeenCalledWith('cust-1', expect.objectContaining({ category: 'WALK_IN', rateCardId: 'card-standard' })));
});

test('shows the current invoice ledger separately from the stored legacy balance', async () => {
  api.customerOutstanding.mockResolvedValue({ data: { totalOutstanding: '115.00', currency: 'INR', invoices: [{ id: '1', invoiceNumber: 'INV-1', currency: 'INR', outstandingAmount: '115.00', status: 'PARTIALLY_PAID' }] } });
  render(<CustomersPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'View ledger for Acme Freight' }));
  expect(await screen.findByText('Current invoice outstanding: INR 115.00')).toBeInTheDocument();
  expect(screen.getByText('Legacy balance (reference): 50')).toBeInTheDocument();
  expect(screen.getByText(/INV-1.*PARTIALLY_PAID/)).toBeInTheDocument();
  expect(api.customerOutstanding).toHaveBeenCalledWith('cust-1', expect.any(AbortSignal));
});
