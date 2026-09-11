import { Building2, Plus, Truck } from 'lucide-react';
import { useState } from 'react';

import PickupRequestDialog from '../../components/pickups/PickupRequestDialog';
import { Badge, Button, Empty } from '../../components/ui';
import PageHeading from '../../components/ui/PageHeading';

export default function PickupRequestsPage({ warehouses, pickups, setPickups, notify }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('All requests');
  const rows = pickups.filter((p) => filter === 'All requests' || p.status === filter);
  return (
    <>
      <div className="heading-with-action">
        <PageHeading
          title="We’ll take it from here."
          eyebrow="PICKUP REQUESTS"
          description="Schedule a pickup. We’ll handle the next mile."
        />
        <Button onClick={() => setOpen(true)}>
          <Plus size={17} />
          Request pickup
        </Button>
      </div>
      <div className="pickup-summary">
        {[
          ['Scheduled', 'Ready for the road'],
          ['Completed', 'Off to a great start'],
        ].map(([s, desc]) => (
          <div className="card" key={s}>
            <span className="quick-icon">
              <Truck size={23} />
            </span>
            <div>
              <h2>
                {pickups.filter((p) => p.status === s).length} {s.toLowerCase()} pickups
              </h2>
              <p>{desc}</p>
            </div>
          </div>
        ))}
      </div>
      <section className="card table-card">
        <div className="tabs">
          {['All requests', 'Scheduled', 'Completed'].map((f) => (
            <button key={f} className={f === filter ? 'active' : ''} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>REQUEST ID</th>
                <th>PICKUP WAREHOUSE</th>
                <th>DATE & TIME</th>
                <th>PACKAGES</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.id}</strong>
                  </td>
                  <td>
                    <Building2 size={15} className="inline-icon" />
                    {p.warehouse}
                  </td>
                  <td>
                    {p.date}
                    <small>{p.time}</small>
                  </td>
                  <td>{p.count} packages</td>
                  <td>
                    <Badge>{p.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <Empty
              title="No pickup requests"
              description="Create a pickup request to get things moving."
            />
          )}
        </div>
      </section>
      {open && (
        <PickupRequestDialog
          warehouses={warehouses}
          setOpen={setOpen}
          setPickups={setPickups}
          notify={notify}
        />
      )}
    </>
  );
}
