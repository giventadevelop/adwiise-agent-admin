'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import ErrorDialog from '@/components/ErrorDialog';

interface FocusGroupCoverImageUploadProps {
  /** Required for immediate upload; omit when deferUpload is true (create form). */
  focusGroupId?: number;
  currentImageUrl?: string;
  onImageUploaded: (imageUrl: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  className?: string;
  /**
   * When true, only validate + preview locally and call onFileSelected.
   * Upload happens later after the focus group exists.
   */
  deferUpload?: boolean;
  onFileSelected?: (file: File, previewUrl: string) => void;
  onFileCleared?: () => void;
}

export default function FocusGroupCoverImageUpload({
  focusGroupId,
  currentImageUrl,
  onImageUploaded,
  onError,
  disabled = false,
  className = '',
  deferUpload = false,
  onFileSelected,
  onFileCleared,
}: FocusGroupCoverImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: '',
    message: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      const errorMessage = 'Unsupported file type. Please upload a JPEG, PNG, or GIF image.';
      setErrorDialog({
        isOpen: true,
        title: 'Invalid File Type',
        message: errorMessage
      });
      onError(errorMessage);
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      const errorMessage = 'File size is too large. Please upload an image smaller than 10MB.';
      setErrorDialog({
        isOpen: true,
        title: 'File Too Large',
        message: errorMessage
      });
      onError(errorMessage);
      return;
    }

    // Create flow: keep file locally until focus group is saved
    if (deferUpload) {
      const previewUrl = URL.createObjectURL(file);
      onFileSelected?.(file, previewUrl);
      onImageUploaded(previewUrl);
      setShowSuccess(true);
      return;
    }

    if (!focusGroupId) {
      const errorMessage = 'Focus group ID is required to upload a cover image.';
      setErrorDialog({
        isOpen: true,
        title: 'Upload Failed',
        message: errorMessage,
      });
      onError(errorMessage);
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Build API URL for focus group cover image upload
      const apiUrl = `/api/proxy/event-medias/upload/focus-group-cover-image?focusGroupId=${focusGroupId}&title=Focus Group Cover Image&description=Cover image for focus group&isPublic=true`;

      console.log('📸 FocusGroupCoverImageUpload: Uploading to URL:', apiUrl);
      console.log('📸 FocusGroupCoverImageUpload: Focus Group ID:', focusGroupId);

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      console.log('📸 FocusGroupCoverImageUpload: Response status:', response.status);

      if (!response.ok) {
        let errorMessage = 'Failed to upload focus group cover image';
        let errorDetails = '';

        // Read response body as text first (can always read as text)
        try {
          const responseText = await response.text();

          // Try to parse as JSON if it looks like JSON
          if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
            try {
              const errorData = JSON.parse(responseText);
              // Handle different error formats from backend
              if (errorData.error) {
                errorMessage = errorData.error;
              }
              if (errorData.details) {
                errorDetails = errorData.details;
              }
              if (errorData.message) {
                errorMessage = errorData.message;
              }
            } catch {
              // If JSON parsing fails, use the text as-is
              if (responseText.trim()) {
                errorMessage = responseText.trim();
              }
            }
          } else {
            // Not JSON, use text directly
            if (responseText.trim()) {
              errorMessage = responseText.trim();
            }
          }
        } catch (parseError) {
          // If reading response fails, use default error message
          console.error('Failed to read error response:', parseError);
        }

        // Create user-friendly error message
        const userFriendlyMessage = formatErrorMessage(errorMessage, errorDetails, response.status);

        console.error('📸 FocusGroupCoverImageUpload: Upload failed:', errorMessage);

        // Show error dialog
        setErrorDialog({
          isOpen: true,
          title: 'Upload Failed',
          message: userFriendlyMessage
        });

        // Also call onError callback for backward compatibility
        onError(userFriendlyMessage);

        return;
      }

      const result = await response.json();
      const imageUrl = result.fileUrl || result.url || result.imageUrl;

      if (!imageUrl) {
        throw new Error('Upload succeeded but no image URL returned');
      }

      console.log('📸 FocusGroupCoverImageUpload: Upload success, image URL:', imageUrl);
      onImageUploaded(imageUrl);
      try {
        const { persistFocusGroupCoverOcrServer } = await import(
          '@/app/admin/focus-groups/ApiServerActions'
        );
        await persistFocusGroupCoverOcrServer(focusGroupId, file);
      } catch (ocrError) {
        console.error('[FocusGroupCoverOCR] post-upload failed:', ocrError);
      }

