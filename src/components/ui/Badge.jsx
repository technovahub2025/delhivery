export default function Badge({ children }) {
  return (
    <span className={`badge ${String(children).toLowerCase().replaceAll(' ', '-')}`}>
      <span className="badge-dot" />
      {children}
    </span>
  );
}
