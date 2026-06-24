import './styles/ApartmentPagination.css';

function rangeAround(page, totalPages, width = 5) {
  if (totalPages <= width) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const half = Math.floor(width / 2);
  let start = Math.max(1, page - half);
  let end = Math.min(totalPages, start + width - 1);
  start = Math.max(1, end - width + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * עימוד לרשימת דירות — עברית RTL.
 */
function ApartmentPagination({
  page,
  totalPages,
  total,
  limit,
  loading,
  onPageChange,
}) {
  if (totalPages <= 1 && total <= limit) return null;

  const pages = rangeAround(page, totalPages, 7);
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <nav className="apartment-pagination" aria-label="עימוד רשימת דירות">
      <p className="apartment-pagination-summary">
        מציג <strong>{from}</strong>–<strong>{to}</strong> מתוך <strong>{total}</strong> דירות
      </p>
      <div className="apartment-pagination-controls">
        <button
          type="button"
          className="apartment-pagination-btn"
          disabled={loading || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          הקודם
        </button>
        <ul className="apartment-pagination-pages">
          {pages[0] > 1 && (
            <>
              <li>
                <button
                  type="button"
                  className={page === 1 ? 'is-current' : ''}
                  disabled={loading}
                  onClick={() => onPageChange(1)}
                >
                  1
                </button>
              </li>
              {pages[0] > 2 && <li className="ellipsis">…</li>}
            </>
          )}
          {pages.map((p) => (
            <li key={p}>
              <button
                type="button"
                className={p === page ? 'is-current' : ''}
                disabled={loading}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            </li>
          ))}
          {pages[pages.length - 1] < totalPages && (
            <>
              {pages[pages.length - 1] < totalPages - 1 && (
                <li className="ellipsis">…</li>
              )}
              <li>
                <button
                  type="button"
                  className={page === totalPages ? 'is-current' : ''}
                  disabled={loading}
                  onClick={() => onPageChange(totalPages)}
                >
                  {totalPages}
                </button>
              </li>
            </>
          )}
        </ul>
        <button
          type="button"
          className="apartment-pagination-btn"
          disabled={loading || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          הבא
        </button>
      </div>
    </nav>
  );
}

export default ApartmentPagination;
