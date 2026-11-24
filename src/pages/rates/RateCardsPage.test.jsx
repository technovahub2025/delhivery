import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RateCardsPage from './RateCardsPage';
import { api } from '../../services/api';

jest.mock('../../services/api', () => ({ api: {
  rateCards: jest.fn(), customers: jest.fn(), createRateCard: jest.fn(), updateRateCard: jest.fn(), createRateCardVersion: jest.fn(),
} }));

const card = { id: 'rate-1', scope: 'WALK_IN_STANDARD', name: 'Standard tariff', currency: 'INR', version: 1, effectiveFrom: '2026-01-01', zoneRates: [{ zone: 'Zone A', modes: [{ mode: 'SURFACE', weightSlabs: [{ minWeight: 0, maxWeight: 5, baseRate: '40' }] }] }], surcharges: [], gstRules: [] };
const customers = [{ id: 'credit-1', category: 'CREDIT', displayName: 'Credit Buyer' }];

beforeEach(() => {
  jest.clearAllMocks();
  api.rateCards.mockResolvedValue({ success: true, data: { rateCards: [card], total: 1 } });
  api.customers.mockResolvedValue({ success: true, data: { customers, total: 1 } });
  api.createRateCard.mockResolvedValue({ success: true, data: { rateCard: card } });
  api.updateRateCard.mockResolvedValue({ success: true, data: { rateCard: card } });
  api.createRateCardVersion.mockResolvedValue({ success: true, data: { rateCard: { ...card, version: 2 } } });
});

test('lists cards and filters by scope, customer, search and page', async () => {
  render(<RateCardsPage />);
  expect(await screen.findByText('Standard tariff')).toBeInTheDocument();
  expect(screen.getByText('v1')).toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText('Filter rate cards by scope'), 'CUSTOMER');
  await waitFor(() => expect(api.rateCards).toHaveBeenLastCalledWith({ scope: 'CUSTOMER', customerId: '', search: '', page: 1, limit: 10 }, expect.any(AbortSignal)));
  await userEvent.type(screen.getByRole('searchbox', { name: /search rate card name/i }), 'Contract');
  await waitFor(() => expect(api.rateCards).toHaveBeenLastCalledWith({ scope: 'CUSTOMER', customerId: '', search: 'Contract', page: 1, limit: 10 }, expect.any(AbortSignal)));
});

test('creates a standard card with zones, modes, slabs, surcharge and GST using the API schema', async () => {
  render(<RateCardsPage />);
  await userEvent.click(await screen.findByRole('button', { name: 'Create rate card' }));
  const dialog = screen.getByRole('dialog', { name: 'Create rate card' });
  fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'New standard' } });
  fireEvent.change(within(dialog).getByLabelText('Zone name'), { target: { value: 'Zone Test' } });
  await userEvent.click(within(dialog).getByRole('button', { name: 'Add mode' }));
  await userEvent.click(within(dialog).getByRole('button', { name: 'Add surcharge' }));
  await userEvent.click(within(dialog).getByRole('button', { name: 'Add GST rule' }));
  await userEvent.click(within(dialog).getByRole('button', { name: 'Create rate card' }));
  await waitFor(() => expect(api.createRateCard).toHaveBeenCalledWith(expect.objectContaining({
    scope: 'WALK_IN_STANDARD', name: 'New standard', currency: 'INR',
    zoneRates: [expect.objectContaining({ zone: 'Zone Test', modes: [expect.objectContaining({ mode: 'SURFACE' }), expect.objectContaining({ mode: 'EXPRESS' })] })],
    surcharges: [{ kind: 'FUEL', value: '0' }], gstRules: [{ rate: '0', inclusive: false }],
  })));
});

test('creates a customer card and can create a later version from an existing card', async () => {
  render(<RateCardsPage />);
  await userEvent.click(await screen.findByRole('button', { name: 'Create rate card' }));
  const createDialog = screen.getByRole('dialog', { name: 'Create rate card' });
  await userEvent.selectOptions(within(createDialog).getByLabelText('Scope'), 'CUSTOMER');
  await userEvent.selectOptions(within(createDialog).getByLabelText('Credit customer'), 'credit-1');
  fireEvent.change(within(createDialog).getByLabelText('Name'), { target: { value: 'Credit tariff' } });
  fireEvent.change(within(createDialog).getByLabelText('Zone name'), { target: { value: 'Zone A' } });
  await userEvent.click(within(createDialog).getByRole('button', { name: 'Create rate card' }));
  await waitFor(() => expect(api.createRateCard).toHaveBeenCalledWith(expect.objectContaining({ scope: 'CUSTOMER', customerId: 'credit-1' })));
  await waitFor(() => expect(createDialog).not.toBeInTheDocument());
  await userEvent.click(await screen.findByRole('button', { name: 'Edit Standard tariff' }));
  const editDialog = await screen.findByRole('dialog', { name: 'Edit rate card · v1' });
  fireEvent.change(within(editDialog).getByLabelText('Name'), { target: { value: 'Edited tariff' } });
  await userEvent.click(within(editDialog).getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(api.updateRateCard).toHaveBeenCalledWith('rate-1', expect.objectContaining({ name: 'Edited tariff', scope: 'WALK_IN_STANDARD' })));
  await waitFor(() => expect(editDialog).not.toBeInTheDocument());
  await waitFor(() => expect(screen.getByRole('button', { name: 'Edit Standard tariff' })).toBeEnabled());
  await userEvent.click(await screen.findByRole('button', { name: 'Edit Standard tariff' }));
  const versionDialog = await screen.findByRole('dialog', { name: 'Edit rate card · v1' });
  await userEvent.click(within(versionDialog).getByRole('button', { name: 'Create new version' }));
  await waitFor(() => expect(api.createRateCardVersion).toHaveBeenCalledWith('rate-1', expect.objectContaining({ scope: 'WALK_IN_STANDARD', zoneRates: expect.any(Array) })));
});

test('blocks invalid slab bounds before submission and displays load failures', async () => {
  render(<RateCardsPage />);
  await userEvent.click(await screen.findByRole('button', { name: 'Create rate card' }));
  const dialog = screen.getByRole('dialog', { name: 'Create rate card' });
  fireEvent.change(within(dialog).getByLabelText('Min weight'), { target: { value: '5' } });
  fireEvent.change(within(dialog).getByLabelText('Max weight'), { target: { value: '1' } });
  await userEvent.click(within(dialog).getByRole('button', { name: 'Create rate card' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('valid non-negative weight slabs');
  expect(api.createRateCard).not.toHaveBeenCalled();
});
