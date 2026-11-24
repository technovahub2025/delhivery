
import { useCallback, useEffect, useState } from 'react';
import {
  Search,
  Download,
  Plus,
  Info,
  RefreshCw,
  ClipboardCheck,
} from 'lucide-react';
import { api } from '../../services/api';
import './NdrManagementPage.css';

const tabs = ['All cases', 'Open', 'Action pending', 'Resolved'];

function getResponseData(response) {
  let value = response?.data ?? response;

  // Support APIs that wrap their result in { success, data }.
  if (value && value.data !== undefined) {
    value = value.data;
  }

  return value;
}

export default function NdrManagementPage({ dashboardFilter = null, initialSearch = '' }) {
  const [tab, setTab] = useState('All cases');
  const [dateFrom] = useState(dashboardFilter?.from || '');
  const [dateTo] = useState(dashboardFilter?.to || '');
  const [search, setSearch] = useState(initialSearch);
  const [dateRange, setDateRange] = useState('All dates');
  const [payment, setPayment] = useState('All payment modes');

  const [showAction, setShowAction] = useState(false);
  const [waybill, setWaybill] = useState('');
  const [action, setAction] = useState('RE-ATTEMPT');
  const [actionDetails, setActionDetails] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [selectedCase, setSelectedCase] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [selectedDetailsLoading, setSelectedDetailsLoading] = useState(false);
  const [uplId, setUplId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const dashboardShipmentMode = dashboardFilter?.target === 'shipments';
  const [dashboardShipments, setDashboardShipments] = useState([]);
  const [selectedDashboardShipment, setSelectedDashboardShipment] = useState(null);
  const [ndrCases, setNdrCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState('');
  const [processingHistory, setProcessingHistory] = useState(false);

  const loadNdrCases = useCallback(async () => {
    setCasesLoading(true);
    setCasesError('');

    try {
      const response = dashboardShipmentMode
        ? await api.ndrDashboardShipments({ from: dashboardFilter?.from, to: dashboardFilter?.to, status: dashboardFilter?.status, target: 'shipments' })
        : await api.ndrCases();
      const data = getResponseData(response);

      if (dashboardShipmentMode && Array.isArray(data?.shipments)) {
        const groups = data.shipments;
        const cases = groups.flatMap((group) => group.cases || []);
        setDashboardShipments(groups);
        setNdrCases(cases);
        setSelectedCase((current) => current ? cases.find((item) => item.id === current.id) || current : null);
        return;
      }
      if (!Array.isArray(data?.cases)) {
        throw new Error(
          'Unexpected response from the NDR cases endpoint.'
        );
      }

      setNdrCases(data.cases);
      setSelectedCase((current) => current ? data.cases.find((item) => item.id === current.id) || current : null);
    } catch (err) {
      setCasesError(
        err.response?.data?.message ||
          err.message ||
          'Could not load NDR cases.'
      );
    } finally {
      setCasesLoading(false);
    }
  }, [dashboardShipmentMode, dashboardFilter?.from, dashboardFilter?.to, dashboardFilter?.status]);

  useEffect(() => {
    loadNdrCases();
  }, [loadNdrCases]);

  async function processStoredTracking() {
    setProcessingHistory(true);
    setCasesError('');
    try {
      await api.processNdrCases();
      await loadNdrCases();
    } catch (failure) {
      setCasesError(failure.message || 'Stored tracking history could not be processed.');
    } finally { setProcessingHistory(false); }
  }

  const filteredCases = ndrCases.filter((item) => {
    const query = search.trim().toLowerCase();

    const searchable = [
      item.waybill,
      item.reference,
      item.customer,
      item.destination,
      item.reason,
      item.status,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (query && !searchable.includes(query)) {
      return false;
    }

    if (tab === 'Open' && item.status !== 'OPEN' && item.status !== 'ACTION_FAILED') return false;
    if (tab === 'Action pending' && !['ACTION_SUBMITTING', 'ACTION_SUBMITTED', 'OUTCOME_UNCONFIRMED'].includes(item.status)) return false;
    if (tab === 'Resolved' && item.status !== 'RESOLVED') return false;
    if (statusFilter !== 'All statuses' && item.status !== statusFilter) return false;
    if (dashboardFilter?.target === 'unresolved' && item.status === 'RESOLVED') return false;
    const eventDate = String(item.occurredAt || item.createdAt || '').slice(0, 10);
    if (dateFrom && eventDate < dateFrom) return false;
    if (dateTo && eventDate > dateTo) return false;

    const mode = String(item.payment || '').toLowerCase();

    if (
      payment === 'COD' &&
      !mode.includes('cod')
    ) {
      return false;
    }

    if (
      payment === 'Prepaid' &&
      !mode.includes('prepaid')
    ) {
      return false;
    }

    if (dateRange !== 'All dates') {
      const rawDate = item.lastUpdated || item.createdAt;
      const timestamp = rawDate ? new Date(rawDate).getTime() : 0;

      if (!timestamp || Number.isNaN(timestamp)) {
        return false;
      }

      const age = Date.now() - timestamp;

      if (
        dateRange === 'Today' &&
        new Date(timestamp).toDateString() !== new Date().toDateString()
      ) {
        return false;
      }

      if (
        dateRange === 'Last 7 days' &&
        (age < 0 || age > 7 * 86400000)
      ) {
        return false;
      }

      if (
        dateRange === 'Last 30 days' &&
        (age < 0 || age > 30 * 86400000)
      ) {
        return false;
      }
    }

    return true;
  });

  async function openCase(item) {
    setSelectedCase(item);
    if (!item.id || item.persisted === false) {
      setSelectedDetails({ trackingEvents: item.statusHistory || [] });
      setSelectedDetailsLoading(false);
      return;
    }
    setSelectedDetails(null);
    setSelectedDetailsLoading(true);
    try {
      setSelectedDetails(getResponseData(await api.ndrCase(item.id)));
    } catch (err) {
      setError(err.message || 'Could not load NDR case details.');
    } finally {
      setSelectedDetailsLoading(false);
    }
  }

  async function submitAction(event) {
    event.preventDefault();

    const awb = waybill.trim();

    if (!awb) {
      setError('Enter a shipment waybill.');
      return;
    }

    const selected = ndrCases.find((item) => item.waybill === awb && item.id && item.persisted !== false) || ndrCases.find((item) => item.waybill === awb);
    if (!selected) {
      setError('Choose a waybill from an owner-scoped NDR case before submitting an action.');
      return;
    }
    if (!selected.id || selected.persisted === false) {
      setError('This tracking observation is derived and not yet a persisted NDR case. Process stored tracking history before submitting an action.');
      return;
    }
    if (['CUSTOMER_CONTACT', 'DELIVERY_INSTRUCTIONS', 'MARK_RESOLVED'].includes(action) && !actionDetails.trim()) {
      setError('Enter details for this action.');
      return;
    }
    if (['RE-ATTEMPT', 'PICKUP_RESCHEDULE'].includes(action) && !window.confirm(`Submit ${action} for ${awb}? Carrier processing may not be confirmed immediately.`)) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await api.ndrCaseAction(selected.id, { action, details: actionDetails });

      setResult(response);
      if (response?.data?.case) setSelectedCase(response.data.case);
      await loadNdrCases();

      function findUpl(value) {
        if (!value || typeof value !== 'object') {
          return '';
        }

        for (const [key, item] of Object.entries(value)) {
          if (
            /^(upl.?id|request.?id)$/i.test(key) &&
            typeof item === 'string' &&
            /^UPL/i.test(item)
          ) {
            return item;
          }
        }

        for (const item of Object.values(value)) {
          const found = findUpl(item);
          if (found) return found;
        }

        return '';
      }

      const id = response?.data?.action?.providerRequestId || findUpl(response);
      if (id) setUplId(id);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'NDR request failed.'
      );
      await loadNdrCases();
    } finally {
      setLoading(false);
    }
  }

  async function checkStatus(event) {
    event.preventDefault();

    const id = uplId.trim();

    if (!/^UPL[A-Za-z0-9_-]{1,100}$/.test(id)) {
      setError('Enter a valid UPL ID.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      setResult(await api.ndrStatus(id));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Could not retrieve the request status.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ndr-page">
      <header className="ndr-heading">
        <div>
      <div className="ndr-eyebrow">SHIPPING OPERATIONS</div>
          <h1>
            NDR Management <Info size={17} />
          </h1>
          <p>
            Review detected non-delivery cases and manage eligible shipment
            actions.
          </p>
        </div>

        <div className="ndr-heading-actions">
          <button
            type="button"
            className="ndr-outline"
            onClick={() => window.print()}
          >
            <Download size={16} /> Print
          </button>

          <button
            type="button"
            className="ndr-dark"
            onClick={() => setShowAction((value) => !value)}
          >
            <Plus size={17} /> NDR action
          </button>
        </div>
      </header>

      <div className="ndr-info-banner">
        <Info size={18} />
        <div>
          <strong>Persisted NDR records</strong>
          <p>
            Cases are persisted against your saved shipments and derived from their recorded tracking events.
          </p>

          {!casesLoading && <p>{ndrCases.length} persisted case(s). Process stored tracking events to refresh detections.</p>}
        </div>

        <button type="button" className="ndr-outline" disabled={processingHistory} onClick={processStoredTracking}>{processingHistory ? 'Processing…' : 'Process tracking history'}</button>

        <button
          type="button"
          className="ndr-outline"
          disabled={casesLoading}
          onClick={loadNdrCases}
        >
          <RefreshCw size={15} />
          {casesLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <section className="ndr-list-card">
        <nav className="ndr-tabs" aria-label="NDR categories">
          {tabs.map((name) => (
            <button
              type="button"
              key={name}
              className={tab === name ? 'active' : ''}
              onClick={() => setTab(name)}
            >
              {name}
              <Info size={14} />
            </button>
          ))}
        </nav>

        <div className="ndr-filters">
          <label className="ndr-search">
            <Search size={17} />
            <input
              aria-label="Search by AWB or consignee"
              placeholder="Search by AWB, consignee, reason"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <select
            aria-label="Date range"
            value={dateRange}
            onChange={(event) => setDateRange(event.target.value)}
          >
              <option>All dates</option>
            <option>Today</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
          </select>

          <select aria-label="NDR status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option>All statuses</option>
            <option value="OPEN">Open</option>
            <option value="ACTION_SUBMITTING">Submitting</option>
            <option value="ACTION_SUBMITTED">Submitted</option>
            <option value="ACTION_FAILED">Failed</option>
            <option value="OUTCOME_UNCONFIRMED">Unconfirmed</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          <select
            aria-label="Payment mode"
            value={payment}
            onChange={(event) => setPayment(event.target.value)}
          >
            <option>All payment modes</option>
            <option>Prepaid</option>
            <option>COD</option>
          </select>

        </div>

        <div className="ndr-table-scroll">
          {dashboardShipmentMode ? <table className="ndr-table">
            <thead><tr><th>SHIPMENT / AWB</th><th>CUSTOMER / DESTINATION</th><th>PAYMENT</th><th>NDR CASES</th><th>REASONS</th><th>LATEST EVENT</th><th>DETAILS</th></tr></thead>
            <tbody>{dashboardShipments.filter((group) => filteredCases.some((item) => item.shipmentId === group.shipmentId)).map((group) => {
              const related = filteredCases.filter((item) => item.shipmentId === group.shipmentId);
              const latest = related.reduce((value, item) => String(item.occurredAt || '') > String(value?.occurredAt || '') ? item : value, null);
              return <tr key={group.shipmentId}>
                <td><strong>{group.reference || '—'}</strong><div>{group.waybill || '—'}</div></td>
                <td>{group.customer || group.destination || '—'}{group.customer && group.destination ? <div>{group.destination}</div> : null}</td>
                <td>{group.payment || '—'}</td><td>{related.length}</td>
                <td>{[...new Set(related.map((item) => item.reason).filter(Boolean))].join('; ') || '—'}</td>
                <td>{latest?.occurredAt ? new Date(latest.occurredAt).toLocaleString() : '—'}</td>
                <td><button type="button" className="ndr-outline" onClick={() => setSelectedDashboardShipment({ ...group, cases: related })}>Related cases</button></td>
              </tr>;
            })}</tbody>
          </table> :
          <table className="ndr-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    disabled
                    aria-label="Select all cases"
                  />
                </th>
                <th>ORDER ID &amp; AWB NO.</th>
                <th>PRODUCT DETAILS</th>
                <th>PAYMENT MODE</th>
                <th>NDR TYPE / REASON</th>
                <th>ACTION COUNT</th>
                <th>LAST UPDATED</th>
                <th>DETAILS</th>
              </tr>
            </thead>

            <tbody>
              {!casesLoading &&
                !casesError &&
                filteredCases.map((item, index) => (
                  <tr key={item.id || `${item.waybill || 'case'}-${index}`} onClick={() => openCase(item)}>
                    <td>
                      <input
                        type="checkbox"
                        disabled
                        aria-label="Select case"
                      />
                    </td>
                    <td>
                      <strong>{item.reference || '—'}</strong>
                      <div>{item.waybill || '—'}</div>
                    </td>
                    <td>{item.destination || item.customer || '—'}</td>
                    <td>{item.payment || '—'}</td>
                    <td>{item.reason || item.status || '—'}</td>
                    <td>{item.actions?.length ?? 0}</td>
                    <td>
                      {item.lastUpdated
                        ? new Date(item.lastUpdated).toLocaleString()
                        : item.createdAt
                          ? new Date(item.createdAt).toLocaleString()
                          : '—'}
                    </td>
                    <td><button type="button" className="ndr-outline" onClick={(event) => { event.stopPropagation(); openCase(item); }}>Details</button></td>
                  </tr>
                ))}
            </tbody>
          </table>}

          {casesLoading && (
            <div className="ndr-empty">
              <RefreshCw size={24} />
              <h3>Loading live NDR cases…</h3>
              <p>Loading persisted NDR records.</p>
            </div>
          )}

          {!casesLoading && casesError && (
            <div className="ndr-empty" role="alert">
              <h3>Could not load NDR cases</h3>
              <p>{casesError}</p>
              <button
                type="button"
                className="ndr-outline"
                onClick={loadNdrCases}
              >
                Try again
              </button>
            </div>
          )}

          {!casesLoading && !casesError && filteredCases.length === 0 && (
            <div className="ndr-empty">
              <div className="ndr-empty-icon">
                <ClipboardCheck size={27} />
              </div>
              <h3>
                {ndrCases.length === 0
                  ? 'No NDR cases found'
                  : 'No cases match your search or date/payment filters'}
              </h3>
              <p>
                {ndrCases.length === 0
                ? 'No NDR events have been recorded for your saved shipments.'
                  : 'Try changing your search or filters.'}
              </p>
            </div>
          )}

          <div className="ndr-table-footer">
            <span>
              {casesLoading
                ? 'Loading records…'
                : (dashboardShipmentMode ? dashboardShipments.filter((group) => filteredCases.some((item) => item.shipmentId === group.shipmentId)).length : filteredCases.length) + ' displayed'}
            </span>

            <button
              type="button"
              className="ndr-outline"
              onClick={() => {
                setSearch('');
                setDateRange('All dates');
                setPayment('All payment modes');
                setStatusFilter('All statuses');
              }}
            >
              Clear filters
            </button>
          </div>
        </div>
      </section>

      {selectedDashboardShipment && <section className="ndr-panel ndr-response" aria-label="Related NDR cases">
        <div className="ndr-panel-title"><div><ClipboardCheck size={19} /><h2>Related NDR cases · {selectedDashboardShipment.waybill || selectedDashboardShipment.reference}</h2></div><button type="button" className="ndr-close" onClick={() => setSelectedDashboardShipment(null)}>Close</button></div>
        <ol>{(selectedDashboardShipment.cases || []).map((item, index) => <li key={item.id || item.eventKey || index}><strong>{item.reason || item.status}</strong> · {item.status} · {item.occurredAt ? new Date(item.occurredAt).toLocaleString() : 'Time unavailable'} · {item.persisted === false ? 'Derived observation' : 'Persisted case'} <button type="button" className="ndr-outline" onClick={() => openCase(item)}>Details</button></li>)}</ol>
      </section>}
      {selectedCase && (
        <section className="ndr-panel ndr-response" aria-label="NDR case details">
          <div className="ndr-panel-title">
            <div><ClipboardCheck size={19} /><h2>NDR case details</h2></div>
            <button type="button" className="ndr-close" onClick={() => { setSelectedCase(null); setSelectedDetails(null); }}>Close</button>
          </div>
          <p><strong>{selectedCase.reference || selectedCase.waybill}</strong> · {selectedCase.waybill} · {selectedCase.status}</p>
          <p>{selectedCase.reason}</p>
          {selectedDetailsLoading && <p>Loading case history…</p>}
          {selectedDetails?.trackingEvents?.length > 0 && <div><h3>Tracking events</h3><ol>{selectedDetails.trackingEvents.map((event, index) => <li key={event.eventKey || index}>{event.status} · {event.location || 'Location unavailable'} · {event.occurredAt ? new Date(event.occurredAt).toLocaleString() : 'Time unavailable'}</li>)}</ol></div>}
          <h3>Action history</h3>
          {selectedCase.actions?.length ? <ol>{selectedCase.actions.map((entry) => <li key={entry.id}>{entry.action} · {entry.status} · {entry.details || entry.error || 'No additional details'} · {entry.submittedAt ? new Date(entry.submittedAt).toLocaleString() : ''}</li>)}</ol> : <p>No actions have been recorded.</p>}
        </section>
      )}

      {showAction && (
        <section className="ndr-action-grid">
          <div className="ndr-panel">
            <div className="ndr-panel-title">
              <div>
                <RefreshCw size={19} />
                <h2>Submit NDR action</h2>
              </div>
              <button
                type="button"
                className="ndr-close"
                onClick={() => setShowAction(false)}
              >
                Close
              </button>
            </div>

            <form onSubmit={submitAction}>
              <label htmlFor="ndr-waybill">Shipment waybill (AWB)</label>
              <input
                id="ndr-waybill"
                required
                maxLength={80}
                placeholder="Enter waybill number"
                value={waybill}
                onChange={(event) => setWaybill(event.target.value)}
              />

              <label htmlFor="ndr-action">Action</label>
              <select
                id="ndr-action"
                value={action}
                onChange={(event) => setAction(event.target.value)}
              >
                <option value="RE-ATTEMPT">Re-attempt delivery</option>
                <option value="PICKUP_RESCHEDULE">Reschedule pickup</option>
                <option value="CUSTOMER_CONTACT">Record customer contact</option>
                <option value="DELIVERY_INSTRUCTIONS">Record delivery instructions</option>
                <option value="MARK_RESOLVED">Mark case resolved</option>
              </select>

              <label htmlFor="ndr-action-details">Action details</label>
              <textarea id="ndr-action-details" value={actionDetails} onChange={(event) => setActionDetails(event.target.value)} maxLength={1000} rows={3} placeholder="Add contact outcome, delivery instructions or resolution note" />

              <p className="ndr-small-note">
                Carrier actions are available only when the selected shipment’s courier adapter supports them. Contact notes, instructions and resolution notes are stored locally.
              </p>

              <button
                className="ndr-dark"
                disabled={loading}
                type="submit"
              >
                {loading ? 'Submitting…' : 'Submit request'}
              </button>
            </form>
          </div>

          <div className="ndr-panel">
            <div className="ndr-panel-title">
              <div>
                <ClipboardCheck size={19} />
                <h2>Check UPL status</h2>
              </div>
            </div>

            <form onSubmit={checkStatus}>
              <label htmlFor="ndr-upl-id">UPL ID</label>
              <input
                id="ndr-upl-id"
                required
                maxLength={103}
                placeholder="Enter returned UPL ID"
                value={uplId}
                onChange={(event) => setUplId(event.target.value)}
              />

              <p className="ndr-small-note">
                Use the UPL ID returned by a previously submitted NDR request.
              </p>

              <button
                className="ndr-outline"
                disabled={loading}
                type="submit"
              >
                {loading ? 'Please wait…' : 'Check status'}
              </button>
            </form>
          </div>
        </section>
      )}

      {error && (
        <div className="ndr-error" role="alert">
          {error}
        </div>
      )}

      {result && (
        <section className="ndr-panel ndr-response">
          <h2>{result.data?.status === 'UNCONFIRMED' ? 'Carrier status unconfirmed' : 'API response'}</h2>
          <p>
            A response or UPL ID alone does not confirm that an NDR action
            succeeded.
          </p>
          {result.data?.status === 'UNCONFIRMED' ? (
            <p role='status'>Waybill {result.data.waybill} · Upload {result.data.providerRequestId}. {result.message}</p>
          ) : <pre>{JSON.stringify(result, null, 2)}</pre>}
        </section>
      )}
    </main>
  );
}
