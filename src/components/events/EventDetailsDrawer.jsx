import { Code2 } from 'lucide-react';

import { Badge, Modal } from '../ui';

export default function EventDetailsDrawer({ selected, setSelected }) {
  return (
    <Modal title="Event details" drawer onClose={() => setSelected(null)}>
      <div className="detail-banner">
        <span className="quick-icon">
          <Code2 size={24} />
        </span>
        <div>
          <h2>{selected.id}</h2>
          <p>shipment.status_updated</p>
        </div>
      </div>
      <Badge>{selected.status}</Badge>
      <h3 className="mt-6">Sample payload</h3>
      <pre className="json-preview">
        {JSON.stringify({ event: 'shipment.status_updated', demo: true, data: selected }, null, 2)}
      </pre>
      <p className="muted">
        Historical mock event. This log does not dispatch or receive network requests.
      </p>
    </Modal>
  );
}
