import { Package } from 'lucide-react';

export default function Empty({
  title = 'No shipments found',
  description = 'Try adjusting your search or filters.',
}) {
  return (
    <div className="empty">
      <Package size={34} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
