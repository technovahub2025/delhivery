import { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../services/api';

// The backend has no warehouse list endpoint. Keep accepted records per account/browser.
export default function useSavedWarehouses(user) {
  const account = user?.id || user?._id || user?.email?.trim().toLowerCase();
  const key = account ? `delhivery:warehouses:v1:${API_BASE_URL}:${account}` : null;
  const current = useRef({ key: null, records: [] });
  const [state, setState] = useState({ key: null, records: [], error: '' });

  useEffect(() => {
    let records = [];
    let error = '';
    if (key) {
      try {
        const saved = JSON.parse(localStorage.getItem(key) || '[]');
        if (!Array.isArray(saved) || saved.some((w) => !w || !w.id || typeof w.name !== 'string'))
          throw new Error('Invalid warehouse cache');
        records = saved;
      } catch {
        error = 'Saved warehouses could not be loaded from this browser.';
      }
    }
    current.current = { key, records };
    setState({ key, records, error });
    return () => {
      current.current = { key: null, records: [] };
    };
  }, [key]);

  function setWarehouses(update) {
    if (!key || current.current.key !== key) return;
    const records = typeof update === 'function' ? update(current.current.records) : update;
    let error = '';
    try {
      localStorage.setItem(key, JSON.stringify(records));
    } catch {
      error = 'Warehouse saved with the shipping service, but this browser could not remember it. It may disappear after a refresh.';
    }
    current.current = { key, records };
    setState({ key, records, error });
  }

  function reset() {
    current.current = { key: null, records: [] };
    setState({ key: null, records: [], error: '' });
  }

  return {
    warehouses: state.key === key ? state.records : [],
    warehouseError: state.key === key ? state.error : '',
    setWarehouses,
    reset,
  };
}
