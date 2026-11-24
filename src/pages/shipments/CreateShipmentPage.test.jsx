import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import CreateShipmentPage from './CreateShipmentPage';
import { api } from '../../services/api';

const customer = { id: 'customer-1', displayName: 'Acme Retail', companyName: 'Acme' };
const partyRecords = {
  SHIPPER: [{ id: 'shipper-1', partyType: 'SHIPPER', companyName: 'Sender Co', contactName: 'Sam Sender', phone: '9876543210', email: 'sender@example.com', addressLines: ['1 Sender Road'], city: 'Mumbai', state: 'Maharashtra', pincode: '400001', gstin: 'ABCDE1234F12345' }],
  CONSIGNEE: [{ id: 'consignee-1', partyType: 'CONSIGNEE', companyName: 'Receiver Co', contactName: 'Riya Receiver', phone: '9123456780', email: 'receiver@example.com', addressLines: ['2 Receiver Road'], pincode: '110001', gstin: 'FGHIJ1234K12345' }],
  PICKUP: [{ id: 'pickup-1', partyType: 'PICKUP', contactName: 'Pickup Contact', phone: '9988776655', email: 'pickup@example.com', addressLines: ['3 Pickup Road'], city: 'Pune', state: 'Maharashtra', pincode: '411001' }],
};

beforeEach(() => {
  jest.spyOn(api, 'directBookingConfiguration').mockResolvedValue({ directBookingEnabled: true });
  jest.spyOn(api, 'customers').mockResolvedValue({ data: { customers: [customer] } });
  jest.spyOn(api, 'partyAddresses').mockImplementation(({ partyType }) => Promise.resolve({ data: { partyAddresses: partyRecords[partyType] || [] } }));
  jest.spyOn(api, 'pincode').mockResolvedValue({ data: { delivery_codes: [{ postal_code: { city: 'New Delhi', state: 'Delhi', pickup: 'Y', pre_paid: 'Y', cod: 'Y' } }] } });
  jest.spyOn(api, 'cost').mockResolvedValue({ data: { total_amount: 100 } });
  jest.spyOn(api, 'createShipment').mockResolvedValue({ data: { packages: [{ waybill: 'MOCK-AWB' }] } });
  jest.spyOn(api, 'pricingPreview').mockResolvedValue({ data: { pricing: { status: 'CONFIGURATION_REQUIRED', customerSelling: {}, blockers: ['Rate card configuration required'], partnerCost: null } } });
  jest.spyOn(api, 'requestDraftCourierQuotes').mockResolvedValue({ data: { status: 'CONFIGURATION_REQUIRED', quotes: [], message: 'No courier quotation adapters are configured.' } });
  jest.spyOn(api, 'selectDraftCourierQuote').mockImplementation((id, quoteId) => Promise.resolve({ data: { selectedPartnerQuote: { id: quoteId, partnerName: 'Mock Carrier', serviceName: 'Surface', currency: 'INR', amount: 42 } } }));
  jest.spyOn(api, 'shipmentDraft').mockResolvedValue({ data: { draft: { id: 'draft-1', formData: {} } } });
  jest.spyOn(api, 'reconcileDraftBooking').mockResolvedValue({ data: { status: 'OUTCOME_UNCONFIRMED', retryAllowed: false } });
  jest.spyOn(api, 'draftBookingStatus').mockResolvedValue({ data: { status: 'OUTCOME_UNCONFIRMED' } });
});

afterEach(() => jest.restoreAllMocks());

function renderBooking(warehouses = [{ id: 'hub-1', name: 'Registered Hub', address: 'Hub Road', pincode: '400001', contact: 'Hub Contact', phone: '9876543210', registrationStatus: 'REGISTERED' }], props = {}) {
  return render(<CreateShipmentPage warehouses={warehouses} setWarehouses={jest.fn()} notify={jest.fn()} onCreate={jest.fn()} navigate={jest.fn()} {...props} />);
}

