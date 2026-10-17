import {
  AlertTriangle,
  Box,
  Building2,
  Calculator,
  ChevronRight,
  RotateCcw,
  FileBarChart,
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
      [
        'ordersPickups',
        'Orders & Pickups',
        Package,
        [
          ['shipments', 'Forward Orders', Package],
          ['reverseOrders', 'Reverse Orders', RotateCcw],
          ['pickups', 'Pickup Requests', Truck],
        ],
      ],
      [
        'deliveryExceptions',
        'Delivery Exceptions',
        AlertTriangle,
        [
          ['ndr', 'NDR', RotateCcw],
          ['exceptions', 'Exceptions', AlertTriangle],
        ],
      ],
      ['create', 'Create shipment', Plus],
      ['tracking', 'Track shipment', MapPin],
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
      ['reports', 'Reports', FileBarChart],
      ['finance', 'Finance', Calculator],
    ],
  ],
];



