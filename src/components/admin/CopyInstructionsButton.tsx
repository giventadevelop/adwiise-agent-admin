'use client';

import { useState } from 'react';

interface CopyInstructionsButtonProps {
  text: string;
  label?: string;
  title?: string;
  className?: string;
}

/** Copies plain-text handoff instructions to the clipboard with brief feedback. */
export default function CopyInstructionsButton({
  text,
  label = 'Copy instructions',
  title = 'Copy instructions',
  className = '',
}: CopyInstructionsButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('[CopyInstructionsButton] clipboard write failed', error);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      disabled={!text.trim()}
      title={title}
      aria-label={title}
      className={`flex-shrink-0 h-11 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-2 transition-all duration-300 hover:scale-105 px-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${className}`}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-200 flex items-center justify-center">
        {copied ? (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        )}
      </div>
      <span className="font-semibold text-blue-700 text-sm">{copied ? 'Copied!' : label}</span>
    </button>
  );
}
