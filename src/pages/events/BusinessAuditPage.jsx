import { useEffect, useState } from 'react';

import { Badge, Button, Empty } from '../../components/ui';
import PageHeading from '../../components/ui/PageHeading';
import { api, unwrap } from '../../services/api';

export default function BusinessAuditPage() {
  const [view, setView] = useState('business');
  const [page, setPage] = useState(1);
  const carrier = view === 'carrier';
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const request = new AbortController();
    setError('');
    setResult(null);
    const read = carrier ? api.integrationAuditEvents : api.auditEvents;
    read({ page }, request.signal).then(response => {
      if (request.signal.aborted) return;
      const data = unwrap(response);
      if (!Array.isArray(data?.events)) throw new Error('The audit response was invalid.');
      setResult(data);
    }).catch(failure => {
      if (!request.signal.aborted) setError(failure.message || 'Audit history could not be loaded.');
    });
    return () => request.abort();
  }, [page, revision, carrier]);

  return <>
    <PageHeading title="Audit history" description="Recorded changes for the signed-in account." />
    <section className="card table-card">
      <div className="table-toolbar" aria-label="Audit entries">
        <Button type="button" variant="secondary" aria-pressed={!carrier} onClick={() => { setView('business'); setPage(1); }}>Business changes</Button>
        <Button type="button" variant="secondary" aria-pressed={carrier} onClick={() => { setView('carrier'); setPage(1); }}>Carrier requests</Button>
      </div>
      {error ? <div role="alert">{error} <Button type="button" onClick={() => setRevision(value => value + 1)}>Retry</Button></div>
        : !result ? <p role="status">Loading audit history...</p>
        : !result.events.length ? <Empty title={carrier ? 'No carrier requests recorded' : 'No audit entries found'} />
        : <div className="table-scroll"><table>
          <thead><tr><th>Time</th>{carrier ? <><th>Operation</th><th>Outcome</th><th>HTTP status</th><th>Duration</th></>
            : <><th>Action</th><th>Entity</th><th>Actor</th><th>Outcome</th><th>Changed fields</th></>}<th>Request ID</th></tr></thead>
          <tbody>{result.events.map(event => <tr key={event.id}>
            <td>{event.createdAt ? new Date(event.createdAt).toLocaleString() : 'Unavailable'}</td>
            {carrier ? <>
              <td>{event.method} {event.operationPath}</td>
              <td><Badge>{event.outcome}</Badge></td>
              <td>{event.statusCode ?? 'No response'}</td>
              <td>{event.durationMs} ms</td>
            </> : <>
              <td>{event.action}</td>
              <td>{event.entityType}{event.entityRef && ' / ' + event.entityRef}</td>
              <td>{event.actorId}</td>
              <td><Badge>{event.outcome} ({event.statusCode})</Badge></td>
              <td>{event.changedFields?.join(', ') || 'None recorded'}</td>
            </>}
            <td>{event.correlationId || 'Unavailable'}</td>
          </tr>)}</tbody>
        </table></div>}
      {result && (page > 1 || result.hasMore) && <div className="pagination">
        <Button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
        <span>Page {page}</span>
        <Button type="button" disabled={!result.hasMore} onClick={() => setPage(page + 1)}>Next</Button>
      </div>}
    </section>
  </>;
}
