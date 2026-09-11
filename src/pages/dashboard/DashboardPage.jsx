import { Box, CalendarDays, CheckCheck, Clock3, Plus, Truck, XCircle } from 'lucide-react';
import { useState } from 'react';
import DeliveryStatusChart from '../../components/dashboard/DeliveryStatusChart';
import QuickActions from '../../components/dashboard/QuickActions';
import RecentShipmentsTable from '../../components/dashboard/RecentShipmentsTable';
import ShipmentActivityChart from '../../components/dashboard/ShipmentActivityChart';
import ShipmentStats from '../../components/dashboard/ShipmentStats';
import { Button } from '../../components/ui';

export default function DashboardPage({ shipments, navigate, onDetails }) {
  const [period, setPeriod] = useState('This week');
  const stats = [
    ['Total shipments', shipments.length, Box, 'orange'],
    ['In transit', shipments.filter((s) => s.status === 'In transit').length, Truck, 'blue'],
    ['Delivered', shipments.filter((s) => s.status === 'Delivered').length, CheckCheck, 'green'],
    [
      'Pending pickup',
      shipments.filter((s) => s.status === 'Pending pickup').length,
      Clock3,
      'amber',
    ],
    ['Cancelled', shipments.filter((s) => s.status === 'Cancelled').length, XCircle, 'red'],
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow muted">YOUR OPERATIONS, AT A GLANCE</div>
          <h1>
            Every delivery starts here<span className="text-orange">.</span>
          </h1>
          <p>Welcome back. Here are the shipments added in this session.</p>
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
      <ShipmentStats stats={stats} navigate={navigate} />
      <div className="chart-grid">
        <ShipmentActivityChart shipments={shipments} period={period} setPeriod={setPeriod} />
        <DeliveryStatusChart shipments={shipments} stats={stats} />
      </div>
      <QuickActions navigate={navigate} />
      <RecentShipmentsTable shipments={shipments} navigate={navigate} onDetails={onDetails} />
      <div className="page-foot">
        <span>
          <ShieldIcon /> Workspace overview <span className="foot-separator">·</span> Manage your
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
