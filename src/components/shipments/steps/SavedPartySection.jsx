import { useEffect, useState } from 'react';
import { Field } from '../../ui';
import { api } from '../../../services/api';

const labelAddress = (address) => [address.companyName || address.contactName, [...(address.addressLines || []), address.city, address.state, address.pincode].filter(Boolean).join(', ')].filter(Boolean).join(' — ');

const EMPTY_ADDRESSES = [];

export default function SavedPartySection({ partyType, title, data, setData, fieldMap, customerId = '', showFields = true, fallbackAddresses = EMPTY_ADDRESSES, customerDetails = null }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [embeddedSelection, setEmbeddedSelection] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setAddresses([]);
    setEmbeddedSelection('');
    api.partyAddresses({ partyType, ...(customerId ? { customerId, includeUnassigned: true } : {}), page: 1, limit: 100 }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        const saved = result?.data?.partyAddresses || [];
        const embedded = partyType === 'SHIPPER' && Array.isArray(fallbackAddresses)
          ? fallbackAddresses.map((address, index) => ({
            ...address,
            id: `customer-shipping-${customerId}-${index}`,
            embeddedCustomerAddress: true,
            companyName: address.companyName || customerDetails?.companyName || customerDetails?.displayName || '',
            contactName: customerDetails?.primaryContact?.name || '',
            phone: customerDetails?.primaryContact?.phone || '',
            email: customerDetails?.primaryContact?.email || '',
            gstin: customerDetails?.gstin || '',
          }))
          : [];
        const seen = new Set();
        const combined = [...saved, ...embedded].filter((address) => {
          const key = [address.addressLines?.join('|'), address.city, address.state, address.pincode]
            .map((value) => String(value || '').trim().toLowerCase()).join('~');
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setAddresses(combined);
      })
      .catch((loadError) => {
        if (!controller.signal.aborted && loadError?.name !== 'AbortError') setError(loadError?.message || 'Saved addresses could not be loaded.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [partyType, customerId, fallbackAddresses, customerDetails]);

  function applyAddress(address) {
    setEmbeddedSelection(address?.embeddedCustomerAddress ? address.id : '');
    setData((draft) => {
      const updated = { ...draft, [`${partyType.toLowerCase()}AddressId`]: address?.embeddedCustomerAddress ? '' : address?.id || '' };
      if (!address) return updated;
      for (const [source, target] of Object.entries(fieldMap)) {
        const value = source === 'addressLines' ? (address.addressLines || []).join(', ') : address[source];
        if (value !== undefined) updated[target] = value;
      }
      return updated;
    });
  }

  return <div className="booking-party-section">
    <Field label={`Saved ${title.toLowerCase()} address`}>
      <select aria-label={`Saved ${title.toLowerCase()} address`} value={embeddedSelection || data[`${partyType.toLowerCase()}AddressId`] || ''} onChange={(event) => applyAddress(addresses.find((address) => address.id === event.target.value) || null)}>
        <option value="">Enter details manually</option>
        {addresses.map((address) => <option key={address.id} value={address.id}>{labelAddress(address) || 'Saved address'}</option>)}
      </select>
    </Field>
    {loading && <small className="muted" role="status">Loading saved addresses...</small>}
    {error && <p className="error" role="alert">{error}</p>}
    {!loading && !error && addresses.length === 0 && <small className="muted">No saved {title.toLowerCase()} addresses available.</small>}
    {showFields && <div className="form-grid">
      {Object.entries(fieldMap).map(([source, target]) => {
        const labels = { companyName: 'Company name', contactName: 'Contact name', phone: 'Mobile number', email: 'Email address', addressLines: 'Address', city: 'City', state: 'State', pincode: target.startsWith('pickup') ? 'Pickup pincode' : target.startsWith('shipper') ? 'Shipper pincode' : 'Consignee pincode', gstin: 'GSTIN' };
        const props = source === 'email' ? { type: 'email' } : source === 'phone' ? { type: 'tel' } : source === 'pincode' ? { inputMode: 'numeric', maxLength: 6 } : {};
        return <Field key={target} label={labels[source] || source} name={target}>
          <input name={target} value={data[target] || ''} onChange={(event) => setData((draft) => ({ ...draft, [target]: event.target.value }))} {...props} />
        </Field>;
      })}
    </div>}
  </div>;
}
