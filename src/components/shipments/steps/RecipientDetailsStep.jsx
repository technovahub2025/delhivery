import { Field } from '../../ui';
import ShipmentFormField from '../ShipmentFormField';

export default function RecipientDetailsStep({ data, setData }) {
  return <>
    <p className="muted">Add the delivery recipient. Selecting a saved consignee fills these editable fields.</p>
    <div className="form-grid">
      <ShipmentFormField label="Full name" name="customer" data={data} onChange={setData} />
      <Field label="Company name"><input value={data.consigneeCompanyName || ''} onChange={(event) => setData((draft) => ({ ...draft, consigneeCompanyName: event.target.value }))} /></Field>
      <ShipmentFormField label="Email address" name="email" data={data} onChange={setData} type="email" />
      <ShipmentFormField label="Mobile number" name="phone" data={data} onChange={setData} type="tel" pattern="[0-9]{10}" title="Enter a 10-digit phone number" />
      <ShipmentFormField label="Full address" name="address" data={data} onChange={setData} />
      <Field label="GSTIN"><input value={data.consigneeGstin || ''} onChange={(event) => setData((draft) => ({ ...draft, consigneeGstin: event.target.value }))} maxLength={15} /></Field>
    </div>
  </>;
}
