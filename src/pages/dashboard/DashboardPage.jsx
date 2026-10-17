import { AlertTriangle, Box, CalendarDays, CheckCheck, ChevronLeft, ChevronRight, Clock3, Plus, Truck, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import DeliveryStatusChart from '../../components/dashboard/DeliveryStatusChart';
import QuickActions from '../../components/dashboard/QuickActions';
import RecentShipmentsTable from '../../components/dashboard/RecentShipmentsTable';
import ShipmentActivityChart from '../../components/dashboard/ShipmentActivityChart';
import ShipmentStats from '../../components/dashboard/ShipmentStats';
import { Button } from '../../components/ui';
import ShipmentLoadState from '../../components/shipments/ShipmentLoadState';
import { api, unwrap } from '../../services/api';

export default function DashboardPage({ shipments, load, navigate, onDetails }) {
  const [period, setPeriod] = useState('This week');
  const [actionData, setActionData] = useState(null);
  const [showBadAddressModal, setShowBadAddressModal] = useState(false);

  useEffect(() => {
    let active = true;

    api.actionRequired()
      .then((result) => {
        if (active) setActionData(unwrap(result));
      })
      .catch(() => {
        if (active) setActionData(null);
      });

    return () => {
      active = false;
    };
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

  const stats = [
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
          <ShipmentStats stats={stats} navigate={navigate} />
          <div className="chart-grid">
            <ShipmentActivityChart shipments={shipments} period={period} setPeriod={setPeriod} />
            <DeliveryStatusChart shipments={shipments} stats={stats} />
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










