import { useState } from 'react';
import { Search, Download, Plus, Info, RefreshCw, ClipboardCheck } from 'lucide-react';
import { api } from '../../services/api';
import './NdrManagementPage.css';

const tabs = ['Need Action', 'Auto Reattempt', 'Return Recommendation'];

export default function NdrManagementPage() {
  const [tab, setTab] = useState('Need Action');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('All dates');
  const [proof, setProof] = useState('All proof');
  const [payment, setPayment] = useState('All payment modes');
  const [attempt, setAttempt] = useState('All attempts');
  const [showAction, setShowAction] = useState(false);
  const [waybill, setWaybill] = useState('');
  const [action, setAction] = useState('RE-ATTEMPT');
  const [uplId, setUplId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submitAction(event) {
    event.preventDefault();
    const awb = waybill.trim();

    if (!awb) {
      setError('Enter a shipment waybill.');
      return;
    }

    const description = action === 'RE-ATTEMPT'
      ? 'request another delivery attempt'
      : 'request a pickup reschedule';

    if (!window.confirm(
      `You are about to ${description} for ${awb}. ` +
      'This may affect a real shipment. Have you verified its eligibility?'
    )) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await api.ndrUpdate({ waybill: awb, act: action });
      setResult(response);

      function findUpl(value) {
        if (!value || typeof value !== 'object') return '';
        for (const [key, item] of Object.entries(value)) {
          if (/^(upl.?id|request.?id)$/i.test(key) &&
              typeof item === 'string' && /^UPL/i.test(item)) return item;
        }
        for (const item of Object.values(value)) {
          const found = findUpl(item);
          if (found) return found;
        }
        return '';
      }

      const id = findUpl(response);
      if (id) setUplId(id);
    } catch (err) {
      setError(err.message || 'NDR request failed.');
    } finally {
      setLoading(false);
    }
  }

  async function checkStatus(event) {
    event.preventDefault();

    if (!/^UPL[A-Za-z0-9_-]{1,100}$/.test(uplId.trim())) {
      setError('Enter a valid UPL ID.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      setResult(await api.ndrStatus(uplId.trim()));
    } catch (err) {
      setError(err.message || 'Could not retrieve the request status.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ndr-page">
      <header className="ndr-heading">
        <div>
          <div className="ndr-eyebrow">SHIPPING OPERATIONS</div>
          <h1>NDR Management <Info size={17} /></h1>
          <p>Review non-delivery cases and manage eligible shipment actions.</p>
        </div>
        <div className="ndr-heading-actions">
          <button className="ndr-outline" onClick={() => window.print()}>
            <Download size={16} /> Print
          </button>
          <button className="ndr-dark" onClick={() => setShowAction(!showAction)}>
            <Plus size={17} /> NDR action
          </button>
        </div>
      </header>

      <div className="ndr-info-banner">
        <Info size={18} />
        <div>
          <strong>Live case list not connected yet</strong>
          <p>The configured backend supports NDR actions and UPL status checks.
            It does not currently expose an endpoint for listing all NDR cases.</p>
        </div>
      </div>

      <section className="ndr-list-card">
        <nav className="ndr-tabs" aria-label="NDR categories">
          {tabs.map((name) => (
            <button
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
              placeholder="Search by AWB, Consignee"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <select aria-label="Date range" value={dateRange}
            onChange={(event) => setDateRange(event.target.value)}>
            <option>All dates</option>
            <option>Today</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
          </select>
          <select aria-label="Proof filter" value={proof}
            onChange={(event) => setProof(event.target.value)}>
            <option>All proof</option>
            <option>Proof available</option>
            <option>No proof</option>
          </select>
          <select aria-label="Payment mode" value={payment}
            onChange={(event) => setPayment(event.target.value)}>
            <option>All payment modes</option>
            <option>Prepaid</option>
            <option>COD</option>
          </select>
          <select aria-label="Attempt count" value={attempt}
            onChange={(event) => setAttempt(event.target.value)}>
            <option>All attempts</option>
            <option>1 attempt</option>
            <option>2 attempts</option>
          </select>
        </div>

        <div className="ndr-table-scroll">
          <table className="ndr-table">
            <thead>
              <tr>
                <th><input type="checkbox" disabled aria-label="Select all cases" /></th>
                <th>ORDER ID &amp; AWB NO.</th>
                <th>PRODUCT DETAILS</th>
                <th>PAYMENT MODE</th>
                <th>NDR TYPE</th>
                <th>ATTEMPT COUNT</th>
                <th>LAST UPDATED</th>
              </tr>
            </thead>
          </table>
          <div className="ndr-empty">
            <div className="ndr-empty-icon"><ClipboardCheck size={27} /></div>
            <h3>No live NDR cases available</h3>
            <p>
              {search
                ? 'Search cannot be matched until the live NDR case list is connected.'
                : `No ${tab.toLowerCase()} records can be displayed because the backend does not yet provide the NDR case list.`}
            </p>
            <button className="ndr-outline" onClick={() => setShowAction(true)}>
              <Plus size={16} /> Submit an NDR action
            </button>
          </div>
          <div className="ndr-table-footer">
            <span>Live records unavailable</span>
            <button className="ndr-outline" onClick={() => {
              setSearch('');
              setDateRange('All dates');
              setProof('All proof');
              setPayment('All payment modes');
              setAttempt('All attempts');
            }}>Clear filters</button>
          </div>
        </div>
      </section>

      {showAction && (
        <section className="ndr-action-grid">
          <div className="ndr-panel">
            <div className="ndr-panel-title">
              <div><RefreshCw size={19} /><h2>Submit NDR action</h2></div>
              <button className="ndr-close" onClick={() => setShowAction(false)}>Close</button>
            </div>
            <form onSubmit={submitAction}>
              <label htmlFor="ndr-waybill">Shipment waybill (AWB)</label>
              <input id="ndr-waybill" required maxLength={80}
                placeholder="Enter waybill number" value={waybill}
                onChange={(event) => setWaybill(event.target.value)} />
              <label htmlFor="ndr-action">Action</label>
              <select id="ndr-action" value={action}
                onChange={(event) => setAction(event.target.value)}>
                <option value="RE-ATTEMPT">Re-attempt delivery</option>
                <option value="PICKUP_RESCHEDULE">Reschedule pickup</option>
              </select>
              <p className="ndr-small-note">
                Verify the current NSL code and attempt count first.
                Eligible attempt count is 1 or 2. Delhivery recommends action after 9 PM.
              </p>
              <button className="ndr-dark" disabled={loading} type="submit">
                {loading ? 'Submitting…' : 'Submit request'}
              </button>
            </form>
          </div>

          <div className="ndr-panel">
            <div className="ndr-panel-title">
              <div><ClipboardCheck size={19} /><h2>Check UPL status</h2></div>
            </div>
            <form onSubmit={checkStatus}>
              <label htmlFor="ndr-upl-id">UPL ID</label>
              <input id="ndr-upl-id" required maxLength={103}
                placeholder="Enter returned UPL ID" value={uplId}
                onChange={(event) => setUplId(event.target.value)} />
              <p className="ndr-small-note">
                Use the UPL ID returned by a previously submitted NDR request.
              </p>
              <button className="ndr-outline" disabled={loading} type="submit">
                {loading ? 'Please wait…' : 'Check status'}
              </button>
            </form>
          </div>
        </section>
      )}

      {error && <div className="ndr-error" role="alert">{error}</div>}

      {result && (
        <section className="ndr-panel ndr-response">
          <h2>API response</h2>
          <p>Review the response below. A UPL ID alone does not confirm that the action succeeded.</p>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}
