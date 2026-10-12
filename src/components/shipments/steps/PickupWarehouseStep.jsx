import { useState } from 'react';
import { MapPin, Plus } from 'lucide-react';

import { Button } from '../../ui';
import WarehouseFormDialog from '../../warehouses/WarehouseFormDialog';

export default function PickupWarehouseStep({
  warehouses,
  data,
  setData,
  setWarehouses,
  notify,
}) {
  const [edit, setEdit] = useState(null);

  function handleWarehouseSaved(savedWarehouse) {
    if (!savedWarehouse?.name) return;

    setData((draft) => ({
      ...draft,
      warehouse: savedWarehouse.name,
    }));
  }

  return (
    <div className="warehouse-options">
      <div className="warehouse-options-header">
        <div>
          <h3>Pickup location</h3>
          <p className="muted">
            Select the warehouse where this shipment will be picked up.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setEdit({})}
        >
          <Plus size={17} />
          Add pickup location
        </Button>
      </div>

      {warehouses.length > 0 ? (
        warehouses.map((w) => (
          <label
            className={`warehouse-option ${
              data.warehouse === w.name ? 'selected' : ''
            }`}
            key={w.id}
          >
            <input
              type="radio"
              name="warehouse"
              value={w.name}
              checked={data.warehouse === w.name}
              onChange={(e) =>
                setData((draft) => ({
                  ...draft,
                  warehouse: e.target.value,
                }))
              }
            />

            <span>
              <strong>{w.name}</strong>

              <small>
                {w.address} · {w.pincode}
              </small>

              <small>
                {w.contact} · {w.phone}
              </small>
            </span>

            <MapPin size={20} />
          </label>
        ))
      ) : (
        <div className="info-box">
          <MapPin size={19} />

          <div>
            <strong>No pickup locations added yet.</strong>
            <p className="muted">
              Add a pickup location to continue creating this shipment.
            </p>

            <Button
              type="button"
              onClick={() => setEdit({})}
            >
              <Plus size={17} />
              Add pickup location
            </Button>
          </div>
        </div>
      )}

      {edit && (
        <WarehouseFormDialog
          edit={edit}
          setEdit={setEdit}
          setWarehouses={setWarehouses}
          notify={notify}
          onSaved={handleWarehouseSaved}
        />
      )}
    </div>
  );
}
