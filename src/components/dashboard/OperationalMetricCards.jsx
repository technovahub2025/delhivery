import { AlertTriangle, Box, CheckCheck, Clock3, RotateCcw, Truck, XCircle } from 'lucide-react';

const items = [
  ['Total shipments', 'totalShipments', Box, 'orange', 'shipments', 'all'],
  ['Pickup pending', 'pickupPendingShipments', Clock3, 'amber', 'shipments', 'pickupPending'],
  ['Undelivered', 'undeliveredShipments', Truck, 'blue', 'shipments', 'undelivered'],
  ['Out for delivery', 'outForDeliveryShipments', Truck, 'blue', 'shipments', 'outForDelivery'],
  ['Transit exceptions', 'transitExceptionShipments', AlertTriangle, 'red', 'shipments', 'transitException'],
  ['Pending AWB', 'pendingAwbShipments', Clock3, 'amber', 'create', 'pendingAwb'],
  ['In transit', 'inTransitShipments', Truck, 'blue', 'shipments', 'inTransit'],
  ['Delivered', 'deliveredShipments', CheckCheck, 'green', 'shipments', 'delivered'],
  ['NDR shipments', 'ndrShipments', AlertTriangle, 'amber', 'ndr', 'shipments'],
  ['Unresolved NDR cases', 'unresolvedNdrCases', AlertTriangle, 'red', 'ndr', 'unresolved'],
  ['RTO shipments', 'rtoShipments', RotateCcw, 'blue', 'rto', 'shipments'],
  ['Active RTO cases', 'activeRtoCases', RotateCcw, 'amber', 'rto', 'active'],
  ['Failed / exception', 'failedExceptionShipments', XCircle, 'red', 'shipments', 'failedException'],
];

export default function OperationalMetricCards({ data, navigate, filters }) {
  return <div className="stats-grid operational-stats-grid">
    {items.map(([label, key, Icon, color, page, target]) => {
      const value = data?.metrics?.[key];
      const unavailable = value == null;
      return <button key={key} className="stat-card" type="button" aria-label={`${label}: ${unavailable ? 'unavailable' : value}`} onClick={() => navigate(page, { dashboardFilter: { ...filters, target } })}>
        <div className="stat-top"><span>{label}</span><span className={`stat-icon ${color}`}><Icon size={18} /></span></div>
        <strong>{unavailable ? '—' : value}</strong>
        {unavailable && <small>Unavailable</small>}
      </button>;
    })}
  </div>;
}
