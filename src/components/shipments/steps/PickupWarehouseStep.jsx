import { useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { Button, Field } from '../../ui';
import WarehouseFormDialog from '../../warehouses/WarehouseFormDialog';

const pickupFields = [
  ['pickupContactName', 'Contact name'], ['pickupPhone', 'Mobile number'],
  ['pickupEmail', 'Email address'], ['pickupAddress', 'Pickup address'],
  ['pickupCity', 'City'], ['pickupState', 'State'], ['pickupPincode', 'Pickup pincode'],
];

export default function PickupWarehouseStep({ warehouses, data, setData, reloadWarehouses, notify, children }) {
  const [edit, setEdit] = useState(null);

  async function handleWarehouseSaved(savedWarehouse) {
    await reloadWarehouses?.();
    if (savedWarehouse?.name && savedWarehouse.registrationStatus === 'REGISTERED') setData((draft) => ({ ...draft, warehouse: savedWarehouse.name, warehouseId: savedWarehouse.id || savedWarehouse._id || '', warehouseAddress: savedWarehouse.details?.address || '', warehousePincode: savedWarehouse.details?.pin || '', warehouseContact: savedWarehouse.details?.contact_name || savedWarehouse.details?.contact || '', warehousePhone: savedWarehouse.details?.phone || '' }));
  }

  function choosePickup(choice) {
    setData((draft) => {
      const updated = { ...draft, pickupChoice: choice };
      if (choice === 'sameAsShipper') {
        updated.pickupContactName = draft.shipperContactName || '';
        updated.pickupPhone = draft.shipperPhone || '';
        updated.pickupEmail = draft.shipperEmail || '';
        updated.pickupAddress = draft.shipperAddress || '';
        updated.pickupCity = draft.shipperCity || '';
        updated.pickupState = draft.shipperState || '';
        updated.pickupPincode = draft.shipperPincode || '';
      }
      return updated;
    });
  }

  return <div className="warehouse-options">
    <p className="muted">Choose the pickup details for this booking. The Delhivery request continues to use the registered warehouse selected below.</p>
    <div className="pickup-choice-grid">
      {[
        ['warehouse', 'Use registered Delhivery warehouse'],
        ['sameAsShipper', 'Same as Shipper Address'],
        ['newAddress', 'Enter New Pickup Address'],
      ].map(([value, label]) => <label className="pickup-choice" key={value}>
        <input type="radio" name="pickupChoice" value={value} checked={(data.pickupChoice || 'warehouse') === value} onChange={() => choosePickup(value)} />
        <span>{label}</span>
      </label>)}
    </div>

    {(data.pickupChoice === 'sameAsShipper' || data.pickupChoice === 'newAddress') && <div className="pickup-address-fields">
      {data.pickupChoice === 'newAddress' && children}
      {(data.pickupChoice !== 'newAddress' || !children) && <div className="form-grid">
        {pickupFields.map(([name, label]) => <Field key={name} label={label} name={name}>
          <input name={name} type={name === 'pickupEmail' ? 'email' : name === 'pickupPhone' ? 'tel' : 'text'} value={data[name] || ''} onChange={(event) => setData((draft) => ({ ...draft, [name]: event.target.value }))} />
        </Field>)}
      </div>}
      {data.pickupChoice === 'sameAsShipper' && <p className="muted">These booking fields copy the current shipper details. The carrier request still uses the registered warehouse below.</p>}
    </div>}

    <div className="warehouse-options-header">
      <div><h3>Registered pickup location</h3><p className="muted">Select a Delhivery-registered warehouse for the carrier request.</p></div>
      <Button type="button" onClick={() => setEdit({})}><Plus size={17} /> Add pickup location</Button>
    </div>
    {warehouses.filter((warehouse) => warehouse.registrationStatus === 'REGISTERED').length > 0 ? warehouses.filter((warehouse) => warehouse.registrationStatus === 'REGISTERED').map((warehouse) => <label className={`warehouse-option ${data.warehouse === warehouse.name ? 'selected' : ''}`} key={warehouse.id}>
      <input type="radio" name="warehouse" value={warehouse.name} checked={data.warehouse === warehouse.name} onChange={() => setData((draft) => ({ ...draft, warehouse: warehouse.name, warehouseId: warehouse.id || '', warehouseAddress: warehouse.address || '', warehousePincode: warehouse.pincode || '', warehouseContact: warehouse.contact || '', warehousePhone: warehouse.phone || '' }))} />
      <span><strong>{warehouse.name}</strong><small>{warehouse.address} · {warehouse.pincode}</small><small>{warehouse.contact} · {warehouse.phone}</small></span><MapPin size={20} />
    </label>) : <div className="info-box"><MapPin size={19} /><div><strong>No registered pickup locations are available.</strong><p className="muted">Only backend-confirmed registered warehouses can be selected for booking.</p></div></div>}
    {edit && <WarehouseFormDialog edit={edit} setEdit={setEdit} notify={notify} onSaved={handleWarehouseSaved} />}
  </div>;
}
