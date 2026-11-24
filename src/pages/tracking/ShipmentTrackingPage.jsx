import { useEffect, useState } from 'react';
import { Button, Empty, Field, Skeleton } from '../../components/ui';
import PageHeading from '../../components/ui/PageHeading';
import ApiResult from '../../components/ui/ApiResult';
import { api, unwrap } from '../../services/api';
import useApiAction from '../../hooks/useApiAction';

export default function ShipmentTrackingPage({ initialSearch = '' }) {
  const [query, setQuery] = useState(initialSearch);
  const [kind, setKind] = useState('waybill');
  const [result, setResult] = useState(null);
  const { busy, error, run } = useApiAction();
  const search = (searchKind = kind, searchValue = query) => {
    const value = searchValue.trim();
    if (!value) return;
    setResult(null);
    run(async () => setResult(unwrap(await api.track({ [searchKind]: value }))));
  };
  const sync = () => run(async () => setResult(unwrap(await api.syncShipmentTracking(result.shipment.id))));
  const events = Array.isArray(result?.events) ? result.events : [];
  useEffect(() => { if (initialSearch) { setQuery(initialSearch); search('waybill', initialSearch); } }, [initialSearch]);
  return (
    <>
      <PageHeading
        title="Every mile, in the picture."
        eyebrow="SHIPMENT TRACKING"
        description="Get the latest shipment updates from the shipping service."
      />
      <section className="card tracking-search">
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!query.trim()) return;
            search();
          }}
        >
          <Field label="Search by">
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setResult(null);
              }}
              disabled={busy}
            >
              <option value="waybill">Waybill</option>
              <option value="ref_ids">Order reference</option>
            </select>
          </Field>
          <Field
            label="Waybill or reference number"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            required
          />
          <Button type="submit" disabled={busy}>
            Track shipment
          </Button>
        </form>
      </section>
      <section className="card mt-6">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {busy ? (
          <Skeleton />
        ) : result ? (
          <>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2>Shipment tracking</h2>
                {result.shipment && <p>{result.shipment.waybill || result.shipment.reference}</p>}
              </div>
              {result.shipment?.id && (
                <Button type="button" variant="secondary" disabled={busy} onClick={sync}>
                  Sync from courier
                </Button>
              )}
            </div>
            {result.sync?.outcome === 'NO_EVENTS' && <p role="status">The courier returned no tracking events. Stored history is unchanged.</p>}
            {result.sync?.outcome === 'RECEIVED' && <p role="status">{result.sync.providerCode === 'DELHIVERY' ? 'Live Delhivery tracking synchronized.' : 'Tracking synchronized.'}</p>}
            {events.length ? (
              <ol className="mt-5 space-y-4" aria-label="Tracking timeline">
                {events.map((item, index) => (
                  <li key={item.eventKey || `${item.occurredAt}-${index}`} className="border-l-2 border-slate-200 pl-4">
                    <strong>{item.status}</strong>
                    <small>{item.providerCode === 'MOCK_LOCAL' || item.providerCode === 'MOCK' ? 'Local mock observation' : item.source === 'WEBHOOK' ? 'Provider webhook observation' : ['SYNC', 'POLL'].includes(item.source) ? `${item.providerCode || 'Courier'} tracking observation` : 'Stored tracking observation'}</small>
                    {item.location && <p>{item.location}</p>}
                    {item.description && <p>{item.description}</p>}
                    <time dateTime={item.occurredAt}>{item.occurredAt ? new Date(item.occurredAt).toLocaleString() : 'Time unavailable'}</time>
                  </li>
                ))}
              </ol>
            ) : result.shipment ? (
              <Empty title="No tracking events yet" description="No scan history has been recorded for this shipment." />
            ) : (
              <ApiResult value={result} />
            )}
          </>
        ) : (
          <Empty title="Track a shipment" description={error ? 'Tracking could not be loaded. Retry your search.' : 'Enter a waybill or order reference above.'} />
        )}
        {error && !busy && <Button type="button" variant="secondary" className="mt-3" onClick={result?.shipment?.id ? sync : () => search()}>Retry</Button>}
      </section>
    </>
  );
}
