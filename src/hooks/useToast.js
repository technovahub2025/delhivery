import { useCallback, useEffect, useRef, useState } from 'react';

export default function useToast() {
  const [message, setMessage] = useState('');
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  const notify = useCallback((text) => {
    setMessage(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(''), 4500);
  }, []);
  return { message, notify };
}
