'use client';

/**
 * Full-screen busy modal used by retail Upload day, Refresh brief, and Ask.
 */
export default function RetailBusyDialog({
  titleId,
  title,
  message,
}: {
  titleId: string;
  title: string;
  message: string;
}) {
  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="mx-4 w-full max-w-md rounded-xl border-2 border-blue-300 bg-blue-50 p-8 shadow-xl">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="flex items-center justify-center rounded-full bg-blue-100 p-4">
            <svg className="h-12 w-12 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <h2 id={titleId} className="text-xl font-semibold text-blue-800">
            {title}
          </h2>
          <p className="text-base leading-relaxed text-blue-800">{message}</p>
          <div className="mt-4 h-2 w-full rounded-full bg-blue-200">
            <div className="h-2 w-3/5 animate-pulse rounded-full bg-blue-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
