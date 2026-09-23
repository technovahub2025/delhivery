import { Edit3, FileText, MoreHorizontal, Package, Plus, Search, XCircle } from 'lucide-react';
import { useState } from 'react';

import ShipmentActionDialog from '../../components/shipments/ShipmentActionDialog';
import { Badge, Button, Empty } from '../../components/ui';
import Pagination from '../../components/ui/Pagination';
import ShipmentLoadState from '../../components/shipments/ShipmentLoadState';
import { statuses } from '../../data/demo';

export default function ShipmentsPage({
  shipments,
  load,
  setShipments,
  navigate,
  notify,
  onDetails,
  initialSearch = '',
}) {
  const [query, setQuery] = useState(initialSearch);
  const [status, setStatus] = useState('All shipments');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [menu, setMenu] = useState(null);
  const [action, setAction] = useState(null);
  const filtered = shipments.filter(
    (s) =>
      (status === 'All shipments' || s.status === status) &&
      (!date || s.date === date) &&
      `${s.id} ${s.reference} ${s.customer} ${s.destination}`
        .toLowerCase()
        .includes(query.toLowerCase())
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 7));
  const active = Math.min(page, pages);

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow muted">SHIPMENT MANAGEMENT</div>
          <h1>
            {load.status === 'success'
              ? 'All your shipments. One place.'
              : 'Shipments created in this session'}
          </h1>
          <p>
            {load.status === 'success'
              ? 'Stay on top of every package, from pickup to doorstep.'
              : 'These records do not include your existing account history.'}
          </p>
        </div>
        <Button onClick={() => navigate('create')}>
          <Plus size={17} />
          Create shipment
        </Button>
      </div>
      {load.status !== 'success' && <ShipmentLoadState load={load} />}
      <section className="card table-card">
        <div className="tabs">
          {['All shipments', ...statuses].map((t) => (
            <button
              key={t}
              className={status === t ? 'active' : ''}
              onClick={() => {
                setStatus(t);
                setPage(1);
              }}
            >
              {t}
              <span>
                {t === 'All shipments'
                  ? shipments.length
                  : shipments.filter((s) => s.status === t).length}
              </span>
            </button>
          ))}
        </div>
        <div className="table-toolbar">
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label="Search shipments"
              placeholder="Search waybill, reference or customer…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <input
            type="date"
            aria-label="Filter shipment date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setPage(1);
            }}
          />
          {(query || date || status !== 'All shipments') && (
            <Button
              variant="secondary"
              onClick={() => {
                setQuery('');
                setDate('');
                setStatus('All shipments');
                setPage(1);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>WAYBILL / REFERENCE</th>
                <th>CUSTOMER</th>
                <th>DESTINATION</th>
                <th>DATE</th>
                <th>PAYMENT</th>
                <th>STATUS</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.slice((active - 1) * 7, active * 7).map((s) => (
                <tr key={s.id}>
                  <td>
                    <button className="table-link" onClick={() => onDetails(s)}>
                      {s.id}
                    </button>
                    <small>{s.reference}</small>
                  </td>
                  <td>{s.customer}</td>
                  <td>
                    {s.destination}
                    <small>{s.pincode}</small>
                  </td>
                  <td>{s.date}</td>
                  <td>
                    <span className="payment-tag">{s.payment}</span>
                  </td>
                  <td>
                    <Badge>{s.status}</Badge>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-btn"
                        aria-label={`Actions for ${s.id}`}
                        aria-expanded={menu === s.id}
                        onClick={() => setMenu(menu === s.id ? null : s.id)}
                      >
                        <MoreHorizontal size={20} />
                      </button>
                      {menu === s.id && (
                        <div className="dropdown row-menu">
                          {[
                            [Package, 'View details', 'view'],
                            [Edit3, 'Edit shipment', 'edit'],
                            [FileText, 'Update e-waybill', 'ewaybill'],
                            [XCircle, 'Cancel shipment', 'cancel'],
                          ].map(([Icon, label, type]) => (
                            <button
                              key={type}
                              disabled={type === 'cancel' && s.status === 'Cancelled'}
                              onClick={() => {
                                setMenu(null);
                                type === 'view' ? onDetails(s) : setAction({ type, shipment: s });
                              }}
                            >
                              <Icon size={15} />
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <Empty />}
        </div>
        <Pagination total={filtered.length} page={active} pageSize={7} onPageChange={setPage} />
      </section>
      {action && (
        <ShipmentActionDialog
          action={action}
          setAction={setAction}
          setShipments={setShipments}
          notify={notify}
        />
      )}
    </>
  );
}
