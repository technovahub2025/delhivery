import { useState } from 'react';
import { ArrowRight, Clock3, MapPin, Package, Truck, Plane } from 'lucide-react';
import { api, unwrap } from '../../services/api';
import useApiAction from '../../hooks/useApiAction';
import PageHeading from '../ui/PageHeading';

function readPrice(response) {
  const value = unwrap(response);
  const item = Array.isArray(value) ? value[0] : value;
  const price = Number(item?.total_amount);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

export default function ShippingCostCalculator({ navigate }) {
  const { busy, error, run } = useApiAction();
  const [prices, setPrices] = useState(null);
  const [form, setForm] = useState({
    origin: '',
    destination: '',
    weight: '1',
    payment: 'Prepaid',
  });

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function calculate(event) {
    event.preventDefault();
    setPrices(null);

    run(async () => {
      const common = {
        ss: 'Delivered',
        o_pin: form.origin.trim(),
        d_pin: form.destination.trim(),
        cgm: Math.round(Number(form.weight) * 1000),
        pt: form.payment === 'COD' ? 'COD' : 'Pre-paid',
      };

      const results = await Promise.allSettled([
        api.cost({ ...common, md: 'S' }),
        api.cost({ ...common, md: 'E' }),
      ]);

      const next = {
        Surface: results[0].status === 'fulfilled'
          ? readPrice(results[0].value)
          : null,
        Express: results[1].status === 'fulfilled'
          ? readPrice(results[1].value)
          : null,
      };

      setPrices(next);

      if (next.Surface === null && next.Express === null) {
        throw new Error('Delhivery did not return a valid price for either service. Please check the details and try again.');
      }
    });
  }

  function createOrder(mode) {
    navigate('create', {
      prefill: {
        mode,
        pincode: form.destination.trim(),
        weight: form.weight,
        payment: form.payment,
      },
    });
  }

  return (
    <div className="rate-calculator">
      <PageHeading
        title="Shipping cost calculator"
        description="Compare available shipping rates before creating your order."
      />

      <div className="rate-layout">
        <section className="card rate-form-card">
          <div className="rate-eyebrow">SHIPMENT DETAILS</div>
          <h2>Calculate your shipping cost</h2>
          <p className="rate-muted">
            Enter your pickup and delivery pincodes to check current rates.
          </p>

          <form onSubmit={calculate}>
            <label className="rate-field">
              <span><MapPin size={16} /> Pickup pincode</span>
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
              <span><MapPin size={16} /> Delivery pincode</span>
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
            <span className="rate-live-label">Live rate check</span>
          </div>

          {!prices ? (
            <div className="rate-empty">
              <div className="rate-empty-icon"><Package size={30} /></div>
              <h3>Your shipping rates will appear here</h3>
              <p>Enter your shipment details and calculate shipping to compare Surface and Express.</p>
            </div>
          ) : (
            <div className="rate-service-list">
              {[
                { name: 'Surface', Icon: Truck, description: 'Surface transport' },
                { name: 'Express', Icon: Plane, description: 'Express transport' },
              ].map(({ name, Icon, description }) => (
                <article className="rate-service-card" key={name}>
                  <div className="rate-service-icon"><Icon size={22} /></div>
                  <div className="rate-service-info">
                    <h3>{name} Shipping</h3>
                    <p>{description}</p>
                    <span className="rate-service-note">
                      <Clock3 size={13} /> Delivery time not provided by this rate check
                    </span>
                  </div>
                  <div className="rate-service-action">
                    {prices[name] !== null ? (
                      <>
                        <strong className="rate-price">
                          ₹{prices[name].toFixed(2)}
                        </strong>
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
            Rates are based on the response from Delhivery. Final charges may differ
            after shipment details and applicable charges are verified.
          </p>
        </section>
      </div>
    </div>
  );
}
