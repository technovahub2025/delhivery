import { fireEvent, render, screen } from '@testing-library/react';
import BusinessAuditPage from './BusinessAuditPage';
import { api } from '../../services/api';

afterEach(() => jest.restoreAllMocks());

test('retries and pages through stored audit records', async () => {
  const audit = jest.spyOn(api, 'auditEvents')
    .mockRejectedValueOnce(new Error('Audit unavailable'))
    .mockResolvedValueOnce({ data: { events: [{ id: '1', action: 'customer.updated', entityType: 'CUSTOMER', actorId: 'staff', outcome: 'SUCCEEDED', statusCode: 200, changedFields: ['displayName'] }], hasMore: true } })
    .mockResolvedValueOnce({ data: { events: [], hasMore: false } });
  render(<BusinessAuditPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Audit unavailable');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('customer.updated')).toBeInTheDocument();
  expect(screen.getByText('displayName')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(await screen.findByText('No audit entries found')).toBeInTheDocument();
  expect(audit.mock.calls[2][0]).toEqual({ page: 2 });
});

test('loads the carrier request history from its owner-scoped endpoint', async () => {
  jest.spyOn(api, 'auditEvents').mockResolvedValue({ data: { events: [], hasMore: false } });
  jest.spyOn(api, 'integrationAuditEvents').mockResolvedValue({ data: { events: [
    { id: 'event-1', method: 'GET', operationPath: '/c/api/pin-codes/json/', outcome: 'RESPONSE', statusCode: 200, durationMs: 14 },
  ], hasMore: false } });
  render(<BusinessAuditPage />);
  await screen.findByText('No audit entries found');
  fireEvent.click(screen.getByRole('button', { name: 'Carrier requests' }));
  expect(await screen.findByText('GET /c/api/pin-codes/json/')).toBeInTheDocument();
  expect(screen.getByText('14 ms')).toBeInTheDocument();
});
