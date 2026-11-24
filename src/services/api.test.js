import {
  API_BASE_URL,
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

test('login posts credentials to the deployed backend', async () => {
  const credentials = { email: 'test@example.com', password: 'test-only' };
  await api.login(credentials);
  expect(fetch).toHaveBeenCalledWith(
    `${API_BASE_URL}/auth/login`,
    expect.objectContaining({ method: 'POST', body: JSON.stringify(credentials) })
  );
});

test('warehouse listing uses the authenticated backend GET endpoint', async () => {
  setAuthToken('test-session-token');
  await api.getWarehouses();
  expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/delhivery/warehouses`, expect.objectContaining({
    method: 'GET',
    headers: expect.objectContaining({ Authorization: 'Bearer test-session-token' }),
  }));
});

test('pickup operations use the additive owner-scoped pickup-request API', async () => {
  await api.pickupRequests();
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/delhivery/pickup-requests`, expect.objectContaining({ method: 'GET' }));
  const body = { pickupDate: '2030-05-12', pickupTime: '14:00', packageCount: 2, totalWeightKg: 3 };
  await api.createPickupRequest(body);
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/delhivery/pickup-requests`, expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }));
  await api.updatePickupRequest('pickup-id', body);
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/delhivery/pickup-requests/pickup-id`, expect.objectContaining({ method: 'PATCH', body: JSON.stringify(body) }));
  await api.cancelPickupRequest('pickup-id');
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/delhivery/pickup-requests/pickup-id/cancel`, expect.objectContaining({ method: 'POST' }));
});

test.each([
  ['standard coverage', () => api.pincode('110001', false), '/delhivery/pincode?pincode=110001'],
  ['heavy coverage', () => api.pincode('110001', true), '/delhivery/pincode/heavy?pincode=110001'],
  [
    'tracking waybill',
    () => api.track({ waybill: '123' }),
    '/delhivery/track?waybill=123',
  ],
  [
    'reference escaping',
    () => api.track({ ref_ids: 'A&B 1' }),
    '/delhivery/track?ref_ids=A%26B+1',
  ],
])('%s sends encoded GET query with no body', async (_, call, path) => {
  await call();
  expect(fetch).toHaveBeenCalledWith(
    `${API_BASE_URL}${path}`,
    expect.objectContaining({ method: 'GET' })
  );
  expect(fetch.mock.calls[0][1].body).toBeUndefined();
});

test('tracking history and explicit sync use owner-authenticated shipment routes', async () => {
  await api.trackingHistory('shipment/id');
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/delhivery/shipments/shipment%2Fid/tracking`, expect.objectContaining({ method: 'GET' }));
  await api.syncShipmentTracking('shipment/id');
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/delhivery/shipments/shipment%2Fid/tracking/sync`, expect.objectContaining({ method: 'POST', body: '{}' }));
});

test('NDR detail and action APIs use persistent case IDs', async () => {
  await api.ndrCase('case/id');
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/delhivery/ndr/cases/case%2Fid`, expect.objectContaining({ method: 'GET' }));
  await api.ndrCaseAction('case/id', { action: 'CUSTOMER_CONTACT', details: 'Dummy follow-up' });
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/delhivery/ndr/cases/case%2Fid/actions`, expect.objectContaining({ method: 'POST', body: JSON.stringify({ action: 'CUSTOMER_CONTACT', details: 'Dummy follow-up' }) }));
});

test('explicit NDR and RTO event processing uses authenticated POST routes', async () => {
  await api.processNdrCases();
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/delhivery/ndr/cases/process`, expect.objectContaining({ method: 'POST', body: '{}' }));
  await api.processRtoCases();
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/delhivery/rto/cases/process`, expect.objectContaining({ method: 'POST', body: '{}' }));
});

test('Credit Customer Billing uses the registered /api/billing endpoints', async () => {
  const query = { customerId: 'credit-customer-1', period: '2026-09' };
  await api.creditBillingCustomers();
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/billing/credit-customers`, expect.objectContaining({ method: 'GET' }));
  await api.creditBillingEligibleShipments(query);
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/billing/eligible-shipments?customerId=credit-customer-1&period=2026-09`, expect.objectContaining({ method: 'GET' }));
  await api.creditInvoices({ customerId: query.customerId });
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/billing/invoices?customerId=credit-customer-1`, expect.objectContaining({ method: 'GET' }));
  const invoiceBody = { ...query, invoiceNumber: 'DUMMY-INV-1', invoiceDate: '2026-10-01' };
  await api.generateCreditInvoice(invoiceBody);
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/billing/invoices`, expect.objectContaining({ method: 'POST', body: JSON.stringify(invoiceBody) }));
  await api.creditInvoice('invoice-1');
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/billing/invoices/invoice-1`, expect.objectContaining({ method: 'GET' }));
});

