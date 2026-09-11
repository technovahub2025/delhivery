import { Button, Modal } from '../ui';
export default function ForgotPasswordDialog({ onClose }) {
  return (
    <Modal title="Reset your password" onClose={onClose}>
      <p>Password reset is not available yet. Contact your account administrator for help.</p>
      <Button onClick={onClose}>Close</Button>
    </Modal>
  );
}
