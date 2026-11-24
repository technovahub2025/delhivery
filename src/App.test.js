import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import App from './App';
import { API_BASE_URL, setAuthToken } from './services/api';
import { navGroups } from './config/navigation';
import { SESSION_KEY } from './services/session';

const reply = (data, status = 200) => ({
  ok: status < 400,
  status,
  text: async () => JSON.stringify(data),
});
const respond = (data) => fetch.mockResolvedValueOnce(reply(data));
const fill = (values) =>
  values.forEach(([label, value]) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
  );
const navigate = (name) => {
  const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
  let button = within(navigation).queryByRole('button', { name, exact: true });
  if (!button) {
    const parent = navGroups
      .flatMap(([, items]) => items)
      .find(([, , , children]) => children?.some(([, childLabel]) => childLabel === name));
    if (parent) {
      fireEvent.click(within(navigation).getByRole('button', { name: parent[1], exact: true }));
      button = within(navigation).getByRole('button', { name, exact: true });
    }
  }
  fireEvent.click(button);
};
const mainButton = (name) =>
  within(screen.getByRole('main')).getByRole('button', { name, exact: true });
const lastRequest = () => {
  const [url, options] = fetch.mock.calls.at(-1);
  return { url, ...options, body: options.body ? JSON.parse(options.body) : undefined };
};
let mockedWarehouses = [];

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  mockedWarehouses = [];
  window.scrollTo = jest.fn();
  global.fetch = jest.fn().mockImplementation((url, options = {}) => {
    if (url.endsWith('/delhivery/warehouses')) {
      if (options.method === 'POST') {
        const details = JSON.parse(options.body);
        const record = { _id: 'eeeeeeeeeeeeeeeeeeeeeeee', id: 'eeeeeeeeeeeeeeeeeeeeeeee', name: details.name, details, registrationStatus: 'REGISTERED' };
        mockedWarehouses = [record];
        return Promise.resolve(reply({ success: true, warehouse: record }, 201));
      }
      if (options.method === 'GET' || !options.method) return Promise.resolve(reply({ success: true, data: { warehouses: mockedWarehouses } }));
    }
    if (url.endsWith('/delhivery/warehouses/update')) {
      const details = JSON.parse(options.body);
      const record = { ...mockedWarehouses[0], details, registrationStatus: 'REGISTERED', updateStatus: 'SUCCEEDED' };
      mockedWarehouses = [record];
      return Promise.resolve(reply({ success: true, warehouse: record }));
    }
    if (url.includes('/config/direct-booking')) return Promise.resolve(reply({ directBookingEnabled: true }));
    if (url.includes('/delhivery/shipments?'))
      return Promise.resolve(
        reply({
          success: true,
          data: { shipments: [], total: 0, page: 1, limit: 100 },
        })
      );
    if (url.includes('/delhivery/pickup-requests'))
      return Promise.resolve(reply({ success: true, data: { pickups: [], total: 0 } }));
    if (url.includes('/delhivery/dashboard/overview'))
      return Promise.resolve(reply({ success: true, data: { metrics: { totalShipments: 0, pendingPickups: 0, inTransitShipments: 0, deliveredShipments: 0, ndrShipments: 0, unresolvedNdrCases: 0, rtoShipments: 0, activeRtoCases: null, failedExceptionShipments: 0 }, availability: { activeRtoCases: { available: false, reason: 'Lifecycle unavailable' } }, pickupSummary: { total: 0, byStatus: {} }, deliverySummary: { inTransit: 0, delivered: 0, failedOrException: 0, unclassified: 0 }, recentActivity: [] } }));
    if (url.includes('/delhivery/dashboard/action-required'))
      return Promise.resolve(reply({ success: true, data: { badAddresses: 0, badAddressesAvailable: true } }));
    if (url.includes('/delhivery/pincode?'))
      return Promise.resolve(reply({ success: true, data: { delivery_codes: [{ postal_code: { city: 'Mumbai', state: 'Maharashtra', pickup: 'Y', pre_paid: 'Y' } }] } }));
    if (url.includes('/delhivery/shipping-cost?'))
      return Promise.resolve(reply({ success: true, data: { total_amount: '100' } }));
    if (url.includes('/api/customers?'))
      return Promise.resolve(reply({ success: true, data: { customers: [], total: 0, page: 1, limit: 100 } }));
    if (url.includes('/api/party-addresses?'))
      return Promise.resolve(reply({ success: true, data: { partyAddresses: [], total: 0, page: 1, limit: 100 } }));
    return Promise.reject(new Error('Unexpected request'));
  });
  setAuthToken(null);
});
afterEach(() => {
  delete global.fetch;
  setAuthToken(null);
});
async function login(permissions = []) {
  const view = render(<App />);
  respond({
    success: true,
    token: 'test-jwt',
    user: { id: 'u1', name: 'Test User', email: 'test@example.com', permissions },
  });
  fill([
    ['Email address', 'test@example.com'],
    ['Password', 'password123'],
  ]);
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
  await screen.findByRole('heading', { name: /every delivery starts here/i });
  return view;
}
async function addWarehouse() {
  navigate('Warehouses');
  fireEvent.click(mainButton('Add warehouse'));
  fill([
    ['Warehouse name', 'Test Hub'],
    ['Contact name', 'Manager'],
    ['Phone number', '9876543210'],
    ['Full address', '24 Test Road'],
    ['Pincode', '110001'],
    ['Registered business name', 'Test Store'],
    ['Email address', 'hub@example.com'],
    ['City', 'Delhi'],
    ['State', 'Delhi'],
  ]);
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Add warehouse' })
  );
  await screen.findByRole('heading', { name: 'Test Hub' });
}

