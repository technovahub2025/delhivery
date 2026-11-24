import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Topbar from './Topbar';
import { api } from '../../services/api';

jest.mock('../../services/api', () => ({ api: { operationalSearch: jest.fn() } }));

test('submits operational search and navigates selected typed result', async () => {
  api.operationalSearch.mockResolvedValue({ success: true, data: { items: [{ id: 'c1', type: 'CUSTOMER', label: 'Example Buyer', detail: '9000000000', target: 'customers' }], total: 1, page: 1, limit: 30, totalPages: 1 } });
  const onSearchResult = jest.fn();
  render(<Topbar title="Overview" user="Test user" onMenu={jest.fn()} onSearchResult={onSearchResult} onHelp={jest.fn()} onLogout={jest.fn()} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Operational search' }), { target: { value: 'example' } });
  fireEvent.submit(screen.getByRole('textbox', { name: 'Operational search' }).closest('form'));
  expect(await screen.findByText('Example Buyer')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Example Buyer/ }));
  expect(onSearchResult).toHaveBeenCalledWith(expect.objectContaining({ type: 'CUSTOMER', target: 'customers' }), 'example');
});

test('shows clear empty and error states', async () => {
  api.operationalSearch.mockResolvedValueOnce({ success: true, data: { items: [], total: 0, page: 1, limit: 30, totalPages: 0 } });
  render(<Topbar title="Overview" user="Test user" onMenu={jest.fn()} onSearchResult={jest.fn()} onHelp={jest.fn()} onLogout={jest.fn()} />);
  const input = screen.getByRole('textbox', { name: 'Operational search' });
  fireEvent.change(input, { target: { value: 'unknown-result' } });
  fireEvent.submit(input.closest('form'));
  expect(await screen.findByText('No matching records.')).toBeInTheDocument();
  api.operationalSearch.mockRejectedValueOnce(new Error('Search unavailable.'));
  fireEvent.submit(input.closest('form'));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Search unavailable.'));
});
