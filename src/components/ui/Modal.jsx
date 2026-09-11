import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

export default function Modal({ title, children, onClose, drawer = false }) {
  const ref = useRef();
  useEffect(() => {
    const before = document.activeElement;
    const el = ref.current;
    el.focus();
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const items = el.querySelectorAll('button,input,select,a,textarea,[tabindex="0"]');
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = prev;
      before?.focus();
    };
  }, [onClose]);
  return (
    <div
      className={`overlay ${drawer ? 'drawer-overlay' : ''}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${drawer ? 'drawer' : ''}`}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
