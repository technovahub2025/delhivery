import { MapPin } from 'lucide-react';
import { Field } from '../../ui';

export default function PickupWarehouseStep({ warehouses, data, setData }) {
  return (
    <div className="warehouse-options">
      {warehouses.map((w) => (
        <label
          className={`warehouse-option ${data.warehouse === w.name ? 'selected' : ''}`}
          key={w.id}
        >
          <input
            type="radio"
            name="warehouse"
            value={w.name}
            checked={data.warehouse === w.name}
            onChange={(e) => setData({ ...data, warehouse: e.target.value })}
          />
          <span>
            <strong>{w.name}</strong>
            <small>
              {w.address} · {w.pincode}
            </small>
            <small>
              {w.contact} · {w.phone}
            </small>
          </span>
          <MapPin size={20} />
        </label>
      ))}
      <Field
        label="Registered warehouse name"
        value={data.warehouse}
        onChange={(e) => setData({ ...data, warehouse: e.target.value })}
        required
      />
      <p className="muted">
        Use the exact pickup-location name registered with your shipping account.
      </p>
    </div>
  );
}
