import { CheckCheck } from 'lucide-react';

export default function DeliveryStatusChart({ shipments, stats }) {
  const categories = [
    ['Delivered', stats[2][1], '#31a780'],
    ['In transit', stats[1][1], '#6485c6'],
    ['Pending pickup', stats[3][1], '#f4b555'],
    ['Cancelled', stats[4][1], '#e99494'],
    ['Other', shipments.length - stats.slice(1).reduce((sum, stat) => sum + stat[1], 0), '#9ca3af'],
  ];
  let offset = 0;
  const segments = categories.map(([, count, color]) => {
    const start = offset;
    offset += shipments.length ? count / shipments.length * 100 : 0;
    return `${color} ${start}% ${offset}%`;
  });
  return (
    <section className="card">
      <div className="section-head">
        <div>
          <h2>Delivery overview</h2>
          <p>A pulse on your shipments</p>
        </div>
        <span className="icon-tile">
          <CheckCheck size={18} />
        </span>
      </div>
      <div
        className="donut"
        style={{
          background: !shipments.length
            ? '#edf0f4'
            : `conic-gradient(${segments.join(', ')})`,
        }}
      >
        <div>
          <small>Total shipments</small>
          <strong>{shipments.length}</strong>
        </div>
      </div>
      <div className="status-legend">
        {categories.map(([title, value, color]) => (
          <div key={title}>
            <span>
              <i className="legend-dot" style={{ backgroundColor: color }} />
              {title}
            </span>
            <strong>
              {shipments.length ? Math.round((value / shipments.length) * 100) : 0}
              <small>%</small>
            </strong>
          </div>
        ))}
      </div>
    </section>
  );
}
