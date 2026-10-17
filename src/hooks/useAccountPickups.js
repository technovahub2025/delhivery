import { useCallback, useEffect, useRef, useState } from 'react';
import { api, unwrap } from '../services/api';

export default function useAccountPickups(token, setPickups) {
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
      setPickups([]);
      setState({ status: 'idle', error: '' });
      return undefined;
    }

    const controller = new AbortController();
    active.current = controller;
    setState({ status: 'loading', error: '' });

    async function load() {
      try {
        const response = unwrap(await api.pickups(controller.signal));

        if (controller.signal.aborted) return;

        if (
          !Array.isArray(response?.pickups) ||
          !Number.isSafeInteger(response.total) ||
          response.total < 0 ||
          response.total !== response.pickups.length ||
          response.total > 200
        ) {
          throw new Error(
            'The backend returned an invalid pickup list. Please retry.'
          );
        }

        const ids = new Set();

        const records = response.pickups.map((pickup) => {
          if (
            !pickup ||
            typeof pickup.id !== 'string' ||
            !pickup.id ||
            ids.has(pickup.id) ||
            typeof pickup.warehouse !== 'string' ||
            typeof pickup.date !== 'string' ||
            typeof pickup.time !== 'string' ||
            !Number.isFinite(Number(pickup.count)) ||
            Number(pickup.count) < 1 ||
            typeof pickup.status !== 'string'
          ) {
            throw new Error(
              'The backend returned invalid or duplicate pickup records. Please retry.'
            );
          }

          ids.add(pickup.id);
          return { ...pickup, count: Number(pickup.count) };
        });

        if (!controller.signal.aborted) {
          setPickups(records);
          setState({ status: 'success', error: '' });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            error: error?.message || 'Could not load pickup requests.'
          });
        }
      }
    }

    load();

    return () => controller.abort();
  }, [token, attempt, cancel, setPickups]);

  return {
    ...state,
    cancel,
    retry: () => setAttempt((value) => value + 1)
  };
}

