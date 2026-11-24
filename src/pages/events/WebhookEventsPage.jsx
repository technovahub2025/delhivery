import { ArrowUpRight, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import EventDetailsDrawer, { formatEventTime } from '../../components/events/EventDetailsDrawer';
import { Badge, Button, Empty } from '../../components/ui';
import PageHeading from '../../components/ui/PageHeading';
import { api, unwrap } from '../../services/api';

export default function WebhookEventsPage() {
  const [query, setQuery] = useState('');
  const [waybill, setWaybill] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setError('');
    setResult(null);
    api.webhookEvents({ waybill, page }, controller.signal).then(response => {
      if (controller.signal.aborted) return;
      const data = unwrap(response);
      if (!Array.isArray(data?.events) || typeof data.hasMore !== 'boolean') throw new Error('Webhook event history returned an invalid response.');
      setResult(data);
    }).catch(failure => {
      if (!controller.signal.aborted) setError(failure.message || 'Webhook events could not be loaded.');
    });
    return () => controller.abort();
  }, [waybill, page, revision]);

  function search(event) {
    event.preventDefault();
    setWaybill(query.trim());
    setPage(1);
    setRevision(value => value + 1);
  }

  return (
    <>
      <PageHeading title="Webhook events" description="Shipment scans received from Delhivery." />
      <section className="card table-card">
        <form className="table-toolbar" onSubmit={search}>
          <label className="search-input">
            <Search size={17} />
            <input aria-label="Filter by waybill" placeholder="Enter a waybill" value={query} onChange={e => setQuery(e.target.value)} />
          </label>
          <Button type="submit">Search</Button>
          <Button type="button" variant="secondary" onClick={() => setRevision(value => value + 1)}>Refresh</Button>
        </form>
        {error ? <div role="alert">{error} <Button type="button" onClick={() => setRevision(value => value + 1)}>Retry</Button></div>
          : !result ? <p role="status">Loading webhook events...</p>
          : !result.events.length ? <Empty title="No webhook events found" />
          : <div className="table-scroll">
              <table>
                <thead><tr><th>Waybill</th><th>Status</th><th>Scan time</th><th>Location</th><th>Details</th></tr></thead>
                <tbody>{result.events.map(event => (
                  <tr key={event.id}>
                    <td>{event.waybill || 'Unavailable'}</td>
                    <td><Badge>{event.status || 'Unavailable'}</Badge></td>
                    <td>{formatEventTime(event.occurredAt)}</td>
                    <td>{event.location || 'Unavailable'}</td>
                    <td><button className="icon-btn" aria-label={'View event ' + event.id} onClick={() => setSelected(event)}><ArrowUpRight size={17} /></button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>}
        {result && (page > 1 || result.hasMore) && <div className="pagination">
          <Button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span>Page {page}</span>
          <Button type="button" disabled={!result.hasMore || page === 9999} onClick={() => setPage(page + 1)}>Next</Button>
        </div>}
      </section>
      {selected && <EventDetailsDrawer selected={selected} setSelected={setSelected} />}
    </>
  );
}
