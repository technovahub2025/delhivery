import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link2, RefreshCw, Search, Truck, X } from 'lucide-react';
import { api } from '../../services/api';
import './RtoManagementPage.css';

function unwrap(response) {
  let value = response?.data ?? response;
  if (value?.data !== undefined) value = value.data;
  return value;
}

export default function RtoManagementPage({ dashboardFilter = null, initialSearch = '' }) {
  const [cases, setCases] = useState([]);
  const [dashboardShipments, setDashboardShipments] = useState([]);
  const [selectedDashboardShipment, setSelectedDashboardShipment] = useState(null);
  const [query, setQuery] = useState(initialSearch);
  const [status, setStatus] = useState('All statuses');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [processingHistory, setProcessingHistory] = useState(false);
  const [returnWaybill, setReturnWaybill] = useState('');
  const [dateFrom] = useState(dashboardFilter?.from || '');
  const [dateTo] = useState(dashboardFilter?.to || '');
  const activeOnly = dashboardFilter?.target === 'active';
  const shipmentDashboardMode = dashboardFilter?.target === 'shipments';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const dashboardTarget = dashboardFilter?.target === 'shipments' || dashboardFilter?.target === 'active';
      const data = unwrap(dashboardTarget ? await api.rtoDashboardCases({ from: dashboardFilter?.from, to: dashboardFilter?.to, status: dashboardFilter?.status, target: dashboardFilter.target }) : await api.rtoCases());
      setCases(Array.isArray(data?.cases) ? data.cases : []);
      setDashboardShipments(Array.isArray(data?.shipments) ? data.shipments : []);
      setSelected((current) => current ? data.cases?.find((item) => item.id === current.id) || current : null);
    } catch (failure) {
      setError(failure.message || 'RTO records could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [dashboardFilter?.target, dashboardFilter?.from, dashboardFilter?.to, dashboardFilter?.status]);

  useEffect(() => { load(); }, [load]);

  async function processStoredTracking() {
    setProcessingHistory(true);
    setError('');
    try { await api.processRtoCases(); await load(); }
    catch (failure) { setError(failure.message || 'Stored tracking history could not be processed.'); }
    finally { setProcessingHistory(false); }
  }

  const filtered = useMemo(() => cases.filter((item) => {
    const text = [item.originalWaybill, item.originalReference, item.reason, item.status, item.providerCode, item.returnShipment?.waybill].join(' ').toLowerCase();
    const date = String(item.occurredAt || '').slice(0, 10);
    return (!activeOnly || item.lifecycleState === 'ACTIVE') && (!query.trim() || text.includes(query.trim().toLowerCase())) && (status === 'All statuses' || item.status === status) && (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
  }), [cases, query, status, activeOnly]);

  async function openDetails(item) {
    setSelected(item);
    setDetails(null);
    setDetailLoading(true);
    setError('');
    try {
      setDetails(unwrap(await api.rtoCase(item.id)));
      setReturnWaybill(item.returnShipment?.waybill || '');
    } catch (failure) {
      setError(failure.message || 'RTO detail could not be loaded.');
    } finally {
      setDetailLoading(false);
    }
  }

  async function syncSelected() {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      const data = unwrap(await api.syncRtoCase(selected.id));
      setSelected(data.rto);
      setDetails((current) => current ? { ...current, rto: data.rto } : current);
      await load();
    } catch (failure) {
      setError(failure.message || 'RTO status synchronization is unavailable.');
    } finally {
      setBusy(false);
    }
  }

  async function linkReturnShipment(event) {
    event.preventDefault();
    if (!selected || !returnWaybill.trim()) return;
    setBusy(true);
    setError('');
    try {
      const data = unwrap(await api.linkRtoReturnShipment(selected.id, returnWaybill.trim()));
      setSelected(data.rto);
      setDetails((current) => current ? { ...current, rto: data.rto } : current);
      await load();
      setDetails(unwrap(await api.rtoCase(selected.id)));
    } catch (failure) {
      setError(failure.message || 'The existing reverse shipment could not be linked.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="rto-page">
      <header className="rto-heading">
        <div>
          <span className="rto-eyebrow">SHIPPING OPERATIONS</span>
          <h1>RTO Management</h1>
          <p>Review Return to Origin events and follow the return journey from stored shipment history.</p>
        </div>
        <div className="rto-heading-actions">
          <button type="button" className="rto-button secondary" onClick={processStoredTracking} disabled={processingHistory}>
            <RefreshCw size={16} /> {processingHistory ? 'Processingâ€¦' : 'Process tracking history'}
          </button>
          <button type="button" className="rto-button secondary" onClick={load} disabled={loading}>
            <RefreshCw size={16} /> {loading ? 'Refreshingâ€¦' : 'Refresh records'}
          </button>
        </div>
      </header>

      <section className="rto-card">
        <div className="rto-toolbar">
          <label className="rto-search"><Search size={17} /><input aria-label="Search RTO records" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search AWB, reference, reason or return shipment" /></label>
          <select aria-label="RTO status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option>All statuses</option>
            {[...new Set(cases.map((item) => item.status).filter(Boolean))].map((item) => <option key={item}>{item}</option>)}
          </select>
          <span>{shipmentDashboardMode ? dashboardShipments.filter((group) => cases.some((item) => item.originalShipmentId === group.shipmentId && (status === 'All statuses' || item.status === status))).length + ' shipments' : filtered.length + ' records'}</span>
        </div>
        {error && <p className="rto-error" role="alert">{error}</p>}
        {loading ? <p className="rto-empty">Loading RTO recordsâ€¦</p> : filtered.length ? (
          <div className="rto-table-wrap">
            {shipmentDashboardMode ? <table>
              <thead><tr><th>Original AWB / reference</th><th>Courier</th><th>RTO events</th><th>Reasons</th><th>Latest event</th><th>Details</th></tr></thead>
              <tbody>{dashboardShipments.filter((group) => {
                const related = cases.filter((item) => item.originalShipmentId === group.shipmentId && (status === 'All statuses' || item.status === status));
                return related.length > 0 && (!query.trim() || [group.originalWaybill, group.originalReference, ...related.flatMap((item) => [item.reason, item.status])].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
              }).map((group) => {
                const related = cases.filter((item) => item.originalShipmentId === group.shipmentId && (status === 'All statuses' || item.status === status));
                return <tr key={group.shipmentId}>
                  <td><strong>{group.originalWaybill || '—'}</strong><small>{group.originalReference || 'No reference'}</small></td>
                  <td>{group.providerCode || 'Unknown'}<small>{group.providerCode === 'MOCK' || group.providerCode === 'MOCK_LOCAL' ? 'Local mock observations' : 'Provider observations'}</small></td><td>{related.length}</td>
                  <td>{[...new Set(related.map((item) => item.reason).filter(Boolean))].join('; ') || '—'}</td>
                  <td>{group.occurredAt ? new Date(group.occurredAt).toLocaleString() : '—'}</td>
                  <td><button type="button" className="rto-button" onClick={() => setSelectedDashboardShipment({ ...group, cases: related })}>Related events</button></td>
                </tr>;
              })}</tbody>
            </table> : 
            <table>
              <thead><tr><th>Original AWB / reference</th><th>RTO reason</th><th>Status</th><th>Event time</th><th>Return shipment</th><th /></tr></thead>
              <tbody>{filtered.map((item) => <tr key={item.id}>
                <td><strong>{item.originalWaybill}</strong><small>{item.originalReference || 'No reference'}</small></td>
                <td>{item.reason || 'Reason not supplied'}</td>
                <td><span className="rto-status">{item.lifecycleState || 'UNRESOLVED'}</span><small>{item.status}</small></td>
                <td>{item.occurredAt ? new Date(item.occurredAt).toLocaleString() : 'â€”'}</td>
                <td>{item.returnShipment?.waybill || 'Not linked'}</td>
                <td><button type="button" className="rto-button" onClick={() => openDetails(item)}>Details</button></td>
              </tr>)}</tbody>
            </table>}
          </div>
        ) : <div className="rto-empty"><Truck size={24} /><h2>No RTO records</h2><p>{query || status !== 'All statuses' ? 'No records match the selected search or status.' : 'No explicit RTO events are present in the stored tracking history.'}</p></div>}
      </section>

      {selectedDashboardShipment && <section className="rto-card" aria-label="Related RTO events">
        <div className="rto-detail-heading"><div><span className="rto-eyebrow">SHIPMENT RTO HISTORY</span><h2>{selectedDashboardShipment.originalWaybill}</h2></div><button type="button" className="rto-icon-button" aria-label="Close related RTO events" onClick={() => setSelectedDashboardShipment(null)}><X size={18} /></button></div>
        <ol>{(selectedDashboardShipment.cases || []).map((item, index) => <li key={item.id || item.triggerEventKey || index}><strong>{item.reason || item.status}</strong> | {item.status} | {item.lifecycleState || 'UNRESOLVED'} | {item.occurredAt ? new Date(item.occurredAt).toLocaleString() : 'Time unavailable'} | {item.persisted === false ? 'Derived observation' : 'Persisted case'} {item.id && <button type="button" className="rto-button" onClick={() => openDetails(item)}>Details</button>}</li>)}</ol>
      </section>}
      {selected && <section className="rto-card rto-details" aria-label="RTO details">
        <div className="rto-detail-heading"><div><span className="rto-eyebrow">RTO RECORD</span><h2>{selected.originalWaybill} Â· {selected.status}</h2></div><button type="button" className="rto-icon-button" aria-label="Close RTO details" onClick={() => { setSelected(null); setDetails(null); }}><X size={18} /></button></div>
        {detailLoading ? <p>Loading RTO historyâ€¦</p> : details && <>
          <p><strong>Reason:</strong> {selected.reason || 'Not supplied'} Â· <strong>Courier:</strong> {selected.providerCode || 'Unknown'} Â· <strong>Carrier reference:</strong> {selected.carrierReference || selected.originalWaybill}</p>
          <div className="rto-detail-grid"><div><h3>Original shipment</h3><p>{details.originalShipment?.customer || 'Customer details unavailable'}</p><p>{details.originalShipment?.destination || 'Destination unavailable'}</p><p>{selected.originalReference || 'No reference'}</p></div><div><h3>Return details</h3>{Object.entries(selected.returnDetails || {}).length ? Object.entries(selected.returnDetails).map(([key, value]) => <p key={key}><strong>{key}:</strong> {value}</p>) : <p>Return address details were not present on the original shipment.</p>}</div></div>
          <h3>RTO status history</h3>
          {selected.statusHistory?.length ? <ol className="rto-timeline">{selected.statusHistory.map((event, index) => <li key={`${event.shipmentId}-${event.eventKey || index}`}><strong>{event.status}</strong><p>{event.reason || 'No description supplied'}{event.location ? ` Â· ${event.location}` : ''}</p><time>{event.occurredAt ? new Date(event.occurredAt).toLocaleString() : 'Time unavailable'}</time></li>)}</ol> : <p>No status history is available.</p>}
          {selected.returnShipment && <><h3>Linked return shipment progress Â· {selected.returnShipment.waybill}</h3><ol className="rto-timeline">{(details.returnTrackingEvents || []).map((event, index) => <li key={event.eventKey || index}><strong>{event.status}</strong><p>{event.description || event.location || 'No description supplied'}</p><time>{event.occurredAt ? new Date(event.occurredAt).toLocaleString() : 'Time unavailable'}</time></li>)}</ol></>}
        </>}
        <div className="rto-detail-actions">
          <button type="button" className="rto-button secondary" disabled={busy} onClick={syncSelected}><RefreshCw size={15} /> {busy ? 'Syncingâ€¦' : 'Sync status'}</button>
          <form onSubmit={linkReturnShipment}><label htmlFor="rto-return-waybill">Link existing reverse shipment AWB</label><input id="rto-return-waybill" value={returnWaybill} onChange={(event) => setReturnWaybill(event.target.value)} placeholder="Existing owner shipment AWB" maxLength={100} /><button type="submit" className="rto-button secondary" disabled={busy || !returnWaybill.trim()}><Link2 size={15} /> Link shipment</button></form>
        </div>
        <p className="rto-note">Status sync requires a configured courier adapter. Linking only attaches an existing owner-scoped reverse shipment; it does not create a shipment.</p>
      </section>}
    </main>
  );
}
