import DashboardPage from '../pages/dashboard/DashboardPage';
import ReportsPage from '../pages/reports/ReportsPage';
import FinancePage from '../pages/finance/FinancePage';
import ShippingDocumentsPage from '../pages/documents/ShippingDocumentsPage';
import WebhookEventsPage from '../pages/events/WebhookEventsPage';
import PickupRequestsPage from '../pages/pickups/PickupRequestsPage';
import CreateShipmentPage from '../pages/shipments/CreateShipmentPage';
import ShipmentsPage from '../pages/shipments/ShipmentsPage';
import ReverseOrdersPage from '../pages/shipments/ReverseOrdersPage';
import NdrManagementPage from '../pages/shipments/NdrManagementPage';
import ExceptionsPage from '../pages/shipments/ExceptionsPage';
import DeliveryEstimatePage from '../pages/shipping/DeliveryEstimatePage';
import PincodeServiceabilityPage from '../pages/shipping/PincodeServiceabilityPage';
import ShippingCalculatorPage from '../pages/shipping/ShippingCalculatorPage';
import ShipmentTrackingPage from '../pages/tracking/ShipmentTrackingPage';
import WarehousesPage from '../pages/warehouses/WarehousesPage';
import WaybillManagementPage from '../pages/waybills/WaybillManagementPage';
import ShipmentLoadState from '../components/shipments/ShipmentLoadState';

export default function WorkspacePages({
  page,
  workspace,
  navigate,
  createPrefill,
  notify,
  onDetails,
  tableSearch,
  searchKey,
}) {
  const { shipments, setShipments, warehouses, setWarehouses, pickups, setPickups } = workspace;
  if (page === 'shipments' && !shipments.length && workspace.shipmentLoad.status !== 'success') {
    return <ShipmentLoadState load={workspace.shipmentLoad} />;
  }
  switch (page) {
    case 'reports':
      return <ReportsPage />;
    case 'finance':
      return <FinancePage />;
    case 'ndr':
      return <NdrManagementPage />;
    case 'exceptions':
      return <ExceptionsPage />;
    case 'reverseOrders':
      return <ReverseOrdersPage notify={notify} />;
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
          onDetails={onDetails}
        />
      );
    case 'create':
      return (
        <CreateShipmentPage
          warehouses={warehouses}
          setWarehouses={setWarehouses}
          notify={notify}
          navigate={navigate}
          prefill={createPrefill}
          onCreate={async (data) => {
            const shipment = await workspace.createShipment(data);
            notify('Shipment created successfully.');
            return shipment;
          }}
        />
      );
    case 'tracking':
      return <ShipmentTrackingPage shipments={shipments} />;
    case 'pickups':
      return (
        <PickupRequestsPage
          pickups={pickups}
          pickupLoad={workspace.pickupLoad}
          setPickups={setPickups}
          onCreated={workspace.pickupLoad.retry}
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
      return <WaybillManagementPage notify={notify} />;
    case 'documents':
      return <ShippingDocumentsPage shipments={shipments} notify={notify} />;
    case 'warehouses':
      return (
        <WarehousesPage
          warehouses={warehouses}
          setWarehouses={setWarehouses}
          notify={notify}
          error={workspace.warehouseError}
        />
      );
    case 'events':
      return <WebhookEventsPage />;
    default:
      return (
        <DashboardPage
          shipments={shipments}
          load={workspace.shipmentLoad}
          navigate={navigate}
          onDetails={onDetails}
        />
      );
  }
}










