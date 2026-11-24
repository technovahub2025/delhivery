import { Badge, Modal } from '../ui';

const eventTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata',
});

export function formatEventTime(value) {
  const date = value && new Date(value);
  return date && Number.isFinite(date.getTime()) ? eventTimeFormatter.format(date) + ' IST' : 'Unavailable';
}

export default function EventDetailsDrawer({ selected, setSelected }) {
  return (
    <Modal title="Event details" drawer onClose={() => setSelected(null)}>
      <Badge>{selected.status || 'Unavailable'}</Badge>
      <dl>
        <dt>Waybill</dt><dd>{selected.waybill || 'Unavailable'}</dd>
        <dt>Carrier order reference</dt><dd>{selected.reference || 'Unavailable'}</dd>
        <dt>Scanned</dt><dd>{formatEventTime(selected.occurredAt)}</dd>
        <dt>Received</dt><dd>{formatEventTime(selected.receivedAt)}</dd>
        <dt>Location</dt><dd>{selected.location || 'Unavailable'}</dd>
        <dt>Carrier status code</dt><dd>{selected.statusCode || 'Unavailable'}</dd>
        <dt>Carrier status type</dt><dd>{selected.statusType || 'Unavailable'}</dd>
      </dl>
      {selected.description && <p>{selected.description}</p>}
    </Modal>
  );
}
