import { fireEvent, render, screen } from '@testing-library/react';
import OperationalMetricCards from './OperationalMetricCards';

test('renders server metrics and marks unavailable values distinctly', () => {
  render(<OperationalMetricCards data={{ metrics: { totalShipments: 12, activeRtoCases: null } }} navigate={jest.fn()} filters={{ from: '2026-09-01' }} />);
  expect(screen.getByRole('button', { name: 'Total shipments: 12' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Active RTO cases: unavailable' })).toBeInTheDocument();
});

test('dashboard card navigation carries matching page, date and status filters', () => {
  const navigate = jest.fn();
  render(<OperationalMetricCards data={{ metrics: { deliveredShipments: 3 } }} navigate={navigate} filters={{ from: '2026-09-01', to: '2026-09-30', status: 'inTransit' }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Delivered: 3' }));
  expect(navigate).toHaveBeenCalledWith('shipments', { dashboardFilter: { from: '2026-09-01', to: '2026-09-30', status: 'inTransit', target: 'delivered' } });
});

test('RTO dashboard cards distinguish all cases from active lifecycle cases', () => {
  const navigate = jest.fn();
  render(<OperationalMetricCards data={{ metrics: { rtoShipments: 4, activeRtoCases: 2 } }} navigate={navigate} filters={{ from: '2026-09-01', to: '2026-09-30', status: 'inTransit' }} />);

  fireEvent.click(screen.getByRole('button', { name: 'RTO shipments: 4' }));
  expect(navigate).toHaveBeenLastCalledWith('rto', { dashboardFilter: { from: '2026-09-01', to: '2026-09-30', status: 'inTransit', target: 'shipments' } });

  fireEvent.click(screen.getByRole('button', { name: 'Active RTO cases: 2' }));
  expect(navigate).toHaveBeenLastCalledWith('rto', { dashboardFilter: { from: '2026-09-01', to: '2026-09-30', status: 'inTransit', target: 'active' } });
});

test('pending AWB dashboard card opens the booking queue with its date range and explicit target', () => {
  const navigate = jest.fn();
  render(<OperationalMetricCards data={{ metrics: { pendingAwbShipments: 2 } }} navigate={navigate} filters={{ from: '2026-09-01', to: '2026-09-30', status: 'inTransit' }} />);
  fireEvent.click(screen.getByRole('button', { name: 'Pending AWB: 2' }));
  expect(navigate).toHaveBeenCalledWith('create', { dashboardFilter: { from: '2026-09-01', to: '2026-09-30', status: 'inTransit', target: 'pendingAwb' } });
});

test('every operational metric opens its matching persisted-record drill-down', () => {
  const navigate = jest.fn();
  const metrics = {
    totalShipments: 10, pickupPendingShipments: 1, undeliveredShipments: 2,
    outForDeliveryShipments: 3, transitExceptionShipments: 4, pendingAwbShipments: 5,
    inTransitShipments: 6, deliveredShipments: 7, ndrShipments: 8,
    unresolvedNdrCases: 9, rtoShipments: 10, activeRtoCases: 11,
    failedExceptionShipments: 12,
  };
  const expected = [
    ['Total shipments', 'shipments', 'all'], ['Pickup pending', 'shipments', 'pickupPending'],
    ['Undelivered', 'shipments', 'undelivered'], ['Out for delivery', 'shipments', 'outForDelivery'],
    ['Transit exceptions', 'shipments', 'transitException'], ['Pending AWB', 'create', 'pendingAwb'],
    ['In transit', 'shipments', 'inTransit'], ['Delivered', 'shipments', 'delivered'],
    ['NDR shipments', 'ndr', 'shipments'], ['Unresolved NDR cases', 'ndr', 'unresolved'],
    ['RTO shipments', 'rto', 'shipments'], ['Active RTO cases', 'rto', 'active'],
    ['Failed / exception', 'shipments', 'failedException'],
  ];
  const filters = { from: '2026-09-01', to: '2026-09-30', status: 'inTransit' };
  render(<OperationalMetricCards data={{ metrics }} navigate={navigate} filters={filters} />);
  for (const [label, page, target] of expected) {
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${label}:`) }));
    expect(navigate).toHaveBeenLastCalledWith(page, { dashboardFilter: { ...filters, target } });
  }
});
