import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Field, Modal } from '../ui';
import { api } from '../../services/api';

const creditFields = ['creditTerms', 'creditLimit', 'monthlyBillingConfig', 'outstandingBalance'];
const phonePattern = /^\+?[0-9][0-9\s().-]*$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const pincodePattern = /^[1-9][0-9]{5}$/;
const gstinPattern = /^[A-Z0-9]{15}$/;
const addressValue = value => ({ addressLines: (value?.addressLines || []).join('\n'), city: value?.city || '', state: value?.state || '', pincode: value?.pincode || '', country: value?.country || '' });
const jsonText = value => value === undefined ? '' : JSON.stringify(value, null, 2);
const toAddress = value => ({ addressLines: value.addressLines.split('\n').map(line => line.trim()).filter(Boolean), city: value.city.trim(), state: value.state.trim(), pincode: value.pincode.trim(), country: value.country.trim() });

function AddressFields({ value, prefix, onChange }) {
  const change = field => event => onChange({ ...value, [field]: event.target.value });
  return <div className="customer-form-grid">
    <Field label="Address lines" name={`${prefix}-lines`}><textarea id={`${prefix}-lines`} rows="3" value={value.addressLines} onChange={change('addressLines')} /></Field>
    <Field label="City" name={`${prefix}-city`} value={value.city} onChange={change('city')} />
    <Field label="State" name={`${prefix}-state`} value={value.state} onChange={change('state')} />
    <Field label="Pincode" name={`${prefix}-pincode`} inputMode="numeric" value={value.pincode} onChange={change('pincode')} />
    <Field label="Country" name={`${prefix}-country`} value={value.country} onChange={change('country')} />
  </div>;
}
function checkAddress(value, label) {
  const result = toAddress(value);
  if (result.addressLines.length > 10 || result.addressLines.some(line => line.length > 250)) throw new Error(`${label} supports up to 10 address lines of 250 characters each.`);
  if (result.city.length > 120 || result.state.length > 120 || result.country.length > 100) throw new Error(`${label} contains a field that is too long.`);
  if (result.pincode && !pincodePattern.test(result.pincode)) throw new Error(`${label} pincode must be a valid six-digit Indian pincode.`);
  return result;
}

