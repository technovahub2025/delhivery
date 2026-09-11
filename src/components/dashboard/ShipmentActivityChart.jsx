import { Empty } from '../ui';

export default function ShipmentActivityChart({ shipments, period, setPeriod }) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - (period === 'Last week' ? 7 : 0));
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    const key = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
    return {
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      count: shipments.filter((s) => s.date === key).length,
    };
  });
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const max = Math.max(4, ...days.map((day) => day.count));
  const points = days
    .map((day, i) => [i * 100 + 10, 158 - (day.count / max) * 148].join(','))
    .join(' ');
  return (
    <section className="card trend-card">
      <div className="section-head">
        <div>
          <h2>Shipment activity</h2>
          <p>Shipments created each day</p>
        </div>
        <select
          aria-label="Chart period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option>This week</option>
          <option>Last week</option>
        </select>
      </div>
      {total ? (
        <>
          <div className="chart-legend">
            <span>
              <i className="legend-dot bg-orange" />
              Shipments
            </span>
          </div>
          <div className="line-chart">
            <div className="chart-y">
              {[1, 0.75, 0.5, 0.25, 0].map((fraction) => (
                <span key={fraction}>{Math.round(max * fraction)}</span>
              ))}
            </div>
            <svg
              viewBox="0 0 620 170"
              preserveAspectRatio="none"
              role="img"
              aria-label={
                period + ' shipments: ' + days.map((day) => day.label + ' ' + day.count).join(', ')
              }
            >
              {[10, 47, 84, 121, 158].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="620"
                  y2={y}
                  stroke="#edf0f4"
                  strokeDasharray="4 5"
                />
              ))}
              <polyline points={points} fill="none" stroke="#f47735" strokeWidth="3" />
            </svg>
            <div className="chart-x">
              {days.map((day) => (
                <span key={day.label}>{day.label}</span>
              ))}
            </div>
          </div>
        </>
      ) : (
        <Empty
          title="No shipment activity"
          description="Shipments created during this period will appear here."
        />
      )}
    </section>
  );
}
