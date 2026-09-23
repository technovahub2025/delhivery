import { api } from '../../services/api';
import useApiAction from '../../hooks/useApiAction';
import { Button, Field, Modal } from '../ui';

export default function WarehouseFormDialog({ edit, setEdit, setWarehouses, notify }) {
  const { busy, error, run } = useApiAction();
  return (
    <Modal title={edit.id ? 'Edit warehouse' : 'Add warehouse'} onClose={() => setEdit(null)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const d = Object.fromEntries(new FormData(e.currentTarget));
          run(async () => {
            const body = {
              name: d.name,
              registered_name: d.registered_name,
              phone: d.phone,
              email: d.email,
              address: d.address,
              pin: d.pincode,
              city: d.city,
              state: d.state,
              country: 'India',
              return_address: d.address,
              return_pin: d.pincode,
              return_city: d.city,
              return_state: d.state,
              return_country: 'India',
            };
            await (edit.id ? api.updateWarehouse(body) : api.createWarehouse(body));
            setWarehouses((list) =>
              edit.id
                ? list.map((w) => (w.id === edit.id ? { ...w, ...d } : w))
                : [...list, { ...d, id: Date.now(), primary: false }]
            );
            setEdit(null);
            notify(edit.id ? 'Warehouse updated.' : 'New warehouse added.');
          });
        }}
      >
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
          <Field
            readOnly={Boolean(edit.id)}
            label="Warehouse name"
            name="name"
            defaultValue={edit.name}
            aria-describedby={edit.id ? 'warehouse-name-note' : undefined}
            required
          />
          {edit.id && (
            <p className="muted" id="warehouse-name-note">
              Warehouse name cannot be edited after creation.
            </p>
          )}
          <div className="form-grid">
            <Field label="Contact name" name="contact" defaultValue={edit.contact} required />
            <Field
              label="Phone number"
              name="phone"
              defaultValue={edit.phone}
              pattern="[0-9]{10}"
              title="Enter a 10-digit phone number"
              required
            />
          </div>
          <Field label="Full address" name="address" defaultValue={edit.address} required />
          <Field
            label="Pincode"
            name="pincode"
            defaultValue={edit.pincode}
            pattern="[1-9][0-9]{5}"
            title="Enter a 6-digit pincode"
            required
          />
          <Field
            label="Registered business name"
            name="registered_name"
            defaultValue={edit.registered_name}
            required
          />
          <Field
            label="Email address"
            name="email"
            type="email"
            defaultValue={edit.email}
            required
          />
          <Field label="City" name="city" defaultValue={edit.city} required />
          <Field label="State" name="state" defaultValue={edit.state} required />
          <p className="muted">This address will also be used for returns.</p>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button type="submit">{edit.id ? 'Save changes' : 'Add warehouse'}</Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
