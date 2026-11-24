import { AlertTriangle, Box, CalendarDays, CheckCheck, ChevronLeft, ChevronRight, Clock3, Plus, Truck, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import DeliveryStatusChart from '../../components/dashboard/DeliveryStatusChart';
import QuickActions from '../../components/dashboard/QuickActions';
import RecentShipmentsTable from '../../components/dashboard/RecentShipmentsTable';
import ShipmentActivityChart from '../../components/dashboard/ShipmentActivityChart';
import OperationalMetricCards from '../../components/dashboard/OperationalMetricCards';
import { Button } from '../../components/ui';
import ShipmentLoadState from '../../components/shipments/ShipmentLoadState';
import { api, unwrap } from '../../services/api';

export default function DashboardPage({ shipments, load, navigate, onDetails }) {
  const [period, setPeriod] = useState('This week');
  const [actionData, setActionData] = useState(null);
  const [showBadAddressModal, setShowBadAddressModal] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [overview, setOverview] = useState(null);
  const [overviewError, setOverviewError] = useState('');
  const [overviewLoading, setOverviewLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setOverviewLoading(true);
    setOverviewError('');
    api.dashboardOverview({ from: dateFrom, to: dateTo, status: statusFilter }, controller.signal)
      .then((result) => { if (active) setOverview(unwrap(result)); })
      .catch((error) => { if (active && error.name !== 'AbortError') setOverviewError(error.message || 'Operations summary could not be loaded.'); })
      .finally(() => { if (active) setOverviewLoading(false); });
    return () => {
      active = false;
      controller.abort();
    };
  }, [dateFrom, dateTo, statusFilter]);
  useEffect(() => {
    let active = true;
    api.actionRequired().then((result) => { if (active) setActionData(unwrap(result)); }).catch(() => { if (active) setActionData(null); });
    return () => { active = false; };
  }, []);
  const normalizeStatus = (status) =>
    String(status || '')
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ');

  const countStatus = (statuses) =>
    shipments.filter((shipment) =>
      statuses.includes(normalizeStatus(shipment.status))
    ).length;

  const chartStats = [
    ['Total shipments', shipments.length, Box, 'orange'],
    [
      'In transit',
      countStatus(['in transit', 'intransit', 'picked up', 'out for delivery']),
      Truck,
      'blue',
    ],
    ['Delivered', countStatus(['delivered']), CheckCheck, 'green'],
    [
      'Pending pickup',
      countStatus(['pending pickup', 'ready for pickup']),
      Clock3,
      'amber',
    ],
    ['Cancelled', countStatus(['cancelled', 'canceled']), XCircle, 'red'],
  ];
  const filterSnapshot = { from: dateFrom, to: dateTo, status: statusFilter };
  const actionRequired = [
    {
      label: 'Bad Addresses',
      count: actionData?.badAddressesAvailable === false ? '—' : (actionData?.badAddresses ?? '—'),
      action: 'Act Now',
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow muted">YOUR OPERATIONS, AT A GLANCE</div>
          <h1>
            Every delivery starts here<span className="text-orange">.</span>
          </h1>
          <p>Shipments created through this app by your login. Older Delhivery account shipments are not included.</p>
          <p>Charts show saved statuses. Use Track shipment for the latest carrier status.</p>
        </div>
        <Button onClick={() => navigate('create')}>
          <Plus size={17} />
          Create shipment
        </Button>
      </div>
      <section className="dashboard-operational-section" aria-label="Operations summary">
        <div className="dashboard-filter-row">
          <div><h2>Operations summary</h2><p>Counts use records saved in this workspace.</p></div>
          <label>From <input type="date" aria-label="Dashboard date from" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} /></label>
          <label>To <input type="date" aria-label="Dashboard date to" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} /></label>
          <label>Shipment status <select aria-label="Dashboard shipment status" value={statusFilter} disabled={!overview?.availability?.shipmentStatusMetrics?.available} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All statuses</option><option value="inTransit">In transit</option><option value="delivered">Delivered</option><option value="failedException">Failed / exception</option></select></label>
          {(dateFrom || dateTo || statusFilter) && <button type="button" onClick={() => { setDateFrom(''); setDateTo(''); setStatusFilter(''); }}>Clear filters</button>}
        </div>
        {overviewLoading && <p role="status">Loading operations summary…</p>}
        {overviewError && <div role="alert" className="error"><span>{overviewError}</span><button type="button" onClick={() => { setOverviewLoading(true); api.dashboardOverview({ from: dateFrom, to: dateTo, status: statusFilter }).then((result) => { setOverview(unwrap(result)); setOverviewError(''); }).catch((error) => setOverviewError(error.message || 'Retry failed.')).finally(() => setOverviewLoading(false)); }}>Retry</button></div>}
        {!overviewLoading && !overviewError && <>
          <OperationalMetricCards data={overview} navigate={navigate} filters={filterSnapshot} />
          <div className="dashboard-operational-summaries">
            <section className="card"><h3>Pickup summary</h3><p>{overview?.pickupSummary?.total ?? 0} pickup requests in range</p><div>{Object.entries(overview?.pickupSummary?.byStatus || {}).map(([status, count]) => <span key={status}>{status}: {count} </span>)}</div></section>
            <section className="card"><h3>Delivery summary</h3><p>In transit: {overview?.deliverySummary?.inTransit ?? 'Unavailable'} · Delivered: {overview?.deliverySummary?.delivered ?? 'Unavailable'}</p><p>Failed / exception: {overview?.deliverySummary?.failedOrException ?? 'Unavailable'} · Unclassified: {overview?.deliverySummary?.unclassified ?? 0}</p></section>
            <section className="card"><h3>RTO lifecycle</h3><p>Active: {overview?.metrics?.activeRtoCases ?? 'Unavailable'} · Completed: {overview?.metrics?.completedRtoCases ?? 'Unavailable'} · Unresolved: {overview?.metrics?.unresolvedRtoCases ?? 'Unavailable'}</p></section>
          </div>
          {overview?.availability?.shipmentStatusMetrics?.available === false && <p className="muted">Shipment status counts are unavailable until provider-specific status mappings are configured. Unmapped provider labels remain unclassified.</p>}
          {overview?.availability?.rtoLifecycleMetrics?.available === false && <p className="muted">RTO lifecycle counts are unavailable until provider-specific RTO lifecycle mappings are configured.</p>}
          <section className="card dashboard-recent-activity"><h3>Recent shipment activity</h3>{overview?.recentActivity?.length ? <ol>{overview.recentActivity.map((item) => <li key={item.id}><strong>{item.status || item.type}</strong><span>{item.reference || item.waybill || (item.pickupId ? 'Pickup request' : '')}</span><span>{item.description}</span><time>{item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Time unavailable'}</time></li>)}</ol> : <p>No stored activity in this date range.</p>}</section>
        </>}
      </section>
      <div className="overview-banner">
        <div className="banner-symbol">
          <Box size={33} strokeWidth={1.4} />
        </div>
        <div>
          <strong>A little less logistics. A lot more possibility.</strong>
          <p>One workspace to manage every mile of your business.</p>
        </div>
        <span className="banner-tag">
          <span />
          Your shipping workspace
        </span>
      </div>
      <div className="action-required">
        <div className="action-required-header">
          <div className="action-required-title">
            <span className="action-required-icon">
              <AlertTriangle size={16} strokeWidth={2.2} />
            </span>
            <h2>Action Required</h2>
          </div>

          <div className="action-required-nav">
            <button type="button" aria-label="Previous action">
              <ChevronLeft size={15} />
            </button>
            <button type="button" aria-label="Next action">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        <div className="action-required-list">
          {actionRequired.map((item) => (
            <div className="action-required-item" key={item.label}>
              <div className="action-required-label">{item.label}</div>
              <div className="action-required-count">{item.count}</div>
              <button
                type="button"
                className="action-required-action"
                onClick={() => {
                  if (item.label === 'Bad Addresses') {
                    setShowBadAddressModal(true);
                  }
                }}
              >
                {item.action}
              </button>
            </div>
          ))}
        </div>
      </div>
      {showBadAddressModal && (
        <div
          className="bad-address-modal-overlay"
          onClick={() => setShowBadAddressModal(false)}
        >
          <div
            className="bad-address-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bad-address-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="bad-address-modal-close"
              aria-label="Close"
              onClick={() => setShowBadAddressModal(false)}
            >
              Ãƒâ€”
            </button>

            <div className="bad-address-modal-header">
              <h2 id="bad-address-modal-title">
                Take actions on your orders with Bad Addresses
              </h2>
            </div>

            <div className="bad-address-action-grid">
              <div className="bad-address-action-card">
                <div className="bad-address-card-title">PENDING</div>
                <div className="bad-address-card-content">
                  <div className="bad-address-card-count">—</div>
                  <div className="bad-address-card-label">Bad Addresses</div>
                </div>
                <button type="button" disabled>
                  Act Now
                </button>
              </div>

              <div className="bad-address-action-card">
                <div className="bad-address-card-title">READY TO SHIP</div>
                <div className="bad-address-card-content">
                  <div className="bad-address-card-count">
                    {actionData?.badAddressesAvailable === false ? '—' : (actionData?.badAddresses ?? '—')}
                  </div>
                  <div className="bad-address-card-label">Bad Addresses</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowBadAddressModal(false);
                    navigate('shipments');
                  }}
                >
                  Act Now
                </button>
              </div>

              <div className="bad-address-action-card">
                <div className="bad-address-card-title ready-pickup">
                  READY FOR PICKUP
                </div>
                <div className="bad-address-card-content">
                  <div className="bad-address-card-count">—</div>
                  <div className="bad-address-card-label">Bad Addresses</div>
                </div>
                <button type="button" disabled>
                  Act Now
                </button>
                <div className="bad-address-card-note">
                  Verify before pickup
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {load.status !== 'success' ? (
        <ShipmentLoadState load={load} />
      ) : (
        <>
          <div className="legacy-shipment-charts">
          <div className="chart-grid">
              <ShipmentActivityChart shipments={shipments} period={period} setPeriod={setPeriod} />
              <DeliveryStatusChart shipments={shipments} stats={chartStats} />
            </div>
          </div>
          <RecentShipmentsTable shipments={shipments} navigate={navigate} onDetails={onDetails} />
        </>
      )}
      <QuickActions navigate={navigate} />
      <div className="page-foot">
        <span>
          <ShieldIcon /> Workspace overview <span className="foot-separator">Ãƒâ€šÃ‚Â·</span> Manage your
          shipments in one place.
        </span>
        <span>
          <CalendarDays size={13} />{' '}
          {new Date().toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </span>
      </div>
    </>
  );
}
function ShieldIcon() {
  return <span className="pulse-dot" />;
}










