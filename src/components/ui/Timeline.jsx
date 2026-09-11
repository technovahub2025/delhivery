import { Check } from 'lucide-react';

export default function Timeline({ items }) {
  return (
    <div className="timeline">
      {items.map((t, i) => (
        <div
          key={t.title}
          className={`timeline-item ${t.done ? 'done' : ''} ${t.current ? 'current' : ''}`}
        >
          <span className="timeline-dot">{t.done ? <Check size={12} /> : null}</span>
          <strong>{t.title}</strong>
          <p>{t.location}</p>
          <small>{t.done ? `${t.date} · ${t.time}` : 'Awaiting update'}</small>
        </div>
      ))}
    </div>
  );
}
