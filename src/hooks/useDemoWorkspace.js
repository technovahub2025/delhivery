import { useCallback, useRef, useState } from 'react';

import { api, unwrap, shipmentPayload } from '../services/api';

import { initialPickups, initialShipments } from '../data/demo';
import useAccountShipments from './useAccountShipments';
import useAccountPickups from './useAccountPickups';
import useSavedWarehouses from './useSavedWarehouses';

// Shared in-memory data belongs to the workspace; page-only form state stays on each page.
export default function useDemoWorkspace(token, user) {
  const generation = useRef(0);
  const session = generation.current;
  const scoped = (setter) => (update) => {
    if (generation.current === session) setter(update);
  };
  const [shipments, setShipments] = useState(initialShipments);
  const {
    warehouses,
    warehouseLoading,
    warehouseError,
    legacyWarehousesDetected,
    reloadWarehouses,
    reset: resetWarehouses,
  } = useSavedWarehouses(token);
  const [pickups, setPickups] = useState(initialPickups);
  const pickupLoad = useAccountPickups(token, setPickups);
  const shipmentLoad = useAccountShipments(token, setShipments);
  const [shipmentDrafts, setShipmentDrafts] = useState([]);

  const loadShipmentDrafts = useCallback(async (query, signal) => {
    const response = query ? await api.shipmentDrafts(signal, query) : await api.shipmentDrafts();
    const result = unwrap(response);
    const drafts = result.drafts || [];
    if (query) return { ...result, drafts };
    if (generation.current === session) setShipmentDrafts(drafts);
    return drafts;
  }, [session]);

  const saveShipmentDraft = async (data, draftId = null) => {
    const body = { formData: data };
    const response = draftId
      ? await api.updateShipmentDraft(draftId, body)
      : await api.createShipmentDraft(body);
    const draft = unwrap(response).draft;
    if (generation.current === session) {
      setShipmentDrafts((rows) => [draft, ...rows.filter((item) => item.id !== draft.id)]);
    }
    return draft;
  };

  const getShipmentDraft = async (id) => {
    const response = await api.shipmentDraft(id);
    return unwrap(response).draft;
  };

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

  async function bookDraftShipment(draftId) {
    const response = await api.bookDraftShipment(draftId);
    const result = unwrap(response);
    const shipment = response.shipment || result.shipment;
    const bookingStatus = shipment?.bookingStatus || result?.bookingStatus || result?.status;
    const awbPending = response?.success === true && Boolean(shipment) && bookingStatus === 'BOOKED_AWB_PENDING';
    if (!shipment?.waybill && !awbPending) throw new Error('The selected courier did not return a confirmed AWB. Check booking status before retrying.');
    const savedShipment = awbPending && shipment.bookingStatus !== 'BOOKED_AWB_PENDING'
      ? { ...shipment, bookingStatus: 'BOOKED_AWB_PENDING' }
      : shipment;
    if (generation.current === session) {
      shipmentLoad.cancel();
      setShipments((list) => [savedShipment, ...list.filter((item) => item.id !== savedShipment.id)]);
      setShipmentDrafts((list) => list.filter((draft) => draft.id !== draftId));
      shipmentLoad.retry();
    }
    // Refresh both server-backed lists after a confirmed booking outcome. A
    // refresh error must not turn a completed booking into a booking error.
    await loadShipmentDrafts().catch(() => {});
    return savedShipment;
  }

  return {
    reset: () => {
      shipmentLoad.cancel();
      pickupLoad.cancel();
      generation.current += 1;
      setShipments([]);
      setShipmentDrafts([]);
      resetWarehouses();
      setPickups([]);
    },
    shipments,
    shipmentLoad,
    setShipments: scoped(setShipments),
    warehouses,
    warehouseLoading,
    warehouseError,
    legacyWarehousesDetected,
    reloadWarehouses,
    pickups,
    pickupLoad,
    setPickups: scoped(setPickups),
    createShipment,
    bookDraftShipment,
    shipmentDrafts,
    loadShipmentDrafts,
    saveShipmentDraft,
    getShipmentDraft,
  };
}

