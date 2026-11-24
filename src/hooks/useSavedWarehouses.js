import { useCallback, useEffect, useRef, useState } from 'react';
import { api, unwrap } from '../services/api';

const LEGACY_STORAGE_PREFIX = 'delhivery:warehouses:v1:';

export function normalizeWarehouse(record) {
  if (!record || typeof record !== 'object') return null;
  const id = record._id || record.id;
  const details = record.details && typeof record.details === 'object' ? record.details : {};
  if (!id || typeof record.name !== 'string') return null;
  return {
    id: String(id),
    name: record.name,
    address: details.address || '',
    pincode: String(details.pin || details.pincode || ''),
    contact: details.contact_name || details.contact || '',
    registered_name: details.registered_name || '',
    phone: details.phone || '',
    email: details.email || '',
    city: details.city || '',
    state: details.state || '',
    registrationStatus: record.registrationStatus || 'UNVERIFIED',
    updateStatus: record.updateStatus || null,
    lastOperationCode: record.lastOperationCode || '',
  };
}

function hasLegacyWarehouseData() {
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      if (localStorage.key(index)?.startsWith(LEGACY_STORAGE_PREFIX)) return true;
    }
  } catch {
    // Storage availability does not affect the backend warehouse source of truth.
  }
  return false;
}

export default function useSavedWarehouses(token) {
  const generation = useRef(0);
  const [state, setState] = useState({ token: null, records: [], loading: Boolean(token), error: '' });
  const [legacyWarehousesDetected, setLegacyWarehousesDetected] = useState(false);

  const reloadWarehouses = useCallback(async () => {
    const requestGeneration = ++generation.current;
    if (!token) {
      setState({ token: null, records: [], loading: false, error: '' });
      return [];
    }

    setState((current) => ({
      token,
      records: current.token === token ? current.records : [],
      loading: true,
      error: '',
    }));
    try {
      const response = unwrap(await api.getWarehouses());
      if (!Array.isArray(response.warehouses)) throw new Error('The backend returned an invalid warehouse list.');
      const warehouses = response.warehouses.map(normalizeWarehouse);
      if (warehouses.some((warehouse) => !warehouse)) throw new Error('The backend returned an invalid warehouse record.');
      if (generation.current === requestGeneration) setState({ token, records: warehouses, loading: false, error: '' });
      return warehouses;
    } catch (failure) {
      if (generation.current === requestGeneration) {
        setState((current) => ({ token, records: current.token === token ? current.records : [], loading: false, error: failure.message || 'Warehouses could not be loaded.' }));
      }
      throw failure;
    }
  }, [token]);

  useEffect(() => {
    setLegacyWarehousesDetected(hasLegacyWarehouseData());
    reloadWarehouses().catch(() => {});
    return () => { generation.current += 1; };
  }, [reloadWarehouses]);

  const reset = useCallback(() => {
    generation.current += 1;
    setState({ token: null, records: [], loading: false, error: '' });
  }, []);

  return {
    warehouses: state.token === token ? state.records : [],
    warehouseLoading: state.token === token ? state.loading : Boolean(token),
    warehouseError: state.token === token ? state.error : '',
    legacyWarehousesDetected,
    reloadWarehouses,
    reset,
  };
}
