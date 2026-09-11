import {
  Box,
  Building2,
  Calculator,
  Clock3,
  Code2,
  FileText,
  LayoutDashboard,
  MapPin,
  Package,
  Plus,
  Truck,
} from 'lucide-react';

export const navGroups = [
  [
    'WORKSPACE',
    [
      ['dashboard', 'Overview', LayoutDashboard],
      ['shipments', 'Shipments', Package],
      ['create', 'Create shipment', Plus],
      ['tracking', 'Track shipment', MapPin],
      ['pickups', 'Pickup requests', Truck],
    ],
  ],
  [
    'SHIPPING TOOLS',
    [
      ['pincode', 'Pincode serviceability', MapPin],
      ['estimate', 'Delivery estimate', Clock3],
      ['calculator', 'Shipping calculator', Calculator],
      ['waybills', 'Waybill management', Box],
      ['documents', 'Labels & documents', FileText],
    ],
  ],
  [
    'MANAGEMENT',
    [
      ['warehouses', 'Warehouses', Building2],
      ['events', 'Webhook events', Code2],
    ],
  ],
];
