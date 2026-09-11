import { Check } from 'lucide-react';

export default function Toast({ message }) {
  return message ? (
    <div className="toast" role="status">
      <span>
        <Check size={17} />
      </span>
      {message}
    </div>
  ) : null;
}
