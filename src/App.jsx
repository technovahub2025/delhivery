import { useState } from 'react';
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

export default function App() {
  const [user, setUser] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  const [rememberedEmail, setRememberedEmail] = useState('');
  const [authPage, setAuthPage] = useState('login');
  const [page, setPage] = useState('dashboard');
  const [helpOpen, setHelpOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [tableSearch, setTableSearch] = useState('');
  const [searchKey, setSearchKey] = useState(0);
  const workspace = useDemoWorkspace(sessionToken, user);
  const { message, notify } = useToast();
  const details = workspace.shipments.find((shipment) => shipment.id === detailId);

  function navigate(next) {
    setPage(next);
    if (next === 'shipments') setTableSearch('');
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
            shipmentCount={workspace.shipments.length}
            navigate={navigate}
            onSearch={searchShipments}
            onHelp={() => setHelpOpen(true)}
            onLogout={logout}
            notify={notify}
          >
            <WorkspacePages
              page={page}
              workspace={workspace}
              navigate={navigate}
              notify={notify}
              onDetails={(shipment) => setDetailId(shipment.id)}
              tableSearch={tableSearch}
              searchKey={searchKey}
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
