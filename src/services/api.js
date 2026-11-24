export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  new URL('/api', window.location.origin).href
).replace(/\/$/, '');
let token = null;
export function setAuthToken(value) {
  token = value;
}

function message(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(message).filter(Boolean).join('; ');
  if (value && typeof value === 'object')
    return message(
      value.message ||
        value.remark ||
        value.remarks ||
        value.rmk ||
        value.error ||
        value.errors ||
        value.packages
    );
  return '';
}

export function assertProviderSuccess(value) {
  if (!value || typeof value !== 'object') return;
  if (
    value.success === false ||
    value.status === false ||
    (value.error && value.error !== 'false') ||
    /^(error|fail|failed|failure)$/i.test(value.status || '') ||
    (value.errors && Object.keys(value.errors).length)
  ) {
    throw Object.assign(
      new Error(message(value) || 'The shipping service could not complete this request.'),
      { details: value }
    );
  }
  if (Array.isArray(value)) value.forEach(assertProviderSuccess);
  else {
    if (value.data) assertProviderSuccess(value.data);
    if (value.packages) assertProviderSuccess(value.packages);
  }
}

export async function apiRequest(path, { method = 'GET', query, body, signal } = {}) {
  const params = new URLSearchParams(
    Object.entries(query || {}).filter(([, v]) => v !== undefined && v !== '')
  );
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(() => controller.abort(), 35000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}${params.toString() ? `?${params}` : ''}`, {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    let result;
    try {
      result = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(
        `The backend returned an invalid response (${response.status}). Check the API URL.`
      );
    }
    if (!response.ok)
      throw Object.assign(new Error(message(result) || `Request failed (${response.status}).`), {
        details: result,
      });
    if (result === null) throw new Error('The backend returned an empty response.');
    assertProviderSuccess(result);
    return result;
  } catch (error) {
    if (signal?.aborted) throw error;
    let failure = error;
    if (error.name === 'AbortError')
      failure = new Error('The request timed out. Check its status before submitting again.');
    else if (error instanceof TypeError)
      failure = new Error(
        'Cannot reach the backend. Check that it is running and the API URL is correct.'
      );
    throw failure;
  } finally {
    signal?.removeEventListener('abort', abort);
    clearTimeout(timeout);
  }
}

export async function apiDownload(path, { query, signal } = {}) {
  const params = new URLSearchParams(Object.entries(query || {}).filter(([, value]) => value !== undefined && value !== ''));
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(() => controller.abort(), 35000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}${params.toString() ? `?${params}` : ''}`, {
      signal: controller.signal,
      headers: { Accept: 'application/octet-stream, application/pdf', ...(token && { Authorization: `Bearer ${token}` }) },
    });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw Object.assign(new Error(message(result) || `Request failed (${response.status}).`), { details: result });
    }
    const filename = response.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/i)?.[1] || 'profitability-report';
    return { blob: await response.blob(), filename };
  } catch (error) {
    if (signal?.aborted) throw error;
    const failure = error.name === 'AbortError' ? new Error('The export request timed out.') : error instanceof TypeError ? new Error('Cannot reach the backend. Check that it is running and the API URL is correct.') : error;
    throw failure;
  } finally {
    signal?.removeEventListener('abort', abort);
    clearTimeout(timeout);
  }
}

