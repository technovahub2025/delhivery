import { Package } from 'lucide-react';

export default function ShippingLabel({ shipment: s }) {
  return (
    <div className="shipping-label">
      <div className="label-brand">
        <strong>
          <Package size={21} />
          Powered by Technovahub
        </strong>
        <span>{s.mode.toUpperCase()}</span>
      </div>
      <div className="label-route">
        <strong>
          {s.warehouse} &rarr; {s.destination}
        </strong>
        <span>{s.payment}</span>
      </div>
      <small>SHIP TO</small>
      <h3>{s.customer}</h3>
      <p>
        {s.address}
        <br />
        {s.destination} — <strong>{s.pincode}</strong>
        <br />
        Phone: {s.phone}
      </p>
      <div className="label-meta">
        <span>WT: {s.weight} KG</span>
        <span>REF: {s.reference}</span>
      </div>
      <div className="barcode" aria-label="Decorative sample barcode" />
      <div className="barcode-number">{s.id}</div>
      <div className="label-from">
        <small>SHIP FROM</small>
        <p>{s.warehouse}</p>
      </div>
      <div className="sample-stamp">SAMPLE — NOT VALID FOR SHIPPING</div>
    </div>
  );
}
