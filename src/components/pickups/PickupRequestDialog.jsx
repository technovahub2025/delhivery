import { CalendarDays } from 'lucide-react';
import { useRef } from 'react';
import { api, unwrap } from '../../services/api';
import useApiAction from '../../hooks/useApiAction';
import { Button, Field, Modal } from '../ui';

const localDate = (date) => date.toLocaleDateString('en-CA');
const parseWeightKg = (value) => {
  const text = String(value ?? '').trim().replace(',', '.');
  if (!text) return NaN;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : NaN;
};

export default function PickupRequestDialog({ warehouses, shipments = [], pickup = null, setOpen, setPickups, onSaved, notify }) {
  const { busy, error, run } = useApiAction();
  const localRequestKeys = useRef(new Map());
  const today = localDate(new Date());
  const location = pickup?.location || {};
  const initialShipmentRefs = new Set((pickup?.shipmentRefs || []).flatMap((row) => [row.waybill, row.reference]).filter(Boolean));
  const warehouse = warehouses.find((item) => item.name === location.name) || warehouses[0] || {};

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const date = String(form.get('date') || '');
    const time = String(form.get('time') || '');
    const timeTo = String(form.get('timeTo') || '');
    const instructions = String(form.get('instructions') || '').trim();
    await run(async () => {
      const dateTime = new Date(`${date}T${time}`);
      const packageCount = Number(form.get('count'));
      const countInput = String(form.get('shipmentCount') || '').trim();
      const shipmentCount = countInput ? Number(countInput) : null;
      const totalWeightKg = parseWeightKg(form.get('totalWeightKg'));
      if (!Number.isFinite(dateTime.getTime()) || dateTime <= new Date()) throw new Error('Choose a valid future pickup date and time.');
      if (!String(form.get('warehouse') || '').trim() || !String(form.get('contactName') || '').trim() || !String(form.get('phone') || '').trim() || !String(form.get('address') || '').trim() || !/^\d{6}$/.test(String(form.get('pincode') || ''))) throw new Error('Complete the pickup location, contact, address and six-digit pincode.');
      if (!Number.isSafeInteger(packageCount) || packageCount < 1) throw new Error('Enter a positive whole package count.');
      if (!Number.isFinite(totalWeightKg) || totalWeightKg <= 0) throw new Error('Enter a total pickup weight greater than zero kilograms.');
      if (timeTo && timeTo <= time) throw new Error('Pickup end time must be after the start time.');
      const body = {
        pickupDate: date,
        pickupTime: time,
        ...((timeTo || pickup?.timeTo) && { pickupTimeTo: timeTo || null }),
        ...((instructions || pickup?.instructions) && { instructions }),
        location: {
          name: String(form.get('warehouse') || '').trim(), contactName: String(form.get('contactName') || '').trim(),
          phone: String(form.get('phone') || '').trim(), email: String(form.get('email') || '').trim(),
          address: String(form.get('address') || '').trim(), city: String(form.get('city') || '').trim(),
          state: String(form.get('state') || '').trim(), pincode: String(form.get('pincode') || '').trim(),
        },
        packageCount, totalWeightKg, shipmentRefs: form.getAll('shipmentRefs').map(String),
        ...((countInput || pickup?.shipmentCount) && { shipmentCount }),
      };
      const submitToCarrier = !pickup && form.get('submitToCarrier') === 'on';
      if (submitToCarrier && !warehouses.some(item => item.registrationStatus === 'REGISTERED' && item.name === body.location.name)) {
        throw new Error('Choose a registered Delhivery warehouse.');
      }
      if (!pickup && !submitToCarrier) {
        const fingerprint = JSON.stringify(body);
        if (!localRequestKeys.current.has(fingerprint)) {
          const key = globalThis.crypto?.randomUUID?.() || `pickup-${Date.now()}-${Math.random().toString(16).slice(2)}`;
          localRequestKeys.current.set(fingerprint, key);
        }
        body.idempotencyKey = localRequestKeys.current.get(fingerprint);
      }
      const response = unwrap(pickup
        ? await api.updatePickupRequest(pickup.recordId || pickup.id, body)
        : submitToCarrier ? await api.pickup({
          pickup_date: body.pickupDate, pickup_time: body.pickupTime,
          pickup_location: body.location.name, expected_package_count: packageCount,
          localDetails: { pickupTimeTo: timeTo || null, instructions, totalWeightKg, shipmentRefs: body.shipmentRefs, shipmentCount },
        }) : await api.createPickupRequest(body));
      const saved = response?.pickup;
      if (!saved || typeof saved.id !== 'string' || !saved.id) throw new Error('The backend did not return a saved pickup request.');
      setPickups((current) => pickup
        ? current.map((item) => item.id === pickup.id ? saved : item)
        : [{ ...saved, id: saved.recordId || saved.id }, ...current.filter((item) => item.id !== (saved.recordId || saved.id))]);
      onSaved?.();
      setOpen(false);
      notify?.(submitToCarrier ? 'Delhivery confirmed the pickup request.' : pickup ? 'Pickup request updated. No carrier request was sent.' : 'Pickup request saved. No carrier request was sent.');
    });
  }

  return (
    <Modal title={pickup ? 'Reschedule pickup' : 'Request a pickup'} onClose={() => setOpen(false)}>
      <p className="muted">Pickup details are saved locally unless you select carrier submission. Delhivery collects ready shipments from the registered warehouse.</p>
      <form onSubmit={submit}>
        {error && <p className="error" role="alert">{error}</p>}
        <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0 }}>
          <Field label="Pickup warehouse" name="warehouse" list="pickup-locations" defaultValue={location.name || warehouse.name || ''} required />
          <datalist id="pickup-locations">{warehouses.map((item) => <option key={item.id} value={item.name} />)}</datalist>
          <div className="form-grid">
            <Field label="Pickup contact name" name="contactName" defaultValue={location.contactName || warehouse.contact || ''} required />
            <Field label="Pickup phone" name="phone" type="tel" defaultValue={location.phone || warehouse.phone || ''} required />
            <Field label="Pickup email" name="email" type="email" defaultValue={location.email || warehouse.email || ''} />
            <Field label="Pickup address" name="address" defaultValue={location.address || warehouse.address || ''} required />
            <Field label="Pickup city" name="city" defaultValue={location.city || warehouse.city || ''} />
            <Field label="Pickup state" name="state" defaultValue={location.state || warehouse.state || ''} />
            <Field label="Pickup pincode" name="pincode" inputMode="numeric" maxLength="6" defaultValue={location.pincode || warehouse.pincode || ''} required />
          </div>
          <div className="form-grid">
            <Field label="Pickup date" type="date" name="date" min={today} defaultValue={pickup?.date || ''} required />
            <Field label="Pickup time" type="time" name="time" defaultValue={String(pickup?.time || '').slice(0, 5)} required />
            <Field label="Pickup end time" type="time" name="timeTo" defaultValue={String(pickup?.timeTo || '').slice(0, 5)} />
            <Field label="Pickup instructions"><textarea name="instructions" maxLength={500} defaultValue={pickup?.instructions || ''} /></Field>
            <Field label="Shipment count (optional)" type="number" name="shipmentCount" min="1" step="1" defaultValue={pickup?.shipmentCount ?? ''} />
            <Field label="Package count" type="number" name="count" min="1" defaultValue={pickup?.count || ''} required />
            <Field label="Total weight (kg)" type="number" name="totalWeightKg" min="0" step="any" defaultValue={pickup?.totalWeightKg ?? ''} required />
          </div>
          {shipments.length > 0 && <fieldset className="pickup-linked-shipments">
            <legend>Link shipments (optional)</legend>
            {shipments.filter((item) => item.waybill || item.trackingNumber || (item.mockOnly && item.reference) || (item.id && !item.bookingStatus)).map((item) => {
              const ref = String(item.waybill || item.trackingNumber || (item.mockOnly && item.reference) || item.id);
              return <label key={ref}><input type="checkbox" name="shipmentRefs" value={ref} defaultChecked={initialShipmentRefs.has(ref)} /> {ref} {item.reference ? `· ${item.reference}` : ''}</label>;
            })}
          </fieldset>}
          {!pickup && warehouses.some(item => item.registrationStatus === 'REGISTERED') && (
            <label><input type="checkbox" name="submitToCarrier" /> Submit this pickup to Delhivery</label>
          )}
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Close</Button>
            <Button type="submit" disabled={busy}><CalendarDays size={17} />{pickup ? 'Save pickup changes' : 'Save pickup request'}</Button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
