'use client';

/** Reload button for the server-rendered error screen (server components cannot take onClick). */
export default function TryAgainButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="w-full bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors font-medium"
    >
      Try Again
    </button>
  );
}
