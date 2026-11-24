import { useEffect, useState } from 'react';
import LoginPage from './pages/auth/LoginPage';
import RegistrationPage from './pages/auth/RegistrationPage';
import WorkspaceLayout from './components/layout/WorkspaceLayout';
import HelpDialog from './components/layout/HelpDialog';
import ShipmentDetailsDrawer from './components/shipments/ShipmentDetailsDrawer';
import { Toast } from './components/ui';
import WorkspacePages from './routes/WorkspacePages';
import useDemoWorkspace from './hooks/useDemoWorkspace';
import useToast from './hooks/useToast';
import './App.css';
import { setAuthToken } from './services/api';
import { restoreSession, saveSession } from './services/session';

export default function App() {
  const [restored] = useState(() => {
    const session = restoreSession();
    setAuthToken(session?.token || null);
    return session;
  });
  const [user, setUser] = useState(restored?.user || null);
  const [sessionToken, setSessionToken] = useState(restored?.token || null);
  const [rememberedEmail, setRememberedEmail] = useState('');
  const [authPage, setAuthPage] = useState('login');
  const [page, setPage] = useState(restored?.page || 'dashboard');
  const [createPrefill, setCreatePrefill] = useState(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [tableSearch, setTableSearch] = useState('');
  const [pageSearch, setPageSearch] = useState('');
  const [searchKey, setSearchKey] = useState(0);
  const [dashboardFilter, setDashboardFilter] = useState(null);
  const workspace = useDemoWorkspace(sessionToken, user);
  const { message, notify } = useToast();
  const details = workspace.shipments.find((shipment) => shipment.id === detailId);

  useEffect(() => {
    saveSession(user && sessionToken ? { user, token: sessionToken, page } : null);
  }, [user, sessionToken, page]);

  function navigate(next, options = {}) {
    if (next === 'create') {
      setCreatePrefill(options.prefill || null);
    }
    setPage(next);
    setPageSearch(options.search || '');
    setDashboardFilter(options.dashboardFilter || null);
    if (next === 'shipments') setTableSearch(options.search || '');
    setSearchKey((key) => key + 1);
    window.scrollTo(0, 0);
  }

  function login(session, remember = false) {
    setRememberedEmail(remember ? session.user.email : '');
    setAuthToken(session.token);
    setSessionToken(session.token);
    setUser(session.user);
    setPage('dashboard');
    notify('Welcome to your workspace.');
  }

  function logout() {
    saveSession(null);
    setAuthToken(null);
    setSessionToken(null);
    workspace.reset();
    setUser(null);
    setAuthPage('login');
    setDetailId(null);
  }

  function searchShipments(query) {
    setTableSearch(query);
    setPage('shipments');
    setSearchKey((key) => key + 1);
  }

  function openOperationalSearchResult(result, query) {
    navigate(result.target, { search: result.searchTerm || query });
  }

  return (
    <>
      {!user ? (
        authPage === 'register' ? (
          <RegistrationPage onShowLogin={() => setAuthPage('login')} notify={notify} />
        ) : (
          <LoginPage
            onLogin={login}
            onRegister={() => setAuthPage('register')}
            notify={notify}
            initialEmail={rememberedEmail}
          />
        )
      ) : (
        <>
          <WorkspaceLayout
            page={page}
            user={user.name || user.email}
            permissions={user.permissions}
            shipmentCount={workspace.shipments.length}
            navigate={navigate}
            onSearch={searchShipments}
            onSearchResult={openOperationalSearchResult}
            onHelp={() => setHelpOpen(true)}
            onLogout={logout}
            notify={notify}
          >
            <WorkspacePages
              user={user}
              key={`${page}-${searchKey}`}
              page={page}
              workspace={workspace}
              navigate={navigate}
              createPrefill={createPrefill}
              notify={notify}
              onDetails={(shipment) => setDetailId(shipment.id)}
              tableSearch={tableSearch}
              searchKey={searchKey}
              pageSearch={pageSearch}
              dashboardFilter={dashboardFilter}
            />
          </WorkspaceLayout>
          {details && (
            <ShipmentDetailsDrawer shipment={details} onClose={() => setDetailId(null)} />
          )}
        </>
      )}
      {helpOpen && <HelpDialog onClose={() => setHelpOpen(false)} />}
      <Toast message={message} />
    </>
  );
}

