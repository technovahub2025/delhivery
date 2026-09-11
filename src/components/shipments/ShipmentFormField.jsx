import { Field } from '../ui';

export default function ShipmentFormField({ label, name, data, onChange, ...props }) {
  return (
    <Field
      label={label}
      name={name}
      value={data[name]}
      onChange={(event) => onChange((draft) => ({ ...draft, [name]: event.target.value }))}
      required
      {...props}
    />
  );
}
