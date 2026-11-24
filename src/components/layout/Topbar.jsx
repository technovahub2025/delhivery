import { Bell, ChevronDown, HelpCircle, LogOut, Menu, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api, unwrap } from '../../services/api';

export default function Topbar({ title, user, onMenu, onSearch, onSearchResult, onHelp, onLogout }) {
  const [search, setSearch] = useState('');
  const [searchPage, setSearchPage] = useState(1);
  const [searchData, setSearchData] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [popover, setPopover] = useState(null);
  const popRef = useRef();
  const [notificationState, setNotificationState] = useState({});
  useEffect(() => {
    if (popover !== 'notifications') return;
    let current = true;
    setNotificationState({ loading: true });
    api.actionRequired().then(result => {
      if (current) setNotificationState({ rows: unwrap(result).notifications || [] });
    }).catch(() => { if (current) setNotificationState({ error: true }); });
    return () => { current = false; };
  }, [popover]);
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
  async function submitSearch(event, page = 1) {
    event?.preventDefault();
    const q = search.trim();
    if (!q) { setSearchData(null); setSearchError('Enter an AWB, customer name, mobile number, or pincode.'); return; }
    setSearchLoading(true); setSearchError('');
    try {
      const response = await api.operationalSearch({ q, page, limit: 30 });
      setSearchData(response?.data?.data ?? response?.data ?? response); setSearchPage(page);
    } catch (error) { setSearchData(null); setSearchError(error.message || 'Search could not be completed.'); }
    finally { setSearchLoading(false); }
  }
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
          onSubmit={submitSearch}
        >
          <Search size={16} />
          <input
            aria-label="Operational search"
            placeholder="Search anything…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span>↵</span>
        </form>
        {searchData && <div className="operational-search-results" role="region" aria-label="Search results">
          <div className="operational-search-heading"><strong>{searchData.total} results</strong><button type="button" onClick={() => setSearchData(null)}>Close</button></div>
          {searchData.items?.length ? searchData.items.map(item => <button type="button" className="operational-search-result" key={`${item.type}-${item.id}`} onClick={() => { onSearchResult?.(item, search); setSearchData(null); }}><span className="operational-search-type">{item.type}</span><span><strong>{item.label}</strong><small>{item.detail}</small></span></button>) : <p className="operational-search-empty">No matching records.</p>}
          {searchData.totalPages > 1 && <div className="operational-search-pagination"><button type="button" disabled={searchLoading || searchPage <= 1} onClick={() => submitSearch(null, searchPage - 1)}>Previous</button><span>Page {searchPage} of {searchData.totalPages}</span><button type="button" disabled={searchLoading || searchPage >= searchData.totalPages} onClick={() => submitSearch(null, searchPage + 1)}>Next</button></div>}
        </div>}
        {searchLoading && <div className="operational-search-status" role="status">Searching...</div>}
        {searchError && <div className="operational-search-error" role="alert">{searchError}</div>}
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
                {notificationState.loading && <p role="status">Loading notifications?</p>}
                {notificationState.error && <p role="alert">Notifications are unavailable.</p>}
                {notificationState.rows?.length > 0 && <ul>{notificationState.rows.map(row => <li key={row.id}><strong>{row.title}</strong>{row.reference && <small> ? {row.reference}</small>}</li>)}</ul>}
                {notificationState.rows?.length === 0 && <p>No notifications yet.</p>}
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
