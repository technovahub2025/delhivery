import { ArrowUpRight, Box, Check, Globe2, PackageCheck, Truck } from 'lucide-react';

export default function AuthStory() {
  return (
    <aside className="auth-story">
      <a href="#login" className="brand">
        <span className="brand-icon">
          <Box size={25} />
        </span>
        Delhivery<span className="brand-hub">Hub</span>
      </a>
      <div className="story-main">
        <div className="eyebrow">
          <span /> THE SMARTER WAY TO SHIP
        </div>
        <h1>
          Great deliveries.
          <br />
          Even greater
          <br />
          <em>possibilities.</em>
        </h1>
        <p>
          From your first order to your next big milestone.
          <br />
          Every shipment, all in one place.
        </p>
        <div className="shipment-illustration">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="route-line" />
          <div className="map-dot dot-one" />
          <div className="map-dot dot-two" />
          <div className="floating-truck">
            <Truck size={42} strokeWidth={1.4} />
          </div>
          <div className="floating-box">
            <Box size={35} strokeWidth={1.4} />
          </div>
          <div className="delivery-note">
            <span className="success-icon">
              <PackageCheck size={23} />
            </span>
            <div>
              <strong>Delivered. Right on time.</strong>
              <small>
                Another happy customer <span>✦</span>
              </small>
            </div>
            <span className="note-check">
              <Check size={14} />
            </span>
          </div>
          <div className="tracking-note">
            <span className="pulse-dot" />
            Your next milestone is on the way
            <ArrowUpRight size={16} />
          </div>
        </div>
      </div>
      <div className="story-bottom">
        <span>Built for businesses on the move.</span>
        <span>
          <Globe2 size={14} /> Across India
        </span>
      </div>
    </aside>
  );
}
