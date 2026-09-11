import { ArrowRight, Check } from 'lucide-react';

import { Badge, Button } from '../ui';

export default function ShipmentCreatedConfirmation({ created, navigate }) {
  return (
    <section className="card creation-success">
      <span className="big-success">
        <Check size={34} />
      </span>
      <div className="eyebrow text-orange">READY FOR THE NEXT MILE</div>
      <h1>Your shipment is ready.</h1>
      <p>
        {created.id} has been created for {created.customer}.
      </p>
      <Badge>Pending pickup</Badge>
      <p className="muted">Your shipment was accepted by the shipping service.</p>
      <Button onClick={() => navigate('shipments')}>
        View shipments
        <ArrowRight size={17} />
      </Button>
    </section>
  );
}
