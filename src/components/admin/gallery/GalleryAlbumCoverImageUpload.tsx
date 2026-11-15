'use client';

import React, { useState, useRef, useEffect } from 'react';
import ErrorDialog from '@/components/ErrorDialog';
import { uploadGalleryAlbumCoverFile } from '@/lib/gallery/uploadGalleryAlbumCoverClient';

interface GalleryAlbumCoverImageUploadProps {
  albumId: number;
  /** Album's tenant — required for platform admin editing another tenant's album. */
  tenantId?: string;
  currentImageUrl?: string;
  onImageUploaded: (imageUrl: string) => void;
  onError: (error: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  disabled?: boolean;
  className?: string;
}

function formatErrorMessage(error: string, details: string, statusCode: number): string {
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

  const lowerError = error.toLowerCase();
  if (lowerError.includes('file size') || lowerError.includes('too large')) {
    return 'File size is too large. Please upload an image smaller than 10MB.';
  }
  if (lowerError.includes('file type') || lowerError.includes('unsupported') || lowerError.includes('invalid format')) {
    return 'Unsupported file type. Please upload a JPEG, PNG, or GIF image.';
  }
  if (details) {
    return `${error}\n\nDetails: ${details}`;
  }
  return error || 'An unexpected error occurred. Please try again.';
}

export default function GalleryAlbumCoverImageUpload({
  albumId,
  tenantId,
  currentImageUrl,
  onImageUploaded,
  onError,
  onUploadingChange,
  disabled = false,
  className = '',
}: GalleryAlbumCoverImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl || '');
  const [errorDialog, setErrorDialog] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: '',
    message: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreviewUrl(currentImageUrl || '');
  }, [currentImageUrl]);

  useEffect(() => {
    onUploadingChange?.(isUploading);
  }, [isUploading, onUploadingChange]);

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const showUploadError = (title: string, message: string) => {
    setErrorDialog({ isOpen: true, title, message });
    onError(message);
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      const errorMessage = 'Unsupported file type. Please upload a JPEG, PNG, or GIF image.';
      showUploadError('Invalid File Type', errorMessage);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      const errorMessage = 'File size is too large. Please upload an image smaller than 10MB.';
      showUploadError('File Too Large', errorMessage);
      return;
    }

    setIsUploading(true);

    try {
      const imageUrl = await uploadGalleryAlbumCoverFile(albumId, file, tenantId);
      setPreviewUrl(imageUrl);
      onImageUploaded(imageUrl);
      setShowSuccess(true);
      try {
        const { persistGalleryCoverOcrServer } = await import(
          '@/app/admin/gallery/albums/ApiServerActions'
        );
        await persistGalleryCoverOcrServer(albumId, file, tenantId);
      } catch (ocrError) {
        console.error('[GalleryCoverOCR] post-upload failed:', ocrError);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload gallery album cover image';
      const userFriendlyMessage = formatErrorMessage(errorMessage, '', 0);
      showUploadError('Upload Failed', userFriendlyMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    e.target.value = '';
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

      <div className={`rounded-2xl border-2 border-teal-300 bg-teal-50 p-4 ${className}`}>
        <div className="flex items-start gap-3 mb-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-200 flex items-center justify-center">
            <svg className="w-6 h-6 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-heading font-semibold text-base text-teal-800">Album cover</h4>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-200 text-teal-800">Shown to visitors</span>
            </div>
            <p className="text-sm mt-1 text-teal-700">This cover is what visitors see on gallery cards and album listings.</p>
          </div>
        </div>

        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl p-4 text-center transition-all duration-300 cursor-pointer ${
            dragActive
              ? 'border-teal-500 bg-teal-100'
              : previewUrl
                ? 'border-teal-400 bg-teal-50'
                : 'border-teal-200 hover:border-teal-400 hover:bg-teal-100/70'
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

          {previewUrl ? (
            <div className="space-y-3">
              <img
                src={previewUrl}
                alt="Album cover preview"
                className="mx-auto h-48 w-auto max-w-full rounded-xl object-contain border-2 border-teal-300 bg-white"
              />
              {isUploading ? (
                <p className="text-sm text-teal-800">Reading the image and uploading...</p>
              ) : (
                <div className="space-y-1 pt-1">
                  <svg className="mx-auto h-10 w-10 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm font-medium text-teal-800">Upload another image to replace this cover.</p>
                  <p className="text-xs text-teal-700">Click to upload or drag and drop</p>
                  {showSuccess && (
                    <p className="text-xs font-semibold text-green-700">Cover image saved to the album.</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 py-4">
              {isUploading ? (
                <p className="text-sm text-teal-800">Reading the image and uploading...</p>
              ) : (
                <>
                  <svg className="mx-auto h-10 w-10 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-teal-800">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-teal-700">This area is a placeholder until you upload a cover.</p>
                  <p className="text-xs text-teal-700">PNG, JPG, GIF up to 10MB</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
