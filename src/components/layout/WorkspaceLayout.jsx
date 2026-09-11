import { useEffect, useState } from 'react';

import { navGroups } from '../../config/navigation';
import Footer from './Footer';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function WorkspaceLayout({
  children,
  page,
  user,
  shipmentCount,
  navigate,
  onSearch,
  onHelp,
  onLogout,
  notify,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const title = navGroups.flatMap((group) => group[1]).find((item) => item[0] === page)?.[1];

  useEffect(() => {
    function close(event) {
      if (event.key === 'Escape') setMobile(false);
    }
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, []);

  function selectPage(next) {
    setMobile(false);
    navigate(next);
  }

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {mobile && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <Sidebar
        mobile={mobile}
        collapsed={collapsed}
        page={page}
        shipmentCount={shipmentCount}
        navigate={selectPage}
        onHelp={onHelp}
        onToggle={() => {
          setCollapsed(!collapsed);
          setMobile(false);
        }}
      />
      <div className="workspace">
        <Topbar
          title={title}
          user={user}
          onMenu={() => setMobile(true)}
          onSearch={onSearch}
          onHelp={onHelp}
          onLogout={onLogout}
          notify={notify}
        />
        <main className="main-content" key={page}>
          {children}
        </main>
        <Footer onHelp={onHelp} />
      </div>
    </div>
  );
}
