"use client";
import React from 'react';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';

interface ErrorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  detail?: string;
}

export default function ErrorDialog({
  isOpen,
  onClose,
  title,
  message,
  detail,
}: ErrorDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 transform transition-all duration-300 scale-100">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <FaExclamationTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
            type="button"
            title="Close"
            aria-label="Close"
          >
            <FaTimes className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{message}</p>
          {detail && detail !== message && (
            <details className="rounded-lg border border-red-200 bg-red-50 p-3">
              <summary className="cursor-pointer text-sm font-medium text-red-800">
                Technical details
              </summary>
              <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-red-900">
                {detail}
              </pre>
            </details>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 p-6">
          <button
            onClick={onClose}
            className="flex h-14 flex-shrink-0 items-center justify-center gap-3 rounded-xl bg-red-100 px-6 transition-all duration-300 hover:scale-105 hover:bg-red-200"
            type="button"
            title="Close"
            aria-label="Close"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-red-200">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <span className="font-semibold text-red-700">Close</span>
          </button>
        </div>
      </div>
    </div>
  );
}
