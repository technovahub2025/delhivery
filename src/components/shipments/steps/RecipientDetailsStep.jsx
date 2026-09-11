import ShipmentFormField from '../ShipmentFormField';

export default function RecipientDetailsStep({ data, setData }) {
  function field(label, name, extra = {}) {
    return (
      <ShipmentFormField label={label} name={name} data={data} onChange={setData} {...extra} />
    );
  }
  return (
    <>
      <div className="form-grid">
        {field('Full name', 'customer')}
        {field('Email address', 'email', { type: 'email' })}
        {field('Phone number', 'phone', {
          pattern: '[0-9]{10}',
          title: 'Enter a 10-digit phone number',
        })}
        {field('Pincode', 'pincode', {
          pattern: '[1-9][0-9]{5}',
          title: 'Enter a 6-digit pincode',
        })}
      </div>
      {field('Full address', 'address')}
      {field('City', 'destination')}
      {field('State', 'state')}
      {field('Order reference', 'reference')}
    </>
  );
}
