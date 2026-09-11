export default function ShipmentStats({ stats, navigate }) {
  return (
    <div className="stats-grid">
      {stats.map(([title, value, Icon, color]) => (
        <button key={title} className="stat-card" onClick={() => navigate('shipments')}>
          <div className="stat-top">
            <span>{title}</span>
            <span className={`stat-icon ${color}`}>
              <Icon size={18} />
            </span>
          </div>
          <strong>{value}</strong>
        </button>
      ))}
    </div>
  );
}
