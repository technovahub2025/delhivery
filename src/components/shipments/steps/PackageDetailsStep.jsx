import { Package } from 'lucide-react';

import ShipmentFormField from '../ShipmentFormField';

export default function PackageDetailsStep({ data, setData }) {
  function field(label, name, extra = {}) {
    return (
      <ShipmentFormField label={label} name={name} data={data} onChange={setData} {...extra} />
    );
  }
  return (
    <>
      <div className="info-box">
        <Package size={19} />
        Use the packed weight and outer dimensions of your package.
      </div>
      <div className="form-grid">
        {field('Product description', 'description')}
        {field('Quantity', 'quantity', { type: 'number', min: 1, step: 1 })}
        {field('Weight (kg)', 'weight', { type: 'number', min: 0.1, step: 0.1 })}
        {field('Length (cm)', 'length', { type: 'number', min: 1 })}
        {field('Width (cm)', 'width', { type: 'number', min: 1 })}
        {field('Height (cm)', 'height', { type: 'number', min: 1 })}
      </div>
    </>
  );
}
