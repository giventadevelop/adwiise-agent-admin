'use client';

type BillingPaginationProps = {
  page: number;
  totalCount: number;
  pageSize: number;
  itemLabel: string;
  onPage: (page: number) => void;
};

export default function BillingPagination({
  page,
  totalCount,
  pageSize,
  itemLabel,
  onPage,
}: BillingPaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const isPrevDisabled = page <= 0;
  const isNextDisabled = page >= totalPages - 1;
  const startItem = totalCount > 0 ? page * pageSize + 1 : 0;
  const endItem = totalCount > 0 ? Math.min(totalCount, page * pageSize + pageSize) : 0;
  const buttonClass =
    'px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg shadow-sm border-2 border-blue-400 hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-md';

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={isPrevDisabled}
          className={buttonClass}
          title="Previous Page"
          aria-label="Previous Page"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Previous</span>
        </button>
        <div className="px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm">
          <span className="text-sm font-bold text-blue-700">
            Page <span className="text-blue-600">{page + 1}</span> of <span className="text-blue-600">{totalPages}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={isNextDisabled}
          className={buttonClass}
          title="Next Page"
          aria-label="Next Page"
        >
          <span>Next</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className="text-center mt-3">
        {totalCount > 0 ? (
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm">
            <span className="text-sm text-gray-700">
              Showing <span className="font-bold text-blue-600">{startItem}</span> to{' '}
              <span className="font-bold text-blue-600">{endItem}</span> of{' '}
              <span className="font-bold text-blue-600">{totalCount}</span> {itemLabel}
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border-2 border-orange-300 rounded-lg shadow-sm">
            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-orange-700">No {itemLabel} found</span>
            <span className="text-sm text-orange-600">[No {itemLabel} match your criteria]</span>
          </div>
        )}
      </div>
    </div>
  );
}
