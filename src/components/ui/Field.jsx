export default function Field({ label, error, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input {...props} />}
      {error && <small className="error">{error}</small>}
    </label>
  );
}
