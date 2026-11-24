import { ArrowRight, Package } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import ShipmentCreatedConfirmation from '../../components/shipments/ShipmentCreatedConfirmation';
import DeliveryDestinationStep from '../../components/shipments/steps/DeliveryDestinationStep';
import PackageDetailsStep from '../../components/shipments/steps/PackageDetailsStep';
import PaymentStep from '../../components/shipments/steps/PaymentStep';
import PickupWarehouseStep from '../../components/shipments/steps/PickupWarehouseStep';
import RecipientDetailsStep from '../../components/shipments/steps/RecipientDetailsStep';
import ShipmentReviewStep from '../../components/shipments/steps/ShipmentReviewStep';
import SavedPartySection from '../../components/shipments/steps/SavedPartySection';
import useApiAction from '../../hooks/useApiAction';

import { Button } from '../../components/ui';
import { api, unwrap } from '../../services/api';

function OrderSummary({ data, setData, warehouses, suppressCarrierLookups, customers }) {
  const [prices, setPrices] = useState({
    Surface: null,
    Express: null,
  });
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [rateCard, setRateCard] = useState(null);
  const [customerPricing, setCustomerPricing] = useState(null);
  const [customerPricingError, setCustomerPricingError] = useState('');

  const selectedWarehouse = warehouses.find(
    (warehouse) => warehouse.name === data.warehouse
  );

  const originPincode = String(selectedWarehouse?.pincode || '').trim();
  const destinationPincode = String(data.pincode || '').trim();

  const chargeableWeightKg = Number(data.chargeableWeightKg);
  const chargeableWeightGrams = Math.round(chargeableWeightKg * 1000);

  const selectedCustomer = customers.find(customer => customer.id === data.bookingCustomerId);
  useEffect(() => {
    let active = true;
    setRateCard(null);
    setCustomerPricing(null);
    setCustomerPricingError('');
    if (!selectedCustomer?.rateCardId) return () => { active = false; };
    api.rateCard(selectedCustomer.rateCardId).then(result => {
      if (!active) return;
      const card = unwrap(result).rateCard;
      setRateCard(card || null);
      const zones = card?.zoneRates || [];
      setData(current => ({ ...current, destinationZone: current.destinationZone && zones.some(row => row.zone === current.destinationZone) ? current.destinationZone : zones.length === 1 ? zones[0].zone : '' }));
    }).catch(error => { if (active) setCustomerPricingError(error.message || 'Rate card could not be loaded.'); });
    return () => { active = false; };
  }, [selectedCustomer?.id, selectedCustomer?.rateCardId, setData]);

  useEffect(() => {
    let active = true;
    if (!data.bookingCustomerId || !data.destinationZone || !Number.isFinite(chargeableWeightKg) || chargeableWeightKg <= 0) {
      setCustomerPricing(null);
      return () => { active = false; };
    }
    const controller = new AbortController();
    setCustomerPricingError('');
    api.pricingPreview({ customerId: data.bookingCustomerId, zone: data.destinationZone, chargeableWeight: chargeableWeightKg, paymentType: data.payment === 'COD' ? 'COD' : 'Prepaid', codAmount: data.payment === 'COD' ? Number(data.value || 0) : 0 }, controller.signal)
      .then(result => { if (active) setCustomerPricing(unwrap(result).pricing || null); })
      .catch(error => { if (active && error.name !== 'AbortError') setCustomerPricingError(error.message || 'Customer pricing preview is unavailable.'); });
    return () => { active = false; controller.abort(); };
  }, [data.bookingCustomerId, data.destinationZone, chargeableWeightKg, data.payment, data.value]);

  useEffect(() => {
    let cancelled = false;

    async function fetchPrices() {
      if (suppressCarrierLookups) {
        setPrices({ Surface: null, Express: null });
        setPriceError('');
        setPriceLoading(false);
        return;
      }
      if (
        !/^\d{6}$/.test(originPincode) ||
        !/^\d{6}$/.test(destinationPincode) ||
        !Number.isFinite(chargeableWeightKg) ||
        chargeableWeightKg <= 0
      ) {
        setPrices({
          Surface: null,
          Express: null,
        });
        setPriceError('');
        return;
      }

      setPriceLoading(true);
      setPriceError('');

      try {
        const paymentType =
          data.payment === 'COD' ? 'COD' : 'Pre-paid';

        const baseQuery = {
          ss: 'Delivered',
          d_pin: destinationPincode,
          o_pin: originPincode,
          cgm: chargeableWeightGrams,
          pt: paymentType,
        };

        const results = await Promise.allSettled([
          api.cost({
            ...baseQuery,
            md: 'S',
          }),
          api.cost({
            ...baseQuery,
            md: 'E',
          }),
        ]);

        const getPrice = (result) => {
          if (result.status !== 'fulfilled') throw result.reason;
          const response = unwrap(result.value);
          const amount = Number(Array.isArray(response) ? response[0]?.total_amount : response?.total_amount);
          if (!Number.isFinite(amount) || amount <= 0) throw new Error('Delhivery did not return a valid shipping price.');
          return amount;
        };
        const nextPrices = results.map((result) => {
          try { return getPrice(result); } catch { return null; }
        });
        const failures = results.flatMap((result, index) => {
          try { getPrice(result); return []; } catch (error) {
            const mode = index === 0 ? 'Surface' : 'Express';
            return [`${mode}: ${error?.message || 'Delhivery estimate is unavailable.'}`];
          }
        });

        if (!cancelled) {
          setPrices({
            Surface: nextPrices[0],
            Express: nextPrices[1],
          });
          setPriceError(failures.join(' '));
        }
      } catch (error) {
        if (!cancelled) {
          setPrices({
            Surface: null,
            Express: null,
          });
          setPriceError(
            error?.message ||
              'Unable to fetch shipping prices from Delhivery.'
          );
        }
      } finally {
        if (!cancelled) {
          setPriceLoading(false);
        }
      }
    }

    fetchPrices();

    return () => {
      cancelled = true;
    };
  }, [
    originPincode,
    destinationPincode,
    chargeableWeightKg,
    chargeableWeightGrams,
    data.payment,
    suppressCarrierLookups,
  ]);
  const boxCount = data.boxes?.length
    ? data.boxes.reduce(
        (total, box) => total + Math.max(1, Number(box.boxes) || 1),
        0
      )
    : Number(data.quantity) || 1;

  const chargeableWeight =
    Number(data.chargeableWeightKg) > 0
      ? `${Number(data.chargeableWeightKg).toFixed(2)} kg`
      : '-';

  const destination =
    data.destination || data.pincode || data.address || '-';

  // The pricing preview and the cost lookup describe the same mode-specific
  // estimate. Keep the cards in sync with the already calculated preview when
  // the cost request has not produced a separate value yet.
  const modePrice = (mode) => {
    const providerPrice = prices[mode];
    if (Number.isFinite(providerPrice) && providerPrice > 0) return providerPrice;
    const previewPrice = Number(customerPricing?.customerSelling?.[mode.toUpperCase()]?.sellingPrice);
    return Number.isFinite(previewPrice) && previewPrice > 0 ? previewPrice : null;
  };
  const surfacePrice = modePrice('Surface');
  const expressPrice = modePrice('Express');

  return (
    <aside className="order-summary-card">
      <div className="order-summary-header">
        <Package size={18} />
        <h3>Order Summary</h3>
      </div>

      <div className="order-summary-divider" />

      <section aria-label="Customer selling price">
        {selectedCustomer && <p role="status">Selected customer: <strong>{selectedCustomer.displayName || selectedCustomer.companyName}</strong></p>}
        <h4>Customer selling price (separate from Delhivery cost)</h4>
        {rateCard?.zoneRates?.length > 0 && <label className="field"><span>Rate destination zone</span><select aria-label="Rate destination zone" value={data.destinationZone || ''} onChange={event => setData(current => ({ ...current, destinationZone: event.target.value }))}><option value="">Select configured zone</option>{rateCard.zoneRates.map((item, index) => <option key={`${item.zone}-${index}`} value={item.zone}>{item.zone}</option>)}</select></label>}
        {customerPricingError && <p role="alert">{customerPricingError}</p>}
        {!data.bookingCustomerId && <p>Select a customer to preview its assigned rate card.</p>}
        {customerPricing && <>
          <p role="status">Pricing status: <strong>{customerPricing.status}</strong></p>
          {['SURFACE', 'EXPRESS'].map(mode => <p key={mode}>{mode}: {customerPricing.customerSelling?.[mode]?.sellingPrice == null ? 'Unavailable' : `${customerPricing.card?.currency || ''} ${customerPricing.customerSelling[mode].sellingPrice.toFixed(2)}`} ({customerPricing.customerSelling?.[mode]?.status || customerPricing.status})</p>)}
          {customerPricing.blockers?.length > 0 && <ul>{customerPricing.blockers.map((reason, index) => <li key={index}>{reason}</li>)}</ul>}
          {customerPricing.status === 'TEST' && <p>DEFAULT/TEST pricing; not client-approved.</p>}
        </>}
      </section>

      <div className="order-summary-divider" />

      <div className="order-summary-row">
        <span>Pickup from:</span>
        <strong>{data.warehouse || '-'}</strong>
      </div>

      <div className="order-summary-row">
        <span>Deliver to:</span>
        <strong>{destination}</strong>
      </div>

      <div className="order-summary-row">
        <span>Box / item count:</span>
        <strong>{boxCount}</strong>
      </div>

      <div className="order-summary-row">
        <span>Payment type:</span>
        <strong>{data.payment || 'Prepaid'}</strong>
      </div>

      <div className="order-summary-row">
        <span className="summary-weight-label">
          Chargeable Weight
          <span className="summary-info">i</span>
        </span>
        <strong>{chargeableWeight}</strong>
      </div>

      <div className="order-summary-divider" />

      <div className="shipping-method-title">
        Shipping method
      </div>

      <div className="shipping-method-grid">
        <button
          type="button"
          className={`shipping-method ${
            data.mode === 'Surface' ? 'selected' : ''
          }`}
          onClick={() =>
            setData((draft) => ({
              ...draft,
              mode: 'Surface',
            }))
          }
        >
          <div className="shipping-method-main">
            <span className="shipping-method-icon">&#128666;</span>
            <span>Surface</span>
          </div>

          <strong className="shipping-method-price">
            {priceLoading
              ? 'Loading...'
              : surfacePrice !== null
                ? `\u20B9${surfacePrice.toFixed(2)}`
                : 'Price unavailable'}
          </strong>

          <span
            className={`shipping-radio ${
              data.mode === 'Surface' ? 'checked' : ''
            }`}
          />
        </button>

        <button
          type="button"
          className={`shipping-method ${
            data.mode === 'Express' ? 'selected' : ''
          }`}
          onClick={() =>
            setData((draft) => ({
              ...draft,
              mode: 'Express',
            }))
          }
        >
          <div className="shipping-method-main">
            <span className="shipping-method-icon">&#9992;</span>
            <span>Express</span>
          </div>

          <strong className="shipping-method-price">
            {priceLoading
              ? 'Loading...'
              : expressPrice !== null
                ? `\u20B9${expressPrice.toFixed(2)}`
                : 'Price unavailable'}
          </strong>

          <span
            className={`shipping-radio ${
              data.mode === 'Express' ? 'checked' : ''
            }`}
          />
        </button>
      </div>

      {priceError && (
        <p className="shipping-price-error" role="alert">
          {priceError}
        </p>
      )}

      {(prices.Surface !== null || prices.Express !== null) && <p className="shipping-price-hint">Delhivery provider estimates; these are separate from the customer selling price and are not final partner costs.</p>}

      {!priceLoading &&
        !priceError &&
        prices.Surface === null &&
        prices.Express === null && (
          <p className="shipping-price-hint">
            {suppressCarrierLookups
              ? 'Compare couriers to view current Delhivery estimates.'
              : 'Enter the delivery pincode and package weight to fetch current Delhivery estimates.'}
          </p>
        )}
    </aside>
  );
}

