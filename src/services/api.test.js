import {
  api,
  apiRequest,
  assertProviderSuccess,
  parseWaybills,
  setAuthToken,
  shipmentPayload,
} from './api';
const response = (value, status = 200) => ({
  ok: status < 400,
  status,
  text: async () => JSON.stringify(value),
});
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue(response({ success: true, data: {} }));
  setAuthToken(null);
});
afterEach(() => {
  delete global.fetch;
  setAuthToken(null);
  jest.useRealTimers();
});

test.each([
  ['standard coverage', () => api.pincode('110001', false), '/delhivery/pincode?pincode=110001'],
  ['heavy coverage', () => api.pincode('110001', true), '/delhivery/pincode/heavy?pincode=110001'],
  [
    'tracking waybill',
    () => api.track({ waybill: '123' }),
    '/delhivery/shipments/track?waybill=123',
  ],
  [
    'reference escaping',
    () => api.track({ ref_ids: 'A&B 1' }),
    '/delhivery/shipments/track?ref_ids=A%26B+1',
  ],
])('%s sends encoded GET query with no body', async (_, call, path) => {
  await call();
  expect(fetch).toHaveBeenCalledWith(
    'http://localhost:3000/api' + path,
    expect.objectContaining({ method: 'GET' })
  );
  expect(fetch.mock.calls[0][1].body).toBeUndefined();
});

test.each([
  ['updateShipment', { waybill: '123', name: 'Customer' }, '/delhivery/shipments/update'],
  ['updateEwaybill', { waybill: '123', ewbn: '123456789012' }, '/delhivery/shipments/ewaybill'],
  ['updateWarehouse', { name: 'Hub', pin: '110001' }, '/delhivery/warehouses/update'],
])('%s sends JSON to the correct route', async (method, body, path) => {
  await api[method](body);
  expect(fetch).toHaveBeenCalledWith(
    'http://localhost:3000/api' + path,
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(body),
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    })
  );
});

test.each([
  { success: false, message: 'Rejected' },
  { success: true, data: { success: false, message: 'Rejected' } },
  { success: true, data: { packages: [{ status: 'Fail', remarks: ['Rejected'] }] } },
  { success: true, data: { error: 'Rejected' } },
  { success: true, data: { status: false, remark: 'Rejected' } },
])('provider rejection is an error even with HTTP 200: %j', async (value) => {
  fetch.mockResolvedValueOnce(response(value));
  await expect(apiRequest('/test')).rejects.toThrow('Rejected');
  expect(window.alert).toHaveBeenCalledTimes(1);
  expect(window.alert).toHaveBeenCalledWith(
    'Sorry, we could not complete your request. Please try again later.'
  );
});

test.each([
  '/auth/login',
  '/auth/register',
  '/delhivery/shipments',
  '/delhivery/shipments/update',
  '/delhivery/shipments/cancel',
  '/delhivery/shipments/ewaybill',
  '/delhivery/shipments/track',
  '/delhivery/pickups',
  '/delhivery/warehouses',
  '/delhivery/warehouses/update',
  '/delhivery/pincode',
  '/delhivery/pincode/heavy',
  '/delhivery/expected-tat',
  '/delhivery/shipping-cost',
  '/delhivery/waybills',
  '/delhivery/shipping-label',
  '/delhivery/documents',
])('HTTP failures alert and still reject for %s', async (path) => {
  fetch.mockResolvedValueOnce(response({ message: 'Service unavailable' }, 503));
  await expect(apiRequest(path)).rejects.toThrow('Service unavailable');
  expect(window.alert).toHaveBeenCalledTimes(1);
  expect(window.alert).toHaveBeenCalledWith(
    'Sorry, we could not complete your request. Please try again later.'
  );
});

test('successful requests do not alert', async () => {
  await apiRequest('/test');
  expect(window.alert).not.toHaveBeenCalled();
});

test('requests cancelled by the caller do not alert', async () => {
  const controller = new AbortController();
  const aborted = Object.assign(new Error('Aborted'), { name: 'AbortError' });
  fetch.mockImplementationOnce(() => {
    controller.abort();
    return Promise.reject(aborted);
  });
  await expect(apiRequest('/test', { signal: controller.signal })).rejects.toBe(aborted);
  expect(window.alert).not.toHaveBeenCalled();
});

test('empty coverage is a result, not an error', () => {
  expect(() =>
    assertProviderSuccess({ success: true, serviceable: false, data: { delivery_codes: [] } })
  ).not.toThrow();
});

test('HTML, empty bodies and network failures have useful errors', async () => {
  fetch.mockResolvedValueOnce({ ok: true, status: 200, text: async () => '<html>frontend</html>' });
  await expect(apiRequest('/test')).rejects.toThrow('invalid response');
  expect(window.alert).toHaveBeenLastCalledWith(
    'Sorry, we could not complete your request. Please try again later.'
  );
  fetch.mockResolvedValueOnce({ ok: true, status: 200, text: async () => '' });
  await expect(apiRequest('/test')).rejects.toThrow('empty response');
  expect(window.alert).toHaveBeenLastCalledWith(
    'Sorry, we could not complete your request. Please try again later.'
  );
  fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  await expect(apiRequest('/test')).rejects.toThrow('Cannot reach the backend');
  expect(window.alert).toHaveBeenLastCalledWith(
    'Unable to connect right now. Please check your connection and try again later.'
  );
});

test('timeout ends the request without automatically retrying a mutation', async () => {
  jest.useFakeTimers();
  fetch.mockImplementationOnce(
    (_, options) =>
      new Promise((resolve, reject) =>
        options.signal.addEventListener('abort', () =>
          reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
        )
      )
  );
  const pending = expect(api.cancelShipment('123')).rejects.toThrow('Check its status');
  jest.advanceTimersByTime(35000);
  await pending;
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(window.alert).toHaveBeenCalledTimes(1);
  expect(window.alert).toHaveBeenCalledWith(
    'This is taking longer than usual. Please check the status before trying again.'
  );
});

test('logout clears the application JWT', async () => {
  setAuthToken('login-jwt');
  await api.track({ waybill: '123' });
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer login-jwt');
  setAuthToken(null);
  await api.track({ waybill: '123' });
  expect(fetch.mock.calls[1][1].headers.Authorization).toBeUndefined();
});

test('waybill parser accepts provider arrays or CSV without inventing identifiers', () => {
  expect(parseWaybills({ data: '123,456' })).toEqual(['123', '456']);
  expect(parseWaybills({ data: ['123', '456'] })).toEqual(['123', '456']);
  expect(() => parseWaybills({ data: { message: 'Unavailable' } })).toThrow(
    'no recognizable waybills'
  );
});

test('shipment COD and weight values are mapped without changing the order reference', () => {
  const payload = shipmentPayload({
    weight: '1.25',
    value: '999',
    payment: 'COD',
    reference: 'MY-ORDER',
    warehouse: 'Hub',
  });
  expect(payload.shipments[0]).toMatchObject({
    weight: '1250',
    cod_amount: '999',
    order: 'MY-ORDER',
  });
  expect(payload.pickup_location).toEqual({ name: 'Hub' });
});
