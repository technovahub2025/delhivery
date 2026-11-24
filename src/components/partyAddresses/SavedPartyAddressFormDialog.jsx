import { useState } from 'react';
import { Button, Field, Modal } from '../ui';

const partyTypes = [
  ['SHIPPER', 'Shipper'],
  ['CONSIGNEE', 'Consignee'],
  ['PICKUP', 'Pickup'],
];
const phonePattern = /^\+?[0-9][0-9\s().-]*$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const pincodePattern = /^[1-9][0-9]{5}$/;
const gstinPattern = /^[A-Z0-9]{15}$/;

function initialForm(address) {
  return {
    partyType: address?.partyType || 'SHIPPER',
    customerId: address?.customerId || '',
    companyName: address?.companyName || '',
    contactName: address?.contactName || '',
    phone: address?.phone || '',
    email: address?.email || '',
    addressLines: (address?.addressLines || []).join('\n'),
    city: address?.city || '',
    state: address?.state || '',
    pincode: address?.pincode || '',
    gstin: address?.gstin || '',
  };
}

function makePayload(form) {
  const payload = {
    partyType: form.partyType,
    customerId: form.customerId || null,
    companyName: form.companyName.trim(),
    contactName: form.contactName.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    addressLines: form.addressLines.split(/\r?\n/).map(line => line.trim()).filter(Boolean),
    city: form.city.trim(),
    state: form.state.trim(),
    pincode: form.pincode.trim(),
    gstin: form.gstin.trim().toUpperCase(),
  };
  for (const [field, limit] of Object.entries({ companyName: 200, contactName: 200, phone: 25, email: 254, city: 120, state: 120, pincode: 6, gstin: 15 })) {
    if (payload[field].length > limit) throw new Error(`${field} must be ${limit} characters or fewer.`);
  }
  if (payload.phone) {
    const digits = payload.phone.replace(/\D/g, '');
    if (!phonePattern.test(payload.phone) || digits.length < 10 || digits.length > 15) throw new Error('Enter a valid contact phone number.');
  }
  if (payload.email && !emailPattern.test(payload.email)) throw new Error('Enter a valid contact email address.');
  if (payload.pincode && !pincodePattern.test(payload.pincode)) throw new Error('Enter a valid six-digit Indian pincode.');
  if (payload.gstin && !gstinPattern.test(payload.gstin)) throw new Error('GSTIN must contain 15 letters or digits.');
  if (payload.addressLines.length > 10 || payload.addressLines.some(line => line.length > 250)) throw new Error('Enter up to 10 address lines, each 250 characters or fewer.');
  return payload;
}

export default function SavedPartyAddressFormDialog({ address, customers, customersLoading, customersError, onRetryCustomers, onClose, onSave }) {
  const [form, setForm] = useState(() => initialForm(address));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (field, value) => setForm(current => ({ ...current, [field]: value }));
  const isEditing = Boolean(address);

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      const payload = makePayload(form);
      setSaving(true);
      await onSave(payload);
    } catch (saveError) {
      setError(saveError?.message || 'Party address could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  return <Modal title={isEditing ? 'Edit saved address' : 'Add saved address'} onClose={saving ? () => {} : onClose}>
    <form className="party-address-form" onSubmit={submit} noValidate>
      <div className="party-address-form-grid">
        <Field label="Party type" name="partyType">
          <select id="partyType" value={form.partyType} onChange={event => set('partyType', event.target.value)} required>
            {partyTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Customer (optional)" name="customerId">
          <select id="customerId" value={form.customerId} onChange={event => set('customerId', event.target.value)}>
            <option value="">No customer association</option>
            {customers.map(customer => <option key={customer.id} value={customer.id}>{customer.displayName || customer.companyName || customer.primaryContact?.name || 'Unnamed customer'}</option>)}
          </select>
        </Field>
      </div>
      {customersLoading && <p className="party-address-note" role="status">Loading customer options...</p>}
      {customersError && <div className="party-address-inline-error" role="alert"><span>{customersError}</span><Button type="button" variant="secondary" onClick={onRetryCustomers}>Retry customers</Button></div>}
      <div className="party-address-form-grid">
        <Field label="Company name" name="companyName" value={form.companyName} onChange={event => set('companyName', event.target.value)} maxLength={200} />
        <Field label="Contact name" name="contactName" value={form.contactName} onChange={event => set('contactName', event.target.value)} maxLength={200} />
        <Field label="Phone" name="phone" type="tel" value={form.phone} onChange={event => set('phone', event.target.value)} maxLength={25} />
        <Field label="Email" name="email" type="email" value={form.email} onChange={event => set('email', event.target.value)} maxLength={254} />
        <Field label="Address lines" name="addressLines"><textarea id="addressLines" rows="3" value={form.addressLines} onChange={event => set('addressLines', event.target.value)} placeholder="One address line per row" /></Field>
        <Field label="City" name="city" value={form.city} onChange={event => set('city', event.target.value)} maxLength={120} />
        <Field label="State" name="state" value={form.state} onChange={event => set('state', event.target.value)} maxLength={120} />
        <Field label="Pincode" name="pincode" inputMode="numeric" value={form.pincode} onChange={event => set('pincode', event.target.value)} maxLength={6} />
        <Field label="GSTIN" name="gstin" value={form.gstin} onChange={event => set('gstin', event.target.value)} maxLength={15} />
      </div>
      <p className="party-address-note">Only party type is required. Contact and address details are optional.</p>
      {error && <div className="party-address-inline-error" role="alert">{error}</div>}
      <div className="modal-actions">
        <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving...' : isEditing ? 'Save changes' : 'Create address'}</Button>
      </div>
    </form>
  </Modal>;
}