test('opens later pending AWB pages with the dashboard date range', async () => {
  const onLoadDrafts = jest.fn()
    .mockResolvedValueOnce({ drafts: [{ id: '1', reference: 'FIRST-DRAFT' }], hasMore: true })
    .mockResolvedValueOnce({ drafts: [{ id: '2', reference: 'SECOND-DRAFT' }], hasMore: false });
  renderBooking(undefined, { onLoadDrafts, dashboardFilter: { target: 'pendingAwb', from: '2026-09-01', to: '2026-09-30' } });
  expect(await screen.findByText(/FIRST-DRAFT/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  expect(await screen.findByText(/SECOND-DRAFT/)).toBeInTheDocument();
  expect(onLoadDrafts.mock.calls.map(([query]) => query)).toEqual([
    { page: 1, from: '2026-09-01', to: '2026-09-30' },
    { page: 2, from: '2026-09-01', to: '2026-09-30' },
  ]);
});

test('shows saved partner performance on an existing comparison', async () => {
  renderBooking(undefined, { prefill: { formData: {}, partnerQuoteBatches: [{
    id: 'performance-batch',
    historicalPerformance: [{ code: 'DELHIVERY', name: 'Delhivery', shipmentCount: 6, mappedCount: 4, deliveredCount: 3, exceptionCount: 1 }],
    quotes: [],
  }] } });
  const history = screen.getByRole('region', { name: 'Historical courier performance' });
  expect(within(history).getByText(/3 delivered, 1 exceptions, 4 mapped out of 6/)).toBeInTheDocument();
  await screen.findByRole('option', { name: 'Acme Retail' });
});

test('shows the carrier failure and replaces it with live serviceability after retry', async () => {
  api.pincode
    .mockRejectedValueOnce(new Error('Delhivery pincode lookup failed (carrier HTTP 401).'))
    .mockResolvedValueOnce({
      provenance: 'DELHIVERY_API', serviceable: true, serviceability: { prepaid: true, cod: false },
      data: { delivery_codes: [{ postal_code: { city: 'Delhi', state_code: 'DL', pre_paid: 'Y', cod: 'N' } }] },
    });
  renderBooking();
  fireEvent.change(screen.getByLabelText('Delivery pincode'), { target: { value: '110001' } });
  expect(await screen.findByRole('alert')).toHaveTextContent('Delhivery pincode lookup failed (carrier HTTP 401).');
  fireEvent.click(screen.getByRole('button', { name: 'Retry pincode check' }));
  expect(await screen.findByText('Serviceability source: Delhivery API.')).toBeInTheDocument();
  expect(screen.getByText(/Prepaid: Yes.*COD: No/)).toBeInTheDocument();
  const destination = within(screen.getByRole('region', { name: /Delivery Destination/ }));
  expect(destination.getByLabelText('City')).toHaveValue('Delhi');
  expect(destination.getByLabelText('State')).toHaveValue('Delhi');
  expect(screen.queryByText(/Sample serviceability/)).not.toBeInTheDocument();
});

test('retains live serviceability for the current pincode and payment capability', async () => {
  api.pincode.mockResolvedValue({
    provenance: 'DELHIVERY_API',
    serviceable: true,
    serviceability: { prepaid: true, cod: false },
    data: { delivery_codes: [{ postal_code: { pin: '600018', city: 'Chennai', state_code: 'TN', pre_paid: 'Y', cod: 'N' } }] },
  });
  renderBooking();
  fireEvent.change(screen.getByLabelText('Delivery pincode'), { target: { value: '600018' } });
  expect(await screen.findByText('Serviceability source: Delhivery API.')).toBeInTheDocument();
  expect(screen.getByText(/Prepaid: Yes.*COD: No/)).toBeInTheDocument();
  expect(screen.getByLabelText('Payment type')).toHaveValue('Prepaid');
  fireEvent.change(screen.getByLabelText('Payment type'), { target: { value: 'COD' } });
  expect(screen.getByText(/Prepaid: Yes.*COD: No/)).toBeInTheDocument();
});

test('offers only live estimates and never requests sample quotations', async () => {
  const liveQuote = { id: 'live-quote', partnerCode: 'DELHIVERY', partnerName: 'Delhivery', provenance: 'PROVIDER_ESTIMATE', mode: 'SURFACE', serviceName: 'Surface', currency: 'INR', amount: 92, bookable: false };
  api.requestDraftCourierQuotes
    .mockResolvedValueOnce({ data: { quoteBatch: { id: 'live', source: 'live', quotes: [liveQuote] } } });
  renderBooking(undefined, { prefill: { draftId: 'separate-sources', formData: {} } });
  fireEvent.click(screen.getByRole('button', { name: 'Compare couriers' }));
  expect(await screen.findByText(/Live Delhivery estimate/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Estimate only' })).toBeDisabled();
  expect(screen.queryByText(/SAMPLE charge/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Compare sample couriers' })).not.toBeInTheDocument();
  expect(api.requestDraftCourierQuotes.mock.calls).toEqual([['separate-sources']]);
});

test('shows the booking sections in the page-12 SRD sequence', async () => {
  renderBooking();
  const headings = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
  expect(headings).toEqual([
    'Pending AWB drafts',
    '1. Delivery Destination',
    '2. Shipper / Consignor Details',
    '3. Consignee Details',
    '4. Pickup Location',
    '5. Product & Box Details',
    '6. Payment Type and Shipping Mode',
  ]);
  expect(await screen.findByRole('option', { name: 'Acme Retail' })).toBeInTheDocument();
  expect(api.partyAddresses).toHaveBeenCalledWith(expect.objectContaining({ partyType: 'SHIPPER', page: 1, limit: 100 }), expect.any(AbortSignal));
  expect(api.partyAddresses).toHaveBeenCalledWith(expect.objectContaining({ partyType: 'CONSIGNEE' }), expect.any(AbortSignal));
  expect(screen.getAllByText('Registered Hub').length).toBeGreaterThan(0);
});

test('direct booking stays available when backend configuration explicitly enables it', async () => {
  renderBooking();
  expect(await screen.findByRole('button', { name: 'Create shipment' })).toBeEnabled();
  expect(api.directBookingConfiguration).toHaveBeenCalledWith(expect.any(AbortSignal));
  expect(screen.queryByText('Direct Delhivery booking is disabled. Save this shipment as a draft and use courier comparison to continue.')).not.toBeInTheDocument();
});

test('unregistered warehouse states are not selectable or ready for booking', async () => {
  renderBooking([{ id: 'unverified-id', name: 'Pending Hub', registrationStatus: 'OUTCOME_UNCONFIRMED' }], {
    onSaveDraft: jest.fn().mockResolvedValue({ id: 'draft-unverified' }),
  });
  expect(await screen.findByRole('button', { name: 'Create shipment' })).toBeDisabled();
  expect(screen.queryByRole('radio', { name: /Pending Hub/ })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save as Draft' })).toBeEnabled();
});

test('direct booking is disabled with the required message when backend configuration is false', async () => {
  api.directBookingConfiguration.mockResolvedValue({ directBookingEnabled: false });
  renderBooking();
  expect(await screen.findByRole('button', { name: 'Create shipment' })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('Direct Delhivery booking is disabled. Save this shipment as a draft and use courier comparison to continue.');
});

test('direct booking stays disabled while readiness configuration is loading', async () => {
  let resolveConfiguration;
  api.directBookingConfiguration.mockReturnValue(new Promise(resolve => { resolveConfiguration = resolve; }));
  renderBooking();
  expect(screen.getByRole('button', { name: 'Create shipment' })).toBeDisabled();
  resolveConfiguration({ directBookingEnabled: true });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Create shipment' })).toBeEnabled());
});

test('direct booking fails closed when readiness configuration is unavailable or invalid', async () => {
  api.directBookingConfiguration.mockRejectedValue(new Error('Unavailable'));
  const { unmount } = renderBooking();
  expect(await screen.findByRole('button', { name: 'Create shipment' })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('Direct Delhivery booking is disabled. Save this shipment as a draft and use courier comparison to continue.');
  unmount();

  api.directBookingConfiguration.mockResolvedValue({ directBookingEnabled: 'true' });
  renderBooking();
  expect(await screen.findByRole('button', { name: 'Create shipment' })).toBeDisabled();
});

test('draft, comparison, selection and draft booking remain available when direct booking is disabled', async () => {
  api.directBookingConfiguration.mockResolvedValue({ directBookingEnabled: false });
  api.requestDraftCourierQuotes.mockResolvedValue({ data: { status: 'QUOTED', quoteBatch: { id: 'safe-batch', requestedAt: '2026-01-02T03:04:05.000Z', status: 'QUOTED', quotes: [{ id: 'safe-quote', partnerCode: 'MOCK_LOCAL', partnerName: 'Local mock courier', serviceName: 'Surface', mode: 'SURFACE', amount: 42, currency: 'INR', status: 'QUOTED', serviceable: true }] } } });
  const saveDraft = jest.fn().mockResolvedValue({ id: 'safe-draft' });
  const bookDraft = jest.fn().mockResolvedValue({ id: 'MOCK-AWB-LOCAL', waybill: 'MOCK-AWB-LOCAL' });
  const create = jest.fn();
  renderBooking(undefined, { onSaveDraft: saveDraft, onBookDraft: bookDraft, onCreate: create });

  expect(await screen.findByRole('button', { name: 'Create shipment' })).toBeDisabled();
  const saveButton = screen.getByRole('button', { name: 'Save as Draft' });
  expect(saveButton).toBeEnabled();
  fireEvent.click(saveButton);
  await waitFor(() => expect(saveDraft).toHaveBeenCalled());

  const compareButton = screen.getByRole('button', { name: 'Compare couriers' });
  expect(compareButton).toBeEnabled();
  fireEvent.click(compareButton);
  await waitFor(() => expect(api.requestDraftCourierQuotes).toHaveBeenCalledWith('safe-draft'));
  expect(api.cost).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByRole('button', { name: 'Select courier' }));
  fireEvent.change(screen.getByLabelText('Delivery pincode'), { target: { value: '110001' } });
  const bookButton = await screen.findByRole('button', { name: 'Book selected courier' });
  await waitFor(() => expect(bookButton).toBeEnabled());
  fireEvent.click(bookButton);

  await waitFor(() => expect(bookDraft).toHaveBeenCalledWith('safe-draft'));
  expect(create).not.toHaveBeenCalled();
  expect(api.createShipment).not.toHaveBeenCalled();
});

test('shows customer selling price separately and requests a mocked rate-card preview', async () => {
  api.customers.mockResolvedValue({ data: { customers: [{ ...customer, rateCardId: 'card-1' }] } });
  jest.spyOn(api, 'rateCard').mockResolvedValue({ data: { rateCard: { id: 'card-1', name: 'DEFAULT/TEST test card', version: 1, currency: 'INR', zoneRates: [{ zone: 'TEST-ZONE' }] } } });
  renderBooking();
  fireEvent.change(await screen.findByLabelText('Booking customer'), { target: { value: 'customer-1' } });
  await screen.findByRole('option', { name: 'TEST-ZONE' });
  fireEvent.change(screen.getByLabelText('Package weight'), { target: { value: '1000' } });
  await waitFor(() => expect(api.pricingPreview).toHaveBeenCalledWith(expect.objectContaining({ customerId: 'customer-1', zone: 'TEST-ZONE', chargeableWeight: 1 }), expect.any(AbortSignal)));
  expect(await screen.findByRole('region', { name: 'Customer selling price' })).toHaveTextContent('separate from Delhivery cost');
});

test('shows Delhivery estimates in the shipping cards independently of booking and refreshes for shipment inputs', async () => {
  api.directBookingConfiguration.mockResolvedValue({ directBookingEnabled: false });
  api.cost.mockImplementation(({ md, cgm, pt }) => Promise.resolve({ data: {
    total_amount: pt === 'COD'
      ? (md === 'S' ? 155.14 : 204.11)
      : cgm > 600 ? (md === 'S' ? 160.25 : 210.75)
        : (md === 'S' ? 145.14 : 194.11),
  } }));
  renderBooking();
  fireEvent.change(screen.getByLabelText('Delivery pincode'), { target: { value: '600018' } });
  fireEvent.change(screen.getByLabelText('Package weight'), { target: { value: '600' } });

  const surface = screen.getByRole('button', { name: /Surface/ });
  const express = screen.getByRole('button', { name: /Express/ });
  await waitFor(() => {
    expect(surface).toHaveTextContent('₹145.14');
    expect(express).toHaveTextContent('₹194.11');
  });
  expect(screen.getByRole('button', { name: 'Create shipment' })).toBeDisabled();
  expect(api.cost).toHaveBeenCalledWith(expect.objectContaining({ d_pin: '600018', cgm: 600, pt: 'Pre-paid', md: 'S' }));
  expect(api.cost).toHaveBeenCalledWith(expect.objectContaining({ d_pin: '600018', cgm: 600, pt: 'Pre-paid', md: 'E' }));

  fireEvent.change(screen.getByLabelText('Package weight'), { target: { value: '1000' } });
  await waitFor(() => expect(surface).toHaveTextContent('₹160.25'));
  fireEvent.change(screen.getByLabelText('Payment type'), { target: { value: 'COD' } });
  await waitFor(() => {
    expect(surface).toHaveTextContent('₹155.14');
    expect(express).toHaveTextContent('₹204.11');
  });
  expect(api.cost).toHaveBeenCalledWith(expect.objectContaining({ d_pin: '600018', cgm: 1000, pt: 'COD', md: 'S' }));

  fireEvent.click(surface);
  expect(surface).toHaveClass('selected');
  expect(surface).toHaveTextContent('₹155.14');
  expect(express).toHaveTextContent('₹204.11');
});

test('reuses READY mode estimates in shipping cards when the separate cost lookup has no result', async () => {
  api.customers.mockResolvedValue({ data: { customers: [{ ...customer, rateCardId: 'card-1' }] } });
  jest.spyOn(api, 'rateCard').mockResolvedValue({ data: { rateCard: { id: 'card-1', currency: 'INR', zoneRates: [{ zone: 'Tamil Nadu' }] } } });
  api.pricingPreview.mockResolvedValue({ data: { pricing: {
    status: 'READY', card: { currency: 'INR' },
    customerSelling: {
      SURFACE: { status: 'READY', sellingPrice: 97.94 },
      EXPRESS: { status: 'READY', sellingPrice: 146.91 },
    },
  } } });
  api.cost.mockRejectedValue(new Error('Cost lookup unavailable'));
  renderBooking();
  fireEvent.change(await screen.findByLabelText('Booking customer'), { target: { value: 'customer-1' } });
  await screen.findByRole('option', { name: 'Tamil Nadu' });
  fireEvent.change(screen.getByLabelText('Delivery pincode'), { target: { value: '600018' } });
  fireEvent.change(screen.getByLabelText('Package weight'), { target: { value: '600' } });

  await waitFor(() => {
    expect(screen.getByRole('region', { name: 'Customer selling price' })).toHaveTextContent('SURFACE: INR 97.94');
    expect(screen.getByRole('region', { name: 'Customer selling price' })).toHaveTextContent('EXPRESS: INR 146.91');
    expect(screen.getByRole('button', { name: /Surface/ })).toHaveTextContent('₹97.94');
    expect(screen.getByRole('button', { name: /Express/ })).toHaveTextContent('₹146.91');
  });
});

test('allows sub-kilogram package weight and keeps physical and chargeable weights distinct', async () => {
  renderBooking();
  fireEvent.change(screen.getByLabelText('Weight unit'), { target: { value: 'kg' } });
  fireEvent.change(screen.getByLabelText('Package weight'), { target: { value: '0.50' } });
  fireEvent.change(screen.getByLabelText('L'), { target: { value: '20' } });
  fireEvent.change(screen.getByLabelText('B'), { target: { value: '15' } });
  fireEvent.change(screen.getByLabelText('H'), { target: { value: '10' } });

  expect(screen.getByLabelText('Package weight')).toHaveAttribute('min', '0.001');
  expect(screen.getByText('Actual weight').nextElementSibling).toHaveTextContent('0.50 kg');
  expect(screen.getByText('Volumetric weight').nextElementSibling).toHaveTextContent('0.60 kg');
  expect(screen.getByText('Chargeable weight').nextElementSibling).toHaveTextContent('0.60 kg');
});

test('shows a successful Delhivery mode estimate while marking a failed mode unavailable', async () => {
  api.cost.mockImplementation(({ md }) => md === 'S'
    ? Promise.resolve({ data: { total_amount: 145.14 } })
    : Promise.reject(new Error('Express cost lookup failed.')));
  renderBooking();
  fireEvent.change(screen.getByLabelText('Delivery pincode'), { target: { value: '600018' } });
  fireEvent.change(screen.getByLabelText('Package weight'), { target: { value: '600' } });

  const surface = screen.getByRole('button', { name: /Surface/ });
  const express = screen.getByRole('button', { name: /Express/ });
  await waitFor(() => expect(surface).toHaveTextContent('₹145.14'));
  expect(express).toHaveTextContent('Price unavailable');
  expect(await screen.findByRole('alert')).toHaveTextContent('Express: Express cost lookup failed.');
});

test('customer selection fills shipper identity and billing details, offers embedded addresses, and loads its assigned rate card', async () => {
  const abc = {
    id: 'customer-abc', category: 'CREDIT', displayName: 'ABC Technologies Pvt Ltd', companyName: 'ABC Technologies Pvt Ltd',
    primaryContact: { name: 'Asha Contact', phone: '9894525004', email: 'asha@example.test' },
    gstin: 'ABCDE1234F12345', billingAddress: { addressLines: ['Billing Road'], city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' },
    shippingAddresses: [{ addressLines: ['Saved Shipper Road'], city: 'Chennai', state: 'Tamil Nadu', pincode: '600002' }],
    rateCardId: 'customer-rate-card',
  };
  api.customers.mockResolvedValue({ data: { customers: [abc] } });
  api.partyAddresses.mockImplementation(({ partyType }) => Promise.resolve({ data: { partyAddresses: partyType === 'SHIPPER' ? [] : partyRecords[partyType] || [] } }));
  jest.spyOn(api, 'rateCard').mockResolvedValue({ data: { rateCard: { id: 'customer-rate-card', scope: 'CUSTOMER', customerId: 'customer-abc', currency: 'INR', zoneRates: [{ zone: 'SOUTH' }] } } });
  renderBooking();

  const customerSelect = await screen.findByLabelText('Booking customer');
  fireEvent.change(customerSelect, { target: { value: 'customer-abc' } });
  await waitFor(() => expect(customerSelect).toHaveValue('customer-abc'));
  expect(screen.getByText('Selected customer:')).toHaveTextContent('ABC Technologies Pvt Ltd');
  const shipperSection = screen.getByRole('region', { name: '2. Shipper / Consignor Details' });
  expect(within(shipperSection).getByLabelText('Company name')).toHaveValue('ABC Technologies Pvt Ltd');
  expect(within(shipperSection).getByLabelText('Contact name')).toHaveValue('Asha Contact');
  expect(within(shipperSection).getByLabelText('Mobile number')).toHaveValue('9894525004');
  expect(within(shipperSection).getByLabelText('Email address')).toHaveValue('asha@example.test');
  expect(within(shipperSection).getByLabelText('Address')).toHaveValue('Billing Road');
  expect(within(shipperSection).getByLabelText('City')).toHaveValue('Chennai');
  expect(within(shipperSection).getByLabelText('State')).toHaveValue('Tamil Nadu');
  expect(within(shipperSection).getByLabelText('Shipper pincode')).toHaveValue('600001');
  expect(within(shipperSection).getByLabelText('GSTIN')).toHaveValue('ABCDE1234F12345');

  expect(await screen.findByRole('option', { name: /Saved Shipper Road/ })).toBeInTheDocument();
  expect(api.partyAddresses).toHaveBeenCalledWith(expect.objectContaining({ partyType: 'SHIPPER', customerId: 'customer-abc', includeUnassigned: true }), expect.any(AbortSignal));
  fireEvent.change(screen.getByLabelText('Saved shipper address'), { target: { value: 'customer-shipping-customer-abc-0' } });
  expect(within(shipperSection).getByLabelText('Address')).toHaveValue('Saved Shipper Road');
  expect(within(shipperSection).getByLabelText('City')).toHaveValue('Chennai');
  expect(within(shipperSection).getByLabelText('Shipper pincode')).toHaveValue('600002');
  expect(api.rateCard).toHaveBeenCalledWith('customer-rate-card');

  fireEvent.change(screen.getByLabelText('Package weight'), { target: { value: '1000' } });
  await waitFor(() => expect(api.pricingPreview).toHaveBeenCalledWith(expect.objectContaining({ customerId: 'customer-abc', zone: 'SOUTH', chargeableWeight: 1 }), expect.any(AbortSignal)));
});

test('changing the selected customer clears old address selections, destination zone and quote state', async () => {
  const first = { ...customer, rateCardId: 'card-first', billingAddress: { addressLines: ['First Billing'] } };
  const second = { id: 'customer-2', displayName: 'Second Customer', companyName: 'Second Customer', rateCardId: 'card-second', billingAddress: { addressLines: ['Second Billing'] } };
  api.customers.mockResolvedValue({ data: { customers: [first, second] } });
  api.partyAddresses.mockResolvedValue({ data: { partyAddresses: [] } });
  jest.spyOn(api, 'rateCard').mockImplementation(async (id) => ({ data: { rateCard: { id, currency: 'INR', zoneRates: [{ zone: id === 'card-first' ? 'ZONE-1' : 'ZONE-2' }] } } }));
  renderBooking(undefined, { prefill: {
    draftId: 'existing-draft', state: 'draft',
    formData: { bookingCustomerId: 'customer-1', shipperAddressId: 'old-shipper', consigneeAddressId: 'old-consignee', pickupAddressId: 'old-pickup', destinationZone: 'OLD-ZONE' },
    partnerQuoteBatches: [{ id: 'old-quotes', quotes: [{ id: 'old-quote', partnerName: 'Old quote', amount: 10, currency: 'INR' }] }],
    selectedPartnerQuote: { id: 'old-quote', partnerName: 'Old quote', amount: 10, currency: 'INR' },
  } });
  const customerSelect = await screen.findByLabelText('Booking customer');
  await waitFor(() => expect(customerSelect).toHaveValue('customer-1'));
  fireEvent.change(customerSelect, { target: { value: 'customer-2' } });
  await waitFor(() => expect(customerSelect).toHaveValue('customer-2'));
  expect(screen.getAllByLabelText('Address')[0]).toHaveValue('Second Billing');
  await waitFor(() => expect(screen.getByLabelText('Rate destination zone')).toHaveValue('ZONE-2'));
  expect(screen.getByLabelText('Saved shipper address')).toHaveValue('');
  expect(screen.queryByText('Old quote')).not.toBeInTheDocument();
  expect(screen.queryByText(/Selected courier:.*Old quote/)).not.toBeInTheDocument();
});

test('shows the no-warehouse instruction and Add warehouse action once', () => {
  renderBooking([]);
  expect(screen.getAllByText(/Register a warehouse and wait for backend confirmation/)).toHaveLength(1);
  expect(screen.getAllByRole('button', { name: 'Add warehouse' })).toHaveLength(1);
  expect(screen.getAllByRole('button', { name: /Add pickup location/ })).toHaveLength(1);
});

test('filters saved addresses by selected customer and copies selected shipper values into editable fields', async () => {
  renderBooking();
  await screen.findByRole('option', { name: 'Acme Retail' });
  fireEvent.change(screen.getByLabelText('Booking customer'), { target: { value: 'customer-1' } });
  await waitFor(() => expect(api.partyAddresses).toHaveBeenCalledWith(expect.objectContaining({ partyType: 'SHIPPER', customerId: 'customer-1' }), expect.any(AbortSignal)));

  fireEvent.change(await screen.findByLabelText('Saved shipper address'), { target: { value: 'shipper-1' } });
  expect(screen.getAllByLabelText('Company name')[0]).toHaveValue('Sender Co');
  expect(screen.getAllByLabelText('Contact name')[0]).toHaveValue('Sam Sender');
  expect(screen.getAllByLabelText('Address')[0]).toHaveValue('1 Sender Road');
  expect(screen.getAllByLabelText('GSTIN')[0]).toHaveValue('ABCDE1234F12345');

  fireEvent.change(screen.getAllByLabelText('Contact name')[0], { target: { value: 'Edited in booking' } });
  expect(partyRecords.SHIPPER[0].contactName).toBe('Sam Sender');
  expect(screen.getAllByLabelText('Contact name')[0]).toHaveValue('Edited in booking');
});

test('saved consignee fills recipient details and destination pincode lookup remains active', async () => {
  renderBooking();
  fireEvent.change(await screen.findByLabelText('Saved consignee address'), { target: { value: 'consignee-1' } });
  const section = screen.getByRole('region', { name: '3. Consignee Details' });
  expect(within(section).getAllByLabelText('Full name')).toHaveLength(1);
  expect(within(section).getAllByLabelText('Company name')).toHaveLength(1);
  expect(within(section).getAllByLabelText('Email address')).toHaveLength(1);
  expect(within(section).getAllByLabelText('Mobile number')).toHaveLength(1);
  expect(within(section).getAllByLabelText('Full address')).toHaveLength(1);
  expect(within(section).getByLabelText('Full name')).toHaveValue('Riya Receiver');
  expect(within(section).getByLabelText('Company name')).toHaveValue('Receiver Co');
  expect(within(section).getByLabelText('Full address')).toHaveValue('2 Receiver Road');
  expect(within(section).getByLabelText('Mobile number')).toHaveValue('9123456780');
  fireEvent.change(within(section).getByLabelText('Full address'), { target: { value: 'Manual booking address' } });
  expect(partyRecords.CONSIGNEE[0].addressLines).toEqual(['2 Receiver Road']);
  expect(within(section).getByLabelText('Full address')).toHaveValue('Manual booking address');
  await waitFor(() => expect(api.pincode).toHaveBeenCalledWith('110001'));
  await waitFor(() => expect(screen.getByLabelText('Delivery pincode')).toHaveValue('110001'));
});

test('pickup choices copy shipper details or expose saved pickup entry while preserving registered warehouse selection', async () => {
  renderBooking();
  fireEvent.change(await screen.findByLabelText('Saved shipper address'), { target: { value: 'shipper-1' } });
  fireEvent.click(screen.getByLabelText('Same as Shipper Address'));

  const contactFields = screen.getAllByLabelText('Contact name');
  expect(contactFields[1]).toHaveValue('Sam Sender');
  expect(screen.getByRole('radio', { name: /Registered Hub/ })).toBeChecked();

  fireEvent.click(screen.getByLabelText('Enter New Pickup Address'));
  fireEvent.change(await screen.findByLabelText('Saved pickup address'), { target: { value: 'pickup-1' } });
  expect(screen.getByLabelText('Pickup pincode')).toHaveValue('411001');
  expect(screen.getByRole('radio', { name: /Registered Hub/ })).toBeChecked();
  expect(screen.getByRole('button', { name: /Add pickup location/i })).toBeInTheDocument();
});

test('Save as Draft persists form state without invoking shipment creation or carrier lookups', async () => {
  const saveDraft = jest.fn().mockResolvedValue({ id: 'draft-1' });
  const create = jest.fn();
  renderBooking(undefined, { onSaveDraft: saveDraft, onCreate: create, onLoadDrafts: jest.fn().mockResolvedValue([]) });
  fireEvent.change(screen.getByLabelText('Order reference'), { target: { value: 'DUMMY-DRAFT-1' } });
  fireEvent.change(screen.getByLabelText('Product description'), { target: { value: 'Dummy package' } });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save as Draft' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Save as Draft' }));
  await waitFor(() => expect(saveDraft).toHaveBeenCalledWith(expect.objectContaining({ reference: 'DUMMY-DRAFT-1', description: 'Dummy package', boxes: expect.any(Array), warehouseId: 'hub-1', warehousePincode: '400001' }), null));
  expect(create).not.toHaveBeenCalled();
  expect(api.createShipment).not.toHaveBeenCalled();
  expect(api.pincode).not.toHaveBeenCalled();
  expect(api.cost).not.toHaveBeenCalled();
});

test('opening a draft restores saved fields and package rows without carrier lookups', async () => {
  const formData = {
    reference: 'DUMMY-RESTORE-1', bookingCustomerId: 'customer-1', customer: 'Riya Receiver',
    shipperAddressId: 'shipper-1', shipperContactName: 'Sam Sender', consigneeAddressId: 'consignee-1',
    pickupChoice: 'newAddress', pickupAddressId: 'pickup-1', pickupContactName: 'Pickup Contact',
    pincode: '110001', destination: 'New Delhi', state: 'Delhi', pincodeServiceable: true,
    boxes: [{ packagingType: 'Cardboard', boxes: 2, boxPreset: 'custom', length: '20', width: '15', height: '10', unit: 'cm', weight: '500', weightUnit: 'gm' }],
    description: 'Dummy restored goods', payment: 'COD', value: '250', mode: 'Surface', warehouse: 'Registered Hub',
  };
  api.shipmentDraft.mockResolvedValue({ data: { draft: { id: 'draft-restore', formData } } });
  const create = jest.fn();
  renderBooking(undefined, { drafts: [{ id: 'draft-restore', reference: 'DRAFT-X', formData }], onLoadDrafts: jest.fn().mockResolvedValue([]), onCreate: create });
  fireEvent.click(await screen.findByRole('button', { name: 'Open draft' }));
  await waitFor(() => expect(screen.getByLabelText('Order reference')).toHaveValue('DUMMY-RESTORE-1'));
  expect(screen.getByLabelText('Product description')).toHaveValue('Dummy restored goods');
  expect(screen.getByLabelText('Delivery pincode')).toHaveValue('110001');
  expect(screen.getByLabelText('Saved shipper address')).toHaveValue('shipper-1');
  expect(screen.getByLabelText('Saved consignee address')).toHaveValue('consignee-1');
  await screen.findByRole('option', { name: /Pickup Contact/ });
  expect(screen.getByLabelText('Saved pickup address')).toHaveValue('pickup-1');
  expect(screen.getByLabelText('No. of boxes')).toHaveValue(2);
  await waitFor(() => expect(api.pincode).toHaveBeenCalledWith('110001'));
  expect(api.cost).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Create shipment' }));
  await waitFor(() => expect(api.pincode).toHaveBeenCalledWith('110001'));
  expect(screen.getByRole('button', { name: 'Create shipment' })).toBeInTheDocument();
  expect(create).not.toHaveBeenCalled();
});

test('draft comparison offers only the live provider flow and no sample booking', async () => {
  const saveDraft = jest.fn().mockResolvedValue({ id: 'draft-compare' });
  const bookDraft = jest.fn();
  const liveQuote = { id: 'quote-1', partnerCode: 'DELHIVERY', partnerName: 'Delhivery', serviceName: 'Surface', amount: 42, partnerTotal: 50, eta: '2 days', serviceable: true, currency: 'INR', status: 'QUOTED' };
  api.selectDraftCourierQuote.mockResolvedValue({ data: { selectedPartnerQuote: liveQuote } });
  api.requestDraftCourierQuotes.mockResolvedValue({ data: { status: 'QUOTED', quoteBatch: { id: 'batch-1', status: 'QUOTED', quotes: [liveQuote], unavailable: [] } } });
  const create = jest.fn();
  renderBooking(undefined, { onSaveDraft: saveDraft, onBookDraft: bookDraft, onCreate: create });
  fireEvent.click(screen.getByRole('button', { name: 'Save as Draft' }));
  await waitFor(() => expect(saveDraft).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: 'Compare couriers' }));
  expect((await screen.findAllByText(/Delhivery/)).length).toBeGreaterThan(0);
  expect(screen.queryByRole('button', { name: 'Compare sample couriers' })).not.toBeInTheDocument();
  expect(screen.getByText(/ETA 2 days/)).toBeInTheDocument();
  expect(screen.getByText(/Serviceable/)).toBeInTheDocument();
  expect(screen.queryByText(/Second Mock/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Select courier' }));
  const selection = await screen.findByText(/Selected courier:/);
  expect(selection).toHaveTextContent('INR 50.00');
  expect(selection).toHaveTextContent('Live Delhivery estimate');
  expect(bookDraft).not.toHaveBeenCalled();
  expect(api.requestDraftCourierQuotes).toHaveBeenCalledWith('draft-compare');
  expect(api.selectDraftCourierQuote).toHaveBeenCalledWith('draft-compare', 'quote-1');
  expect(bookDraft).not.toHaveBeenCalled();
  expect(create).not.toHaveBeenCalled();
  expect(api.createShipment).not.toHaveBeenCalled();
  expect(api.cost).not.toHaveBeenCalled();
});

test('unconfirmed booking attempts remain visible and can be reconciled without retrying booking', async () => {
  const bookDraft = jest.fn();
  renderBooking(undefined, { onBookDraft: bookDraft, drafts: [{ id: 'attempt-1', state: 'creating', reference: 'DUMMY-ATTEMPT', bookingAttempt: { status: 'OUTCOME_UNCONFIRMED' } }], onLoadDrafts: jest.fn().mockResolvedValue([]) });
  expect(await screen.findByText(/OUTCOME_UNCONFIRMED/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reconcile booking' }));
  await waitFor(() => expect(api.reconcileDraftBooking).toHaveBeenCalledWith('attempt-1'));
  expect(bookDraft).not.toHaveBeenCalled();
});


async function prepareSelectedQuoteForBooking() {
  api.requestDraftCourierQuotes.mockResolvedValue({
    data: {
      status: 'QUOTED',
      quoteBatch: {
        id: 'pending-batch',
        requestedAt: '2026-11-16T10:00:00.000Z',
        status: 'QUOTED',
        quotes: [{
          id: 'pending-quote', partnerCode: 'MOCK_LOCAL', partnerName: 'Local mock courier',
          serviceName: 'Local mock service', mode: 'EXPRESS', amount: 1, partnerTotal: 1,
          currency: 'INR', serviceable: true, status: 'QUOTED',
        }],
        unavailable: [],
      },
    },
  });
  api.selectDraftCourierQuote.mockResolvedValue({
    data: { selectedPartnerQuote: { id: 'pending-quote', partnerCode: 'MOCK_LOCAL', partnerName: 'Local mock courier', serviceName: 'Local mock service', amount: 1, currency: 'INR', status: 'QUOTED' } },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save as Draft' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Compare couriers' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Compare couriers' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Select courier' }));
  fireEvent.change(screen.getByLabelText('Delivery pincode'), { target: { value: '110001' } });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Book selected courier' })).toBeEnabled());
}

test('BOOKED_AWB_PENDING is successful, visible without an AWB, and prevents another booking', async () => {
  const bookDraft = jest.fn().mockResolvedValue({
    id: 'BOOKED-DUMMY-PENDING',
    reference: 'DUMMY-PENDING-1',
    providerCode: 'MOCK_LOCAL',
    mockOnly: true,
    bookingStatus: 'BOOKED_AWB_PENDING',
    waybill: '',
    customer: 'Acme Retail',
  });
  renderBooking(undefined, { onSaveDraft: jest.fn().mockResolvedValue({ id: 'draft-pending' }), onBookDraft: bookDraft });
  await prepareSelectedQuoteForBooking();

  fireEvent.click(screen.getByRole('button', { name: 'Book selected courier' }));

  expect(await screen.findByRole('heading', { name: 'Mock booking saved.' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('The mock booking was saved successfully.');
  expect(screen.getByRole('status')).toHaveTextContent('AWB generation is pending. No AWB has been generated.');
  expect(screen.queryByText('BOOKED-DUMMY-PENDING')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Book selected courier' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Booking...' })).not.toBeInTheDocument();
  expect(bookDraft).toHaveBeenCalledTimes(1);
});

test('normal AWB booking still uses the standard success confirmation', async () => {
  const bookDraft = jest.fn().mockResolvedValue({ id: 'REAL-AWB-123', waybill: 'REAL-AWB-123', bookingStatus: 'AWB_GENERATED', customer: 'Acme Retail' });
  renderBooking(undefined, { onSaveDraft: jest.fn().mockResolvedValue({ id: 'draft-awb' }), onBookDraft: bookDraft });
  await prepareSelectedQuoteForBooking();

  fireEvent.click(screen.getByRole('button', { name: 'Book selected courier' }));

  expect(await screen.findByRole('heading', { name: 'Your shipment is ready.' })).toBeInTheDocument();
  expect(screen.getByText(/REAL-AWB-123 has been created/)).toBeInTheDocument();
});

test('genuine booking failure remains an error and does not show pending-AWB success', async () => {
  const failure = Object.assign(new Error('The courier definitively rejected the booking.'), { details: { code: 'BOOKING_REJECTED' } });
  const bookDraft = jest.fn().mockRejectedValue(failure);
  renderBooking(undefined, { onSaveDraft: jest.fn().mockResolvedValue({ id: 'draft-failed' }), onBookDraft: bookDraft });
  await prepareSelectedQuoteForBooking();

  fireEvent.click(screen.getByRole('button', { name: 'Book selected courier' }));

  expect(await screen.findByText('The courier definitively rejected the booking.')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Mock booking saved.' })).not.toBeInTheDocument();
  expect(api.draftBookingStatus).not.toHaveBeenCalled();
});

test('ambiguous booking remains unconfirmed and follows the existing status-recovery path', async () => {
  const failure = Object.assign(new Error('Booking outcome is unconfirmed. Check booking status before retrying.'), { details: { code: 'BOOKING_OUTCOME_UNCONFIRMED' } });
  const bookDraft = jest.fn().mockRejectedValue(failure);
  api.draftBookingStatus.mockResolvedValue({ data: { status: 'OUTCOME_UNCONFIRMED' } });
  renderBooking(undefined, { onSaveDraft: jest.fn().mockResolvedValue({ id: 'draft-ambiguous' }), onBookDraft: bookDraft });
  await prepareSelectedQuoteForBooking();

  fireEvent.click(screen.getByRole('button', { name: 'Book selected courier' }));

  expect(await screen.findByText(/Booking status: OUTCOME_UNCONFIRMED/)).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Mock booking saved.' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Book selected courier' })).toBeDisabled();
  expect(api.draftBookingStatus).toHaveBeenCalledWith('draft-ambiguous');
  expect(bookDraft).toHaveBeenCalledTimes(1);
});
