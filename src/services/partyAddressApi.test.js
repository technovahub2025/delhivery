import { api, setAuthToken } from './api';

const response = (body, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) });

beforeEach(() => {
  setAuthToken('party-address-test-jwt');
  global.fetch = jest.fn().mockResolvedValue(response({ success: true, data: { partyAddresses: [], total: 0, page: 1, limit: 10 } }));
});
afterEach(() => { setAuthToken(null); delete global.fetch; });

test('party address list sends filters to the authenticated endpoint', async () => {
  await api.partyAddresses({ partyType: 'PICKUP', customerId: 'customer-1', search: 'A & B', page: 2, limit: 10 });
  const [url, options] = fetch.mock.calls[0];
  expect(url).toContain('/api/party-addresses?partyType=PICKUP&customerId=customer-1&search=A+%26+B&page=2&limit=10');
  expect(options.method).toBe('GET');
  expect(options.headers.Authorization).toBe('Bearer party-address-test-jwt');
});

test('party address detail uses the encoded by-ID endpoint', async () => {
  const controller = new AbortController();
  await api.partyAddress('id/with space', controller.signal);
  const [url, options] = fetch.mock.calls[0];
  expect(url).toContain('/api/party-addresses/id%2Fwith%20space');
  expect(options.method).toBe('GET');
  expect(options.signal).toBeInstanceOf(AbortSignal);
});

test('party address create and update use JSON POST and PATCH endpoints', async () => {
  const payload = { partyType: 'SHIPPER', customerId: null, contactName: 'A contact' };
  await api.createPartyAddress(payload);
  expect(fetch.mock.calls[0][0]).toMatch(/\/api\/party-addresses$/);
  expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify(payload) });
  await api.updatePartyAddress('address-1', payload);
  expect(fetch.mock.calls[1][0]).toMatch(/\/api\/party-addresses\/address-1$/);
  expect(fetch.mock.calls[1][1]).toMatchObject({ method: 'PATCH', body: JSON.stringify(payload) });
  expect(fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer party-address-test-jwt');
});

test('party address API exposes backend validation errors', async () => {
  fetch.mockResolvedValueOnce(response({ success: false, message: 'Enter a valid six-digit Indian pincode.' }, 400));
  await expect(api.createPartyAddress({ partyType: 'PICKUP', pincode: 'bad' })).rejects.toThrow('Enter a valid six-digit Indian pincode.');
  expect(window.alert).not.toHaveBeenCalled();
});
