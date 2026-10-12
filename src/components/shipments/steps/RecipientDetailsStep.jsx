import { useEffect, useState } from 'react';
import ShipmentFormField from '../ShipmentFormField';
import { api, unwrap } from '../../../services/api';

export default function RecipientDetailsStep({ data, setData }) {
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState('');

  useEffect(() => {
    const pincode = String(data.pincode || '').trim();

    if (!/^\d{6}$/.test(pincode)) {
      setPincodeLoading(false);
      setPincodeError('');

      setData((draft) => ({
        ...draft,
        destination: '',
        state: '',
        pincodeServiceable: false,
      }));

      return;
    }

    let cancelled = false;

    async function fetchPincodeDetails() {
      setPincodeLoading(true);
      setPincodeError('');

      try {
        const response = await api.pincode(pincode);
        const result = unwrap(response);

        const deliveryCodes = Array.isArray(result)
          ? result
          : Array.isArray(result?.delivery_codes)
            ? result.delivery_codes
            : [];

        const location =
          deliveryCodes[0]?.postal_code ||
          deliveryCodes[0] ||
          result?.postal_code ||
          null;

        if (!location) {
          throw new Error(
            'Delivery service is not available for this pincode.'
          );
        }

        const city =
          location?.city ||
          deliveryCodes[0]?.city ||
          '';

        const stateCode =
          location?.state_code ||
          deliveryCodes[0]?.state_code ||
          '';

        const stateNames = {
          PU: 'Puducherry',
        };

        const state =
          location?.state ||
          deliveryCodes[0]?.state ||
          stateNames[stateCode] ||
          stateCode;

        const isServiceable =
          Boolean(city && state) &&
          (
            location?.pickup === 'Y' ||
            location?.pre_paid === 'Y' ||
            location?.cod === 'Y'
          );

        if (!isServiceable) {
          throw new Error(
            'Delivery service is not available for this pincode.'
          );
        }

        if (!cancelled) {
          setData((draft) => ({
            ...draft,
            destination: city,
            state,
            pincodeServiceable: true,
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setData((draft) => ({
            ...draft,
            destination: '',
            state: '',
            pincodeServiceable: false,
          }));

          setPincodeError(
            error?.message ||
              'Delivery service is not available for this pincode.'
          );
        }
      } finally {
        if (!cancelled) {
          setPincodeLoading(false);
        }
      }
    }

    fetchPincodeDetails();

    return () => {
      cancelled = true;
    };
  }, [data.pincode, setData]);

  function field(label, name, extra = {}) {
    return (
      <ShipmentFormField
        label={label}
        name={name}
        data={data}
        onChange={setData}
        {...extra}
      />
    );
  }

  return (
    <>
      <div className="form-grid">
        {field('Order reference', 'reference')}

        {field('Full name', 'customer')}

        {field('Email address', 'email', {
          type: 'email',
        })}

        {field('Phone number', 'phone', {
          pattern: '[0-9]{10}',
          title: 'Enter a 10-digit phone number',
        })}

        {field('Pincode', 'pincode', {
          pattern: '[1-9][0-9]{5}',
          title: 'Enter a 6-digit pincode',
          maxLength: 6,
        })}
      </div>

      {pincodeLoading && (
        <p className="muted">Checking delivery serviceability...</p>
      )}

      {pincodeError && (
        <p className="error" role="alert">
          ⚠️ {pincodeError}
        </p>
      )}

      {field('Full address', 'address')}

      {field('City', 'destination', {
        readOnly: true,
      })}

      {field('State', 'state', {
        readOnly: true,
      })}
    </>
  );
}
