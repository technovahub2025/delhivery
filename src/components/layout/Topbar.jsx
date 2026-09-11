import { Bell, ChevronDown, HelpCircle, LogOut, Menu, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function Topbar({ title, user, onMenu, onSearch, onHelp, onLogout }) {
  const [search, setSearch] = useState('');
  const [popover, setPopover] = useState(null);
  const popRef = useRef();
  useEffect(() => {
    function close(e) {
      if (e.key === 'Escape' || (e.type === 'mousedown' && !popRef.current?.contains(e.target)))
        setPopover(null);
    }
    document.addEventListener('keydown', close);
    document.addEventListener('mousedown', close);
    return () => {
      document.removeEventListener('keydown', close);
      document.removeEventListener('mousedown', close);
    };
  }, []);
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="icon-btn mobile-menu"
          aria-label="Open navigation"
          onClick={() => onMenu()}
        >
          <Menu size={21} />
        </button>
        <span className="breadcrumb">
          Workspace <span>/</span> <strong>{title}</strong>
        </span>
      </div>
      <div className="topbar-right">
        <form
          className="global-search"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch(search);
            setSearch('');
          }}
        >
          <Search size={16} />
          <input
            aria-label="Global shipment search"
            placeholder="Search anything…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span>↵</span>
        </form>
        <span className="demo-pill">
          <span />
          Workspace
        </span>
        <div className="header-popovers" ref={popRef}>
          <div className="popover-anchor">
            <button
              className="icon-btn notification-btn"
              aria-label="Notifications"
              aria-expanded={popover === 'notifications'}
              onClick={() => setPopover(popover === 'notifications' ? null : 'notifications')}
            >
              <Bell size={19} />
            </button>
            {popover === 'notifications' && (
              <div className="dropdown notification-panel">
                <h3>Notifications</h3>
                <p>No notifications yet.</p>
              </div>
            )}
          </div>
          <span className="topbar-divider" />
          <div className="popover-anchor">
            <button
              className="profile-button"
              aria-label="Profile menu"
              aria-expanded={popover === 'profile'}
              onClick={() => setPopover(popover === 'profile' ? null : 'profile')}
            >
              <span className="avatar">{user?.[0]?.toUpperCase() || 'W'}</span>
              <span className="profile-name">
                <strong>{user || 'Workspace user'}</strong>
                <small>Workspace admin</small>
              </span>
              <ChevronDown size={14} />
            </button>
            {popover === 'profile' && (
              <div className="dropdown profile-panel">
                <small>{user}</small>
                <button
                  onClick={() => {
                    setPopover(null);
                    onHelp();
                  }}
                >
                  <HelpCircle size={16} />
                  Help
                </button>
                <button
                  onClick={() => {
                    onLogout();
                    setPopover(null);
                  }}
                >
                  <LogOut size={16} />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
