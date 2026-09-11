import { useCallback, useEffect, useRef, useState } from 'react';

// Simulates a short local action and cancels it when the owning page unmounts.
export default function useDemoAction(delay = 650) {
  const [busy, setBusy] = useState(false);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  const run = useCallback(
    (action) => {
      clearTimeout(timer.current);
      setBusy(true);
      timer.current = setTimeout(() => {
        setBusy(false);
        action();
      }, delay);
    },
    [delay]
  );
  return { busy, run };
}
