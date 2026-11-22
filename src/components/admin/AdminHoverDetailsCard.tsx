'use client';

import React, { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type AdminTooltipDetail = {
  label: string;
  value: string | number | boolean | null | undefined;
};

export function useAdminHoverDetails<T>(openDelayMs = 300) {
  const [item, setItem] = useState<T | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback((data: T, event: React.MouseEvent<HTMLElement>) => {
    clearTimer();
    const targetElement = event.currentTarget;
    timerRef.current = setTimeout(() => {
      if (!targetElement || !document.body.contains(targetElement)) return;
      setAnchorRect(targetElement.getBoundingClientRect());
      setItem(data);
    }, openDelayMs);
  }, [clearTimer, openDelayMs]);

  const handleMouseLeave = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const close = useCallback(() => {
    clearTimer();
    setItem(null);
    setAnchorRect(null);
  }, [clearTimer]);

  return { item, anchorRect, handleMouseEnter, handleMouseLeave, close };
}

export default function AdminHoverDetailsCard({
  title,
  details,
  anchorRect,
  onClose,
}: {
  title: string;
  details: AdminTooltipDetail[];
  anchorRect: DOMRect | null;
  onClose: () => void;
}) {
  if (!anchorRect || typeof document === 'undefined') return null;

  const visible = details.filter(
    (detail) => detail.value !== null && detail.value !== undefined && detail.value !== '',
  );
  const tooltipWidth = 450;
  const spacing = 12;
  let top = anchorRect.top;
  let left = anchorRect.right + spacing;
  const estimatedHeight = 400;
  if (top + estimatedHeight > window.innerHeight) {
    top = window.innerHeight - estimatedHeight - spacing;
  }
  if (top < spacing) top = spacing;
  if (left + tooltipWidth > window.innerWidth - spacing) {
    left = window.innerWidth - tooltipWidth - spacing;
  }

  const style: React.CSSProperties = {
    position: 'fixed',
    top: `${top}px`,
    left: `${left}px`,
    zIndex: 9999,
    background: 'white',
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
    padding: '16px',
    width: `${tooltipWidth}px`,
    fontSize: '14px',
    maxHeight: '500px',
    overflowY: 'auto',
  };

  return createPortal(
    <div style={style} tabIndex={-1} className="admin-tooltip">
      <div className="sticky top-0 z-10 bg-white flex justify-end">
        <button
          onClick={onClose}
          className="w-8 h-8 text-2xl bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
          aria-label="Close tooltip"
          type="button"
        >
          &times;
        </button>
      </div>
      <div className="font-semibold text-lg mb-4 pb-2 border-b border-gray-200">{title}</div>
      <table className="admin-tooltip-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {visible.map((detail) => (
            <tr key={detail.label} className="border-b border-gray-100">
              <th
                style={{
                  textAlign: 'left',
                  width: '40%',
                  minWidth: '150px',
                  fontWeight: 600,
                  wordBreak: 'break-word',
                  whiteSpace: 'normal',
                  padding: '12px 16px 12px 0',
                  fontSize: '14px',
                  color: '#374151',
                }}
              >
                {detail.label}
              </th>
              <td
                style={{
                  textAlign: 'left',
                  width: '60%',
                  padding: '12px 0',
                  fontSize: '14px',
                  color: '#6b7280',
                  wordBreak: 'break-word',
                }}
              >
                {typeof detail.value === 'boolean' ? (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${detail.value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {detail.value ? 'Yes' : 'No'}
                  </span>
                ) : (
                  String(detail.value)
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>,
    document.body,
  );
}
