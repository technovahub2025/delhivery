import { ArrowRight, Check } from 'lucide-react';

import { Badge, Button } from '../ui';

export default function ShipmentCreatedConfirmation({ created, navigate }) {
  const awbPending = created.bookingStatus === 'BOOKED_AWB_PENDING';
  const mockOnly = created.mockOnly === true || created.providerCode === 'MOCK_LOCAL';

  return (
    <section className="card creation-success">
      <span className="big-success">
        <Check size={34} />
      </span>
      <div className="eyebrow text-orange">{awbPending ? 'BOOKING SAVED' : 'READY FOR THE NEXT MILE'}</div>
      <h1>{awbPending ? (mockOnly ? 'Mock booking saved.' : 'Booking saved.') : mockOnly ? 'Sample shipment saved.' : 'Your shipment is ready.'}</h1>
      {awbPending ? (
        <p role="status">{mockOnly ? 'The mock booking was saved successfully.' : 'The booking was saved successfully.'} AWB generation is pending. No AWB has been generated.</p>
      ) : (
        <>
          <p>{created.id} has been created for {created.customer}.</p>
          {created.sampleWaybill && <p role="status">Sample AWB. No carrier booking was made.</p>}
          <Badge>Pending pickup</Badge>
          <p className="muted">{created.providerOutcome === 'PROVIDER_CONFIRMED' ? 'The provider confirmed the booking and returned an AWB.' : 'Shipment status is recorded locally.'}</p>
        </>
      )}
      {!awbPending && <Button type="button" variant="secondary" onClick={() => navigate('documents')}>{mockOnly ? 'Open sample labels' : 'Open shipping labels'}</Button>}
      <Button onClick={() => navigate('shipments')}>
        View shipments
        <ArrowRight size={17} />
      </Button>
    </section>
  );
}
