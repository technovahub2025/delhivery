import { ArrowUpRight, MapPin, Plus, Truck } from 'lucide-react';

export default function QuickActions({ navigate }) {
  return (
    <div className="quick-grid">
      {[
        [Plus, 'Create a shipment', 'Your next delivery starts here', 'create'],
        [MapPin, 'Check a pincode', 'Discover where we deliver', 'pincode'],
        [Truck, 'Request a pickup', 'We’ll take it from here', 'pickups'],
      ].map(([Icon, title, desc, key]) => (
        <button key={key} className="quick-card" onClick={() => navigate(key)}>
          <span className="quick-icon">
            <Icon size={21} />
          </span>
          <div>
            <strong>{title}</strong>
            <small>{desc}</small>
          </div>
          <ArrowUpRight size={18} />
        </button>
      ))}
    </div>
  );
}
