import { useState } from 'react';
import {
  ArrowRight, Clock3, MapPin, Package, Truck, Plane,
} from 'lucide-react';
import { api, unwrap } from '../../services/api';
import useApiAction from '../../hooks/useApiAction';
import PageHeading from '../ui/PageHeading';

const flows = {
  Forward: {
    status: 'Delivered',
    description: 'Ship from your pickup location to your customer.',
  },
  'Return (RTO)': {
    status: 'RTO',
    description: 'Estimate charges for a shipment returned to its origin.',
  },
  'Reverse Pickup (RVP)': {
    status: 'DTO',
    description: 'Estimate a customer return travelling back to your warehouse.',
  },
};

function responseData(response) {
  let value = unwrap(response);
  if (value && typeof value === 'object' && 'data' in value) {
    value = value.data;
  }
  return value;
}

function readPrice(response) {
  const value = responseData(response);
  const item = Array.isArray(value) ? value[0] : value;
  const price = Number(item?.total_amount);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

function readTat(response) {
  const value = responseData(response);
  const item = Array.isArray(value) ? value[0] : value;
  if (!item || typeof item !== 'object') return null;

  const days = item.tat ?? item.expected_tat ?? item.delivery_days ?? item.days;
  const date = item.expected_delivery_date ?? item.estimated_date ?? item.delivery_date;

  if (days !== undefined && Number.isFinite(Number(days))) {
    return `${Number(days)} day${Number(days) === 1 ? '' : 's'}`;
  }
  if (date) return String(date);
  return null;
}

export default function ShippingCostCalculator({ navigate }) {
  const { busy, error, run } = useApiAction();
  const [flow, setFlow] = useState('Forward');
  const [prices, setPrices] = useState(null);
  const [form, setForm] = useState({
    origin: '',
    destination: '',
    weight: '1',
    payment: 'Prepaid',
  });

  const selectedFlow = flows[flow];

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setPrices(null);
  }

  function calculate(event) {
    event.preventDefault();
    setPrices(null);

    run(async () => {
      const reverse = flow === 'Reverse Pickup (RVP)';
      const returnTrip = flow === 'Return (RTO)';
      const origin = reverse
        ? form.destination.trim()
        : form.origin.trim();
      const destination = reverse
        ? form.origin.trim()
        : form.destination.trim();

      const common = {
        ss: selectedFlow.status,
        o_pin: origin,
        d_pin: destination,
        cgm: Math.round(Number(form.weight) * 1000),
        pt: form.payment === 'COD' ? 'COD' : 'Pre-paid',
      };

      const results = await Promise.allSettled([
        api.cost({ ...common, md: 'S' }),
        api.cost({ ...common, md: 'E' }),
        api.estimate({
          origin_pin: returnTrip ? destination : origin,
          destination_pin: returnTrip ? origin : destination,
          mot: 'S',
        }),
        api.estimate({
          origin_pin: returnTrip ? destination : origin,
          destination_pin: returnTrip ? origin : destination,
          mot: 'E',
        }),
      ]);

      const next = {
        Surface: results[0].status === 'fulfilled'
          ? readPrice(results[0].value) : null,
        Express: results[1].status === 'fulfilled'
          ? readPrice(results[1].value) : null,
        SurfaceTat: results[2].status === 'fulfilled'
          ? readTat(results[2].value) : null,
        ExpressTat: results[3].status === 'fulfilled'
          ? readTat(results[3].value) : null,
      };

      setPrices(next);

      if (next.Surface === null && next.Express === null) {
        throw new Error(
          'No valid rate was returned. Check the pincodes and try again.'
        );
      }
    });
  }

  function createOrder(mode) {
    navigate('create', {
      prefill: {
        flow,
        mode,
        origin: form.origin.trim(),
        pincode: flow === 'Reverse Pickup (RVP)'
          ? form.origin.trim()
          : form.destination.trim(),
        weight: form.weight,
        payment: flow === 'Reverse Pickup (RVP)'
          ? 'Pickup'
          : form.payment,
      },
    });
  }

  return (
    <div className="rate-calculator">
      <PageHeading
        title="Rate calculator & serviceability"
        description="Calculate shipping charges between two locations."
      />

      <div className="rate-flow-tabs" role="tablist" aria-label="Shipment type">
        {Object.keys(flows).map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={flow === name}
            className={flow === name ? 'active' : ''}
            onClick={() => {
              setFlow(name);
              setPrices(null);
            }}
          >
            {name}
          </button>
        ))}
      </div>

      <p className="rate-flow-description">{selectedFlow.description}</p>

      <div className="rate-layout">
        <section className="card rate-form-card">
          <div className="rate-eyebrow">LOCATION DETAILS</div>
          <h2>{flow === 'Reverse Pickup (RVP)' ? 'Return journey' : 'Shipment journey'}</h2>

          <form onSubmit={calculate}>
            <label className="rate-field">
              <span><MapPin size={16} /> {flow === 'Reverse Pickup (RVP)' ? 'Seller warehouse pincode' : 'Pickup pincode'}</span>
              <input
                name="origin"
                value={form.origin}
                onChange={update}
                placeholder="Enter 6-digit pincode"
                inputMode="numeric"
                pattern="[1-9][0-9]{5}"
                maxLength={6}
                required
              />
            </label>

            <label className="rate-field">
              <span><MapPin size={16} /> {flow === 'Reverse Pickup (RVP)' ? 'Customer pincode' : 'Delivery pincode'}</span>
              <input
                name="destination"
                value={form.destination}
                onChange={update}
                placeholder="Enter 6-digit pincode"
                inputMode="numeric"
                pattern="[1-9][0-9]{5}"
                maxLength={6}
                required
              />
            </label>

            <div className="rate-eyebrow">PACKAGE DETAILS</div>
            <div className="rate-form-row">
              <label className="rate-field">
                <span><Package size={16} /> Weight (kg)</span>
                <input
                  name="weight"
                  type="number"
                  value={form.weight}
                  onChange={update}
                  min="0.1"
                  max="1000"
                  step="0.1"
                  required
                />
              </label>

              <label className="rate-field">
                <span>Payment type</span>
                <select name="payment" value={form.payment} onChange={update}>
                  <option value="Prepaid">Prepaid</option>
                  <option value="COD">Cash on delivery</option>
                </select>
              </label>
            </div>

            <button className="rate-primary-button" type="submit" disabled={busy}>
              {busy ? 'Checking rates...' : 'Calculate shipping'}
              <ArrowRight size={17} />
            </button>
          </form>

          {error && <p className="rate-error" role="alert">{error}</p>}
        </section>

        <section className="rate-results">
          <div className="rate-results-heading">
            <div>
              <div className="rate-eyebrow">SHIPPING OPTIONS</div>
              <h2>Choose your service</h2>
            </div>
            <span className="rate-live-label">API rate check</span>
          </div>

          {!prices ? (
            <div className="rate-empty">
              <div className="rate-empty-icon"><Package size={30} /></div>
              <h3>Your shipping rates will appear here</h3>
              <p>Enter the location and package details, then calculate shipping.</p>
            </div>
          ) : (
            <div className="rate-service-list">
              {[
                { name: 'Surface', Icon: Truck },
                { name: 'Express', Icon: Plane },
              ].map(({ name, Icon }) => (
                <article className="rate-service-card" key={name}>
                  <div className="rate-service-icon"><Icon size={22} /></div>
                  <div className="rate-service-info">
                    <h3>{name} Shipping</h3>
                    <p>{name === 'Surface' ? 'Road transport' : 'Express transport'}</p>
                    <span className="rate-service-note">
                      <Clock3 size={13} />
                      Delivery estimate: {prices[`${name}Tat`] || 'Not available'}
                    </span>
                  </div>
                  <div className="rate-service-action">
                    {prices[name] !== null ? (
                      <>
                        <strong className="rate-price">₹{prices[name].toFixed(2)}</strong>
                        <button
                          type="button"
                          className="rate-order-button"
                          onClick={() => createOrder(name)}
                        >
                          Create Order <ArrowRight size={15} />
                        </button>
                      </>
                    ) : (
                      <span className="rate-unavailable">Rate unavailable</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="rate-disclaimer">
            Rates are approximate estimates from Delhivery. Final charges may differ.
            Verify shipment type and route before creating an order.
          </p>
        </section>
      </div>
    </div>
  );
}
