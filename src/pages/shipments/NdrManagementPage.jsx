
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

const tabs = ['Need Action', 'Auto Reattempt', 'Return Recommendation'];

function getResponseData(response) {
  let value = response?.data ?? response;

  // Support APIs that wrap their result in { success, data }.
  if (value && value.data !== undefined) {
    value = value.data;
  }

  return value;
}

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

  const [ndrCases, setNdrCases] = useState([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState('');
  const [casesChecked, setCasesChecked] = useState(0);
  const [trackingFailed, setTrackingFailed] = useState(0);
  const [complete, setComplete] = useState(false);

  const loadNdrCases = useCallback(async () => {
    setCasesLoading(true);
    setCasesError('');

    try {
      const response = await api.ndrCases();
      const data = getResponseData(response);

      if (!Array.isArray(data?.cases)) {
        throw new Error(
          'Unexpected response from the NDR cases endpoint.'
        );
      }

      setNdrCases(data.cases);
      setCasesChecked(Number(data.checked) || 0);
      setTrackingFailed(Number(data.trackingFailed) || 0);
      setComplete(data.complete === true);
    } catch (err) {
      setCasesError(
        err.response?.data?.message ||
          err.message ||
          'Could not load live NDR cases.'
      );
    } finally {
      setCasesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNdrCases();
  }, [loadNdrCases]);

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

  async function submitAction(event) {
    event.preventDefault();

    const awb = waybill.trim();

    if (!awb) {
      setError('Enter a shipment waybill.');
      return;
    }

    const description =
      action === 'RE-ATTEMPT'
        ? 'request another delivery attempt'
        : 'request a pickup reschedule';

    if (
      !window.confirm(
        `You are about to ${description} for ${awb}. ` +
          'This may affect a real shipment. Have you verified its eligibility?'
      )
    ) {
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await api.ndrUpdate({
        waybill: awb,
        act: action,
      });

      setResult(response);

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

      const id = findUpl(response);
      if (id) setUplId(id);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'NDR request failed.'
      );
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
          <strong>Live tracking results</strong>
          <p>
            The list is built from tracking information for saved shipments
            available to your account. It is not a complete carrier-side NDR
            feed.
          </p>

          {!casesLoading && trackingFailed > 0 && (
            <p>
              {trackingFailed} tracking request(s) failed. Results may be
              incomplete.
            </p>
          )}

          {!casesLoading && complete && (
            <p>All attempted tracking checks completed successfully.</p>
          )}
        </div>

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

          <select
            aria-label="Proof filter"
            value={proof}
            onChange={(event) => setProof(event.target.value)}
          >
            <option>All proof</option>
            <option>Proof available</option>
            <option>No proof</option>
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

          <select
            aria-label="Attempt count"
            value={attempt}
            onChange={(event) => setAttempt(event.target.value)}
          >
            <option>All attempts</option>
            <option>1 attempt</option>
            <option>2 attempts</option>
          </select>
        </div>

        <div className="ndr-table-scroll">
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
                <th>ATTEMPT COUNT</th>
                <th>LAST UPDATED</th>
              </tr>
            </thead>

            <tbody>
              {!casesLoading &&
                !casesError &&
                filteredCases.map((item, index) => (
                  <tr key={`${item.waybill || 'case'}-${index}`}>
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
                    <td>Not provided by tracking response</td>
                    <td>
                      {item.lastUpdated
                        ? new Date(item.lastUpdated).toLocaleString()
                        : item.createdAt
                          ? new Date(item.createdAt).toLocaleString()
                          : '—'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {casesLoading && (
            <div className="ndr-empty">
              <RefreshCw size={24} />
              <h3>Loading live NDR cases…</h3>
              <p>Checking tracking information for saved shipments.</p>
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
                  ? 'No non-delivery cases were identified in the tracking data returned for your saved shipments.'
                  : 'Try changing your search or filters.'}
              </p>
            </div>
          )}

          <div className="ndr-table-footer">
            <span>
              {casesLoading
                ? 'Loading records…'
                : `${filteredCases.length} displayed · ${casesChecked} shipments checked`}
            </span>

            <button
              type="button"
              className="ndr-outline"
              onClick={() => {
                setSearch('');
                setDateRange('All dates');
                setProof('All proof');
                setPayment('All payment modes');
                setAttempt('All attempts');
              }}
            >
              Clear filters
            </button>
          </div>
        </div>
      </section>

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
              </select>

              <p className="ndr-small-note">
                Verify the current status and eligibility before submitting.
                Submitting an action can affect a real shipment.
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
          <h2>API response</h2>
          <p>
            A response or UPL ID alone does not confirm that an NDR action
            succeeded.
          </p>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}
