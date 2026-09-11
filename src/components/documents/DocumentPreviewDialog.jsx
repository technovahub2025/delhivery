import { money } from '../../data/demo';
import { Modal } from '../ui';
import ShippingLabel from './ShippingLabel';

export default function DocumentPreviewDialog({ preview, setPreview, s }) {
  return (
    <Modal title={preview} onClose={() => setPreview(null)}>
      {preview === 'Shipping label' ? (
        <ShippingLabel shipment={s} />
      ) : (
        <div className="document-preview">
          <span className="eyebrow text-orange">Powered by Technovahub · SAMPLE DOCUMENT</span>
          <h2>{preview}</h2>
          <p>
            {s.id} · {s.reference}
          </p>
          <hr />
          <h3>{s.customer}</h3>
          <p>
            {s.address} — {s.pincode}
          </p>
          <div className="availability">
            <div>
              <span>Package</span>
              <strong>{s.weight} kg</strong>
            </div>
            <div>
              <span>Dimensions</span>
              <strong>{s.dimensions}</strong>
            </div>
            <div>
              <span>Order value</span>
              <strong>{money(s.value)}</strong>
            </div>
          </div>
          <p className="muted">For demo purposes only. Not a valid commercial document.</p>
        </div>
      )}
    </Modal>
  );
}
