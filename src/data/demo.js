export const statuses = ['In transit', 'Delivered', 'Pending pickup', 'Cancelled'];
export const initialShipments = [];
export const initialWarehouses = [];
export const initialPickups = [];
export const events = [];

export function timeline(shipment) {
  return shipment.history || [];
}

export const money = (n) => '₹' + Number(n).toLocaleString('en-IN');
