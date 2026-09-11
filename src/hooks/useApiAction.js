import { useRef, useState } from 'react';

export default function useApiAction() {
  const active = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run(action) {
    if (active.current) return;
    active.current = true;
    setBusy(true);
    setError('');
    try {
      return await action();
    } catch (failure) {
      setError(failure.message || 'Request failed. Please try again.');
    } finally {
      active.current = false;
      setBusy(false);
    }
  }
  return { busy, error, run };
}
