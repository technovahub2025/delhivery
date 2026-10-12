import { api, unwrap } from '../../services/api';
import useApiAction from '../../hooks/useApiAction';
import ApiResult from '../ui/ApiResult';
import { ArrowRight, Clock3, MapPin, Package } from 'lucide-react';
import { useState } from 'react';

import { Button, Empty, Field, Skeleton } from '../ui';
import PageHeading from '../ui/PageHeading';

export default function ShippingToolPanel({ type }) {
  const { busy, error, run } = useApiAction();
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState('Standard');
  const titles = {
    pincode: ['Pincode serviceability', 'Find out where your next delivery can go.', MapPin],
    estimate: ['Expected delivery time', 'A little clarity for the journey ahead.', Clock3],
    calculator: ['Shipping cost calculator', 'Know your shipping costs before you send.', Package],
  };
  const [title, description, Icon] = titles[type];
  function submit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setResult(null);
    run(async () => {
      const response =
        type === 'pincode'
          ? await api.pincode(data.pincode, tab === 'Heavy')
          : type === 'estimate'
            ? await api.estimate({
                origin_pin: data.origin,
                destination_pin: data.destination,
                mot: data.mode === 'Surface' ? 'S' : 'E',
              })
            : await api.cost({
                md: data.mode === 'Surface' ? 'S' : 'E',
                ss: data.status,
                d_pin: data.destination,
                o_pin: data.origin,
                cgm: Math.round(Number(data.weight) * 1000),
                pt: data.payment === 'Prepaid' ? 'Pre-paid' : 'COD',
              });
      setResult(response);
    });
  }
  return (
    <>
      <PageHeading title={title} description={description} />
      <div className="tool-layout">
        <section className="card tool-form">
          <span className="tool-icon">
            <Icon size={26} />
          </span>
          <h2>{type === 'pincode' ? 'Where are we delivering?' : 'Plan your shipment'}</h2>
          <p className="muted">Enter your shipment details to check with the shipping service.</p>
          {type === 'pincode' && (
            <div className="segmented">
              {['Standard', 'Heavy'].map((t) => (
                <button
                  disabled={busy}
                  key={t}
                  className={tab === t ? 'active' : ''}
                  onClick={() => {
                    setTab(t);
                    setResult(null);
                  }}
                >
                  {t} shipment
                </button>
              ))}
            </div>
          )}
          <form onSubmit={submit}>
            {type === 'pincode' ? (
              <Field
                label="Destination pincode"
                name="pincode"
                placeholder="e.g. 400001"
                pattern="[1-9][0-9]{5}"
                title="Enter a valid 6-digit pincode"
                required
              />
            ) : (
              <>
                <div className="form-grid">
                  <Field
                    label="Origin pincode"
                    name="origin"
                    placeholder="110001"
                    pattern="[1-9][0-9]{5}"
                    title="Enter a valid 6-digit pincode"
                    required
                  />
                  <Field
                    label="Destination pincode"
                    name="destination"
                    placeholder="400001"
                    pattern="[1-9][0-9]{5}"
                    title="Enter a valid 6-digit pincode"
                    required
                  />
                </div>
                <Field label="Transport mode">
                  <select name="mode">
                    <option>Express</option>
                    <option>Surface</option>
                  </select>
                </Field>
                {type === 'calculator' && (
                  <>
                    <Field
                      label="Package weight (kg)"
                      name="weight"
                      type="number"
                      min="0.1"
                      max="1000"
                      step="0.1"
                      placeholder="1.0"
                      required
                    />
                    <div className="form-grid">
                      <Field label="Shipment status">
                        <select name="status">
                          <option>Delivered</option>
                          <option>RTO</option>
                          <option>DTO</option>
                        </select>
                      </Field>
                      <Field label="Payment type">
                        <select name="payment">
                          <option>Prepaid</option>
                          <option>COD</option>
                        </select>
                      </Field>
                    </div>
                  </>
                )}
              </>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {type === 'pincode'
                ? 'Check serviceability'
                : type === 'estimate'
                  ? 'Estimate delivery'
                  : 'Calculate shipping'}
              <ArrowRight size={17} />
            </Button>
          </form>
        </section>
        <section className="card tool-result">
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {busy ? (
            <Skeleton />
          ) : result ? (
            <>
              <h2>
                {type === 'pincode' && typeof result.serviceable === 'boolean'
                  ? result.serviceable
                    ? 'Pincode found in the delivery network'
                    : 'No serviceable locations found'
                  : 'Shipping results'}
              </h2>
              <ApiResult value={unwrap(result)} />
            </>
          ) : (
            <Empty
              title="Your results will appear here"
              description="Enter the details and submit your request."
            />
          )}
        </section>
      </div>
    </>
  );
}
