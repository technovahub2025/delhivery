import { api, unwrap } from '../../services/api';
import useApiAction from '../../hooks/useApiAction';
import { CalendarDays } from 'lucide-react';

import { Button, Field, Modal } from '../ui';

export default function PickupRequestDialog({ warehouses, setOpen, setPickups, notify }) {
  const { busy, error, run } = useApiAction();
  const today = new Date();
  const latest = new Date();
  latest.setDate(latest.getDate() + 7);
  const localDate = (date) => date.toLocaleDateString('en-CA');
  return (
    <Modal title="Request a pickup" onClose={() => setOpen(false)}>
      <p className="muted">Choose a time that works for your warehouse.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const d = Object.fromEntries(new FormData(e.currentTarget));
          run(async () => {
            const dateTime = new Date(d.date + 'T' + d.time);
            if (!d.warehouse.trim()) throw new Error('Enter a registered warehouse name.');
            if (!Number.isFinite(dateTime.getTime()))
              throw new Error('Enter a valid pickup date and time.');
            if (dateTime <= new Date() || d.date > localDate(latest))
              throw new Error('Choose a future pickup time within seven days.');
            const response = unwrap(
              await api.pickup({
                pickup_time: d.time.length === 5 ? d.time + ':00' : d.time,
                pickup_date: d.date,
                pickup_location: d.warehouse,
                expected_package_count: Number(d.count),
              })
            );
            setPickups((list) => [
              {
                ...d,
                id: String(response.pickup_id || response.id || Date.now()),
                status: 'Scheduled',
              },
              ...list,
            ]);
            setOpen(false);
            notify('Pickup request submitted.');
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
            label="Pickup warehouse"
            name="warehouse"
            list="pickup-locations"
            defaultValue={warehouses[0]?.name || ''}
            required
          />
          <datalist id="pickup-locations">
            {warehouses.map((w) => (
              <option key={w.id} value={w.name} />
            ))}
          </datalist>
          <p className="muted">
            Enter the exact warehouse name registered with your shipping account.
          </p>
          <div className="form-grid">
            <Field
              label="Pickup date"
              type="date"
              name="date"
              min={localDate(today)}
              max={localDate(latest)}
              required
            />
            <Field label="Pickup time" type="time" name="time" required />
          </div>
          <Field label="Package count" type="number" name="count" min="1" max="1000" required />
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              <CalendarDays size={17} />
              Schedule pickup
            </Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
