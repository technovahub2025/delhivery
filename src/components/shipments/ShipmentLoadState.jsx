import { Button } from '../ui';

export default function ShipmentLoadState({ load }) {
  if (load.status === 'error')
    return (
      <section className="card" role="alert">
        <h2>Saved shipments unavailable</h2>
        <p>{load.error}</p>
        <p>App shipment totals and charts are unavailable until saved records can be loaded.</p>
        <Button onClick={load.retry}>Retry shipment loading</Button>
      </section>
    );
  return (
    <section className="card" role="status">
      Loading saved shipments…
    </section>
  );
}