test('created and edited warehouses reload from MongoDB after refresh', async () => {
  const first = await login();
  await addWarehouse();
  fireEvent.click(screen.getByRole('button', { name: 'Edit warehouse' }));
  fill([['Full address', '99 Updated Road']]);
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  first.unmount();
  setAuthToken(null);
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Test Hub' })).toBeInTheDocument();
  expect(screen.getByText('99 Updated Road')).toBeInTheDocument();
  expect(screen.getByText('Registered business: Test Store')).toBeInTheDocument();
  navigate('Create shipment');
  expect(screen.getByRole('radio', { name: /Test Hub/ })).toBeInTheDocument();
});

test.each(navGroups.flatMap(([, items]) => items
  .filter(([, , , children]) => !children)
  .map(([id, label]) => [id, label])
))(
  'refresh restores the authenticated %s page',
  async (id, label) => {
    const first = await login(id === 'roleAdmin' ? ['users.read'] : []);
    navigate(label);
    first.unmount();
    setAuthToken(null);
    fetch.mockClear();
    render(<App />);
    expect(screen.queryByRole('button', { name: 'Log in' })).not.toBeInTheDocument();
    const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
    if (!within(navigation).queryByRole('button', { name: label, exact: true })) navigate(label);
    expect(within(navigation).getByRole('button', { name: label, exact: true })).toHaveAttribute(
      'aria-current',
      'page'
    );
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer test-jwt');
    expect(fetch.mock.calls.some(([url]) => url.includes('/auth/login'))).toBe(false);
  }
);

test('logout clears the saved session so refresh stays logged out', async () => {
  const first = await login();
  navigate('Warehouses');
  fireEvent.click(screen.getByRole('button', { name: 'Profile menu' }));
  fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
  expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  first.unmount();
  render(<App />);
  expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
});

test.each([
  '{broken',
  JSON.stringify({ token: 'token', user: null }),
  JSON.stringify({
    token: `header.${btoa(JSON.stringify({ exp: 1 }))}.signature`,
    user: { email: 'test@example.com' },
  }),
])('invalid or expired saved sessions return to login', (saved) => {
  sessionStorage.setItem(SESSION_KEY, saved);
  render(<App />);
  expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
  expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
});

test('account source errors show retry without false empty statistics', async () => {
  fetch.mockImplementation((url) => Promise.resolve(url.includes('/dashboard/overview')
    ? reply({ success: false, message: 'Account shipment source required' }, 503)
    : url.includes('/dashboard/action-required')
      ? reply({ success: true, data: { badAddresses: 0, badAddressesAvailable: true } })
      : reply({ success: false, message: 'Account shipment source required' }, 503)));
  await login();
  expect(await screen.findAllByText('Account shipment source required')).toHaveLength(2);
  expect(screen.queryByText('No shipments yet')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Total shipments/ })).not.toBeInTheDocument();
  expect(lastRequest()).toMatchObject({
    url: `${API_BASE_URL}/delhivery/shipments?page=1&limit=100`,
    headers: { Authorization: 'Bearer test-jwt' },
  });
  respond({ success: true, data: { shipments: [], total: 0, page: 1, limit: 100 } });
  fireEvent.click(screen.getByRole('button', { name: 'Retry shipment loading' }));
  await screen.findByText('No shipments yet');
});

