import { useCallback, useEffect, useRef, useState } from 'react';
import { api, unwrap } from '../services/api';

// Publish only a complete list of saved app-created shipments for this login.
export default function useAccountShipments(token, setShipments) {
  const active = useRef(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ status: 'idle', error: '' });
  const cancel = useCallback(() => {
    active.current?.abort();
    active.current = null;
  }, []);

  useEffect(() => {
    cancel();
    if (!token) {
      setState({ status: 'idle', error: '' });
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setState({ status: 'loading', error: '' });
    async function load() {
      try {
        const records = [];
        const ids = new Set();
        let total;
        for (let page = 1; ; page += 1) {
          const data = unwrap(await api.shipments({ page, limit: 100 }, controller.signal));
          if (controller.signal.aborted) return;
          if (
            !Array.isArray(data?.shipments) ||
            !Number.isSafeInteger(data.total) ||
            data.total < 0 ||
            data.page !== page ||
            data.limit !== 100 ||
            (total !== undefined && total !== data.total)
          ) {
            throw new Error(
              'The backend returned an invalid or changing shipment list. Please retry.'
            );
          }
          total = data.total;
          for (const shipment of data.shipments) {
            if (
              typeof shipment.id !== 'string' ||
              !shipment.id ||
              ids.has(shipment.id) ||
              typeof shipment.status !== 'string' ||
              typeof shipment.date !== 'string'
            ) {
              throw new Error(
                'The backend returned invalid or duplicate shipment records. Please retry.'
              );
            }
            ids.add(shipment.id);
            records.push(shipment);
          }
          if (
            records.length > total ||
            data.shipments.length > 100 ||
            (records.length < total && data.shipments.length === 0)
          ) {
            throw new Error('The backend returned an incomplete shipment list. Please retry.');
          }
          if (records.length === total) break;
        }
        if (!controller.signal.aborted) {
          records.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
          setShipments(records);
          setState({ status: 'success', error: '' });
        }
      } catch (error) {
        if (!controller.signal.aborted) setState({ status: 'error', error: error.message });
      }
    }
    load();
    return () => controller.abort();
  }, [token, attempt, cancel, setShipments]);

  return { ...state, cancel, retry: () => setAttempt((value) => value + 1) };
}