const post = (path, body) => apiRequest(path, { method: 'POST', body });
const get = (path, query) => apiRequest(`/delhivery/${path}`, { query });
export const api = {
  rbacPolicy: () => apiRequest('/admin/rbac/policy'),
  saveRbacPolicy: (roles, reason, revision) => apiRequest('/admin/rbac/policy', { method: 'PUT', body: { roles, reason, revision } }),
  rbacUserRole: (id) => apiRequest('/admin/rbac/users/' + encodeURIComponent(id) + '/role'),
  assignRbacUserRole: (id, role, reason) => apiRequest('/admin/rbac/users/' + encodeURIComponent(id) + '/role', { method: 'PATCH', body: { role, reason } }),
  operationalSearch: (query, signal) => apiRequest('/search', { query, signal }),
  directBookingConfiguration: (signal) => apiRequest('/config/direct-booking', { signal }),
  shipments: (query, signal) => apiRequest('/delhivery/shipments', { query, signal }),
  lookupOriginalShipment: (waybill) => apiRequest('/delhivery/shipments/lookup', { query: { waybill } }),
  login: (body) => post('/auth/login', body),
  register: (body) => post('/auth/register', body),
  pincode: (pincode, heavy) => get(heavy ? 'pincode/heavy' : 'pincode', { pincode }),
  estimate: (query) => get('expected-tat', query),
  cost: (query) => get('shipping-cost', query),
  waybills: (count, requestId) => post('/delhivery/waybills', { count, requestId }),
  waybillAllocation: (requestId) => get('waybills/allocations/' + encodeURIComponent(requestId)),
  integrationAuditEvents: (query, signal) => apiRequest('/audit/integrations', { query, signal }),
  auditEvents: (query, signal) => apiRequest('/audit', { query, signal }),
  webhookEvents: (query, signal) => apiRequest('/delhivery/webhook/events', { query, signal }),
  // Backend tracking lookup is mounted at /api/delhivery/track.
  track: (query) => get('track', query),
  trackingHistory: (shipmentId, signal) => apiRequest('/delhivery/shipments/' + encodeURIComponent(shipmentId) + '/tracking', { signal }),
  syncShipmentTracking: (shipmentId) => post('/delhivery/shipments/' + encodeURIComponent(shipmentId) + '/tracking/sync', {}),
  actionRequired: () => get('dashboard/action-required'),
  dashboardOverview: (query, signal) => apiRequest('/delhivery/dashboard/overview', { query, signal }),
  label: (waybill) => get('shipping-label', { waybill, pdf: true }),
  documents: (waybill) => get('documents', { waybill }),
  createShipment: (body) => post('/delhivery/shipments', body),
  shipmentDrafts: (signal, query) => apiRequest('/delhivery/shipments/drafts', { signal, query }),
  shipmentDraft: (id, signal) => apiRequest('/delhivery/shipments/drafts/' + encodeURIComponent(id), { signal }),
  createShipmentDraft: (body) => apiRequest('/delhivery/shipments/drafts', { method: 'POST', body }),
  updateShipmentDraft: (id, body) => apiRequest('/delhivery/shipments/drafts/' + encodeURIComponent(id), { method: 'PATCH', body }),
  requestDraftCourierQuotes: (id, source) => post('/delhivery/shipments/drafts/' + encodeURIComponent(id) + '/quotes', { compareModes: true, ...(source && { source }) }),
  selectDraftCourierQuote: (id, quoteId) => post('/delhivery/shipments/drafts/' + encodeURIComponent(id) + '/quotes/' + encodeURIComponent(quoteId) + '/select', {}),
  bookDraftShipment: (id) => post('/delhivery/shipments/drafts/' + encodeURIComponent(id) + '/book', {}),
  draftBookingStatus: (id) => apiRequest('/delhivery/shipments/drafts/' + encodeURIComponent(id) + '/booking-status'),
  reconcileDraftBooking: (id) => post('/delhivery/shipments/drafts/' + encodeURIComponent(id) + '/reconcile', {}),
  ndrCases: () => get('ndr/cases'),
  ndrDashboardShipments: (query, signal) => apiRequest('/delhivery/ndr/dashboard-cases', { query, signal }),
  processNdrCases: () => post('/delhivery/ndr/cases/process', {}),
  ndrCase: (id, signal) => apiRequest('/delhivery/ndr/cases/' + encodeURIComponent(id), { signal }),
  ndrCaseAction: (id, body) => post('/delhivery/ndr/cases/' + encodeURIComponent(id) + '/actions', body),
  ndrUpdate: (body) => post('/delhivery/ndr/update', body),
  ndrStatus: (uplId) => get(`ndr/status/${encodeURIComponent(uplId)}`),
  rtoCases: (signal) => apiRequest('/delhivery/rto/cases', { signal }),
  rtoDashboardCases: (query, signal) => apiRequest('/delhivery/rto/dashboard-cases', { query, signal }),
  processRtoCases: () => post('/delhivery/rto/cases/process', {}),
  rtoCase: (id, signal) => apiRequest('/delhivery/rto/cases/' + encodeURIComponent(id), { signal }),
  syncRtoCase: (id) => post('/delhivery/rto/cases/' + encodeURIComponent(id) + '/sync', {}),
  linkRtoReturnShipment: (id, waybill) => post('/delhivery/rto/cases/' + encodeURIComponent(id) + '/return-shipment', { waybill }),
  reverseOrders: () => get('reverse-orders'),
  createReverseOrder: (body) => post('/delhivery/reverse-orders', body),
  updateShipment: (body) => post('/delhivery/shipments/update', body),
  cancelShipment: (waybill) => post('/delhivery/shipments/cancel', { waybill }),
  updateEwaybill: (body) => post('/delhivery/shipments/ewaybill', body),
  pickups: (signal) => apiRequest('/delhivery/pickups', { signal }),
  pickup: (body) => post('/delhivery/pickups', body),
  pickupRequests: (signal) => apiRequest('/delhivery/pickup-requests', { signal }),
  createPickupRequest: (body) => post('/delhivery/pickup-requests', body),
  pickupRequest: (id, signal) => apiRequest('/delhivery/pickup-requests/' + encodeURIComponent(id), { signal }),
  updatePickupRequest: (id, body) => apiRequest('/delhivery/pickup-requests/' + encodeURIComponent(id), { method: 'PATCH', body }),
  submitPickupRequest: (id) => post('/delhivery/pickup-requests/' + encodeURIComponent(id) + '/submit', {}),
  recoverPickupRequest: (id, reason) => post('/delhivery/pickup-requests/' + encodeURIComponent(id) + '/recover', { reason }),
  cancelFailedPickupRequest: (id, reason) => post('/delhivery/pickup-requests/' + encodeURIComponent(id) + '/cancel-failed', { reason }),
  pickupDiagnostic: (id) => apiRequest('/admin/pickup-diagnostics/' + encodeURIComponent(id)),
  cancelPickupRequest: (id) => post('/delhivery/pickup-requests/' + encodeURIComponent(id) + '/cancel', {}),
  updatePickupStatus: (id, status) => post('/delhivery/pickup-requests/' + encodeURIComponent(id) + '/status', { status }),
  syncPickupStatus: (id) => post('/delhivery/pickup-requests/' + encodeURIComponent(id) + '/sync', {}),
  deletePickupRequest: (id) => apiRequest('/delhivery/pickup-requests/' + encodeURIComponent(id), { method: 'DELETE' }),
  getWarehouses: (signal) => apiRequest('/delhivery/warehouses', { signal }),
  createWarehouse: (body) => post('/delhivery/warehouses', body),
  updateWarehouse: (body) => post('/delhivery/warehouses/update', body),
  reports: () => apiRequest("/reports"),
  customers: (query, signal) => apiRequest('/customers', { query, signal }),
  products: (query, signal) => apiRequest('/products', { query, signal }),
  createProduct: (body) => apiRequest('/products', { method: 'POST', body }),
  customer: (id, signal) => apiRequest('/customers/' + encodeURIComponent(id), { signal }),
  createCustomer: (body) => apiRequest('/customers', { method: 'POST', body }),
  updateCustomer: (id, body) => apiRequest('/customers/' + encodeURIComponent(id), { method: 'PATCH', body }),
  partyAddresses: (query, signal) => apiRequest('/party-addresses', { query, signal }),
  partyAddress: (id, signal) => apiRequest('/party-addresses/' + encodeURIComponent(id), { signal }),
  createPartyAddress: (body) => apiRequest('/party-addresses', { method: 'POST', body }),
  updatePartyAddress: (id, body) => apiRequest('/party-addresses/' + encodeURIComponent(id), { method: 'PATCH', body }),
  rateCards: (query, signal) => apiRequest('/rate-cards', { query, signal }),
  rateCard: (id, signal) => apiRequest('/rate-cards/' + encodeURIComponent(id), { signal }),
  createRateCard: (body) => apiRequest('/rate-cards', { method: 'POST', body }),
  updateRateCard: (id, body) => apiRequest('/rate-cards/' + encodeURIComponent(id), { method: 'PATCH', body }),
  createRateCardVersion: (id, body) => apiRequest('/rate-cards/' + encodeURIComponent(id) + '/versions', { method: 'POST', body }),
  pricingPreview: (body, signal) => apiRequest('/rate-cards/pricing-preview', { method: 'POST', body, signal }),
  createReport: (body) => apiRequest("/reports", { method: "POST", body }),
  updateReport: (id, body) => apiRequest(`/reports/${encodeURIComponent(id)}`, { method: "PATCH", body }),
  deleteReport: (id) => apiRequest(`/reports/${encodeURIComponent(id)}`, { method: "DELETE" }),
  creditBillingCustomers: (signal) => apiRequest('/billing/credit-customers', { signal }),
  creditBillingEligibleShipments: (query, signal) => apiRequest('/billing/eligible-shipments', { query, signal }),
  creditInvoices: (query, signal) => apiRequest('/billing/invoices', { query, signal }),
  creditInvoice: (id, signal) => apiRequest('/billing/invoices/' + encodeURIComponent(id), { signal }),
  adjustCreditInvoice: (id, body) => post('/billing/invoices/' + encodeURIComponent(id) + '/adjustments', body),
  demoWalkInPayments: (signal) => apiRequest('/billing/walk-in-payments', { signal }),
  recordManualWalkInReceipt: (id, method, reference) => post('/billing/walk-in-payments/' + encodeURIComponent(id), { source: 'MANUAL', method, reference }),
  recordDemoWalkInPayment: (id, method) => post('/billing/walk-in-payments/' + encodeURIComponent(id), { method }),
  generateCreditInvoice: (body) => apiRequest('/billing/invoices', { method: 'POST', body }),
  paymentInvoices: (query, signal) => apiRequest('/billing/payment-invoices', { query, signal }),
  customerOutstanding: (customerId, signal) => apiRequest('/billing/customers/' + encodeURIComponent(customerId) + '/outstanding', { signal }),
  customerPayments: (query, signal) => apiRequest('/billing/payments', { query, signal }),
  customerPayment: (id, signal) => apiRequest('/billing/payments/' + encodeURIComponent(id), { signal }),
  recordCustomerPayment: (body) => apiRequest('/billing/payments', { method: 'POST', body }),
  partnerCosts: (query, signal) => apiRequest('/delhivery/partner-costs', { query, signal }),
  partnerCost: (shipmentId, signal) => apiRequest('/delhivery/partner-costs/' + encodeURIComponent(shipmentId), { signal }),
  recordFinalPartnerCost: (shipmentId, body) => apiRequest('/delhivery/partner-costs/' + encodeURIComponent(shipmentId) + '/final', { method: 'POST', body }),
  profitabilityReport: (query, signal) => apiRequest('/finance/profitability', { query, signal }),
  profitabilityExport: (format, query, signal) => apiDownload(`/finance/profitability/export.${format}`, { query, signal }),
};
export const unwrap = (result) => result.data ?? result;

