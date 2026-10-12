import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import useApiAction from '../../hooks/useApiAction';
import { Check, XCircle } from 'lucide-react';

import { Button, Field, Modal } from '../ui';

export default function ShipmentActionDialog({
  action,
  setAction,
  setShipments,
  notify,
}) {
  const { busy, error, run } = useApiAction();

  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState('');

  useEffect(() => {
    if (action?.type !== 'edit') return;

    setPincode(String(action.shipment.pincode || ''));
    setCity(action.shipment.destination || '');
    setState(action.shipment.state || '');
    setPincodeError('');
  }, [action]);

  useEffect(() => {
    if (action?.type !== 'edit') return;

    const value = pincode.replace(/\D/g, '');

    if (value.length !== 6) {
      setCity('');
      setState('');
      setPincodeError('');
      setPincodeLoading(false);
      return;
    }

    let cancelled = false;

    setPincodeLoading(true);
    setPincodeError('');

    api.pincode(value)
      .then((result) => {
        if (cancelled) return;

        const response = result?.data ?? result;
        const deliveryCodes = response?.delivery_codes || [];

        if (!deliveryCodes.length) {
          setCity('');
          setState('');
          setPincodeError('This pincode is not serviceable.');
          return;
        }

        const location = deliveryCodes[0]?.postal_code;

        const resolvedCity =
          location?.city ||
          deliveryCodes[0]?.city ||
          '';

        const stateCode = location?.state_code || deliveryCodes[0]?.state_code || '';

        const stateNames = {
          PU: 'Puducherry',
        };

        const resolvedState =
          location?.state ||
          deliveryCodes[0]?.state ||
          stateNames[stateCode] ||
          stateCode;

        if (!resolvedCity && !resolvedState) {
          setCity('');
          setState('');
          setPincodeError(
            'Pincode is serviceable, but city/state information was not returned.'
          );
          return;
        }

        setCity(resolvedCity);
        setState(resolvedState);
      })
      .catch((err) => {
        if (cancelled) return;

        setCity('');
        setState('');
        setPincodeError(
          err?.message || 'Unable to fetch city and state for this pincode.'
        );
      })
      .finally(() => {
        if (!cancelled) setPincodeLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pincode, action]);

  function update(event) {
    event.preventDefault();

    const data = Object.fromEntries(new FormData(event.currentTarget));

    run(async () => {
      if (action.type === 'ewaybill') {
        await api.updateEwaybill({
          waybill: action.shipment.id,
          ewbn: data.ewaybill,
        });
      } else {
        await api.updateShipment({
          waybill: action.shipment.id,
          name: data.customer,
          add: data.address,
          phone: data.phone,
          pin: data.pincode,
          city: data.destination,
        });
      }

      setShipments((list) =>
        list.map((shipment) =>
          shipment.id === action.shipment.id
            ? {
                ...shipment,
                ...data,
                destination: city,
                state,
                pincode,
              }
            : shipment
        )
      );

      setAction(null);
      notify('Shipment updated successfully.');
    });
  }

  return (
    <Modal
      title={
        action.type === 'cancel'
          ? 'Cancel this shipment?'
          : action.type === 'edit'
            ? 'Edit shipment'
            : 'Update e-waybill'
      }
      onClose={() => setAction(null)}
    >
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {action.type === 'cancel' ? (
        <>
          <div className="warning-icon">
            <XCircle size={28} />
          </div>

          <p>
            Cancel <strong>{action.shipment.id}</strong> for{' '}
            {action.shipment.customer}? Its status will be updated with the
            shipping service.
          </p>

          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setAction(null)}>
              Keep shipment
            </Button>

            <Button
              variant="danger"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api.cancelShipment(action.shipment.id);

                  setShipments((list) =>
                    list.map((s) =>
                      s.id === action.shipment.id
                        ? { ...s, status: 'Cancelled' }
                        : s
                    )
                  );

                  setAction(null);
                  notify('Shipment cancelled.');
                })
              }
            >
              Cancel shipment
            </Button>
          </div>
        </>
      ) : (
        <form onSubmit={update}>
          {action.type === 'edit' ? (
            <>
              <Field
                label="Consignee name"
                name="customer"
                defaultValue={action.shipment.customer}
                required
              />

              <Field
                label="Address"
                name="address"
                defaultValue={action.shipment.address}
                required
              />

              <div className="form-grid">
                <Field
                  label="Phone"
                  name="phone"
                  defaultValue={action.shipment.phone}
                  pattern="[0-9]{10}"
                  title="Enter a 10-digit phone number"
                  required
                />

                <Field
                  label="Email"
                  name="email"
                  type="email"
                  defaultValue={action.shipment.email || ''}
                  placeholder="Optional"
                />
              </div>

              <div className="form-grid">
                <div>
                  <Field
                    label="Pincode"
                    name="pincode"
                    value={pincode}
                    onChange={(event) => {
                      const value = event.target.value
                        .replace(/\D/g, '')
                        .slice(0, 6);

                      setPincode(value);
                    }}
                    pattern="[1-9][0-9]{5}"
                    title="Enter a 6-digit pincode"
                    required
                  />

                  {pincodeLoading && (
                    <small className="muted">
                      Fetching city and state...
                    </small>
                  )}

                  {pincodeError && (
                    <small className="error">
                      {pincodeError}
                    </small>
                  )}
                </div>

                <Field
                  label="City"
                  name="destination"
                  value={city}
                  readOnly
                  required
                />
              </div>

              <Field
                label="State"
                name="state"
                value={state}
                readOnly
                required
              />

              <Field
                label="GST number"
                name="gst"
                defaultValue={action.shipment.gst || ''}
                placeholder="Optional"
              />
            </>
          ) : (
            <>
              <p className="muted">
                Add the 12-digit e-waybill number for {action.shipment.id}.
              </p>

              <Field
                label="E-waybill number"
                name="ewaybill"
                defaultValue={action.shipment.ewaybill}
                pattern="[0-9]{12}"
                title="Enter a 12-digit e-waybill number"
                required
              />
            </>
          )}

          <div className="modal-actions">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setAction(null)}
            >
              Discard
            </Button>

            <Button
              type="submit"
              disabled={busy || (action.type === 'edit' && (!city || !state))}
            >
              <Check size={16} />
              Save changes
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

