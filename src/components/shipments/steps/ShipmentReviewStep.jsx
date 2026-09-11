import { money } from '../../../data/demo';

export default function ShipmentReviewStep({ data }) {
  return (
    <div className="review-grid">
      {[
        ['Pickup warehouse', data.warehouse],
        ['Order reference', data.reference],
        ['Products', `${data.quantity} x ${data.description}`],
        ['State', data.state],
        ['Recipient', data.customer],
        ['Address', `${data.address}, ${data.destination} — ${data.pincode}`],
        ['Contact', `${data.phone} · ${data.email}`],
        ['Package', `${data.weight} kg · ${data.length} × ${data.width} × ${data.height} cm`],
        ['Payment', `${data.payment} · ${money(data.value)}`],
        ['Transport', data.mode],
      ].map(([k, v]) => (
        <div key={k}>
          <small>{k}</small>
          <strong>{v}</strong>
        </div>
      ))}
    </div>
  );
}
