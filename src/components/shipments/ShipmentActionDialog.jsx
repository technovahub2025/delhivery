import { api } from '../../services/api';
import useApiAction from '../../hooks/useApiAction';
import { Check, XCircle } from 'lucide-react';

import { Button, Field, Modal } from '../ui';

export default function ShipmentActionDialog({ action, setAction, setShipments, notify }) {
  const { busy, error, run } = useApiAction();
  function update(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    run(async () => {
      if (action.type === 'ewaybill')
        await api.updateEwaybill({ waybill: action.shipment.id, ewbn: data.ewaybill });
      else
        await api.updateShipment({
          waybill: action.shipment.id,
          name: data.customer,
          add: data.address,
          phone: data.phone,
          pin: data.pincode,
          city: data.destination,
        });
      setShipments((list) =>
        list.map((shipment) =>
          shipment.id === action.shipment.id ? { ...shipment, ...data } : shipment
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
            Cancel <strong>{action.shipment.id}</strong> for {action.shipment.customer}? Its status
            will be updated with the shipping service.
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
                      s.id === action.shipment.id ? { ...s, status: 'Cancelled' } : s
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
                label="Recipient name"
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
                  label="Pincode"
                  name="pincode"
                  defaultValue={action.shipment.pincode}
                  pattern="[1-9][0-9]{5}"
                  title="Enter a 6-digit pincode"
                  required
                />
              </div>
              <Field
                label="Destination city"
                name="destination"
                defaultValue={action.shipment.destination}
                required
              />
            </>
          ) : (
            <>
              <p className="muted">Add the 12-digit e-waybill number for {action.shipment.id}.</p>
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
            <Button variant="secondary" type="button" onClick={() => setAction(null)}>
              Discard
            </Button>
            <Button type="submit" disabled={busy}>
              <Check size={16} />
              Save changes
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
