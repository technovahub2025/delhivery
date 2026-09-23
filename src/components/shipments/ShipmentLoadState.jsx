import { Button } from '../ui';

export default function ShipmentLoadState({ load }) {
  if (load.status === 'error')
    return (
      <section className="card" role="alert">
        <h2>Account shipments unavailable</h2>
        <p>{load.error}</p>
        <p>Account totals and charts are unavailable until shipments can be loaded.</p>
        <Button onClick={load.retry}>Retry shipment loading</Button>
      </section>
    );
  return (
    <section className="card" role="status">
      Loading account shipments…
    </section>
  );
}