test('fetched records populate statistics, activity and recent shipments', async () => {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  fetch.mockImplementation((url) =>
    url.includes('/dashboard/overview')
      ? Promise.resolve(reply({ success: true, data: { metrics: { totalShipments: 1, pendingPickups: 0, inTransitShipments: 0, deliveredShipments: 1, ndrShipments: 0, unresolvedNdrCases: 0, rtoShipments: 0, activeRtoCases: null, failedExceptionShipments: 0 }, availability: { activeRtoCases: { available: false, reason: 'Lifecycle unavailable' } }, pickupSummary: { total: 0, byStatus: {} }, deliverySummary: { inTransit: 0, delivered: 1, failedOrException: 0, unclassified: 0 }, recentActivity: [] } }))
      : Promise.resolve(
    Promise.resolve(
      reply({
        success: true,
        data: {
          shipments: [
            {
              id: 'TEST-AWB',
              customer: 'Test Recipient',
              date,
              status: 'Delivered',
              destination: 'Delhi',
            },
          ],
          total: 1,
          page: 1,
          limit: 100,
        },
      })
    )
  ));
  await login();
  await screen.findByText('TEST-AWB');
  expect(screen.getByRole('button', { name: /Total shipments: 1/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Delivered: 1/ })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: /This week shipments:/ })).toBeInTheDocument();
  expect(within(screen.getByRole('table')).getByText('Test Recipient')).toBeInTheDocument();
});

test('login uses backend credentials, rejects invalid login and clears token on logout', async () => {
  render(<App />);
  expect(screen.queryByRole('button', { name: /explore the demo/i })).not.toBeInTheDocument();
  fill([
    ['Email address', 'test@example.com'],
    ['Password', 'bad-password'],
  ]);
  fetch.mockResolvedValueOnce(reply({ success: false, message: 'Invalid credentials' }, 401));
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
  expect(lastRequest()).toMatchObject({
    method: 'POST',
    body: { email: 'test@example.com', password: 'bad-password' },
  });
  respond({
    success: true,
    token: 'test-jwt',
    user: { name: 'Test User', email: 'test@example.com' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
  await screen.findByText('No shipments yet');
  fireEvent.click(screen.getByRole('button', { name: 'Profile menu' }));
  fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
  expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
});

test('registration validates confirmation then posts only required account fields', async () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /create an account/i }));
  fill([
    ['Full name', 'Test User'],
    ['Email address', 'test@example.com'],
    ['Password', 'password123'],
    ['Confirm password', 'different'],
  ]);
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match');
  expect(fetch).not.toHaveBeenCalled();
  fill([['Confirm password', 'password123']]);
  respond({ success: true });
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  await screen.findByRole('button', { name: 'Log in' });
  expect(lastRequest()).toMatchObject({
    url: `${API_BASE_URL}/auth/register`,
    body: { name: 'Test User', email: 'test@example.com', password: 'password123' },
  });
});

test('all pages render after the automatic account shipment request', async () => {
  await login();
  for (const name of [
    'Forward Orders',
    'Create shipment',
    'Track shipment',
    'Pickup Requests',
    'Pincode serviceability',
    'Delivery estimate',
    'Shipping calculator',
    'Waybill management',
    'Labels & documents',
    'Warehouses',
    'Webhook events',
    'Overview',
  ])
    navigate(name);
  expect(screen.getByText('No shipment activity')).toBeInTheDocument();
  expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  navigate('Create shipment');
  expect(mainButton('Create shipment')).toBeDisabled();
});

