import { Field } from '../ui';

export default function IconField({ label, icon: Icon, children, ...inputProps }) {
  return (
    <Field label={label}>
      <div className="input-icon">
        <Icon size={18} />
        <input {...inputProps} />
        {children}
      </div>
    </Field>
  );
}
