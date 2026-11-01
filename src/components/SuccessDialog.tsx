"use client";
import React from 'react';
import { FaCheckCircle, FaTimes } from 'react-icons/fa';

interface SuccessDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  buttonText?: string;
  showRefreshButton?: boolean;
  onRefresh?: () => void;
}

export default function SuccessDialog({
  isOpen,
  onClose,
  title,
  message,
  buttonText = 'OK',
  showRefreshButton = false,
  onRefresh,
}: SuccessDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <FaCheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <FaTimes className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 leading-relaxed">{message}</p>

          {showRefreshButton && onRefresh && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 mb-3">
                The page will refresh to show the updated image.
              </p>
              <button
                onClick={onRefresh}
                type="button"
                title="Refresh Page"
                aria-label="Refresh Page"
                className="flex h-14 w-full flex-shrink-0 items-center justify-center gap-3 rounded-xl bg-blue-100 px-6 transition-all duration-300 hover:scale-105 hover:bg-blue-200"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-200">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <span className="font-semibold text-blue-700">Refresh Page</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 p-6">
          <button
            onClick={onClose}
            type="button"
            title={buttonText}
            aria-label={buttonText}
            className="flex h-14 flex-shrink-0 items-center justify-center gap-3 rounded-xl bg-green-100 px-6 transition-all duration-300 hover:scale-105 hover:bg-green-200"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-200">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="font-semibold text-green-700">{buttonText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