export function shipmentPayload(data) {
  return {
    shipments: [
      {
        name: data.customer,
        add: data.address,
        pin: data.pincode,
        city: data.destination,
        state: data.state,
        country: 'India',
        phone: data.phone,
        email: data.email,
        order: data.reference,
        payment_mode: data.payment,
        total_amount: String(data.value),
        cod_amount: data.payment === 'COD' ? String(data.value) : '0',
        products_desc: data.description,
        quantity: String(data.quantity),
        weight: String(Math.round(Number(data.weight) * 1000)),
        shipment_length: data.length,
        shipment_width: data.width,
        shipment_height: data.height,
        shipping_mode: data.mode,
      },
    ],
    pickup_location: { warehouseId: data.warehouseId },
    ...(data.bookingCustomerId && { pricingInput: { customerId: data.bookingCustomerId, zone: data.destinationZone, chargeableWeight: Number(data.chargeableWeightKg) } }),
  };
}

export function parseWaybills(result) {
  let value = unwrap(result);
  if (value && typeof value === 'object' && !Array.isArray(value))
    value = value.waybills || value.waybill;
  if (typeof value === 'string') value = value.split(/[,\s]+/);
  if (!Array.isArray(value) || !value.length || !value.every((v) => /^\d+$/.test(String(v)))) {
    throw new Error(
      'The service returned no recognizable waybills. Check the allocation before trying again.'
    );
  }
  return [...new Set(value.map(String))];
}







