import { CheckCheck } from 'lucide-react';

export default function DeliveryStatusChart({ shipments, stats }) {
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
            : `conic-gradient(#31a780 0 ${(stats[2][1] / shipments.length) * 100}%, #6485c6 ${(stats[2][1] / shipments.length) * 100}% ${((stats[2][1] + stats[1][1]) / shipments.length) * 100}%, #f4b555 ${((stats[2][1] + stats[1][1]) / shipments.length) * 100}% ${((shipments.length - stats[4][1]) / shipments.length) * 100}%, #e99494 0)`,
        }}
      >
        <div>
          <small>Total shipments</small>
          <strong>{shipments.length}</strong>
        </div>
      </div>
      <div className="status-legend">
        {stats.slice(1).map(([title, value, , color]) => (
          <div key={title}>
            <span>
              <i className={`legend-dot ${color}`} />
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
