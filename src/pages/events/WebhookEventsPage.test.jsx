import { fireEvent, render, screen, within } from '@testing-library/react';
import WebhookEventsPage from './WebhookEventsPage';
import { api } from '../../services/api';

afterEach(() => jest.restoreAllMocks());

test('loads actual events and filters by waybill before opening event details', async () => {
  const scan = { id: 'archive-1', waybill: '1234567890', status: 'Manifested', location: 'Test hub', statusCode: 'X-UCI', occurredAt: '2026-10-10T11:00:00Z' };
  const request = jest.spyOn(api, 'webhookEvents').mockResolvedValue({ data: { events: [scan], hasMore: false } });
  render(<WebhookEventsPage />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading');
  await screen.findByText('Manifested');
  fireEvent.change(screen.getByRole('textbox', { name: 'Filter by waybill' }), { target: { value: scan.waybill } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  fireEvent.click(await screen.findByRole('button', { name: 'View event archive-1' }));
  expect(request).toHaveBeenLastCalledWith({ page: 1, waybill: scan.waybill }, expect.any(AbortSignal));
  expect(within(screen.getByRole('dialog')).getByText('X-UCI')).toBeInTheDocument();
});

test('distinguishes a fetch failure from an empty archive after retry', async () => {
  jest.spyOn(api, 'webhookEvents').mockRejectedValueOnce(new Error('Archive unavailable'))
    .mockResolvedValueOnce({ data: { events: [], hasMore: false } });
  render(<WebhookEventsPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Archive unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('No webhook events found')).toBeInTheDocument();
});
