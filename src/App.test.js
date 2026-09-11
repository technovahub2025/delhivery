import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import App from './App';
import { setAuthToken } from './services/api';

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
const navigate = (name) =>
  fireEvent.click(
    within(screen.getByRole('navigation')).getByRole('button', { name, exact: true })
  );
const mainButton = (name) =>
  within(screen.getByRole('main')).getByRole('button', { name, exact: true });
const lastRequest = () => {
  const [url, options] = fetch.mock.calls.at(-1);
  return { url, ...options, body: options.body ? JSON.parse(options.body) : undefined };
};

beforeEach(() => {
  window.scrollTo = jest.fn();
  global.fetch = jest.fn().mockRejectedValue(new Error('Unexpected request'));
  setAuthToken(null);
});
afterEach(() => {
  delete global.fetch;
  setAuthToken(null);
});
async function login() {
  render(<App />);
  respond({
    success: true,
    token: 'test-jwt',
    user: { id: 'u1', name: 'Test User', email: 'test@example.com' },
  });
  fill([
    ['Email address', 'test@example.com'],
    ['Password', 'password123'],
  ]);
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
  await screen.findByRole('heading', { name: /every delivery starts here/i });
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
  respond({ success: true, data: { success: true } });
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Add warehouse' })
  );
  await screen.findByRole('heading', { name: 'Test Hub' });
}

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
    url: 'http://localhost:3000/api/auth/register',
    body: { name: 'Test User', email: 'test@example.com', password: 'password123' },
  });
});

test('all pages render empty without automatic provider requests', async () => {
  await login();
  for (const name of [
    'Shipments',
    'Create shipment',
    'Track shipment',
    'Pickup requests',
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
  expect(fetch).toHaveBeenCalledTimes(1);
  navigate('Create shipment');
  expect(mainButton('Continue')).toBeDisabled();
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
    url: 'http://localhost:3000/api/delhivery/pincode/heavy?pincode=400001',
    method: 'GET',
    headers: { Authorization: 'Bearer test-jwt' },
  });
  expect(lastRequest().body).toBeUndefined();
  navigate('Shipping calculator');
  fill([
    ['Origin pincode', '110001'],
    ['Destination pincode', '400001'],
    ['Package weight (kg)', '0.5'],
    ['Transport mode', 'Surface'],
  ]);
  respond({ success: true, data: { success: false, message: 'Rate unavailable' } });
  fireEvent.click(mainButton('Calculate shipping'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Rate unavailable');
  const url = new URL(lastRequest().url);
  expect(Object.fromEntries(url.searchParams)).toEqual({
    md: 'S',
    ss: 'Delivered',
    d_pin: '400001',
    o_pin: '110001',
    cgm: '500',
    pt: 'Pre-paid',
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
  expect(lastRequest().url).toContain('/shipments/track?ref_ids=ORDER-1001');
});

test('waybills are allocated only on submit and provider document links can be opened', async () => {
  await login();
  navigate('Waybill management');
  expect(fetch).toHaveBeenCalledTimes(1);
  fill([['Number of waybills', '2']]);
  respond({ success: true, data: '123456789,123456790' });
  fireEvent.click(mainButton('Generate waybills'));
  await screen.findByText('123456789');
  expect(lastRequest().url).toContain('/waybills?count=2');
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
  expect(lastRequest().body).toMatchObject({
    name: 'Test Hub',
    pin: '110001',
    return_city: 'Delhi',
    email: 'hub@example.com',
  });
  navigate('Create shipment');
  fireEvent.click(mainButton('Continue'));
  fill([
    ['Full name', 'Recipient'],
    ['Email address', 'recipient@example.com'],
    ['Phone number', '9876543210'],
    ['Pincode', '400001'],
    ['Full address', '12 Road'],
    ['City', 'Mumbai'],
    ['State', 'Maharashtra'],
    ['Order reference', 'ORDER-1'],
  ]);
  fireEvent.click(mainButton('Continue'));
  fill([
    ['Product description', 'Shirt'],
    ['Quantity', '1'],
    ['Weight (kg)', '0.5'],
    ['Length (cm)', '20'],
    ['Width (cm)', '15'],
    ['Height (cm)', '10'],
  ]);
  fireEvent.click(mainButton('Continue'));
  fireEvent.change(screen.getByLabelText(/Order value/), { target: { value: '999' } });
  fireEvent.click(mainButton('Continue'));
  respond({
    success: true,
    data: { success: false, packages: [{ status: 'Fail', remarks: ['Invalid warehouse'] }] },
  });
  fireEvent.click(mainButton('Create shipment'));
  await screen.findByRole('alert');
  expect(screen.queryByText('Your shipment is ready.')).not.toBeInTheDocument();
  respond({
    success: true,
    data: { success: true, packages: [{ waybill: '123456789', status: 'Success' }] },
  });
  fireEvent.click(mainButton('Create shipment'));
  await screen.findByText('Your shipment is ready.');
  expect(lastRequest().body).toMatchObject({
    shipments: [
      {
        name: 'Recipient',
        order: 'ORDER-1',
        weight: '500',
        payment_mode: 'Prepaid',
        cod_amount: '0',
        products_desc: 'Shirt',
      },
    ],
    pickup_location: { name: 'Test Hub' },
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

test('pickup request maps location, time and count and updates only after success', async () => {
  await login();
  await addWarehouse();
  navigate('Pickup requests');
  fireEvent.click(mainButton('Request pickup'));
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  fill([
    ['Pickup date', tomorrow.toLocaleDateString('en-CA')],
    ['Pickup time', '14:00'],
    ['Package count', '3'],
  ]);
  respond({ success: true, data: { pickup_id: 'P123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Schedule pickup' }));
  await screen.findByText('P123');
  expect(lastRequest().body).toEqual({
    pickup_time: '14:00:00',
    pickup_date: tomorrow.toLocaleDateString('en-CA'),
    pickup_location: 'Test Hub',
    expected_package_count: 3,
  });
});
