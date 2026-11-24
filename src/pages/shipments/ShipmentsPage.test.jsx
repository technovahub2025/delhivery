import { isConfirmedPendingAwb, matchesShipmentStatusFilter } from './ShipmentsPage';
import { csvEscape } from '../../utils/csv';

test('shipment CSV cells neutralize formula strings while preserving negative numbers and quoting', () => {
  expect(csvEscape('=HYPERLINK("x")')).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
  expect(csvEscape('  \r\n@cmd')).toBe("\"'  \r\n@cmd\"");
  expect(csvEscape('-42.25')).toBe('-42.25');
  expect(csvEscape('Customer, Inc.')).toBe('"Customer, Inc."');
});

test('pending AWB detail filter accepts only BOOKED_AWB_PENDING records without an AWB', () => {
  expect(isConfirmedPendingAwb({ bookingStatus: 'BOOKED_AWB_PENDING', waybill: '' })).toBe(true);
  expect(isConfirmedPendingAwb({ bookingStatus: 'BOOKED_AWB_PENDING' })).toBe(true);
  expect(isConfirmedPendingAwb({ bookingStatus: 'BOOKED_AWB_PENDING', waybill: 'AWB-123' })).toBe(false);
  expect(isConfirmedPendingAwb({ status: 'Pending pickup', waybill: '' })).toBe(false);
  expect(isConfirmedPendingAwb({ bookingStatus: 'BOOKING_PENDING', waybill: '' })).toBe(false);
});

test('dashboard Delivered and In Transit filters trust the backend canonical status', () => {
  expect(matchesShipmentStatusFilter({ status: 'Pending pickup', dashboardStatus: 'delivered' }, 'delivered')).toBe(true);
  expect(matchesShipmentStatusFilter({ status: 'Delivered', dashboardStatus: 'unknown' }, 'delivered')).toBe(false);
  expect(matchesShipmentStatusFilter({ status: 'Delivered', dashboardStatus: 'inTransit' }, 'inTransit')).toBe(true);
  expect(matchesShipmentStatusFilter({ status: 'Delivered', dashboardStatus: 'unknown' }, 'inTransit')).toBe(false);
});

test('dashboard drill-down applies both the selected figure and the dashboard status scope', () => {
  const delivered = { dashboardStatus: 'delivered' };
  const moving = { dashboardStatus: 'inTransit', dashboardTags: ['undelivered'] };
  expect(matchesShipmentStatusFilter(delivered, 'delivered', 'inTransit')).toBe(false);
  expect(matchesShipmentStatusFilter(delivered, 'all', 'inTransit')).toBe(false);
  expect(matchesShipmentStatusFilter(moving, 'undelivered', 'inTransit')).toBe(true);
  expect(matchesShipmentStatusFilter(moving, 'all', 'inTransit')).toBe(true);
});
