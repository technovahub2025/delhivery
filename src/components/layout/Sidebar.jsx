import { ArrowUpRight, Box, ChevronsLeft } from 'lucide-react';

import { navGroups } from '../../config/navigation';

export default function Sidebar({
  mobile,
  collapsed,
  page,
  shipmentCount,
  navigate,
  onHelp,
  onToggle,
}) {
  return (
    <aside className={`sidebar ${mobile ? 'mobile-open' : ''}`}>
      <button
        className="brand sidebar-brand"
        onClick={() => navigate('dashboard')}
        aria-label="Powered by Technovahub overview"
      >
        <span className="brand-icon">
          <Box size={24} />
        </span>
        <span className="brand-name">
          Delivery<span className="brand-hub">Hub</span>
        </span>
      </button>
      <div className="workspace-selector">
        <span className="workspace-avatar">W</span>
        <div>
          <strong>Your workspace</strong>
          <small>Business account</small>
        </div>
        <span className="pulse-dot" />
      </div>
      <nav aria-label="Main navigation">
        {navGroups.map(([group, items]) => (
          <div className="nav-group" key={group}>
            <p>{group}</p>
            {items.map(([key, label, Icon]) => (
              <button
                key={key}
                title={collapsed ? label : undefined}
                aria-label={label}
                aria-current={page === key ? 'page' : undefined}
                className={`nav-item ${page === key ? 'active' : ''}`}
                onClick={() => navigate(key)}
              >
                <Icon size={18} />
                <span>{label}</span>
                {key === 'shipments' && <small>{shipmentCount}</small>}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-help">
          <span className="help-spark">✦</span>
          <strong>A little help goes a long way.</strong>
          <p>Find your feet. Then go further.</p>
          <button onClick={() => onHelp()}>
            Explore help center
            <ArrowUpRight size={15} />
          </button>
        </div>
        <button
          className="collapse-button"
          onClick={() => {
            onToggle();
          }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronsLeft size={17} />
          <span>Collapse sidebar</span>
        </button>
      </div>
    </aside>
  );
}
