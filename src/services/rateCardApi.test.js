import { api, setAuthToken } from './api';

const response = (body, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) });

beforeEach(() => {
  setAuthToken('rate-card-test-jwt');
  global.fetch = jest.fn().mockResolvedValue(response({ success: true, data: { rateCards: [] } }));
});
afterEach(() => { setAuthToken(null); delete global.fetch; });

test('rate card listing encodes supported scope, customer and search filters', async () => {
  await api.rateCards({ scope: 'CUSTOMER', customerId: 'a/b', search: 'Rate & Tax', page: 2, limit: 10 });
  const [url, options] = fetch.mock.calls[0];
  expect(url).toContain('/api/rate-cards?scope=CUSTOMER&customerId=a%2Fb&search=Rate+%26+Tax&page=2&limit=10');
  expect(options.headers.Authorization).toBe('Bearer rate-card-test-jwt');
});

test.each([
  ['createRateCard', undefined, 'POST', '/api/rate-cards'],
  ['updateRateCard', 'card/1', 'PATCH', '/api/rate-cards/card%2F1'],
  ['createRateCardVersion', 'card/1', 'POST', '/api/rate-cards/card%2F1/versions'],
])('%s uses the configured JSON route', async (method, id, verb, path) => {
  const body = { scope: 'WALK_IN_STANDARD', zoneRates: [] };
  await api[method](...(id === undefined ? [body] : [id, body]));
  const [url, options] = fetch.mock.calls[0];
  expect(url).toMatch(new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
  expect(options).toMatchObject({ method: verb, body: JSON.stringify(body), headers: { Authorization: 'Bearer rate-card-test-jwt', 'Content-Type': 'application/json' } });
});
