import DashboardPage from '../pages/dashboard/DashboardPage';
import ReportsPage from '../pages/reports/ReportsPage';
import FinancePage from '../pages/finance/FinancePage';
import ShippingDocumentsPage from '../pages/documents/ShippingDocumentsPage';
import BusinessAuditPage from '../pages/events/BusinessAuditPage';
import WebhookEventsPage from '../pages/events/WebhookEventsPage';
import PickupRequestsPage from '../pages/pickups/PickupRequestsPage';
import CreateShipmentPage from '../pages/shipments/CreateShipmentPage';
import ShipmentsPage from '../pages/shipments/ShipmentsPage';
import ReverseOrdersPage from '../pages/shipments/ReverseOrdersPage';
import NdrManagementPage from '../pages/shipments/NdrManagementPage';
import RtoManagementPage from '../pages/shipments/RtoManagementPage';
import ExceptionsPage from '../pages/shipments/ExceptionsPage';
import DeliveryEstimatePage from '../pages/shipping/DeliveryEstimatePage';
import PincodeServiceabilityPage from '../pages/shipping/PincodeServiceabilityPage';
import ShippingCalculatorPage from '../pages/shipping/ShippingCalculatorPage';
import ShipmentTrackingPage from '../pages/tracking/ShipmentTrackingPage';
import WarehousesPage from '../pages/warehouses/WarehousesPage';
import WaybillManagementPage from '../pages/waybills/WaybillManagementPage';
import RoleAdministrationPage from '../pages/admin/RoleAdministrationPage';
import CustomersPage from '../pages/customers/CustomersPage';
import SavedPartyAddressesPage from '../pages/partyAddresses/SavedPartyAddressesPage';
import RateCardsPage from '../pages/rates/RateCardsPage';
import ShipmentLoadState from '../components/shipments/ShipmentLoadState';

export default function WorkspacePages({
  page,
  workspace,
  user,
  navigate,
  createPrefill,
  notify,
  onDetails,
  tableSearch,
  searchKey,
  dashboardFilter,
  pageSearch = '',
}) {
  const { shipments, setShipments, warehouses, pickups, setPickups } = workspace;
  if (page === 'shipments' && !shipments.length && workspace.shipmentLoad.status !== 'success') {
    return <ShipmentLoadState load={workspace.shipmentLoad} />;
  }
  switch (page) {
    case 'roleAdmin':
      return <RoleAdministrationPage permissions={user?.permissions} />;
    case 'customers':
      return <CustomersPage notify={notify} initialSearch={pageSearch} />;
    case 'partyAddresses':
      return <SavedPartyAddressesPage notify={notify} initialSearch={pageSearch} />;
    case 'rateCards':
      return <RateCardsPage notify={notify} />;
    case 'reports':
      return <ReportsPage />;
    case 'finance':
      return <FinancePage />;
    case 'ndr':
      return <NdrManagementPage dashboardFilter={dashboardFilter} initialSearch={pageSearch} />;
    case 'rto':
      return <RtoManagementPage dashboardFilter={dashboardFilter} initialSearch={pageSearch} />;
    case 'exceptions':
      return <ExceptionsPage />;
    case 'reverseOrders':
      return <ReverseOrdersPage notify={notify} warehouses={warehouses} />;
    case 'shipments':
      return (
        <ShipmentsPage
          key={searchKey}
          shipments={shipments}
          load={workspace.shipmentLoad}
          setShipments={setShipments}
          navigate={navigate}
          notify={notify}
          initialSearch={tableSearch}
          dashboardFilter={dashboardFilter}
          onDetails={onDetails}
        />
      );
    case 'create':
      return (
        <CreateShipmentPage
          warehouses={warehouses}
          warehouseLoading={workspace.warehouseLoading}
          reloadWarehouses={workspace.reloadWarehouses}
          notify={notify}
          navigate={navigate}
          prefill={createPrefill}
          onCreate={async (data) => {
            const shipment = await workspace.createShipment(data);
            notify('Shipment created successfully.');
            return shipment;
          }}
          dashboardFilter={dashboardFilter}
          drafts={workspace.shipmentDrafts}
          onLoadDrafts={workspace.loadShipmentDrafts}
          onSaveDraft={workspace.saveShipmentDraft}
          onBookDraft={workspace.bookDraftShipment}
        />
      );
    case 'tracking':
      return <ShipmentTrackingPage shipments={shipments} initialSearch={pageSearch} />;
    case 'pickups':
      return (
        <PickupRequestsPage
          pickups={pickups}
          shipments={shipments}
          pickupLoad={workspace.pickupLoad}
          initialSearch={pageSearch}
          dashboardFilter={dashboardFilter}
          setPickups={setPickups}
          warehouses={warehouses}
          notify={notify}
        />
      );
    case 'pincode':
      return <PincodeServiceabilityPage />;
    case 'estimate':
      return <DeliveryEstimatePage />;
    case 'calculator':
      return <ShippingCalculatorPage navigate={navigate} />;
    case 'waybills':
      return <WaybillManagementPage notify={notify} accountKey={user?.id || user?.email} />;
    case 'documents':
      return <ShippingDocumentsPage shipments={shipments} notify={notify} initialSearch={pageSearch} />;
    case 'warehouses':
      return (
        <WarehousesPage
          warehouses={warehouses}
          notify={notify}
          error={workspace.warehouseError}
          loading={workspace.warehouseLoading}
          legacyWarehousesDetected={workspace.legacyWarehousesDetected}
          reloadWarehouses={workspace.reloadWarehouses}
        />
      );
    case 'audit':
      return <BusinessAuditPage />;
    case 'events':
      return <WebhookEventsPage />;
    default:
      return (
        <DashboardPage
          shipments={shipments}
          load={workspace.shipmentLoad}
          navigate={navigate}
          onDetails={onDetails}
          dashboardFilter={dashboardFilter}
        />
      );
  }
}










