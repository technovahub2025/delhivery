import {
  CalendarDays,
  ChevronDown,
  Download,
  Filter,
  MapPin,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Search,
  X,
  Edit3,
  FileText,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import ShipmentActionDialog from '../../components/shipments/ShipmentActionDialog';
import { Badge, Button, Empty } from '../../components/ui';
import Pagination from '../../components/ui/Pagination';
import ShipmentLoadState from '../../components/shipments/ShipmentLoadState';

const statusCards = [
  { label: 'Pending AWB', key: 'pendingAwb' },
  { label: 'Ready to ship', key: 'readyToShip' },
  { label: 'Ready for pickup', key: 'readyForPickup' },
  { label: 'In transit', key: 'inTransit' },
  { label: 'RTO - In transit', key: 'rtoInTransit' },
  { label: 'Delivered', key: 'delivered' },
  { label: 'All shipments', key: 'all' },
  { label: 'Shipped via third party', key: 'thirdParty' },
];

function normalized(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ');
}

function getShipmentGroup(shipment) {
  const status = normalized(shipment.status);
  const awb = String(
    shipment.awb ??
      shipment.waybill ??
      shipment.waybillNumber ??
      shipment.trackingNumber ??
      '',
  ).trim();
  const courier = normalized(
    shipment.courier ?? shipment.carrier ?? shipment.shippedVia ?? '',
  );

  if (status.includes('rto') && status.includes('transit')) {
    return 'rtoInTransit';
  }
  if (status.includes('deliver')) return 'delivered';
  if (
    status.includes('transit') ||
    status.includes('picked up') ||
    status.includes('out for delivery')
  ) {
    return 'inTransit';
  }
  if (courier && !courier.includes('delhivery')) return 'thirdParty';
  if (
    status.includes('ready for pickup') ||
    status.includes('pending pickup')
  ) {
    return 'readyForPickup';
  }
  if (status.includes('ready to ship') || status.includes('ready to dispatch')) {
    return 'readyToShip';
  }
  if (
    status.includes('pending awb') ||
    status.includes('awb pending') ||
    !awb
  ) {
    return 'pendingAwb';
  }
  return 'readyToShip';
}

function getPickupLocation(shipment) {
  return (
    shipment.pickupLocation ??
    shipment.pickup_location ??
    shipment.warehouseName ??
    shipment.warehouse ??
    shipment.origin ??
    ''
  );
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function downloadShipmentsCsv(shipments) {
  const columns = [
    ['Waybill / Shipment ID', (s) => s.waybill ?? s.awb ?? s.id],
    ['Reference', (s) => s.reference],
    ['Customer', (s) => s.customer],
    ['Destination', (s) => s.destination],
    ['Pincode', (s) => s.pincode],
    ['Date', (s) => s.date],
    ['Payment', (s) => s.payment],
    ['Status', (s) => s.status],
    ['Pickup location', getPickupLocation],
  ];

  const rows = [
    columns.map(([heading]) => csvCell(heading)).join(','),
    ...shipments.map((shipment) =>
      columns.map(([, getValue]) => csvCell(getValue(shipment))).join(','),
    ),
  ];

  const blob = new Blob(['\uFEFF', rows.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `forward-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ShipmentsPage({
  shipments = [],
  load,
  setShipments,
  navigate,
  notify,
  onDetails,
  initialSearch = '',
}) {
  const [query, setQuery] = useState(initialSearch);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [menu, setMenu] = useState(null);
  const [action, setAction] = useState(null);

  const safeShipments = Array.isArray(shipments) ? shipments : [];

  const pickupLocations = useMemo(
    () =>
      [...new Set(safeShipments.map(getPickupLocation).filter(Boolean))].sort(
        (a, b) => String(a).localeCompare(String(b)),
      ),
    [safeShipments],
  );

  const counts = useMemo(() => {
    const result = {
      pendingAwb: 0,
      readyToShip: 0,
      readyForPickup: 0,
      inTransit: 0,
      rtoInTransit: 0,
      delivered: 0,
      all: safeShipments.length,
      thirdParty: 0,
    };

    safeShipments.forEach((shipment) => {
      const group = getShipmentGroup(shipment);
      if (Object.prototype.hasOwnProperty.call(result, group)) {
        result[group] += 1;
      }
    });
    return result;
  }, [safeShipments]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return safeShipments.filter((shipment) => {
      const group = getShipmentGroup(shipment);
      const shipmentDate = String(shipment.date ?? '').slice(0, 10);
      const location = String(getPickupLocation(shipment));

      const matchesStatus =
        selectedStatus === 'all' || group === selectedStatus;
      const matchesSearch =
        !search ||
        [
          shipment.id,
          shipment.awb,
          shipment.waybill,
          shipment.reference,
          shipment.customer,
          shipment.destination,
          shipment.pincode,
          shipment.status,
          location,
        ]
          .map((value) => String(value ?? ''))
          .join(' ')
          .toLowerCase()
          .includes(search);
      const matchesFrom = !dateFrom || shipmentDate >= dateFrom;
      const matchesTo = !dateTo || shipmentDate <= dateTo;
      const matchesPickup = !pickupLocation || location === pickupLocation;

      return (
        matchesStatus &&
        matchesSearch &&
        matchesFrom &&
        matchesTo &&
        matchesPickup
      );
    });
  }, [
    safeShipments,
    query,
    selectedStatus,
    dateFrom,
    dateTo,
    pickupLocation,
  ]);

  const pageSize = 7;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const activePage = Math.min(page, pages);
  const visibleShipments = filtered.slice(
    (activePage - 1) * pageSize,
    activePage * pageSize,
  );

  const hasFilters =
    query || dateFrom || dateTo || pickupLocation || selectedStatus !== 'all';

  function clearFilters() {
    setQuery('');
    setDateFrom('');
    setDateTo('');
    setPickupLocation('');
    setSelectedStatus('all');
    setPage(1);
  }

  return (
    <div className="forward-orders-page">
      <div className="forward-orders-heading">
        <div>
          <div className="forward-orders-eyebrow">ORDERS &amp; PICKUPS</div>
          <h1>Forward Orders</h1>
          <p>
            Manage your forward shipments, check their status and review
            shipment details.
          </p>
        </div>

        <div className="forward-orders-heading-actions">
          <Button
            variant="secondary"
            disabled
            title="Order sync is not configured in the current API."
          >
            <RefreshCw size={16} />
            Sync orders
          </Button>
          <Button
            variant="secondary"
            onClick={() => downloadShipmentsCsv(filtered)}
            disabled={!filtered.length}
          >
            <Download size={16} />
            Download CSV
          </Button>
          <Button onClick={() => navigate('create')}>
            <Plus size={17} />
            Create order
          </Button>
        </div>
      </div>

      <section
        className="forward-orders-status-grid"
        aria-label="Shipment status filters"
      >
        {statusCards.map((card) => (
          <button
            type="button"
            key={card.key}
            className={`forward-status-card ${
              selectedStatus === card.key ? 'selected' : ''
            }`}
            onClick={() => {
              setSelectedStatus(card.key);
              setPage(1);
            }}
            aria-pressed={selectedStatus === card.key}
          >
            <span className="forward-status-card-label">{card.label}</span>
            <strong>{counts[card.key] ?? 0}</strong>
          </button>
        ))}
      </section>

      <section className="card forward-orders-table-card">
        <div className="forward-orders-toolbar">
          <div className="search-input forward-orders-search">
            <Search size={17} />
            <input
              aria-label="Search forward orders"
              placeholder="Search AWB, order ID, customer or destination"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
            {query && (
              <button
                type="button"
                className="forward-clear-search"
                aria-label="Clear search"
                onClick={() => {
                  setQuery('');
                  setPage(1);
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          <button
            type="button"
            className={`forward-filter-button ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters((value) => !value)}
            aria-expanded={showFilters}
          >
            <Filter size={16} />
            Filters
            <ChevronDown size={15} />
          </button>

          <div className="forward-orders-result-count">
            {filtered.length} {filtered.length === 1 ? 'order' : 'orders'}
          </div>
        </div>

        {showFilters && (
          <div className="forward-orders-filter-panel">
            <label>
              <span>
                <CalendarDays size={14} />
                From date
              </span>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  setPage(1);
                }}
              />
            </label>

            <label>
              <span>
                <CalendarDays size={14} />
                To date
              </span>
              <input
                type="date"
                min={dateFrom || undefined}
                value={dateTo}
                onChange={(event) => {
                  setDateTo(event.target.value);
                  setPage(1);
                }}
              />
            </label>

            <label>
              <span>
                <MapPin size={14} />
                Pickup location
              </span>
              <select
                value={pickupLocation}
                onChange={(event) => {
                  setPickupLocation(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All pickup locations</option>
                {pickupLocations.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </label>

            {hasFilters && (
              <button
                type="button"
                className="forward-reset-filters"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {load?.status !== 'success' && <ShipmentLoadState load={load} />}

        <div className="table-scroll forward-orders-table-scroll">
          <table className="forward-orders-table">
            <thead>
              <tr>
                <th>ORDER / AWB</th>
                <th>CUSTOMER</th>
                <th>DESTINATION</th>
                <th>ORDER DATE</th>
                <th>PAYMENT</th>
                <th>STATUS</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visibleShipments.map((shipment) => (
                <tr key={shipment.id}>
                  <td>
                    <button
                      type="button"
                      className="table-link"
                      onClick={() => onDetails?.(shipment)}
                    >
                      {shipment.waybill ?? shipment.awb ?? shipment.id}
                    </button>
                    <small>{shipment.reference || 'No reference'}</small>
                  </td>
                  <td>
                    <span className="forward-customer-name">
                      {shipment.customer || '—'}
                    </span>
                  </td>
                  <td>
                    <span>{shipment.destination || '—'}</span>
                    {shipment.pincode && <small>{shipment.pincode}</small>}
                  </td>
                  <td>{shipment.date || '—'}</td>
                  <td>
                    <span className="payment-tag">{shipment.payment || '—'}</span>
                  </td>
                  <td>
                    <Badge>{shipment.status || 'Unknown'}</Badge>
                  </td>
                  <td>
                    <div className="row-actions forward-order-row-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Actions for ${shipment.id}`}
                        aria-expanded={menu === shipment.id}
                        onClick={() =>
                          setMenu(menu === shipment.id ? null : shipment.id)
                        }
                      >
                        <MoreHorizontal size={20} />
                      </button>

                      {menu === shipment.id && (
                        <div className="dropdown row-menu">
                          {[
                            [Package, 'View details', 'view'],
                            [Edit3, 'Edit shipment', 'edit'],
                            [FileText, 'Update e-waybill', 'ewaybill'],
                            [XCircle, 'Cancel shipment', 'cancel'],
                          ].map(([Icon, label, type]) => (
                            <button
                              type="button"
                              key={type}
                              disabled={
                                type === 'cancel' &&
                                normalized(shipment.status) === 'cancelled'
                              }
                              onClick={() => {
                                setMenu(null);
                                if (type === 'view') {
                                  onDetails?.(shipment);
                                } else {
                                  setAction({ type, shipment });
                                }
                              }}
                            >
                              <Icon size={15} />
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!visibleShipments.length && (
            <div className="forward-orders-empty">
              <Empty />
              {safeShipments.length > 0 && hasFilters && (
                <button
                  type="button"
                  className="forward-reset-filters"
                  onClick={clearFilters}
                >
                  Clear filters and show all orders
                </button>
              )}
            </div>
          )}
        </div>

        <Pagination
          total={filtered.length}
          page={activePage}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </section>

      {action && (
        <ShipmentActionDialog
          action={action}
          setAction={setAction}
          setShipments={setShipments}
          notify={notify}
        />
      )}
    </div>
  );
}
