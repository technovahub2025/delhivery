import { Package } from 'lucide-react';

import { money, timeline } from '../../data/demo';
import { Badge, Modal, Timeline } from '../ui';

export default function ShipmentDetailsDrawer({ shipment: s, onClose }) {
  return (
    <Modal title="Shipment details" drawer onClose={onClose}>
      <div className="detail-banner">
        <span className="quick-icon">
          <Package size={26} />
        </span>
        <div>
          <h2>{s.id}</h2>
          <p>{s.reference}</p>
        </div>
        <Badge>{s.status}</Badge>
      </div>
      <div className="detail-section">
        <h3>Recipient details</h3>
        <strong>{s.customer}</strong>
        <p>
          {s.address} — {s.pincode}
        </p>
        <p>
          {s.phone} · {s.email}
        </p>
      </div>
      <div className="detail-section">
        <h3>Package information</h3>
        <div className="detail-grid">
          {[
            ['Weight', `${s.weight} kg`],
            ['Dimensions', s.dimensions],
            ['Payment', s.payment],
            ['Order value', money(s.value)],
            ['Pickup', s.warehouse],
            ['E-waybill', s.ewaybill || 'Not added'],
          ].map(([k, v]) => (
            <div key={k}>
              <small>{k}</small>
              <strong>{v}</strong>
            </div>
          ))}
        </div>
      </div>
      <h3>Tracking timeline</h3>
      {s.status === 'Cancelled' ? (
        <div className="info-box">
          This shipment was cancelled. No further movement is expected.
        </div>
      ) : null}
      <Timeline items={timeline(s)} />
    </Modal>
  );
}