      // Show success message
      setShowSuccess(true);
    } catch (error: any) {
      console.error('Focus group cover image upload error:', error);
      const errorMessage = error.message || 'Failed to upload focus group cover image';
      const userFriendlyMessage = formatErrorMessage(errorMessage, '', 0);

      // Show error dialog
      setErrorDialog({
        isOpen: true,
        title: 'Upload Failed',
        message: userFriendlyMessage
      });

      // Also call onError callback for backward compatibility
      onError(userFriendlyMessage);
    } finally {
      setIsUploading(false);
    }
  };

  // Helper function to format error messages in a user-friendly way
  const formatErrorMessage = (error: string, details: string, statusCode: number): string => {
    // Handle common HTTP status codes
    if (statusCode === 400) {
      return 'Invalid request. Please check that the file is a valid image and try again.';
    }
    if (statusCode === 401) {
      return 'Authentication failed. Please refresh the page and try again.';
    }
    if (statusCode === 403) {
      return 'You do not have permission to upload images. Please contact an administrator.';
    }
    if (statusCode === 413) {
      return 'File size is too large. Please upload an image smaller than 10MB.';
    }
    if (statusCode === 415) {
      return 'Unsupported file type. Please upload a JPEG, PNG, or GIF image.';
    }
    if (statusCode === 500) {
      return 'Server error occurred. Please try again later or contact support if the problem persists.';
    }

    // Try to extract user-friendly messages from error strings
    const lowerError = error.toLowerCase();
    if (lowerError.includes('file size') || lowerError.includes('too large')) {
      return 'File size is too large. Please upload an image smaller than 10MB.';
    }
    if (lowerError.includes('file type') || lowerError.includes('unsupported') || lowerError.includes('invalid format')) {
      return 'Unsupported file type. Please upload a JPEG, PNG, or GIF image.';
    }
    if (lowerError.includes('permission') || lowerError.includes('unauthorized') || lowerError.includes('forbidden')) {
      return 'You do not have permission to upload images. Please contact an administrator.';
    }
    if (lowerError.includes('network') || lowerError.includes('fetch') || lowerError.includes('connection')) {
      return 'Network error occurred. Please check your internet connection and try again.';
    }

    // If we have details, include them
    if (details) {
      return `${error}\n\nDetails: ${details}`;
    }

    // Return the error message as-is if we can't format it
    return error || 'An unexpected error occurred. Please try again.';
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <>
      <ErrorDialog
        isOpen={errorDialog.isOpen}
        onClose={() => setErrorDialog({ isOpen: false, title: '', message: '' })}
        title={errorDialog.title}
        message={errorDialog.message}
      />

      <div className={`rounded-2xl border-2 border-sky-300 bg-sky-50 p-4 ${className}`}>
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-sky-200 flex items-center justify-center">
            <svg className="w-6 h-6 text-sky-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-heading font-semibold text-base text-sky-800">Cover image</h4>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-200 text-sky-800">Shown to visitors</span>
            </div>
            <p className="text-sm mt-1 text-sky-700">This cover is what visitors see on the focus group.</p>
          </div>
        </div>

        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl p-4 text-center transition-all duration-300 cursor-pointer ${
            dragActive
              ? 'border-sky-500 bg-sky-100'
              : currentImageUrl
                ? 'border-sky-400 bg-sky-50'
                : 'border-sky-200 hover:border-sky-400 hover:bg-sky-100/70'
          } ${disabled || isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled || isUploading}
          />

          {currentImageUrl ? (
            <div className="space-y-3">
              <div className="relative inline-block">
                <img
                  src={currentImageUrl}
                  alt="Focus group cover preview"
                  className="mx-auto h-48 w-auto max-w-full rounded-xl object-contain border-2 border-sky-300 bg-white"
                />
                {deferUpload && onFileCleared && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileCleared();
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center"
                    title="Remove image"
                    aria-label="Remove image"
                  >
                    <FaTimes className="w-3 h-3 text-red-600" />
                  </button>
                )}
              </div>
              {isUploading ? (
                <p className="text-sm text-sky-800">Reading the image and uploading...</p>
              ) : (
                <div className="space-y-1 pt-1">
                  <svg className="mx-auto h-10 w-10 text-sky-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm font-medium text-sky-800">
                    {deferUpload
                      ? 'This image uploads after the focus group is created.'
                      : 'Upload another image to replace this cover.'}
                  </p>
                  <p className="text-xs text-sky-700">Click to upload or drag and drop</p>
                  {showSuccess && !deferUpload && (
                    <p className="text-xs font-semibold text-green-700">Cover image saved.</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 py-4">
              {isUploading ? (
                <p className="text-sm text-sky-800">Reading the image and uploading...</p>
              ) : (
                <>
                  <svg className="mx-auto h-10 w-10 text-sky-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm text-sky-800">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-sky-700">This area is a placeholder until you upload a cover.</p>
                  <p className="text-xs text-sky-700">PNG, JPG, GIF up to 10MB. Recommended 800×480.</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

