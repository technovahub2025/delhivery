import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Search } from 'lucide-react';
import { api } from '../../services/api';

function unwrap(response) {
  let value = response?.data ?? response;
  if (value?.data !== undefined) value = value.data;
  return value;
}

function getInstructions(shipment) {
  const status = shipment?.Status ?? {};
  const scans = Array.isArray(shipment?.Scans) ? shipment.Scans : [];

  return [
    status.Status,
    status.Instructions,
    ...scans.map((scan) => scan?.ScanDetail?.Instructions),
  ].filter(Boolean).join(' | ');
}

function isException(status, instructions) {
  const text = `${status || ''} ${instructions || ''}`.toLowerCase();

  return /exception|delivery failed|failed delivery|bad.?address|incomplete address|damaged|damage|lost shipment|shipment delayed|delivery delayed|consignee unavailable|customer not available|refused delivery|undelivered/.test(text);
}

export default function ExceptionsPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checked, setChecked] = useState(0);
  const [failed, setFailed] = useState(0);

  const loadExceptions = useCallback(async () => {
    setLoading(true);
    setError('');
    setFailed(0);

    try {
      const response = await api.shipments({ page: 1, limit: 100 });
      const payload = unwrap(response);
      const shipments = payload?.shipments;

      if (!Array.isArray(shipments)) {
        throw new Error('Unexpected shipment-list response from the server.');
      }

      setChecked(shipments.length);

      const results = await Promise.all(
        shipments.map(async (row) => {
          const record = row?.record ?? row ?? {};
          const waybill = String(row?.waybill ?? record?.waybill ?? '').trim();

          if (!waybill) return { error: false, item: null };

          try {
            const trackingResponse = await api.track({ waybill });
            const tracking = unwrap(trackingResponse);
            const data = tracking?.ShipmentData;

            if (!Array.isArray(data)) {
              return { error: true, item: null };
            }

            const entries = data.map((entry) => {
              const live = entry?.Shipment;
              if (!live) return null;

              const status = live?.Status?.Status || '';
              const instructions = getInstructions(live);

              if (!isException(status, instructions)) return null;

              return {
                waybill,
                reference: row?.reference ?? record?.reference ?? '',
                status,
                reason: instructions || status || 'Tracking exception',
                updatedAt: live?.Status?.StatusDateTime || '',
              };
            }).filter(Boolean);

            return { error: false, item: entries };
          } catch {
            return { error: true, item: null };
          }
        })
      );

      setFailed(results.filter((result) => result.error).length);
      setItems(results.flatMap((result) =>
        Array.isArray(result.item) ? result.item : result.item ? [result.item] : []
      ));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
        err.message ||
        'Could not load shipment exceptions.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExceptions();
  }, [loadExceptions]);

  const filtered = items.filter((item) =>
    `${item.waybill} ${item.reference} ${item.status} ${item.reason}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  return (
    <main className="ndr-page">
      <header className="ndr-heading">
        <div>
          <div className="ndr-eyebrow">SHIPPING OPERATIONS</div>
          <h1><AlertTriangle size={22} /> Shipment Exceptions</h1>
          <p>Review exceptions detected in tracking information for saved shipments.</p>
        </div>

        <button
          type="button"
          className="ndr-outline"
          disabled={loading}
          onClick={loadExceptions}
        >
          <RefreshCw size={16} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <div className="ndr-info-banner">
        <AlertTriangle size={18} />
        <div>
          <strong>Tracking-based exception detection</strong>
          <p>
            These results are inferred from shipment tracking statuses and
            instructions. They are not a guaranteed complete official
            Delhivery exception feed.
          </p>
          {!loading && (
            <p>
              {checked} shipments checked · {failed} tracking request(s) failed.
            </p>
          )}
        </div>
      </div>

      <section className="ndr-list-card">
        <div className="ndr-filters">
          <label className="ndr-search">
            <Search size={17} />
            <input
              aria-label="Search exceptions"
              placeholder="Search AWB, reference, status, or reason"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        <div className="ndr-table-scroll">
          <table className="ndr-table">
            <thead>
              <tr>
                <th>ORDER REFERENCE</th>
                <th>WAYBILL</th>
                <th>STATUS</th>
                <th>EXCEPTION DETAILS</th>
                <th>LAST UPDATED</th>
              </tr>
            </thead>
            <tbody>
              {!loading && !error && filtered.map((item, index) => (
                <tr key={`${item.waybill}-${index}`}>
                  <td>{item.reference || '—'}</td>
                  <td>{item.waybill}</td>
                  <td>{item.status || '—'}</td>
                  <td>{item.reason || '—'}</td>
                  <td>
                    {item.updatedAt
                      ? new Date(item.updatedAt).toLocaleString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && (
            <div className="ndr-empty">
              <RefreshCw size={24} />
              <h3>Checking shipment tracking…</h3>
            </div>
          )}

          {!loading && error && (
            <div className="ndr-empty" role="alert">
              <h3>Could not load exceptions</h3>
              <p>{error}</p>
              <button className="ndr-outline" onClick={loadExceptions}>
                Try again
              </button>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="ndr-empty">
              <AlertTriangle size={26} />
              <h3>{items.length ? 'No matching exceptions' : 'No exceptions detected'}</h3>
              <p>
                {items.length
                  ? 'Try another search.'
                  : 'No matching exception statuses were identified in the tracking responses.'}
              </p>
            </div>
          )}

          <div className="ndr-table-footer">
            <span>{loading ? 'Loading…' : `${filtered.length} exceptions detected`}</span>
            <button
              className="ndr-outline"
              onClick={() => setSearch('')}
            >
              Clear search
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
