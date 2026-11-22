'use client';

import { useState, useRef, useEffect } from 'react';
import type { EventSponsorsDTO } from '@/types';
import { uploadSponsorImageServer } from '@/app/admin/event-sponsors/ApiServerActions';
import SuccessDialog from '@/components/SuccessDialog';
import ErrorDialog from '@/components/ErrorDialog';

interface SponsorImageUploadDialogProps {
  sponsor: EventSponsorsDTO;
  imageType: 'logo' | 'hero' | 'banner';
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (imageUrl: string) => void;
  eventId?: number; // Optional, for event-specific context
}

export default function SponsorImageUploadDialog({
  sponsor,
  imageType,
  isOpen,
  onClose,
  onUploadSuccess,
  eventId,
}: SponsorImageUploadDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image file (JPEG, PNG, GIF, etc.)');
      setShowErrorDialog(true);
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File size must be less than 10MB');
      setShowErrorDialog(true);
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !sponsor.id) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate initial progress
      setUploadProgress(10);

      // Upload the image
      const eventIdToUse = eventId || 0; // Use provided eventId or 0 for sponsor-level images
      const media = await uploadSponsorImageServer(
        sponsor.id,
        eventIdToUse,
        imageType,
        selectedFile
      );

      // Simulate completion progress
      setUploadProgress(100);

      // Call success handler with the image URL
      const imageUrl = media.fileUrl || '';
      onUploadSuccess(imageUrl);

      // Close the upload dialog
      onClose();

      const label = imageType.charAt(0).toUpperCase() + imageType.slice(1);
      if (media.ocrError) {
        setErrorMessage(`${label} image was saved. Reading the words on it failed, so search text was not updated. ${media.ocrError}`);
        setShowErrorDialog(true);
      } else {
        const words = media.ocrChars ?? 0;
        setSuccessMessage(
          words > 0
            ? `${label} image uploaded. Saved ${words} words from the image for search.`
            : `${label} image uploaded. No readable words were found in the image.`,
        );
        setShowSuccessDialog(true);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setErrorMessage(`Failed to upload ${imageType} image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setShowErrorDialog(true);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    setErrorMessage('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Get current image URL based on image type
  const getCurrentImageUrl = () => {
    switch (imageType) {
      case 'logo':
        return sponsor.logoUrl;
      case 'hero':
        return sponsor.heroImageUrl;
      case 'banner':
        return sponsor.bannerImageUrl;
      default:
        return undefined;
    }
  };

  const currentImageUrl = getCurrentImageUrl();
  const imageTypeLabel = imageType.charAt(0).toUpperCase() + imageType.slice(1).replace(/([A-Z])/g, ' $1');

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-card rounded-lg sacred-shadow max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-lg font-heading font-semibold text-foreground">
              Upload {imageTypeLabel} Image
            </h2>
            <button
              onClick={handleClose}
              className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-100 hover:bg-red-200 flex items-center justify-center transition-all duration-300 hover:scale-110 disabled:opacity-50"
              disabled={isUploading}
              title="Close"
              aria-label="Close"
              type="button"
            >
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Sponsor Info */}
            <div className="text-center">
              <h3 className="text-lg font-heading font-medium text-foreground mb-2">
                {sponsor.name}
              </h3>
              {sponsor.companyName && (
                <p className="text-sm font-body text-muted-foreground">{sponsor.companyName}</p>
              )}
            </div>

            {/* Current Image Preview */}
            {currentImageUrl && (
              <div className="text-center">
                <p className="text-sm font-body text-muted-foreground mb-2">Current {imageTypeLabel}:</p>
                <img
                  src={currentImageUrl}
                  alt={`Current ${imageTypeLabel}`}
                  className="mx-auto h-32 w-auto rounded-lg object-contain border border-border"
                />
              </div>
            )}

            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center reverent-transition ${
                dragActive
                  ? 'border-primary bg-primary/10'
                  : selectedFile
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border hover:border-primary/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {!selectedFile ? (
                <div className="space-y-4">
                  <svg className="mx-auto h-12 w-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="text-sm font-body text-foreground">
                      <span className="font-medium text-primary hover:text-primary/80">
                        Click to upload
                      </span>{' '}
                      or drag and drop
                    </p>
                    <p className="text-xs font-body text-muted-foreground mt-1">
                      PNG, JPG, GIF up to 10MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mx-auto h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6"
                    title="Select Image"
                    aria-label="Select Image"
                  >
                    <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </span>
                    <span className="font-semibold text-blue-700">Select Image</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <img
                    src={previewUrl!}
                    alt="Preview"
                    className="mx-auto h-32 w-auto rounded-lg object-contain border border-border"
                  />
                  <div>
                    <p className="text-sm font-body font-medium text-foreground">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs font-body text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-4"
                      title="Change"
                      aria-label="Change"
                    >
                      <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                      </span>
                      <span className="font-semibold text-blue-700">Change</span>
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="h-14 rounded-xl bg-red-100 hover:bg-red-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-4"
                      title="Remove"
                      aria-label="Remove"
                    >
                      <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-200 flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </span>
                      <span className="font-semibold text-red-700">Remove</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm font-body">
                  <span className="text-foreground">Uploading...</span>
                  <span className="text-muted-foreground">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full reverent-transition"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50"
                disabled={isUploading}
                title="Cancel"
                aria-label="Cancel"
              >
                <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </span>
                <span className="font-semibold text-blue-700">Cancel</span>
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="flex-1 h-14 rounded-xl bg-green-100 hover:bg-green-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                title={isUploading ? 'Uploading' : 'Upload Image'}
                aria-label={isUploading ? 'Uploading' : 'Upload Image'}
              >
                <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-200 flex items-center justify-center">
                  {isUploading ? (
                    <svg className="animate-spin w-6 h-6 text-green-700" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  )}
                </span>
                <span className="font-semibold text-green-700">{isUploading ? 'Uploading...' : 'Upload Image'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Dialog */}
      <SuccessDialog
        isOpen={showSuccessDialog}
        onClose={() => setShowSuccessDialog(false)}
        title="Upload Successful"
        message={successMessage}
      />

      {/* Error Dialog */}
      <ErrorDialog
        isOpen={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        title="Upload Failed"
        message={errorMessage}
      />
    </>
  );
}

