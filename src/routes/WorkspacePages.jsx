import DashboardPage from '../pages/dashboard/DashboardPage';
import ShippingDocumentsPage from '../pages/documents/ShippingDocumentsPage';
import WebhookEventsPage from '../pages/events/WebhookEventsPage';
import PickupRequestsPage from '../pages/pickups/PickupRequestsPage';
import CreateShipmentPage from '../pages/shipments/CreateShipmentPage';
import ShipmentsPage from '../pages/shipments/ShipmentsPage';
import DeliveryEstimatePage from '../pages/shipping/DeliveryEstimatePage';
import PincodeServiceabilityPage from '../pages/shipping/PincodeServiceabilityPage';
import ShippingCalculatorPage from '../pages/shipping/ShippingCalculatorPage';
import ShipmentTrackingPage from '../pages/tracking/ShipmentTrackingPage';
import WarehousesPage from '../pages/warehouses/WarehousesPage';
import WaybillManagementPage from '../pages/waybills/WaybillManagementPage';

export default function WorkspacePages({
  page,
  workspace,
  navigate,
  notify,
  onDetails,
  tableSearch,
  searchKey,
}) {
  const { shipments, setShipments, warehouses, setWarehouses, pickups, setPickups } = workspace;
  switch (page) {
    case 'shipments':
      return (
        <ShipmentsPage
          key={searchKey}
          shipments={shipments}
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
          navigate={navigate}
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
      return <ShippingCalculatorPage />;
    case 'waybills':
      return <WaybillManagementPage notify={notify} />;
    case 'documents':
      return <ShippingDocumentsPage shipments={shipments} notify={notify} />;
    case 'warehouses':
      return (
        <WarehousesPage warehouses={warehouses} setWarehouses={setWarehouses} notify={notify} />
      );
    case 'events':
      return <WebhookEventsPage />;
    default:
      return <DashboardPage shipments={shipments} navigate={navigate} onDetails={onDetails} />;
  }
}
