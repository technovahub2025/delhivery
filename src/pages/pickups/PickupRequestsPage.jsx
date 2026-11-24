import { Building2, Plus, Truck } from 'lucide-react';
import { Fragment, useState } from 'react';
import { Search } from 'lucide-react';
import { api, unwrap } from '../../services/api';

import PickupRequestDialog from '../../components/pickups/PickupRequestDialog';
import { Badge, Button, Empty } from '../../components/ui';
import PageHeading from '../../components/ui/PageHeading';

export default function PickupRequestsPage({ warehouses, pickups, setPickups, shipments = [], pickupLoad, notify, dashboardFilter = null, initialSearch = '' }) {
  const [open, setOpen] = useState(false);
  const [editingPickup, setEditingPickup] = useState(null);
  const [filter, setFilter] = useState(dashboardFilter?.target || 'All requests');
  const [dateFrom] = useState(dashboardFilter?.from || '');
  const [dateTo] = useState(dashboardFilter?.to || '');
  const [actionError, setActionError] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [diagnostic, setDiagnostic] = useState(null);
  const [search, setSearch] = useState(initialSearch);
  const rows = pickups.filter((p) => (filter === 'All requests' || p.status === filter) && (!dateFrom || String(p.date || '').slice(0, 10) >= dateFrom) && (!dateTo || String(p.date || '').slice(0, 10) <= dateTo) && (!search.trim() || [p.carrierRequestId, p.warehouse, p.location?.phone, p.location?.pincode, ...(p.shipmentRefs || []).flatMap(ref => [ref.waybill, ref.reference])].join(' ').toLowerCase().includes(search.trim().toLowerCase())));
  async function cancelPickup(pickup) {
    setActionError('');
    setActionBusy(pickup.id);
    try {
      const result = unwrap(await api.cancelPickupRequest(pickup.recordId || pickup.id));
      const saved = result.pickup;
      setPickups((current) => current.map((item) => item.id === pickup.id ? saved : item));
      notify?.('Pickup request cancelled locally. No carrier cancellation was sent.');
    } catch (error) {
      setActionError(error?.message || 'Pickup request could not be cancelled.');
    } finally {
      setActionBusy('');
    }
  }
  async function recordPickupStatus(pickup, status) {
    setActionError(''); setActionBusy(pickup.id);
    try {
      const saved = unwrap(await api.updatePickupStatus(pickup.recordId || pickup.id, status)).pickup;
      setPickups((current) => current.map((item) => item.id === pickup.id ? saved : item));
      notify?.('Local pickup status recorded: ' + saved.status + '.');
    } catch (error) { setActionError(error?.message || 'Pickup status could not be updated.'); }
    finally { setActionBusy(''); }
  }
  async function syncPickup(pickup) {
    setActionError(''); setActionBusy(pickup.id);
    try {
      const result = unwrap(await api.syncPickupStatus(pickup.recordId || pickup.id));
      const saved = result.pickup;
      setPickups((current) => current.map((item) => item.id === pickup.id ? saved : item));
      notify?.(result.changed === false ? 'Carrier pickup status is unchanged.' : 'Pickup status synchronized from the configured courier.');
    } catch (error) { setActionError(error?.message || 'Courier pickup synchronization is unavailable.'); }
    finally { setActionBusy(''); }
  }
  async function submitPickup(pickup) {
    setActionError(''); setActionBusy(pickup.id);
    try {
      const saved = unwrap(await api.submitPickupRequest(pickup.recordId || pickup.id)).pickup;
      setPickups((current) => current.map((item) => item.id === pickup.id ? saved : item));
      notify?.('Pickup submitted to Delhivery and confirmed.');
    } catch (error) { setActionError(error?.message || 'Pickup could not be submitted to Delhivery.'); }
    finally { setActionBusy(''); }
  }
  async function recoverPickup(pickup) {
    const reason = globalThis.prompt?.('Recovery reason (minimum 10 characters):', '') || '';
    if (reason.trim().length < 10) { setActionError('Provide an operator recovery reason of at least 10 characters.'); return; }
    setActionError(''); setActionBusy(pickup.id);
    try { const saved = unwrap(await api.recoverPickupRequest(pickup.recordId || pickup.id, reason)).pickup; setPickups((current) => current.map((item) => item.id === pickup.id ? saved : item)); notify?.('Pickup recovery authorized. Review it before submitting again.'); }
    catch (error) { setActionError(error?.message || 'Pickup recovery could not be authorized.'); }
    finally { setActionBusy(''); }
  }
  async function inspectDiagnostic(pickup) {
    setActionError(''); setActionBusy('diagnostic-' + pickup.id);
    try { setDiagnostic(unwrap(await api.pickupDiagnostic(pickup.recordId || pickup.id))); }
    catch (error) { setActionError(error?.message || 'Pickup diagnostic could not be loaded.'); }
    finally { setActionBusy(''); }
  }
  async function cancelFailedPickup(pickup) {
    const reason = globalThis.prompt?.('Cancellation reason (minimum 10 characters):', '') || '';
    if (reason.trim().length < 10) { setActionError('Provide a cancellation reason of at least 10 characters.'); return; }
    setActionError(''); setActionBusy(pickup.id);
    try { const saved = unwrap(await api.cancelFailedPickupRequest(pickup.recordId || pickup.id, reason)).pickup; setPickups((current) => current.map((item) => item.id === pickup.id ? saved : item)); notify?.('Failed pickup cancelled locally. No carrier cancellation was sent.'); }
    catch (error) { setActionError(error?.message || 'Pickup cancellation could not be saved.'); }
    finally { setActionBusy(''); }
  }
  return (
    <>
      <div className="heading-with-action">
        <PageHeading
          title="Weâ€™ll take it from here."
          eyebrow="PICKUP REQUESTS"
          description="Schedule a pickup. Weâ€™ll handle the next mile."
        />
        <Button onClick={() => setOpen(true)}>
          <Plus size={17} />
          Request pickup
        </Button>
      </div>
      <div className="pickup-summary">
        {[
          ['Pending', 'Saved locally; awaiting carrier workflow'],
          ['Scheduled', 'Pickup date and time confirmed'],
          ['Completed', 'Pickup completed'],
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
        {process.env.NODE_ENV !== 'production' && diagnostic && <pre className="card" aria-label="Pickup diagnostic" style={{ whiteSpace: 'pre-wrap', maxHeight: 360, overflow: 'auto' }}>{JSON.stringify(diagnostic, null, 2)}</pre>}
        <label className="search-input pickup-search"><Search size={16} /><input aria-label="Search pickup requests" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search pickup ID, AWB, mobile, or pincode" /></label>
        <div className="tabs">
          {['All requests', 'Pending', 'Scheduled', 'Assigned', 'Picked up', 'Failed', 'Rescheduled', 'Completed', 'Cancelled'].map((f) => (
            <button key={f} className={f === filter ? 'active' : ''} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <div className="table-scroll">
          {pickupLoad?.status === "loading" && <p className="muted">Loading saved pickup requests...</p>}
          {pickupLoad?.status === "error" && (
            <div role="alert" className="error">
              <p>{pickupLoad.error}</p>
              <Button variant="secondary" onClick={pickupLoad.retry}>Retry</Button>
            </div>
          )}
          {actionError && <p className="error" role="alert">{actionError}</p>}
          <table>
            <thead>
              <tr>
                <th>REQUEST ID</th>
                <th>PICKUP WAREHOUSE</th>
                <th>DATE & TIME</th>
                <th>PACKAGES</th>
                <th>TOTAL WEIGHT</th>
                <th>LINKED SHIPMENTS</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <Fragment key={p.id}><tr>
                  <td>
                    <strong>{p.carrierRequestId || p.id}</strong>
                  </td>
                  <td>
                    <Building2 size={15} className="inline-icon" />
                    {p.warehouse}
                  </td>
                  <td>
                    {p.date}
                    <small>{p.time}{p.timeTo ? ' to ' + p.timeTo : ''}</small>
                    {p.instructions && <small>{p.instructions}</small>}
                  </td>
                  <td>{p.count} packages{p.shipmentCount != null && <small>{p.shipmentCount} shipments</small>}</td>
                  <td>{p.totalWeightKg == null ? '—' : `${p.totalWeightKg} kg`}</td>
                  <td>{(p.shipmentRefs || []).map((ref) => ref.waybill || ref.reference).filter(Boolean).join(', ') || '—'}</td>
                  <td>
                    <Badge>{p.status}</Badge>
                    <small>{p.workflow === 'LOCAL' ? 'Local request; no provider operation' : `${p.providerCode || 'Courier'} provider request`}</small>
                  </td>
                  <td>{p.workflow === 'LOCAL' && !['Picked up', 'Completed', 'Cancelled'].includes(p.status) ? <div className="table-actions">
                    <Button type="button" variant="secondary" disabled={actionBusy === p.id} onClick={() => { setEditingPickup(p); setOpen(true); }}>Reschedule / edit</Button>
                    {(p.availableStatuses || []).map(({ code, label }) => <Button key={code} type="button" variant="secondary" disabled={Boolean(actionBusy)} onClick={() => recordPickupStatus(p, code)}>Mark {label.toLowerCase()}</Button>)}
                    {p.status !== 'Submission failed' && p.carrierSubmissionStatus !== 'FAILED' && <Button type="button" variant="secondary" disabled={actionBusy === p.id} onClick={() => submitPickup(p)}>{actionBusy === p.id ? 'Submitting...' : 'Submit to Delhivery'}</Button>}
                    {p.status === 'Submission failed' && p.carrierSubmissionStatus === 'FAILED' && (p.submissionAttempt?.providerDispatched === false || (p.submissionAttempt?.providerDispatched === true && p.submissionAttempt?.providerOutcome === 'REJECTED' && p.submissionAttempt?.providerResponse)) && <Button type="button" variant="secondary" disabled={actionBusy === p.id} onClick={() => recoverPickup(p)}>Recover failed submission</Button>}
                    {p.status === 'Submission failed' && p.carrierSubmissionStatus === 'FAILED' && <Button type="button" variant="secondary" disabled={actionBusy === p.id} onClick={() => cancelFailedPickup(p)}>Cancel failed pickup</Button>}
                    {process.env.NODE_ENV !== 'production' && <Button type="button" variant="secondary" disabled={actionBusy === 'diagnostic-' + p.id} onClick={() => inspectDiagnostic(p)}>{actionBusy === 'diagnostic-' + p.id ? 'Loading diagnostic...' : 'View diagnostic'}</Button>}
                    <Button type="button" variant="secondary" disabled={actionBusy === p.id} onClick={() => cancelPickup(p)}>{actionBusy === p.id ? 'Cancelling...' : 'Cancel'}</Button>
                  </div> : p.workflow === 'LOCAL' ? '—' : p.carrierSyncAvailable !== true ? <small>Carrier status sync unavailable</small> : <Button type="button" variant="secondary" disabled={actionBusy === p.id} onClick={() => syncPickup(p)}>{actionBusy === p.id ? 'Syncing...' : 'Sync carrier status'}</Button>}</td>
                </tr>
                <tr className="pickup-detail-row"><td colSpan="8"><details>
                  <summary>Pickup details and history</summary>
                  <p>{p.location?.address || p.warehouse} · {p.location?.contactName || ''} · {p.location?.phone || ''}</p>
                  <ol>{(p.history || []).map((event, index) => <li key={`${event.timestamp || index}-${event.action}`}><strong>{event.action}</strong> · {event.status} · {event.description} · {event.timestamp ? new Date(event.timestamp).toLocaleString() : ''}</li>)}</ol>
                </details></td></tr></Fragment>
              ))}
            </tbody>
          </table>
          {!rows.length && pickupLoad?.status !== "loading" && pickupLoad?.status !== "error" && (
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
          shipments={shipments}
          pickup={editingPickup}
          setOpen={setOpen}
          setPickups={setPickups}
          notify={notify}
          onSaved={() => setEditingPickup(null)}
        />
      )}
    </>
  );
}


