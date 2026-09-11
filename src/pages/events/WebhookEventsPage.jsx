import { ArrowUpRight, Search } from 'lucide-react';
import { useState } from 'react';

import EventDetailsDrawer from '../../components/events/EventDetailsDrawer';
import { Badge, Empty } from '../../components/ui';
import PageHeading from '../../components/ui/PageHeading';
import { events } from '../../data/demo';

export default function WebhookEventsPage() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const rows = events.filter((e) =>
    `${e.waybill} ${e.status} ${e.location}`.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <>
      <PageHeading
        title="Every update, accounted for."
        eyebrow="WEBHOOK EVENTS"
        description="Event history is not available in this workspace yet."
      />
      <section className="card table-card">
        <div className="table-toolbar">
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label="Search webhook events"
              placeholder="Search waybill, status or location…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <span className="demo-pill">
            <span />
            Event history unavailable
          </span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>EVENT / WAYBILL</th>
                <th>STATUS</th>
                <th>TIMESTAMP</th>
                <th>LOCATION</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td>
                    <button className="table-link" onClick={() => setSelected(e)}>
                      {e.waybill}
                    </button>
                    <small>{e.id}</small>
                  </td>
                  <td>
                    <Badge>{e.status}</Badge>
                  </td>
                  <td>
                    {e.timestamp.slice(0, 10)}
                    <small>{e.timestamp.slice(11, 19)} IST</small>
                  </td>
                  <td>{e.location}</td>
                  <td>
                    <button
                      className="icon-btn"
                      aria-label={`View event ${e.id}`}
                      onClick={() => setSelected(e)}
                    >
                      <ArrowUpRight size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <Empty
              title="Event history unavailable"
              description="The backend receives shipment callbacks but does not yet provide an event history endpoint."
            />
          )}
        </div>
      </section>
      {selected && <EventDetailsDrawer selected={selected} setSelected={setSelected} />}
    </>
  );
}
