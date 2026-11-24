import { api, setAuthToken } from './api';

const response = (body, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) });

beforeEach(() => {
  setAuthToken('customer-test-jwt');
  global.fetch = jest.fn().mockResolvedValue(response({ success: true, data: { customers: [], total: 0, page: 1, limit: 10 } }));
});
afterEach(() => { setAuthToken(null); delete global.fetch; });

test('customer list uses the authenticated customers endpoint and encoded filters', async () => {
  await api.customers({ search: 'A & B', category: 'CREDIT', page: 2, limit: 10 });
  const [url, options] = fetch.mock.calls[0];
  expect(url).toContain('/api/customers?search=A+%26+B&category=CREDIT&page=2&limit=10');
  expect(options.method).toBe('GET');
  expect(options.headers.Authorization).toBe('Bearer customer-test-jwt');
});

test('customer create and update use the expected JSON endpoints and methods', async () => {
  const payload = { category: 'WALK_IN', displayName: 'Walk-in' };
  await api.createCustomer(payload);
  expect(fetch.mock.calls[0][0]).toMatch(/\/api\/customers$/);
  expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify(payload) });
  await api.updateCustomer('a/b', payload);
  expect(fetch.mock.calls[1][0]).toMatch(/\/api\/customers\/a%2Fb$/);
  expect(fetch.mock.calls[1][1]).toMatchObject({ method: 'PATCH', body: JSON.stringify(payload) });
});

test('customer API surfaces backend validation and service messages', async () => {
  fetch.mockResolvedValueOnce(response({ success: false, message: 'Contact phone is invalid.' }, 400));
  await expect(api.createCustomer({ category: 'CREDIT' })).rejects.toThrow('Contact phone is invalid.');
  expect(window.alert).not.toHaveBeenCalled();
});
