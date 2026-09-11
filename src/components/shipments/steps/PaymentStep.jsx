import { Field } from '../../ui';
import ShipmentFormField from '../ShipmentFormField';

export default function PaymentStep({ data, setData }) {
  function field(label, name, extra = {}) {
    return (
      <ShipmentFormField label={label} name={name} data={data} onChange={setData} {...extra} />
    );
  }
  return (
    <>
      {field('Order value (₹)', 'value', { type: 'number', min: 1, step: '0.01' })}
      <div className="form-grid">
        <Field label="Payment type">
          <select
            value={data.payment}
            onChange={(e) => setData({ ...data, payment: e.target.value })}
          >
            <option>Prepaid</option>
            <option>COD</option>
          </select>
        </Field>
        <Field label="Transport mode">
          <select value={data.mode} onChange={(e) => setData({ ...data, mode: e.target.value })}>
            <option>Express</option>
            <option>Surface</option>
          </select>
        </Field>
      </div>
      <div className="info-box">
        {data.payment === 'COD'
          ? 'The order value is the amount to collect on delivery.'
          : 'This shipment is marked as prepaid. No payment will be processed.'}
      </div>
    </>
  );
}