test('Payment Management API methods use authenticated owner-scoped billing endpoints', async () => {
  await api.paymentInvoices({ customerId: 'credit-customer-1' });
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/billing/payment-invoices?customerId=credit-customer-1`, expect.objectContaining({ method: 'GET' }));
  await api.customerOutstanding('credit-customer-1');
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/billing/customers/credit-customer-1/outstanding`, expect.objectContaining({ method: 'GET' }));
  await api.customerPayments({ customerId: 'credit-customer-1' });
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/billing/payments?customerId=credit-customer-1`, expect.objectContaining({ method: 'GET' }));
  const body = { customerId: 'credit-customer-1', amount: '20.00', currency: 'INR', receivedAt: '2026-11-14', idempotencyKey: 'test-key', allocations: [{ invoiceId: 'invoice-1', amount: '20.00' }] };
  await api.recordCustomerPayment(body);
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/billing/payments`, expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }));
  await api.customerPayment('payment-1');
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/billing/payments/payment-1`, expect.objectContaining({ method: 'GET' }));
});

test('partner cost client paths match the mounted backend routes', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ success: true, data: { costs: [] } }) });
  await api.partnerCosts({ partnerCode: 'MOCK', status: 'PENDING', from: '2026-09-01' });
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/delhivery/partner-costs?partnerCode=MOCK&status=PENDING&from=2026-09-01`, expect.objectContaining({ method: 'GET' }));
  await api.partnerCost('shipment/1');
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/delhivery/partner-costs/shipment%2F1`, expect.objectContaining({ method: 'GET' }));
  const body = { amount: '123.40', currency: 'INR', sourceReference: 'DUMMY-INV' };
  await api.recordFinalPartnerCost('shipment/1', body);
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/delhivery/partner-costs/shipment%2F1/final`, expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }));
});

test('profitability report client uses the authenticated finance report route', async () => {
  await api.profitabilityReport({ period: '2026-10', customerId: 'customer-1', partnerCode: 'MOCK' });
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/finance/profitability?period=2026-10&customerId=customer-1&partnerCode=MOCK`, expect.objectContaining({ method: 'GET' }));
});

test('profitability exports send the active filters with authentication and read binary files', async () => {
  const blob = new Blob(['mock report']);
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'attachment; filename="profitability-2026-10.xlsx"' }, blob: async () => blob });
  setAuthToken('test-session-token');
  const filters = { from: '2026-10-01', to: '2026-10-31', customerId: 'customer-1', partnerCode: 'MOCK', shipmentStatus: 'Delivered' };
  const result = await api.profitabilityExport('xlsx', filters);
  expect(result).toEqual({ blob, filename: 'profitability-2026-10.xlsx' });
  expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/finance/profitability/export.xlsx?from=2026-10-01&to=2026-10-31&customerId=customer-1&partnerCode=MOCK&shipmentStatus=Delivered`, expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-session-token' }) }));
});