export default function CreateShipmentPage({ warehouses, warehouseLoading = false, reloadWarehouses, notify, onCreate, onSaveDraft, onBookDraft, drafts = [], onLoadDrafts, navigate, dashboardFilter, prefill = null }) {
  const { busy, error, run } = useApiAction();
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState('');
  const [draftId, setDraftId] = useState(prefill?.draftId || (prefill?.formData ? prefill.id : ''));
  const [draftMode, setDraftMode] = useState(Boolean(prefill?.draftId || prefill?.formData));
  const from = dashboardFilter?.target === 'pendingAwb' ? dashboardFilter.from : '';
  const to = dashboardFilter?.target === 'pendingAwb' ? dashboardFilter.to : '';
  const [queuePage, setQueuePage] = useState(1);
  const [queueResult, setQueueResult] = useState(null);
  const [queueRevision, setQueueRevision] = useState(0);
  const queue = queueResult?.drafts || drafts;
  const refreshQueue = () => setQueueRevision((value) => value + 1);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState('');
  const [quoteBatches, setQuoteBatches] = useState(prefill?.partnerQuoteBatches || []);
  const [selectedPartnerQuote, setSelectedPartnerQuote] = useState(prefill?.selectedPartnerQuote || null);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [quotesError, setQuotesError] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingStatus, setBookingStatus] = useState(null);
  const [recoveredWaybill, setRecoveredWaybill] = useState('');
  const bookingInFlight = useRef(false);
  const reconciliationInFlight = useRef(false);
  const [draftState, setDraftState] = useState(prefill?.state || 'draft');
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [directBookingEnabled, setDirectBookingEnabled] = useState(false);
  const [directBookingConfigLoaded, setDirectBookingConfigLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api.directBookingConfiguration(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setDirectBookingEnabled(result?.directBookingEnabled === true);
          setDirectBookingConfigLoaded(true);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setDirectBookingEnabled(false);
          setDirectBookingConfigLoaded(true);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    api.customers({ page: 1, limit: 100 }, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setCustomers(result?.data?.customers || []); })
      .catch((loadError) => { if (!controller.signal.aborted && loadError?.name !== 'AbortError') setCustomersError(loadError?.message || 'Customers could not be loaded.'); })
      .finally(() => { if (!controller.signal.aborted) setCustomersLoading(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (prefill?.formData) {
      setData((current) => ({ ...current, ...prefill.formData }));
      setDraftId(prefill.id || prefill.draftId || '');
      setDraftMode(true);
      setQuoteBatches(prefill.partnerQuoteBatches || []);
      setSelectedPartnerQuote(prefill.selectedPartnerQuote || null);
    }
  }, [prefill]);

  useEffect(() => {
    if (!onLoadDrafts) return undefined;
    const request = new AbortController();
    setDraftsLoading(true);
    setDraftsError('');
    onLoadDrafts({ page: queuePage, from, to }, request.signal).then((result) => {
      if (request.signal.aborted || !result?.drafts) return;
      if (!result.drafts.length && queuePage > 1) setQueuePage(queuePage - 1);
      else setQueueResult(result);
    }).catch((loadError) => {
      if (!request.signal.aborted) setDraftsError(loadError?.message || 'Drafts could not be loaded.');
    }).finally(() => { if (!request.signal.aborted) setDraftsLoading(false); });
    return () => request.abort();
  }, [onLoadDrafts, queuePage, from, to, queueRevision]);

  const firstRegisteredWarehouse = warehouses.find((warehouse) => warehouse.registrationStatus === 'REGISTERED');
  const [data, setData] = useState({
    warehouse: firstRegisteredWarehouse?.name || '',
    warehouseId: firstRegisteredWarehouse?.id || '',
    warehouseAddress: firstRegisteredWarehouse?.address || '',
    warehousePincode: firstRegisteredWarehouse?.pincode || '',
    warehouseContact: firstRegisteredWarehouse?.contact || '',
    warehousePhone: firstRegisteredWarehouse?.phone || '',
    reference: '',
    state: '',
    description: '',
    productCategory: '',
    handlingInstructions: '',
    fragile: false,
    quantity: '1',
    customer: '',
    consigneeCompanyName: '',
    consigneeGstin: '',
    bookingCustomerId: '',
    shipperCompanyName: '',
    shipperContactName: '',
    shipperPhone: '',
    shipperEmail: '',
    shipperAddress: '',
    shipperCity: '',
    shipperState: '',
    shipperPincode: '',
    shipperGstin: '',
    pickupChoice: 'warehouse',
    pickupContactName: '',
    pickupPhone: '',
    pickupEmail: '',
    pickupAddress: '',
    pickupCity: '',
    pickupState: '',
    pickupPincode: '',
    email: '',
    phone: '',
    address: '',
    pincode: prefill?.pincode || '',
    pincodeServiceability: null,
    destination: '',
    weight: prefill?.weight || '',
    boxes: [{
      packagingType: 'Cardboard',
      boxes: 1,
      boxPreset: 'custom',
      length: '',
      width: '',
      height: '',
      unit: 'cm',
      weight: prefill?.weight
        ? String(Math.round(Number(prefill.weight) * 1000))
        : '',
      weightUnit: 'gm',
    }],
    actualWeightKg: Number(prefill?.weight) || 0,
    volumetricWeightKg: 0,
    chargeableWeightKg: Number(prefill?.weight) || 0,
    length: '',
    width: '',
    height: '',
    value: '',
    payment: prefill?.payment || 'Prepaid',
    mode: prefill?.mode || 'Express',
    pincodeServiceable: false,
  });

  const selectedCustomer = customers.find((customer) => String(customer.id) === String(data.bookingCustomerId));

  function selectBookingCustomer(customerId) {
    const customer = customers.find((item) => String(item.id) === String(customerId));
    const billing = customer?.billingAddress || {};
    const shipper = {
      shipperCompanyName: customer?.companyName || customer?.displayName || '',
      shipperContactName: customer?.primaryContact?.name || '',
      shipperPhone: customer?.primaryContact?.phone || '',
      shipperEmail: customer?.primaryContact?.email || '',
      shipperAddress: Array.isArray(billing.addressLines) ? billing.addressLines.join(', ') : '',
      shipperCity: billing.city || '',
      shipperState: billing.state || '',
      shipperPincode: billing.pincode || '',
      shipperGstin: customer?.gstin || '',
    };
    setData((current) => ({
      ...current,
      bookingCustomerId: customer ? String(customer.id) : '',
      ...shipper,
      destinationZone: '',
      shipperAddressId: '',
      consigneeAddressId: '',
      pickupAddressId: '',
      ...(current.consigneeAddressId ? {
        consigneeCompanyName: '', consigneeGstin: '', customer: '', phone: '', email: '', address: '',
        pincode: '', destination: '', state: '', pincodeServiceable: false, pincodeServiceability: null,
      } : {}),
      ...(current.pickupAddressId || current.pickupChoice === 'sameAsShipper' ? {
        pickupContactName: current.pickupChoice === 'sameAsShipper' ? shipper.shipperContactName : '',
        pickupPhone: current.pickupChoice === 'sameAsShipper' ? shipper.shipperPhone : '',
        pickupEmail: current.pickupChoice === 'sameAsShipper' ? shipper.shipperEmail : '',
        pickupAddress: current.pickupChoice === 'sameAsShipper' ? shipper.shipperAddress : '',
        pickupCity: current.pickupChoice === 'sameAsShipper' ? shipper.shipperCity : '',
        pickupState: current.pickupChoice === 'sameAsShipper' ? shipper.shipperState : '',
        pickupPincode: current.pickupChoice === 'sameAsShipper' ? shipper.shipperPincode : '',
      } : {}),
    }));
    setQuoteBatches([]);
    setSelectedPartnerQuote(null);
    setQuotesError('');
  }

  useEffect(() => {
    if (warehouseLoading) return;
    const selected = warehouses.find((warehouse) => warehouse.id === data.warehouseId);
    if (selected?.registrationStatus === 'REGISTERED') return;
    const registered = warehouses.find((warehouse) => warehouse.registrationStatus === 'REGISTERED');
    setData((current) => ({
      ...current,
      warehouse: registered?.name || '',
      warehouseId: registered?.id || '',
      warehouseAddress: registered?.address || '',
      warehousePincode: registered?.pincode || '',
      warehouseContact: registered?.contact || '',
      warehousePhone: registered?.phone || '',
    }));
  }, [warehouses, warehouseLoading, data.warehouseId]);

  const [created, setCreated] = useState(null);
  const selectedWarehouseRegistered = warehouses.some(
    (warehouse) => warehouse.id === data.warehouseId && warehouse.registrationStatus === 'REGISTERED'
  );
  const partyAddressMaps = {
    shipper: { companyName: 'shipperCompanyName', contactName: 'shipperContactName', phone: 'shipperPhone', email: 'shipperEmail', addressLines: 'shipperAddress', city: 'shipperCity', state: 'shipperState', pincode: 'shipperPincode', gstin: 'shipperGstin' },
    consignee: { companyName: 'consigneeCompanyName', contactName: 'customer', phone: 'phone', email: 'email', addressLines: 'address', pincode: 'pincode', gstin: 'consigneeGstin' },
    pickup: { contactName: 'pickupContactName', phone: 'pickupPhone', email: 'pickupEmail', addressLines: 'pickupAddress', city: 'pickupCity', state: 'pickupState', pincode: 'pickupPincode' },
  };

  function submit(e) {
    e.preventDefault();

    if (draftMode) {
      setDraftMode(false);
      setData((current) => ({ ...current, pincodeServiceable: false }));
      notify?.('Verify destination serviceability before creating this shipment.');
      return;
    }

    if (!directBookingConfigLoaded || !directBookingEnabled) return;

    if (!data.warehouse || !warehouses.some((warehouse) => warehouse.id === data.warehouseId && warehouse.registrationStatus === 'REGISTERED')) {
      notify?.('Select a backend-confirmed registered warehouse before creating a shipment.');
      return;
    }

    if (!data.pincodeServiceable) {
      notify?.('Please verify that the recipient pincode is serviceable.');
      return;
    }

    const paymentCapability = data.payment === 'COD' ? 'cod' : 'prepaid';
    const serviceability = data.pincodeServiceability;
    if (!serviceability || String(serviceability.pincode) !== String(data.pincode) || serviceability[paymentCapability] !== true) {
      notify?.('Please verify that the recipient pincode is serviceable for the selected payment type.');
      return;
    }

    run(async () => {
      const shipment = await onCreate({
        ...data,
        dimensions: `${data.length} × ${data.width} × ${data.height} cm`,
      });
      setCreated(shipment);
    });
  }

  async function saveDraft() {
    setDraftsError('');
    setDraftMode(true);
    setDraftsLoading(true);
    try {
      const draft = await onSaveDraft?.(data, draftId || null);
      if (draft?.id) {
        setDraftId(draft.id);
        setDraftState(draft.state || 'draft');
        setQuoteBatches(draft.partnerQuoteBatches || quoteBatches);
        setSelectedPartnerQuote(draft.selectedPartnerQuote || null);
      }
      setQueuePage(1);
      refreshQueue();
      notify?.('Draft saved. No shipment was booked.');
    } catch (saveError) {
      setDraftsError(saveError?.message || 'Draft could not be saved.');
    } finally {
      setDraftsLoading(false);
    }
  }

  async function resumeDraft(id) {
    setDraftsError('');
    setDraftsLoading(true);
    try {
      const draft = await api.shipmentDraft(id);
      const value = unwrap(draft).draft;
      if (value?.formData) {
        setDraftMode(true);
        setData((current) => ({ ...current, ...value.formData }));
        setDraftId(value.id);
        setDraftState(value.state || 'draft');
        setQuoteBatches(value.partnerQuoteBatches || []);
        setSelectedPartnerQuote(value.selectedPartnerQuote || null);
        notify?.('Draft opened. Review the details before creating a shipment.');
      }
    } catch (loadError) {
      setDraftsError(loadError?.message || 'Draft could not be opened.');
    } finally {
      setDraftsLoading(false);
    }
  }

  async function requestQuotes() {
    setQuotesError('');
    if (!draftId) {
      setQuotesError('Save this booking as a draft before requesting courier quotations.');
      return;
    }
    setQuotesLoading(true);
    try {
      const response = unwrap(await api.requestDraftCourierQuotes(draftId));
      if (response.quoteBatch) setQuoteBatches((current) => [...current.map(batch => ({ ...batch, archived: true })), response.quoteBatch]);
      if (response.status === 'CONFIGURATION_REQUIRED') setQuotesError(response.message || 'No courier quotation adapters are configured.');
      else if (response.status === 'UNAVAILABLE') setQuotesError('No courier partner returned a quotation.');
      setSelectedPartnerQuote(response.selectedPartnerQuote || null);
    } catch (quoteError) {
      setQuotesError(quoteError?.message || 'Courier quotations could not be loaded.');
    } finally {
      setQuotesLoading(false);
    }
  }

  async function selectQuote(quote) {
    if (!draftId) return;
    setQuotesError('');
    try {
      const response = unwrap(await api.selectDraftCourierQuote(draftId, quote.id));
      setSelectedPartnerQuote(response.selectedPartnerQuote || quote);
      if (response.selectedMode) setData(current => ({ ...current, mode: response.selectedMode }));
    } catch (selectionError) {
      setQuotesError(selectionError?.message || 'Courier selection could not be saved.');
    }
  }

  async function bookSelectedCourier() {
    if (!draftId || !selectedPartnerQuote || !onBookDraft || bookingInFlight.current) return;
    if (!data.warehouse || !warehouses.some((warehouse) => warehouse.id === data.warehouseId && warehouse.registrationStatus === 'REGISTERED') || !data.pincodeServiceable) {
      setQuotesError('Select a registered warehouse and verify destination serviceability before booking.');
      return;
    }
    setQuotesError('');
    bookingInFlight.current = true;
    setRecoveredWaybill('');
    setBookingLoading(true);
    try {
      const shipment = await onBookDraft(draftId);
      setCreated(shipment);
    } catch (bookingError) {
      const code = bookingError?.details?.code;
      const preflightRejected = [
        'BOOKING_PREFLIGHT_FAILED', 'BOOKING_PRICING_CONFIGURATION_REQUIRED', 'BOOKING_CUSTOMER_INVALID',
        'WAREHOUSE_INVALID', 'WAREHOUSE_CHANGED', 'QUOTE_STALE', 'QUOTE_EXPIRED', 'QUOTE_NOT_SERVICEABLE',
        'BOOKING_SERVICEABILITY_UNAVAILABLE', 'BOOKING_QUOTE_UNAVAILABLE', 'COURIER_SELECTION_REQUIRED',
        'BOOKING_ADAPTER_UNAVAILABLE', 'BOOKING_REJECTED', 'DELHIVERY_FEATURE_DISABLED', 'DELHIVERY_MPS_UNAVAILABLE',
      ].includes(code);
      setDraftState(preflightRejected ? 'draft' : 'creating');
      setQuotesError(bookingError?.message || 'Booking outcome is unconfirmed. Check booking status before retrying.');
      if (preflightRejected) { setBookingStatus(null); return; }
      try {
        const status = unwrap(await api.draftBookingStatus(draftId)).status;
        setBookingStatus(status || 'OUTCOME_UNCONFIRMED');
      } catch {
        setBookingStatus('OUTCOME_UNCONFIRMED');
      }
    } finally {
      bookingInFlight.current = false;
      refreshQueue();
      setBookingLoading(false);
    }
  }

  async function reconcileBooking(id = draftId) {
    if (!id || reconciliationInFlight.current || bookingInFlight.current) return;
    reconciliationInFlight.current = true;
    setQuotesError('');
    setRecoveredWaybill('');
    setReconcileLoading(true);
    try {
      const result = unwrap(await api.reconcileDraftBooking(id));
      setBookingStatus(result.status || 'OUTCOME_UNCONFIRMED');
      if (result.status === 'AWB_GENERATED' && result.waybill) setRecoveredWaybill(result.waybill);
      setDraftState(result.retryAllowed ? 'draft' : ['AWB_GENERATED', 'BOOKED_AWB_PENDING'].includes(result.status) ? 'saved' : 'creating');
      if (result.retryAllowed) setSelectedPartnerQuote(null);
      refreshQueue();
    } catch (reconcileError) {
      setQuotesError(reconcileError?.message || 'Booking could not be safely reconciled. Do not retry.');
    } finally {
      reconciliationInFlight.current = false;
      setReconcileLoading(false);
    }
  }

  if (created) {
    return (
      <ShipmentCreatedConfirmation
        created={created}
        navigate={navigate}
      />
    );
  }

  return (
    <div className="create-shipment-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow muted">LET'S GET IT THERE</div>
          <h1>Create a shipment</h1>
          <p>A few simple details. A world of possibilities.</p>
        </div>

        <Button
          variant="secondary"
          onClick={() => navigate('shipments')}
        >
          Back to shipments
        </Button>
      </div>

      <div className="wizard-layout">
        <section className="card wizard-card">
          <form onSubmit={submit}>
  <fieldset
    disabled={busy || draftState === 'creating' || draftState === 'saved'}
    style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
  >
    {!warehouses.some((warehouse) => warehouse.registrationStatus === 'REGISTERED') && (
      <div className="info-box">
        Register a warehouse and wait for backend confirmation before booking.
        <Button type="button" onClick={() => navigate('warehouses')}>
          Add warehouse
        </Button>
      </div>
    )}

    {error && <p className="error" role="alert">{error}</p>}

    <section className="create-order-section booking-section" aria-labelledby="drafts-heading">
      <h2 id="drafts-heading" className="booking-section-heading">Pending AWB drafts</h2>
      {draftsLoading && <p className="muted" role="status">Loading drafts...</p>}
      {draftsError && <p className="error" role="alert">{draftsError}</p>}
      {!draftsLoading && queue.length > 0 && <ul>{queue.map((draft) => <li key={draft.id}>
        <span>{draft.formData?.reference || draft.reference} · {draft.updatedAt ? new Date(draft.updatedAt).toLocaleString() : 'Draft'} · {draft.state === 'creating' ? (draft.bookingAttempt?.status || 'OUTCOME_UNCONFIRMED') : draft.state === 'saved' ? 'Booked, AWB pending' : draft.state}</span>
        {(draft.state === 'creating' || (draft.state === 'saved' && draft.bookingAttempt?.providerReference)) ? <Button type="button" variant="secondary" disabled={reconcileLoading || bookingLoading} onClick={() => { setDraftId(draft.id); setDraftState('creating'); setBookingStatus(draft.bookingAttempt?.status || 'OUTCOME_UNCONFIRMED'); reconcileBooking(draft.id); }}>Reconcile booking</Button> : (draft.state || 'draft') === 'draft' ? <Button type="button" variant="secondary" onClick={() => resumeDraft(draft.id)}>Open draft</Button> : null}
      </li>)}</ul>}
      {!draftsLoading && !draftsError && !queue.length && <p className="muted">No pending drafts.</p>}
      {draftsError && <Button type="button" variant="secondary" onClick={refreshQueue}>Retry pending AWB list</Button>}
      {(queuePage > 1 || queueResult?.hasMore) && <div aria-label="Pending AWB pagination">
        <Button type="button" variant="secondary" disabled={draftsLoading || queuePage === 1} onClick={() => setQueuePage(queuePage - 1)}>Previous page</Button>
        <span>Page {queuePage}</span>
        <Button type="button" variant="secondary" disabled={draftsLoading || !queueResult?.hasMore || Boolean(draftsError)} onClick={() => setQueuePage(queuePage + 1)}>Next page</Button>
      </div>}
    </section>

    <section className="create-order-section booking-section" aria-labelledby="courier-comparison-heading">
      <h3 id="courier-comparison-heading" className="booking-section-heading">Courier comparison</h3>
      <div className="create-order-section-body">
        <p className="muted">Customer selling prices use the assigned rate card and remain separate from Delhivery partner cost estimates.</p>
        {!draftId && <p className="muted">Save the booking as a draft before requesting quotations.</p>}
        <div className="courier-comparison-actions">
          <Button type="button" variant="secondary" disabled={!draftId || quotesLoading || draftsLoading} onClick={() => requestQuotes()}>
            {quotesLoading ? 'Requesting quotations...' : 'Compare couriers'}
          </Button>
        </div>
        {quotesError && <p role="status" className="muted">{quotesError}</p>}
        {selectedPartnerQuote && <p role="status">Selected courier: <strong>{selectedPartnerQuote.partnerName}</strong> · {selectedPartnerQuote.serviceName} · {selectedPartnerQuote.currency} {Number(selectedPartnerQuote.partnerTotal ?? selectedPartnerQuote.amount).toFixed(2)} · {selectedPartnerQuote.partnerCode === 'DELHIVERY' ? 'Live Delhivery estimate. Final partner cost is unconfirmed.' : 'Provider estimate. Final partner cost is unconfirmed.'}</p>}
        {selectedPartnerQuote && <Button type="button" disabled={!onBookDraft || bookingLoading || selectedPartnerQuote.bookable === false || draftState !== 'draft' || !data.warehouse || !warehouses.some((warehouse) => warehouse.id === data.warehouseId && warehouse.registrationStatus === 'REGISTERED') || !data.pincodeServiceable} onClick={bookSelectedCourier}>{bookingLoading ? 'Booking...' : 'Book selected courier'}</Button>}
        {bookingStatus && <p role="status">Booking status: {bookingStatus}{recoveredWaybill && ' · AWB ' + recoveredWaybill}{bookingStatus !== 'AWB_GENERATED' && '. Do not retry unless the booking outcome is definitively confirmed as not found.'}</p>}
        {quoteBatches.map((batch) => <div key={batch.id} className="courier-quote-batch">
          <p>{batch.archived ? 'Historical quotation' : 'Quotation set'} · {batch.requestedAt ? new Date(batch.requestedAt).toLocaleString() : batch.status}</p>
          {batch.performanceUnavailable && <p className="muted">Historical courier performance is temporarily unavailable.</p>}
          {batch.historicalPerformance?.length > 0 && <section aria-label="Historical courier performance">
            <p className="muted">Performance from this account's recorded forward shipments at the time of comparison.</p>
            <ul>{batch.historicalPerformance.map(row => <li key={row.code}>
              <strong>{row.name}</strong> ? {row.mappedCount > 0
                ? `${row.deliveredCount} delivered, ${row.exceptionCount} exceptions, ${row.mappedCount} mapped out of ${row.shipmentCount}`
                : `No mapped tracking outcomes (${row.shipmentCount} saved shipments)`}
            </li>)}</ul>
          </section>}
          {batch.quotes?.map((quote) => <div key={quote.id} className="courier-quote-row">
            <span><strong>{quote.partnerName}</strong> · {quote.serviceName} ({quote.mode || 'Mode unspecified'})</span>
            <span>{quote.currency} {Number(quote.partnerTotal ?? quote.amount).toFixed(2)} · {quote.provenance === 'LOCAL_MOCK' || quote.partnerCode === 'MOCK_LOCAL' ? 'SAMPLE charge, no carrier request' : quote.partnerCode === 'DELHIVERY' ? 'Live Delhivery estimate' : 'Provider estimate'}{quote.eta ? ` · ETA ${quote.eta}` : ''}{quote.serviceable === true ? ' · Serviceable' : quote.serviceable === false ? ' · Not serviceable' : ''}{quote.chargeBreakdown ? ` · Charges ${JSON.stringify(quote.chargeBreakdown)}` : ''}</span>
            <Button type="button" variant="secondary" disabled={batch.archived || draftState !== 'draft' || quote.bookable === false || quote.serviceable === false || selectedPartnerQuote?.id === quote.id} onClick={() => selectQuote(quote)}>
              {batch.archived ? 'Archived quote' : quote.bookable === false ? 'Estimate only' : selectedPartnerQuote?.id === quote.id ? 'Selected' : 'Select courier'}
            </Button>
          </div>)}
          {batch.unavailable?.map((item) => <p key={`${batch.id}-${item.partnerCode}-${item.mode || ''}`} className="muted">{item.partnerName || item.partnerCode}: unavailable{item.reason ? ` — ${item.reason}` : ''}</p>)}
        </div>)}
      </div>
    </section>

    <section className="create-order-section booking-section" aria-labelledby="destination-heading">
      <h2 id="destination-heading" className="booking-section-heading">1. Delivery Destination</h2>
      <div className="create-order-section-body"><DeliveryDestinationStep data={data} setData={setData} /></div>
    </section>

    <section className="create-order-section booking-section" aria-labelledby="shipper-heading">
      <h2 id="shipper-heading" className="booking-section-heading">2. Shipper / Consignor Details</h2>
      <div className="create-order-section-body">
        <label className="field"><span>Customer</span><select aria-label="Booking customer" value={data.bookingCustomerId} onChange={(event) => selectBookingCustomer(event.target.value)}>
          <option value="">No customer selected</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.displayName || customer.companyName || customer.primaryContact?.name || 'Unnamed customer'}</option>)}
        </select></label>
        {customersLoading && <p className="muted" role="status">Loading customers...</p>}
        {customersError && <p className="error" role="alert">{customersError}</p>}
        <SavedPartySection partyType="SHIPPER" title="Shipper" data={data} setData={setData} fieldMap={partyAddressMaps.shipper} customerId={data.bookingCustomerId} fallbackAddresses={selectedCustomer?.shippingAddresses} customerDetails={selectedCustomer} />
      </div>
    </section>

    <section className="create-order-section booking-section" aria-labelledby="consignee-heading">
      <h2 id="consignee-heading" className="booking-section-heading">3. Consignee Details</h2>
      <div className="create-order-section-body">
        <SavedPartySection partyType="CONSIGNEE" title="Consignee" data={data} setData={setData} fieldMap={partyAddressMaps.consignee} customerId={data.bookingCustomerId} showFields={false} />
        <RecipientDetailsStep data={data} setData={setData} />
      </div>
    </section>

    <section className="create-order-section booking-section" aria-labelledby="pickup-heading">
      <h2 id="pickup-heading" className="booking-section-heading">4. Pickup Location</h2>
      <div className="create-order-section-body">
        <PickupWarehouseStep warehouses={warehouses} data={data} setData={setData} reloadWarehouses={reloadWarehouses} notify={notify}>
          <SavedPartySection partyType="PICKUP" title="Pickup" data={data} setData={setData} fieldMap={partyAddressMaps.pickup} customerId={data.bookingCustomerId} />
        </PickupWarehouseStep>
      </div>
    </section>

    <section className="create-order-section booking-section" aria-labelledby="package-heading">
      <h2 id="package-heading" className="booking-section-heading">5. Product &amp; Box Details</h2>
      <div className="create-order-section-body"><PackageDetailsStep data={data} setData={setData} /></div>
    </section>

    <section className="create-order-section booking-section" aria-labelledby="payment-heading">
      <h2 id="payment-heading" className="booking-section-heading">6. Payment Type and Shipping Mode</h2>
      <div className="create-order-section-body"><PaymentStep data={data} setData={setData} /><ShipmentReviewStep data={data} /></div>
    </section>

    <div className="wizard-footer">
      <Button
        type="button"
        variant="secondary"
        onClick={() => navigate('shipments')}
      >
        Back to shipments
      </Button>
      <Button type="button" variant="secondary" disabled={draftsLoading || busy || draftState === 'creating' || draftState === 'saved'} onClick={saveDraft}>
        Save as Draft
      </Button>
      {directBookingConfigLoaded && !directBookingEnabled && <p className="muted" role="status">Direct Delhivery booking is disabled. Save this shipment as a draft and use courier comparison to continue.</p>}
      <Button type="submit" disabled={!data.warehouse || !selectedWarehouseRegistered || busy || !directBookingConfigLoaded || !directBookingEnabled}>
        {busy ? 'Creating shipment...' : 'Create shipment'}
        <ArrowRight size={16} />
      </Button>
    </div>
  </fieldset>
</form>
        {draftId && draftState === 'creating' && <div className="wizard-footer"><Button type="button" variant="secondary" disabled={reconcileLoading} onClick={() => reconcileBooking()}>{reconcileLoading ? 'Checking booking...' : 'Reconcile booking status'}</Button></div>}
        </section>

        <OrderSummary
          data={data}
          setData={setData}
          warehouses={warehouses}
          suppressCarrierLookups={draftMode}
          customers={customers}
        />
      </div>
    </div>
  );
}










