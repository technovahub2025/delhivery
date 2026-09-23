import { useRef, useState } from 'react';

import { api, unwrap, shipmentPayload } from '../services/api';

import { initialPickups, initialShipments } from '../data/demo';
import useAccountShipments from './useAccountShipments';
import useSavedWarehouses from './useSavedWarehouses';

// Shared in-memory data belongs to the workspace; page-only form state stays on each page.
export default function useDemoWorkspace(token, user) {
  const generation = useRef(0);
  const session = generation.current;
  const scoped = (setter) => (update) => {
    if (generation.current === session) setter(update);
  };
  const [shipments, setShipments] = useState(initialShipments);
  const { warehouses, setWarehouses, warehouseError, reset: resetWarehouses } = useSavedWarehouses(user);
  const [pickups, setPickups] = useState(initialPickups);
  const shipmentLoad = useAccountShipments(token, setShipments);

  async function createShipment(data) {
    const response = await api.createShipment(shipmentPayload(data));
    const result = unwrap(response);
    const parcel = result.packages?.[0] || result;
    const waybill = parcel.waybill || parcel.wbn || parcel.AWB;
    if (!waybill)
      throw new Error(
        'The response did not include a waybill. Check your order in the shipping service before submitting again.'
      );
    const shipment = response.shipment || {
      ...data,
      id: String(waybill),
      date: new Date().toLocaleDateString('en-CA'),
      history: [
        {
          title: 'Shipment created',
          location: data.warehouse,
          date: new Date().toLocaleDateString('en-IN'),
          time: new Date().toLocaleTimeString('en-IN'),
          done: true,
          current: true,
        },
      ],
      status: 'Pending pickup',
      ewaybill: '',
    };
    if (generation.current === session) {
      // Prevent an older in-flight list request from erasing the newly saved shipment.
      shipmentLoad.cancel();
      setShipments((list) => [shipment, ...list.filter((item) => item.id !== shipment.id)]);
      if (shipmentLoad.status !== 'success') shipmentLoad.retry();
    }
    return shipment;
  }

  return {
    reset: () => {
      shipmentLoad.cancel();
      generation.current += 1;
      setShipments([]);
      resetWarehouses();
      setPickups([]);
    },
    shipments,
    shipmentLoad,
    setShipments: scoped(setShipments),
    warehouses,
    warehouseError,
    setWarehouses: scoped(setWarehouses),
    pickups,
    setPickups: scoped(setPickups),
    createShipment,
  };
}