test('shipping tools use GET query parameters and show nested provider failures', async () => {
  await login();
  navigate('Pincode serviceability');
  fireEvent.click(mainButton('Heavy shipment'));
  fill([['Destination pincode', '400001']]);
  respond({
    success: true,
    serviceable: true,
    data: { delivery_codes: [{ postal_code: { city: 'Mumbai' } }] },
  });
  fireEvent.click(mainButton('Check serviceability'));
  await screen.findByText('Mumbai');
  expect(lastRequest()).toMatchObject({
    url: `${API_BASE_URL}/delhivery/pincode/heavy?pincode=400001`,
    method: 'GET',
    headers: { Authorization: 'Bearer test-jwt' },
  });
  expect(lastRequest().body).toBeUndefined();
  navigate('Shipping calculator');
  fill([
    ['Pickup pincode', '110001'],
    ['Delivery pincode', '400001'],
    ['Weight (kg)', '0.5'],
  ]);
  respond({ success: false, message: 'Surface rate unavailable' });
  respond({ success: true, data: { total_amount: '125.00' } });
  respond({ success: true, data: { tat: 2 } });
  respond({ success: true, data: { tat: 3 } });
  fireEvent.click(mainButton('Calculate shipping'));
  expect(await screen.findByText(/125[.]00/)).toBeInTheDocument();
  expect(window.alert).not.toHaveBeenCalled();
  const costRequest = fetch.mock.calls.find(([url]) => url.includes('/delhivery/shipping-cost?'));
  const costUrl = new URL(costRequest[0]);
  expect(Object.fromEntries(costUrl.searchParams)).toEqual({
    ss: 'Delivered',
    o_pin: '110001',
    d_pin: '400001',
    cgm: '500',
    pt: 'Pre-paid',
    md: 'S',
  });
  navigate('Delivery estimate');
  fill([
    ['Origin pincode', '110001'],
    ['Destination pincode', '400001'],
    ['Transport mode', 'Surface'],
  ]);
  respond({ success: true, data: { expected_delivery_date: '2026-09-15' } });
  fireEvent.click(mainButton('Estimate delivery'));
  await screen.findByText('2026-09-15');
  expect(lastRequest().url).toContain('origin_pin=110001&destination_pin=400001&mot=S');
});

test('tracking uses references independently of local shipments', async () => {
  await login();
  navigate('Track shipment');
  fill([
    ['Search by', 'ref_ids'],
    ['Waybill or reference number', 'ORDER-1001'],
  ]);
  respond({
    success: true,
    data: { ShipmentData: [{ Shipment: { AWB: '123456789', Status: { Status: 'Delivered' } } }] },
  });
  fireEvent.click(mainButton('Track shipment'));
  await screen.findByText('Delivered');
  expect(lastRequest().url).toContain('/delhivery/track?ref_ids=ORDER-1001');
});

test('waybills are allocated only on submit and provider document links can be opened', async () => {
  await login();
  navigate('Waybill management');
  expect(fetch.mock.calls.some(([url]) => url.includes('/waybills'))).toBe(false);
  fill([['Number of waybills', '2']]);
  respond({ success: true, data: { state: 'CONFIRMED', waybills: ['123456789', '123456790'] } });
  fireEvent.click(mainButton('Generate waybills'));
  await screen.findByText('123456789');
  expect(lastRequest()).toMatchObject({ method: 'POST', body: { count: 2, requestId: expect.any(String) } });
  expect(lastRequest().url).toMatch(/\/waybills$/);
  fireEvent.click(screen.getByLabelText('Select all'));
  expect(mainButton('Copy selected (2)')).toBeEnabled();
  navigate('Labels & documents');
  fill([['Waybill', '123456789']]);
  respond({
    success: true,
    data: { packages: [{ pdf_download_link: 'https://example.com/label.pdf' }] },
  });
  fireEvent.click(mainButton('Get documents'));
  expect(await screen.findByRole('link', { name: 'Open document or link' })).toHaveAttribute(
    'href',
    'https://example.com/label.pdf'
  );
  expect(lastRequest().url).toContain('/shipping-label?waybill=123456789&pdf=true');
  fill([['Document type', 'documents']]);
  respond({ success: true, data: { url: 'https://example.com/invoice.pdf' } });
  fireEvent.click(mainButton('Get documents'));
  await waitFor(() =>
    expect(screen.getByRole('link', { name: 'Open document or link' })).toHaveAttribute(
      'href',
      'https://example.com/invoice.pdf'
    )
  );
  expect(lastRequest().url).toContain('/documents?waybill=123456789');
});

