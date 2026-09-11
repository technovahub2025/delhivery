export const API_BASE_URL = (
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api'
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
    throw new Error(message(value) || 'The shipping service could not complete this request.');
  }
  if (Array.isArray(value)) value.forEach(assertProviderSuccess);
  else {
    if (value.data) assertProviderSuccess(value.data);
    if (value.packages) assertProviderSuccess(value.packages);
  }
}

export async function apiRequest(path, { method = 'GET', query, body } = {}) {
  const params = new URLSearchParams(
    Object.entries(query || {}).filter(([, v]) => v !== undefined && v !== '')
  );
  const controller = new AbortController();
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
    if (!response.ok) throw new Error(message(result) || `Request failed (${response.status}).`);
    if (result === null) throw new Error('The backend returned an empty response.');
    assertProviderSuccess(result);
    return result;
  } catch (error) {
    if (error.name === 'AbortError')
      throw new Error('The request timed out. Check its status before submitting again.');
    if (error instanceof TypeError)
      throw new Error(
        'Cannot reach the backend. Check that it is running and the API URL is correct.'
      );
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

const post = (path, body) => apiRequest(path, { method: 'POST', body });
const get = (path, query) => apiRequest(`/delhivery/${path}`, { query });
export const api = {
  login: (body) => post('/auth/login', body),
  register: (body) => post('/auth/register', body),
  pincode: (pincode, heavy) => get(heavy ? 'pincode/heavy' : 'pincode', { pincode }),
  estimate: (query) => get('expected-tat', query),
  cost: (query) => get('shipping-cost', query),
  waybills: (count) => get('waybills', { count }),
  track: (query) => get('shipments/track', query),
  label: (waybill) => get('shipping-label', { waybill, pdf: true }),
  documents: (waybill) => get('documents', { waybill }),
  createShipment: (body) => post('/delhivery/shipments', body),
  updateShipment: (body) => post('/delhivery/shipments/update', body),
  cancelShipment: (waybill) => post('/delhivery/shipments/cancel', { waybill }),
  updateEwaybill: (body) => post('/delhivery/shipments/ewaybill', body),
  pickup: (body) => post('/delhivery/pickups', body),
  createWarehouse: (body) => post('/delhivery/warehouses', body),
  updateWarehouse: (body) => post('/delhivery/warehouses/update', body),
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
    pickup_location: { name: data.warehouse },
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
