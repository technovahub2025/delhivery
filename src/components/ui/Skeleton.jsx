import { LoaderCircle } from 'lucide-react';

export default function Skeleton() {
  return (
    <div aria-label="Loading preview" role="status" className="skeletons">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="skeleton" />
      ))}
      <span className="sr-only">
        <LoaderCircle />
        Loading
      </span>
    </div>
  );
}
