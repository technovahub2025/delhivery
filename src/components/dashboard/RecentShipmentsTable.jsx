import { ArrowRight, ArrowUpRight, MapPin } from 'lucide-react';

import { Badge, Empty } from '../ui';

export default function RecentShipmentsTable({ shipments, navigate, onDetails }) {
  return (
    <section className="card table-card">
      <div className="section-head">
        <div>
          <h2>
            Recent shipments <span className="count-badge">{shipments.length}</span>
          </h2>
          <p>A closer look at your latest deliveries</p>
        </div>
        <button className="text-link" onClick={() => navigate('shipments')}>
          View all shipments
          <ArrowRight size={15} />
        </button>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>WAYBILL / REFERENCE</th>
              <th>CUSTOMER</th>
              <th>DESTINATION</th>
              <th>PAYMENT</th>
              <th>STATUS</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shipments.slice(0, 5).map((s) => (
              <tr key={s.id}>
                <td>
                  <button className="table-link" onClick={() => onDetails(s)}>
                    {s.id}
                  </button>
                  <small>{s.reference}</small>
                </td>
                <td>
                  <div className="customer-cell">
                    <span className="avatar mini">
                      {s.customer
                        .split(' ')
                        .map((x) => x[0])
                        .join('')}
                    </span>
                    {s.customer}
                  </div>
                </td>
                <td>
                  <MapPin size={13} className="inline-icon" />
                  {s.destination}
                </td>
                <td>
                  <span className="payment-tag">{s.payment}</span>
                </td>
                <td>
                  <Badge>{s.status}</Badge>
                </td>
                <td>
                  <button
                    className="icon-btn"
                    aria-label={`View ${s.id}`}
                    onClick={() => onDetails(s)}
                  >
                    <ArrowUpRight size={17} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!shipments.length && (
        <Empty title="No shipments yet" description="The connected shipment source returned no records." />
      )}
    </section>
  );
}
