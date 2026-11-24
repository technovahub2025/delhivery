import { Building2, Edit3, MapPin, Phone, Plus, User } from 'lucide-react';
import { useState } from 'react';

import { Badge, Button } from '../../components/ui';
import PageHeading from '../../components/ui/PageHeading';
import WarehouseFormDialog from '../../components/warehouses/WarehouseFormDialog';

function registrationLabel(warehouse) {
  const status = String(warehouse.registrationStatus || '').toUpperCase();
  if (status === 'REGISTERED') return 'Registered · ready for booking';
  if (status === 'CREATING' || status === 'PENDING') return 'Pending registration';
  if (status === 'FAILED') return 'Registration failed';
  if (status === 'OUTCOME_UNCONFIRMED') return 'Outcome needs verification';
  return 'Registration not verified';
}

export default function WarehousesPage({
  warehouses = [],
  notify,
  error = '',
  loading = false,
  legacyWarehousesDetected = false,
  reloadWarehouses,
}) {
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
      {legacyWarehousesDetected && (
        <p className="info-box" role="status">
          Older warehouse entries were found in this browser. They are not verified or available for booking; only warehouses confirmed by the backend are shown.
        </p>
      )}
      {error && (
        <div className="error" role="alert">
          <p>{error}</p>
          <Button type="button" variant="secondary" onClick={() => reloadWarehouses?.().catch(() => {})}>
            Retry
          </Button>
        </div>
      )}
      {loading && <p className="muted" role="status">Loading warehouses...</p>}
      {!loading && !error && warehouses.length === 0 && (
        <p className="muted" role="status">No warehouses have been registered in your account yet.</p>
      )}
      <div className="warehouse-grid">
        {warehouses.map((warehouse) => {
          const registered = warehouse.registrationStatus === 'REGISTERED';
          return (
            <section className="card warehouse-card" key={warehouse.id}>
              <div className="section-head">
                <span className="tool-icon"><Building2 size={26} /></span>
                <Badge>{registrationLabel(warehouse)}</Badge>
              </div>
              <h2>{warehouse.name}</h2>
              <div className="warehouse-info">
                <p><MapPin size={17} /><span>{warehouse.address}<br /><strong>{warehouse.pincode}</strong></span></p>
                <p><User size={17} /><span>Registered business: {warehouse.registered_name || '—'}</span></p>
                <p><Phone size={17} />{warehouse.phone || '—'}</p>
              </div>
              {warehouse.updateStatus && warehouse.updateStatus !== 'SUCCEEDED' && (
                <p className="muted">Last update: {warehouse.updateStatus === 'PENDING' ? 'pending' : warehouse.updateStatus.toLowerCase().replaceAll('_', ' ')}</p>
              )}
              <div className="warehouse-footer">
                <span className={registered ? 'positive' : 'muted'}>
                  <span className="pulse-dot" />
                  {registered ? 'Registration confirmed' : 'Not ready for booking'}
                </span>
                {registered && (
                  <button className="text-link" onClick={() => setEdit(warehouse)}>
                    <Edit3 size={14} />
                    Edit warehouse
                  </button>
                )}
              </div>
            </section>
          );
        })}
        {!loading && !error && <button className="add-warehouse" onClick={() => setEdit({})}>
          <span><Plus size={25} /></span>
          <strong>Room to grow</strong>
          <p>Add another pickup location</p>
        </button>}
      </div>
      {edit && (
        <WarehouseFormDialog
          edit={edit}
          setEdit={setEdit}
          notify={notify}
          onSaved={reloadWarehouses}
        />
      )}
    </>
  );
}
