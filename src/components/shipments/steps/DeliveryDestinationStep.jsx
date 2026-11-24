import { useEffect, useState } from 'react';
import { Field } from '../../ui';
import ShipmentFormField from '../ShipmentFormField';
import { api } from '../../../services/api';

export default function DeliveryDestinationStep({ data, setData }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const pincode = String(data.pincode || '').trim();
    setLookupResult(null);
    setData((draft) => ({ ...draft, destination: '', state: '', pincodeServiceable: false, pincodeServiceability: null }));
    if (!/^\d{6}$/.test(pincode)) {
      setLoading(false);
      setError('');
      return undefined;
    }

    let cancelled = false;
    const lookup = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.pincode(pincode);
        // Accept the API envelope directly and the equivalent nested data
        // envelope used by older clients, while retaining provider metadata.
        const envelope = response?.provenance !== undefined || response?.serviceability !== undefined
          ? response : response?.data || response;
        const result = envelope?.data && typeof envelope.data === 'object' ? envelope.data : envelope;
        const codes = Array.isArray(result) ? result : Array.isArray(result?.delivery_codes) ? result.delivery_codes : [];
        const postalCodes = codes.map(row => row?.postal_code || row).filter(Boolean);
        const location = postalCodes.find(row => (row.pre_paid === 'Y' || row.cod === 'Y') &&
          String(row.remarks || '').trim().toLowerCase() !== 'embargo') || postalCodes[0] || result?.postal_code;
        const city = location?.city || '';
        const stateCode = location?.state_code || '';
        const state = location?.state || ({ DL: 'Delhi', PU: 'Puducherry' }[stateCode]) || stateCode;
        const serviceability = envelope?.serviceability || result?.serviceability || null;
        const prepaid = serviceability
          ? serviceability.prepaid === true || String(serviceability.prepaid).toLowerCase() === 'true'
          : location?.pre_paid === 'Y';
        const cod = serviceability
          ? serviceability.cod === true || String(serviceability.cod).toLowerCase() === 'true'
          : location?.cod === 'Y';
        const serviceable = envelope?.serviceable ?? (prepaid || cod);
        if (!cancelled) {
          setLookupResult({ provenance: envelope?.provenance, serviceable, paymentModes: { prepaid, cod },
            addressIncomplete: serviceable && (!city || !state) });
          setData((draft) => ({ ...draft, destination: city, state,
            pincodeServiceable: Boolean(serviceable && city && state),
            pincodeServiceability: {
              pincode,
              prepaid, cod, provenance: envelope?.provenance || 'DELHIVERY_API',
            },
          }));
        }
      } catch (lookupError) {
        if (!cancelled) {
          setData((draft) => ({ ...draft, destination: '', state: '', pincodeServiceable: false, pincodeServiceability: null }));
          setError(lookupError?.message || 'The pincode lookup could not be completed.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    lookup();
    return () => { cancelled = true; };
  }, [data.pincode, setData, attempt]);

  return <div>
    <p className="muted">Enter the delivery pincode to check city, state and serviceability.</p>
    <div className="form-grid">
        <ShipmentFormField label="Order reference" name="reference" data={data} onChange={setData} />
      <ShipmentFormField label="Delivery pincode" name="pincode" data={data} onChange={setData} inputMode="numeric" pattern="[1-9][0-9]{5}" title="Enter a 6-digit pincode" maxLength={6} />
      <Field label="City"><input value={data.destination || ''} readOnly /></Field>
      <Field label="State"><input value={data.state || ''} readOnly /></Field>
    </div>
    {loading && <p className="muted" role="status">Checking delivery serviceability...</p>}
    {!loading && lookupResult?.provenance === 'LOCAL_MOCK' && <p className="muted" role="status">Sample serviceability. No carrier request was made.</p>}
    {!loading && lookupResult?.provenance === 'DELHIVERY_API' && <p className="muted" role="status">Serviceability source: Delhivery API.</p>}
    {!loading && lookupResult?.paymentModes && <p className="muted">
      Prepaid: {lookupResult.paymentModes.prepaid === true ? 'Yes' : 'No'} · COD: {lookupResult.paymentModes.cod === true ? 'Yes' : 'No'}
    </p>}
    {!loading && lookupResult && !lookupResult.serviceable && <p className="error" role="alert">Delivery service is not available for this pincode.</p>}
    {!loading && lookupResult?.addressIncomplete && <p className="error" role="alert">Serviceability was confirmed, but the response did not include the city or state needed to book.</p>}
    {error && <button type="button" onClick={() => setAttempt((value) => value + 1)}>Retry pincode check</button>}
    {error && <p className="error" role="alert">⚠️ {error}</p>}
  </div>;
}
