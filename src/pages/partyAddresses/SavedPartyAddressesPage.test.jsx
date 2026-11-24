import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SavedPartyAddressesPage from './SavedPartyAddressesPage';
import { api } from '../../services/api';

jest.mock('../../services/api', () => ({ api: {
  partyAddresses: jest.fn(), partyAddress: jest.fn(), createPartyAddress: jest.fn(), updatePartyAddress: jest.fn(), customers: jest.fn(),
} }));

const address = { id: 'address-1', partyType: 'SHIPPER', customerId: 'customer-1', companyName: 'Acme Ltd', contactName: 'A Contact', phone: '9876543210', email: 'a@example.com', addressLines: ['12 Test Road'], city: 'Pune', state: 'Maharashtra', pincode: '411001', gstin: '22AAAAA0000A1Z5' };
const customers = [{ id: 'customer-1', category: 'CREDIT', displayName: 'Acme Freight', companyName: 'Acme Ltd' }];
const listed = (partyAddresses = [address], total = partyAddresses.length, page = 1) => ({ success: true, data: { partyAddresses, total, page, limit: 10 } });

beforeEach(() => {
  jest.clearAllMocks();
  api.partyAddresses.mockResolvedValue(listed());
  api.partyAddress.mockResolvedValue({ success: true, data: { partyAddress: address } });
  api.customers.mockResolvedValue({ success: true, data: { customers, total: 1, page: 1, limit: 100 } });
  api.createPartyAddress.mockResolvedValue({ success: true, data: { partyAddress: address } });
  api.updatePartyAddress.mockResolvedValue({ success: true, data: { partyAddress: address } });
});

test('lists addresses with party, customer and search filters and pagination', async () => {
  api.partyAddresses.mockResolvedValue(listed([address], 21));
  render(<SavedPartyAddressesPage />);
  expect(await screen.findByText('Acme Ltd')).toBeInTheDocument();
  expect(screen.getByText('Shipper', { selector: 'span.party-type-badge' })).toBeInTheDocument();
  expect(within(screen.getByRole('table')).getByText('Acme Freight')).toBeInTheDocument();
  expect(api.partyAddresses).toHaveBeenCalledWith({ search: '', partyType: '', customerId: '', page: 1, limit: 10 }, expect.any(AbortSignal));
  await userEvent.type(screen.getByRole('searchbox', { name: /search addresses/i }), 'Pune');
  await waitFor(() => expect(api.partyAddresses).toHaveBeenLastCalledWith({ search: 'Pune', partyType: '', customerId: '', page: 1, limit: 10 }, expect.any(AbortSignal)));
  fireEvent.change(screen.getByLabelText('Party type'), { target: { value: 'CONSIGNEE' } });
  fireEvent.change(screen.getByLabelText('Customer'), { target: { value: 'customer-1' } });
  await waitFor(() => expect(api.partyAddresses).toHaveBeenLastCalledWith({ search: 'Pune', partyType: 'CONSIGNEE', customerId: 'customer-1', page: 1, limit: 10 }, expect.any(AbortSignal)));
  await screen.findByRole('button', { name: 'Next page' });
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  await waitFor(() => expect(api.partyAddresses).toHaveBeenLastCalledWith({ search: 'Pune', partyType: 'CONSIGNEE', customerId: 'customer-1', page: 2, limit: 10 }, expect.any(AbortSignal)));
});

test.each(['SHIPPER', 'CONSIGNEE', 'PICKUP'])('creates a %s address without requiring unconfirmed address fields', async partyType => {
  render(<SavedPartyAddressesPage />);
  await screen.findByText('Acme Ltd');
  await userEvent.click(screen.getByRole('button', { name: 'Add address' }));
  const dialog = screen.getByRole('dialog', { name: 'Add saved address' });
  await userEvent.selectOptions(within(dialog).getByLabelText('Party type'), partyType);
  await userEvent.click(within(dialog).getByRole('button', { name: 'Create address' }));
  await waitFor(() => expect(api.createPartyAddress).toHaveBeenCalledWith(expect.objectContaining({ partyType, customerId: null })));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add saved address' })).not.toBeInTheDocument());
});

test('associates an address with a selected existing customer', async () => {
  render(<SavedPartyAddressesPage />);
  await screen.findByText('Acme Ltd');
  await userEvent.click(screen.getByRole('button', { name: 'Add address' }));
  const dialog = screen.getByRole('dialog', { name: 'Add saved address' });
  await userEvent.selectOptions(within(dialog).getByLabelText('Customer (optional)'), 'customer-1');
  await userEvent.click(within(dialog).getByRole('button', { name: 'Create address' }));
  await waitFor(() => expect(api.createPartyAddress).toHaveBeenCalledWith(expect.objectContaining({ partyType: 'SHIPPER', customerId: 'customer-1' })));
});

test('views address details through the by-ID API', async () => {
  render(<SavedPartyAddressesPage />);
  await userEvent.click(await screen.findByRole('button', { name: 'View Acme Ltd' }));
  expect(await screen.findByRole('dialog', { name: 'Saved address details' })).toBeInTheDocument();
  expect(await within(screen.getByRole('dialog', { name: 'Saved address details' })).findByText(/12 Test Road/)).toBeInTheDocument();
  expect(api.partyAddress).toHaveBeenCalledWith('address-1', expect.any(AbortSignal));
});

test('edits an address and saves only the supported form fields', async () => {
  render(<SavedPartyAddressesPage />);
  await userEvent.click(await screen.findByRole('button', { name: 'Edit Acme Ltd' }));
  const dialog = screen.getByRole('dialog', { name: 'Edit saved address' });
  expect(within(dialog).getByLabelText('Customer (optional)')).toHaveValue('customer-1');
  fireEvent.change(within(dialog).getByLabelText('Contact name'), { target: { value: 'Updated Contact' } });
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(api.updatePartyAddress).toHaveBeenCalledWith('address-1', expect.objectContaining({ partyType: 'SHIPPER', customerId: 'customer-1', contactName: 'Updated Contact', addressLines: ['12 Test Road'] })));
});

test('validates optional contact fields and displays backend save errors', async () => {
  render(<SavedPartyAddressesPage />);
  await userEvent.click(await screen.findByRole('button', { name: 'Add address' }));
  const dialog = screen.getByRole('dialog', { name: 'Add saved address' });
  fireEvent.change(within(dialog).getByLabelText('Phone'), { target: { value: '123' } });
  await userEvent.click(within(dialog).getByRole('button', { name: 'Create address' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Enter a valid contact phone number.');
  expect(api.createPartyAddress).not.toHaveBeenCalled();
  fireEvent.change(within(dialog).getByLabelText('Phone'), { target: { value: '' } });
  api.createPartyAddress.mockRejectedValueOnce(new Error('Party address could not be saved.'));
  await userEvent.click(within(dialog).getByRole('button', { name: 'Create address' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Party address could not be saved.');
});

test('shows loading, empty and retryable list error states', async () => {
  let resolveList;
  api.partyAddresses.mockImplementationOnce(() => new Promise(resolve => { resolveList = resolve; }));
  const view = render(<SavedPartyAddressesPage />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading saved addresses');
  await waitFor(() => expect(resolveList).toBeDefined());
  resolveList(listed([]));
  expect(await screen.findByText('No saved addresses yet')).toBeInTheDocument();
  view.unmount();
  api.partyAddresses.mockRejectedValueOnce(new Error('Address service unavailable.'));
  render(<SavedPartyAddressesPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Address service unavailable.');
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(api.partyAddresses).toHaveBeenCalledTimes(3);
});
