import { Building2, Edit3, MapPin, Phone, Plus, User } from 'lucide-react';
import { useState } from 'react';

import { Badge, Button } from '../../components/ui';
import PageHeading from '../../components/ui/PageHeading';
import WarehouseFormDialog from '../../components/warehouses/WarehouseFormDialog';

export default function WarehousesPage({ warehouses, setWarehouses, notify }) {
  const [edit, setEdit] = useState(null);
  return (
    <>
      <div className="heading-with-action">
        <PageHeading
          title="Your network starts here."
          eyebrow="WAREHOUSES"
          description="Manage the places that keep your business moving."
        />
        <Button onClick={() => setEdit({})}>
          <Plus size={17} />
          Add warehouse
        </Button>
      </div>
      <div className="warehouse-grid">
        {warehouses.map((w) => (
          <section className="card warehouse-card" key={w.id}>
            <div className="section-head">
              <span className="tool-icon">
                <Building2 size={26} />
              </span>
              {w.primary ? <Badge>Primary</Badge> : <span className="payment-tag">Active</span>}
            </div>
            <h2>{w.name}</h2>
            <div className="warehouse-info">
              <p>
                <MapPin size={17} />
                <span>
                  {w.address}
                  <br />
                  <strong>{w.pincode}</strong>
                </span>
              </p>
              <p>
                <User size={17} />
                {w.contact}
              </p>
              <p>
                <Phone size={17} />
                {w.phone}
              </p>
            </div>
            <div className="warehouse-footer">
              <span className="positive">
                <span className="pulse-dot" />
                Ready for pickup
              </span>
              <button className="text-link" onClick={() => setEdit(w)}>
                <Edit3 size={14} />
                Edit warehouse
              </button>
            </div>
          </section>
        ))}
        <button className="add-warehouse" onClick={() => setEdit({})}>
          <span>
            <Plus size={25} />
          </span>
          <strong>Room to grow</strong>
          <p>Add another pickup location</p>
        </button>
      </div>
      {edit && (
        <WarehouseFormDialog
          edit={edit}
          setEdit={setEdit}
          setWarehouses={setWarehouses}
          notify={notify}
        />
      )}
    </>
  );
}
