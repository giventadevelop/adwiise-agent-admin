'use client';

import { useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Amber exclamation that explains how to fill a field. Portaled so the roster modal does not clip it. */
export function HintMark({ text }: { text: string }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);

  const show = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 280;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    setBox({ top: rect.bottom + 8, left });
    setOpen(true);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-bold leading-none text-gray-900 shadow-sm hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
        aria-label={text}
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
        onFocus={show}
        onBlur={() => setOpen(false)}
      >
        !
      </button>
      {open && box && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="tooltip"
              style={{ position: 'fixed', top: box.top, left: box.left, width: 280, zIndex: 10050 }}
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-gray-800 shadow-lg"
            >
              {text}
            </div>,
            document.body
          )
        : null}
    </>
  );
}

export function FieldHint({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="block text-sm font-medium text-gray-700">{label}</span>
        <HintMark text={hint} />
      </div>
      {children}
    </div>
  );
}
