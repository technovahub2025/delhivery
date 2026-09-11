import { Button, Modal } from '../ui';
export default function HelpDialog({ onClose }) {
  return (
    <Modal title="Your shipping workspace" onClose={onClose}>
      <p>
        Add a warehouse and create shipments, or use a waybill to track existing shipments and
        retrieve documents.
      </p>
      <p>
        Lists show records added in this session. Refreshing or logging out clears these lists; it
        does not delete records from the shipping service.
      </p>
      <p>Webhook history and password resets are not available yet.</p>
      <Button onClick={onClose}>Close</Button>
    </Modal>
  );
}