test('warehouse and shipment creation wait for acceptance; failed cancellation preserves state', async () => {
  await login();
  await addWarehouse();
  const warehouseRequest = fetch.mock.calls.find(([url, options]) => url.endsWith('/delhivery/warehouses') && options.method === 'POST');
  expect(JSON.parse(warehouseRequest[1].body)).toMatchObject({
    name: 'Test Hub',
    pin: '110001',
    return_city: 'Delhi',
    email: 'hub@example.com',
  });
  navigate('Create shipment');
  fill([
    ['Full name', 'Recipient'],
    ['Delivery pincode', '400001'],
    ['Full address', '12 Road'],
    ['Order reference', 'ORDER-1'],
  ]);
  fireEvent.change(screen.getAllByLabelText('Email address')[1], { target: { value: 'recipient@example.com' } });
  fireEvent.change(screen.getAllByLabelText('Mobile number')[1], { target: { value: '9876543210' } });
  await screen.findByDisplayValue('Mumbai');
  fill([
    ['Product description', 'Shirt'],
    ['No. of boxes', '1'],
    ['Package weight', '500'],
    ['L', '20'],
    ['B', '15'],
    ['H', '10'],
  ]);
  fireEvent.change(screen.getByLabelText(/Order value/), { target: { value: '999' } });
  await screen.findAllByText(/100[.]00/);
  const previousFetchHandler = fetch.getMockImplementation();
  const bookingResponses = [
    reply({ success: true, data: { success: false, packages: [{ status: 'Fail', remarks: ['Invalid warehouse'] }] } }),
    reply({ success: true, data: { success: true, packages: [{ waybill: '123456789', status: 'Success' }] } }),
  ];
  fetch.mockImplementation((url, options = {}) => {
    if (url.includes('/delhivery/shipments') && options.method === 'POST')
      return Promise.resolve(bookingResponses.shift());
    return previousFetchHandler(url, options);
  });
  fireEvent.click(mainButton('Create shipment'));
  await screen.findAllByText('Invalid warehouse');
  expect(screen.queryByText('Your shipment is ready.')).not.toBeInTheDocument();
  fireEvent.click(mainButton('Create shipment'));
  await screen.findByText('Your shipment is ready.');
  expect(lastRequest().body).toMatchObject({
    shipments: [
      {
        name: 'Recipient',
        order: 'ORDER-1',
        weight: '600',
        payment_mode: 'Prepaid',
        cod_amount: '0',
        products_desc: 'Shirt',
      },
    ],
    pickup_location: { warehouseId: 'eeeeeeeeeeeeeeeeeeeeeeee' },
  });
  fireEvent.click(mainButton('View shipments'));
  fireEvent.click(mainButton('Actions for 123456789'));
  fireEvent.click(mainButton('Cancel shipment'));
  respond({ success: true, data: { success: false, message: 'Cannot cancel' } });
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel shipment' })
  );
  await screen.findByText('Cannot cancel');
  expect(within(screen.getByRole('table')).getByText('Pending pickup')).toBeInTheDocument();
  respond({ success: true, data: { status: true } });
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel shipment' })
  );
  await waitFor(() =>
    expect(within(screen.getByRole('table')).getByText('Cancelled')).toBeInTheDocument()
  );
  expect(lastRequest().body).toEqual({ waybill: '123456789' });
});

test('pickup request saves location, schedule, package metrics and shipment links without carrier submission', async () => {
  await login();
  await addWarehouse();
  navigate('Pickup Requests');
  fireEvent.click(mainButton('Request pickup'));
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  fill([
    ['Pickup date', tomorrow.toLocaleDateString('en-CA')],
    ['Pickup time', '14:00'],
    ['Pickup contact name', 'Manager'],
    ['Package count', '3'],
    ['Total weight (kg)', '4.25'],
  ]);
  respond({ success: true, data: { pickup: { id: 'pickup-id-1', recordId: 'pickup-id-1', warehouse: 'Test Hub', date: tomorrow.toLocaleDateString('en-CA'), time: '14:00:00', count: 3, totalWeightKg: 4.25, location: { name: 'Test Hub', contactName: 'Manager', phone: '9876543210', address: '24 Test Road', pincode: '110001' }, shipmentRefs: [], status: 'Pending', workflow: 'LOCAL', history: [{ action: 'CREATED', status: 'Pending' }] } } });
  fireEvent.click(screen.getByRole('button', { name: 'Save pickup request' }));
  await screen.findByText('pickup-id-1');
  const pickupCall = fetch.mock.calls.find(([url, options]) =>
    url.includes('/delhivery/pickup-requests') && options.method === 'POST'
  );
  expect(JSON.parse(pickupCall[1].body)).toEqual({
    pickupDate: tomorrow.toLocaleDateString('en-CA'),
    pickupTime: '14:00',
    location: { name: 'Test Hub', contactName: 'Manager', phone: '9876543210', email: 'hub@example.com', address: '24 Test Road', city: 'Delhi', state: 'Delhi', pincode: '110001' },
    packageCount: 3,
    totalWeightKg: 4.25,
    shipmentRefs: [],
    idempotencyKey: expect.any(String),
  });
});
