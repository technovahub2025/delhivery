import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  itemLabel = 'shipments',
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="pagination">
      <span>
        Showing {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} of{' '}
        {total} {itemLabel}
      </span>
      <div>
        <button
          className="icon-btn"
          disabled={page === 1}
          aria-label="Previous page"
          onClick={() => onPageChange(page - 1)}
        >
          <ArrowLeft size={16} />
        </button>
        {Array.from({ length: pages }, (_, i) => (
          <button
            className={`page-number ${page === i + 1 ? 'active' : ''}`}
            aria-current={page === i + 1 ? 'page' : undefined}
            key={i}
            onClick={() => onPageChange(i + 1)}
          >
            {i + 1}
          </button>
        ))}
        <button
          className="icon-btn"
          disabled={page === pages}
          aria-label="Next page"
          onClick={() => onPageChange(page + 1)}
        >
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