test('credit billing API methods use the authenticated billing namespace', async () => {
  const query = { customerId: 'credit-customer-1', period: '2026-09' };
  await api.creditBillingCustomers();
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/billing/credit-customers`, expect.objectContaining({ method: 'GET' }));
  await api.creditBillingEligibleShipments(query);
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/billing/eligible-shipments?customerId=credit-customer-1&period=2026-09`, expect.objectContaining({ method: 'GET' }));
  await api.creditInvoices(query);
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/billing/invoices?customerId=credit-customer-1&period=2026-09`, expect.objectContaining({ method: 'GET' }));
  await api.generateCreditInvoice({ ...query, invoiceNumber: 'DUMMY-INV-1' });
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/billing/invoices`, expect.objectContaining({ method: 'POST', body: JSON.stringify({ ...query, invoiceNumber: 'DUMMY-INV-1' }) }));
  await api.creditInvoice('invoice-1');
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/billing/invoices/invoice-1`, expect.objectContaining({ method: 'GET' }));
});

test('RTO list, detail, sync and existing reverse-shipment link APIs use owner-scoped routes', async () => {
  await api.rtoCases();
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/delhivery/rto/cases`, expect.objectContaining({ method: 'GET' }));
  await api.rtoCase('rto/id');
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/delhivery/rto/cases/rto%2Fid`, expect.objectContaining({ method: 'GET' }));
  await api.syncRtoCase('rto/id');
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/delhivery/rto/cases/rto%2Fid/sync`, expect.objectContaining({ method: 'POST' }));
  await api.linkRtoReturnShipment('rto/id', 'MOCK-RETURN-A');
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/delhivery/rto/cases/rto%2Fid/return-shipment`, expect.objectContaining({ method: 'POST', body: JSON.stringify({ waybill: 'MOCK-RETURN-A' }) }));
});

test.each([
  ['updateShipment', { waybill: '123', name: 'Customer' }, '/delhivery/shipments/update'],
  ['updateEwaybill', { waybill: '123', ewbn: '123456789012' }, '/delhivery/shipments/ewaybill'],
  ['updateWarehouse', { name: 'Hub', pin: '110001' }, '/delhivery/warehouses/update'],
])('%s sends JSON to the correct route', async (method, body, path) => {
  await api[method](body);
  expect(fetch).toHaveBeenCalledWith(
    `${API_BASE_URL}${path}`,
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(body),
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    })
  );
});

test('draft operations use only the local draft persistence routes', async () => {
  const formData = { reference: 'DUMMY-DRAFT', boxes: [{ length: '10', width: '8', height: '4' }] };
  await api.createShipmentDraft({ formData });
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/delhivery/shipments/drafts`, expect.objectContaining({ method: 'POST', body: JSON.stringify({ formData }) }));
  await api.updateShipmentDraft('draft-1', { formData });
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/delhivery/shipments/drafts/draft-1`, expect.objectContaining({ method: 'PATCH' }));
  await api.shipmentDrafts();
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/delhivery/shipments/drafts`, expect.objectContaining({ method: 'GET' }));
  await api.shipmentDraft('draft-1');
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/delhivery/shipments/drafts/draft-1`, expect.objectContaining({ method: 'GET' }));
  await api.requestDraftCourierQuotes('draft-1');
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/delhivery/shipments/drafts/draft-1/quotes`, expect.objectContaining({ method: 'POST', body: JSON.stringify({ compareModes: true }) }));
  await api.selectDraftCourierQuote('draft-1', 'quote-1');
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/delhivery/shipments/drafts/draft-1/quotes/quote-1/select`, expect.objectContaining({ method: 'POST', body: '{}' }));
  await api.bookDraftShipment('draft-1');
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/delhivery/shipments/drafts/draft-1/book`, expect.objectContaining({ method: 'POST', body: '{}' }));
  await api.draftBookingStatus('draft-1');
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/delhivery/shipments/drafts/draft-1/booking-status`, expect.objectContaining({ method: 'GET' }));
});

test('customer pricing preview uses the authenticated rate-card route', async () => {
  const input = { customerId: 'customer-1', zone: 'TEST-ZONE', chargeableWeight: 1, paymentType: 'Prepaid', codAmount: 0 };
  await api.pricingPreview(input);
  expect(fetch).toHaveBeenLastCalledWith(`${API_BASE_URL}/rate-cards/pricing-preview`, expect.objectContaining({ method: 'POST', body: JSON.stringify(input) }));
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
  expect(window.alert).not.toHaveBeenCalled();
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
])('HTTP failures reject without blocking the page for %s', async (path) => {
  fetch.mockResolvedValueOnce(response({ message: 'Service unavailable' }, 503));
  await expect(apiRequest(path)).rejects.toThrow('Service unavailable');
  expect(window.alert).not.toHaveBeenCalled();
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
  expect(window.alert).not.toHaveBeenCalled();
  fetch.mockResolvedValueOnce({ ok: true, status: 200, text: async () => '' });
  await expect(apiRequest('/test')).rejects.toThrow('empty response');
  expect(window.alert).not.toHaveBeenCalled();
  fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  await expect(apiRequest('/test')).rejects.toThrow('Cannot reach the backend');
  expect(window.alert).not.toHaveBeenCalled();
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
  expect(window.alert).not.toHaveBeenCalled();
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
    warehouseId: 'eeeeeeeeeeeeeeeeeeeeeeee',
  });
  expect(payload.shipments[0]).toMatchObject({
    weight: '1250',
    cod_amount: '999',
    order: 'MY-ORDER',
  });
  expect(payload.pickup_location).toEqual({ warehouseId: 'eeeeeeeeeeeeeeeeeeeeeeee' });
});

test('shipment payload preserves sub-kilogram physical weight in grams and chargeable weight separately', () => {
  const payload = shipmentPayload({
    weight: '0.6',
    actualWeightKg: 0.5,
    volumetricWeightKg: 0.6,
    chargeableWeightKg: 0.6,
    value: '999',
    payment: 'Prepaid',
    reference: 'LIGHT-ORDER',
    bookingCustomerId: 'customer-1',
    destinationZone: 'Tamil Nadu',
    warehouseId: 'eeeeeeeeeeeeeeeeeeeeeeee',
  });
  expect(payload.shipments[0].weight).toBe('600');
  expect(payload.pricingInput).toEqual({ customerId: 'customer-1', zone: 'Tamil Nadu', chargeableWeight: 0.6 });
});