export default function CustomerFormDialog({ customer, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    category: customer?.category || 'WALK_IN', companyName: customer?.companyName || '', displayName: customer?.displayName || '',
    contact: { name: customer?.primaryContact?.name || '', phone: customer?.primaryContact?.phone || '', email: customer?.primaryContact?.email || '' },
    gstin: customer?.gstin || '', billingAddress: addressValue(customer?.billingAddress),
    shippingAddresses: (customer?.shippingAddresses || []).map(addressValue), creditTerms: jsonText(customer?.creditTerms),
    creditLimit: customer?.creditLimit == null ? '' : String(customer.creditLimit), monthlyBillingConfig: jsonText(customer?.monthlyBillingConfig),
    outstandingBalance: customer?.outstandingBalance == null ? '' : String(customer.outstandingBalance),
  }));
  const [rateCards, setRateCards] = useState([]);
  const [rateCardsError, setRateCardsError] = useState('');
  const [rateCardsLoading, setRateCardsLoading] = useState(true);
  const [rateCardId, setRateCardId] = useState(customer?.rateCardId || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (field, value) => setForm(current => ({ ...current, [field]: value }));

  useEffect(() => {
    const controller = new AbortController();
    api.rateCards({ page: 1, limit: 100 }, controller.signal)
      .then(result => { if (!controller.signal.aborted) setRateCards(result?.data?.rateCards || []); })
      .catch(loadError => { if (!controller.signal.aborted && loadError?.name !== 'AbortError') setRateCardsError(loadError?.message || 'Rate cards could not be loaded.'); })
      .finally(() => { if (!controller.signal.aborted) setRateCardsLoading(false); });
    return () => controller.abort();
  }, []);

  const compatibleRateCards = useMemo(() => rateCards.filter(card => form.category === 'CREDIT'
    ? card.scope === 'CUSTOMER' && card.customerId === customer?.id
    : card.scope === 'WALK_IN_STANDARD'), [rateCards, form.category, customer?.id]);

  async function submit(event) {
    event.preventDefault(); setError('');
    try {
      const companyName = form.companyName.trim(); const displayName = form.displayName.trim();
      if (companyName.length > 200 || displayName.length > 200) throw new Error('Company and display names must be 200 characters or fewer.');
      const primaryContact = {};
      for (const key of ['name', 'phone', 'email']) if (form.contact[key].trim()) primaryContact[key] = form.contact[key].trim();
      if (primaryContact.name?.length > 200) throw new Error('Contact name must be 200 characters or fewer.');
      if (primaryContact.phone) { const digits = primaryContact.phone.replace(/\D/g, ''); if (!phonePattern.test(primaryContact.phone) || digits.length < 10 || digits.length > 15) throw new Error('Enter a valid contact phone number.'); }
      if (primaryContact.email && (primaryContact.email.length > 254 || !emailPattern.test(primaryContact.email))) throw new Error('Enter a valid contact email address.');
      const gstin = form.gstin.trim().toUpperCase();
      if (gstin && !gstinPattern.test(gstin)) throw new Error('GSTIN must contain 15 letters or digits.');
      if (form.shippingAddresses.length > 100) throw new Error('A customer can have at most 100 shipping addresses.');
      if (rateCardId && !compatibleRateCards.some(card => card.id === rateCardId)) throw new Error('Select a rate card compatible with this customer category and ownership.');
      if (form.category === 'WALK_IN' && !rateCardId) throw new Error('Select the applicable standard walk-in rate card.');
      const payload = { category: form.category, companyName, displayName, primaryContact, gstin, billingAddress: checkAddress(form.billingAddress, 'Billing address'), shippingAddresses: form.shippingAddresses.map((address, index) => checkAddress(address, `Shipping address ${index + 1}`)), rateCardId: rateCardId || null };
      if (form.category === 'CREDIT') {
        for (const [field, label] of [['creditLimit', 'Credit limit'], ['outstandingBalance', 'Outstanding balance']]) {
          const value = form[field].trim();
          if (value && !Number.isFinite(Number(value))) throw new Error(`${label} must be a finite number.`);
          if (field === 'creditLimit' && value && Number(value) < 0) throw new Error('Credit limit must be non-negative.');
          payload[field] = value ? Number(value) : null;
        }
        for (const field of ['creditTerms', 'monthlyBillingConfig']) {
          const value = form[field].trim();
          try { payload[field] = value ? JSON.parse(value) : null; }
          catch { throw new Error(`${field === 'creditTerms' ? 'Credit terms' : 'Monthly billing configuration'} must be valid JSON.`); }
        }
      } else if (customer?.category === 'CREDIT') creditFields.forEach(field => { payload[field] = null; });
      setSaving(true); await onSave(payload);
    } catch (saveError) { setError(saveError.message || 'Customer could not be saved.'); }
    finally { setSaving(false); }
  }

  return <Modal title={customer ? 'Edit customer' : 'Add customer'} onClose={saving ? () => {} : onClose}>
    <form className="customer-form" onSubmit={submit} noValidate>
      <div className="customer-form-grid">
        <Field label="Category" name="category"><select id="category" value={form.category} onChange={event => { set('category', event.target.value); setRateCardId(''); }}><option value="CREDIT">Credit</option><option value="WALK_IN">Walk-in</option></select></Field>
        <Field label="Display name" name="displayName" value={form.displayName} onChange={event => set('displayName', event.target.value)} maxLength={200} />
        <Field label="Company name" name="companyName" value={form.companyName} onChange={event => set('companyName', event.target.value)} maxLength={200} />
        <Field label="Contact name" name="contactName" value={form.contact.name} onChange={event => set('contact', { ...form.contact, name: event.target.value })} maxLength={200} />
        <Field label="Phone" name="phone" type="tel" value={form.contact.phone} onChange={event => set('contact', { ...form.contact, phone: event.target.value })} maxLength={25} />
        <Field label="Email" name="email" type="email" value={form.contact.email} onChange={event => set('contact', { ...form.contact, email: event.target.value })} maxLength={254} />
        <Field label="GSTIN" name="gstin" value={form.gstin} onChange={event => set('gstin', event.target.value)} maxLength={15} />
      </div>
      <section className="customer-form-section">
        <h3>Rate card</h3>
        <Field label={form.category === 'CREDIT' ? 'Customer rate card' : 'Standard walk-in rate card'} name="rateCardId">
          <select id="rateCardId" value={rateCardId} onChange={event => setRateCardId(event.target.value)} disabled={rateCardsLoading || Boolean(rateCardsError)}>
            <option value="">No rate card assigned</option>
            {compatibleRateCards.map(card => <option key={card.id} value={card.id}>{card.name || `${card.scope} · v${card.version}`}</option>)}
          </select>
        </Field>
        {rateCardsLoading && <p className="customer-form-note" role="status">Loading compatible rate cards...</p>}
        {rateCardsError && <p className="customer-alert" role="alert">{rateCardsError}</p>}
        {!rateCardsLoading && !rateCardsError && form.category === 'CREDIT' && !customer?.id && <p className="customer-form-note">Create the Credit customer first, then assign a rate card created for that customer.</p>}
        {!rateCardsLoading && !rateCardsError && form.category === 'CREDIT' && customer?.id && compatibleRateCards.length === 0 && <p className="customer-form-note">No customer-specific rate cards are available for this customer yet.</p>}
        {!rateCardsLoading && !rateCardsError && form.category === 'WALK_IN' && compatibleRateCards.length === 0 && <p className="customer-form-note">No standard walk-in rate card is available yet.</p>}
      </section>
      <section className="customer-form-section"><h3>Billing address</h3><AddressFields value={form.billingAddress} prefix="billing" onChange={value => set('billingAddress', value)} /></section>
      <section className="customer-form-section">
        <div className="customer-section-heading"><h3>Shipping addresses</h3><Button type="button" variant="secondary" onClick={() => set('shippingAddresses', [...form.shippingAddresses, addressValue()])}><Plus size={15} /> Add address</Button></div>
        {!form.shippingAddresses.length && <p className="customer-form-note">No shipping addresses added.</p>}
        {form.shippingAddresses.map((address, index) => <div className="customer-shipping-address" key={index}>
          <div className="customer-section-heading"><h4>Shipping address {index + 1}</h4><button type="button" className="icon-btn" aria-label={`Remove shipping address ${index + 1}`} onClick={() => set('shippingAddresses', form.shippingAddresses.filter((_, row) => row !== index))}><Trash2 size={16} /></button></div>
          <AddressFields value={address} prefix={`shipping-${index}`} onChange={value => set('shippingAddresses', form.shippingAddresses.map((row, rowIndex) => rowIndex === index ? value : row))} />
        </div>)}
      </section>
      {form.category === 'CREDIT' && <section className="customer-form-section" aria-labelledby="credit-details"><h3 id="credit-details">Credit details</h3><p className="customer-form-note">Optional fields. No credit terms or billing rules are assumed.</p>
        <div className="customer-form-grid">
          <Field label="Credit limit" name="creditLimit" type="number" min="0" step="any" value={form.creditLimit} onChange={event => set('creditLimit', event.target.value)} />
          <Field label="Legacy balance (reference)" name="outstandingBalance" type="number" step="any" value={form.outstandingBalance} onChange={event => set('outstandingBalance', event.target.value)} />
          <Field label="Credit terms (JSON)" name="creditTerms"><textarea id="creditTerms" rows="4" value={form.creditTerms} onChange={event => set('creditTerms', event.target.value)} placeholder="Optional JSON" /></Field>
          <Field label="Monthly billing configuration (JSON)" name="monthlyBillingConfig"><textarea id="monthlyBillingConfig" rows="4" value={form.monthlyBillingConfig} onChange={event => set('monthlyBillingConfig', event.target.value)} placeholder="Optional JSON" /></Field>
        </div>
        <p className="customer-form-note">Billing uses calendar months by default. Set cycleStartDay to an integer between 1 and 28 to use a different monthly start date.</p>
      </section>}
      {error && <div className="customer-alert" role="alert">{error}</div>}
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : customer ? 'Save changes' : 'Create customer'}</Button></div>
    </form>
  </Modal>;
}
