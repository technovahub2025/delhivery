import { Button, Modal } from '../ui';
export default function TermsDialog({ onClose }) {
  return (
    <Modal title="Account terms" onClose={onClose}>
      <p>
        Registration creates an account. Shipping actions are submitted to the connected shipping
        service. Contact your account administrator for applicable service terms.
      </p>
      <Button onClick={onClose}>Close</Button>
    </Modal>
  );
}
