'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { uploadSponsorImageServer } from '@/app/admin/event-sponsors/ApiServerActions';

interface SponsorImageUploadAreaProps {
  /** Required for immediate upload; omit when deferUpload is true (create form). */
  sponsorId?: number;
  imageType: 'logo' | 'hero' | 'banner';
  currentImageUrl?: string | null;
  onUploadSuccess: (imageUrl: string, ocrChars?: number) => void;
  disabled?: boolean;
  /**
   * When true, only validate + preview locally and call onFileSelected.
   * Upload happens later after the sponsor exists.
   */
  deferUpload?: boolean;
  onFileSelected?: (file: File, previewUrl: string) => void;
  onFileCleared?: () => void;
}

const IMAGE_STYLES = {
  banner: {
    title: 'Banner poster',
    hint: 'This poster is what visitors see on the sponsor page and on event sponsor cards.',
    placeholder: 'This area is a placeholder until you upload a banner.',
    replaceHint: 'Upload another image to replace this banner.',
    card: 'border-amber-300 bg-amber-50',
    drag: 'border-amber-500 bg-amber-100',
    filled: 'border-amber-400 bg-amber-50',
    idle: 'border-amber-200 hover:border-amber-400 hover:bg-amber-100/70',
    iconBox: 'bg-amber-200',
    icon: 'text-amber-700',
    titleText: 'text-amber-800',
    hintText: 'text-amber-700',
    badge: 'bg-amber-200 text-amber-800',
  },
  logo: {
    title: 'Logo',
    hint: 'Saved with the sponsor. Visitors do not see this image.',
    placeholder: 'This area is a placeholder until you upload a logo.',
    replaceHint: 'Upload another image to replace this logo.',
    card: 'border-indigo-300 bg-indigo-50',
    drag: 'border-indigo-500 bg-indigo-100',
    filled: 'border-indigo-400 bg-indigo-50',
    idle: 'border-indigo-200 hover:border-indigo-400 hover:bg-indigo-100/70',
    iconBox: 'bg-indigo-200',
    icon: 'text-indigo-700',
    titleText: 'text-indigo-800',
    hintText: 'text-indigo-700',
    badge: 'bg-indigo-200 text-indigo-800',
  },
  hero: {
    title: 'Hero image',
    hint: 'Saved with the sponsor. Visitors do not see this image.',
    placeholder: 'This area is a placeholder until you upload a hero image.',
    replaceHint: 'Upload another image to replace this hero image.',
    card: 'border-purple-300 bg-purple-50',
    drag: 'border-purple-500 bg-purple-100',
    filled: 'border-purple-400 bg-purple-50',
    idle: 'border-purple-200 hover:border-purple-400 hover:bg-purple-100/70',
    iconBox: 'bg-purple-200',
    icon: 'text-purple-700',
    titleText: 'text-purple-800',
    hintText: 'text-purple-700',
    badge: 'bg-purple-200 text-purple-800',
  },
} as const;

function ImageTypeIcon({ imageType, className }: { imageType: 'logo' | 'hero' | 'banner'; className: string }) {
  if (imageType === 'banner') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21h8M12 15v6" />
      </svg>
    );
  }
  if (imageType === 'logo') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

export default function SponsorImageUploadArea({
  sponsorId,
  imageType,
  currentImageUrl,
  onUploadSuccess,
  disabled = false,
  deferUpload = false,
  onFileSelected,
  onFileCleared,
}: SponsorImageUploadAreaProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const style = IMAGE_STYLES[imageType];
  const isBanner = imageType === 'banner';

  useEffect(() => {
    if (deferUpload && currentImageUrl && !selectedFile) {
      setPreviewUrl(currentImageUrl);
    }
  }, [deferUpload, currentImageUrl, selectedFile]);

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return 'Please select an image file (JPEG, PNG, GIF, etc.)';
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'File size must be less than 10MB';
    }
    return null;
  };

  const handleFileSelect = useCallback(
    (file: File) => {
      setError(null);
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      if (deferUpload) {
        onFileSelected?.(file, objectUrl);
        onUploadSuccess(objectUrl);
      }
    },
    [deferUpload, onFileSelected, onUploadSuccess],
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    },
    [handleFileSelect],
  );

  const handleUpload = async () => {
    if (!selectedFile || !sponsorId || disabled || deferUpload) return;

    setIsUploading(true);
    setUploadProgress(10);
    setError(null);

    try {
      const media = await uploadSponsorImageServer(
        sponsorId,
        0,
        imageType,
        selectedFile,
      );

      setUploadProgress(100);
      const imageUrl = media.fileUrl || '';
      onUploadSuccess(imageUrl, media.ocrChars);

      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadProgress(0);
    } catch (err: unknown) {
      console.error('Upload failed:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to upload ${imageType} image: ${message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (deferUpload) {
      onFileCleared?.();
      onUploadSuccess('');
    }
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const displayPreview = previewUrl || (deferUpload ? currentImageUrl : null) || (!selectedFile ? currentImageUrl : null);
  const showingPreview = Boolean((selectedFile && previewUrl) || displayPreview);

  return (
    <div className={`rounded-2xl border-2 p-4 ${style.card}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${style.iconBox}`}>
          <ImageTypeIcon imageType={imageType} className={`w-6 h-6 ${style.icon}`} />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className={`font-heading font-semibold text-base ${style.titleText}`}>{style.title}</h4>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
              {isBanner ? 'Shown to visitors' : 'Not shown publicly'}
            </span>
          </div>
          <p className={`text-sm mt-1 ${style.hintText}`}>{style.hint}</p>
        </div>
      </div>

      <div
        className={`
          border-2 border-dashed rounded-xl p-4 text-center transition-all duration-300 cursor-pointer
          ${dragActive ? style.drag : showingPreview ? style.filled : style.idle}
          ${disabled || isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {showingPreview ? (
          <div className="space-y-3">
            <img
              src={(previewUrl || displayPreview) as string}
              alt={`${style.title} preview`}
              className={`mx-auto w-auto max-w-full rounded-xl object-contain border-2 bg-white ${style.card} ${isBanner ? 'h-48' : 'h-36'}`}
            />
            {selectedFile && (
              <div>
                <p className={`text-sm font-medium truncate ${style.titleText}`}>{selectedFile.name}</p>
                <p className={`text-xs ${style.hintText}`}>
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
            {deferUpload ? (
              <div className="flex items-center justify-center gap-2">
                <p className={`text-xs ${style.hintText}`}>Image will upload after the sponsor is created</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                  className="flex-shrink-0 h-10 rounded-xl bg-red-100 hover:bg-red-200 flex items-center justify-center gap-2 transition-all duration-300 hover:scale-105 px-3"
                  title="Remove image"
                  aria-label="Remove image"
                >
                  <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-red-200 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </span>
                  <span className="font-semibold text-red-700 text-sm">Remove</span>
                </button>
              </div>
            ) : isUploading ? (
              <div className="space-y-2">
                <div className="w-full bg-white rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className={`text-xs ${style.hintText}`}>Reading the image and uploading... {uploadProgress}%</p>
              </div>
            ) : selectedFile ? (
              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpload();
                  }}
                  className="flex-shrink-0 h-10 rounded-xl bg-green-100 hover:bg-green-200 flex items-center justify-center gap-2 transition-all duration-300 hover:scale-105 px-3"
                  title="Upload image"
                  aria-label="Upload image"
                >
                  <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-green-200 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </span>
                  <span className="font-semibold text-green-700 text-sm">Upload</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove();
                  }}
                  className="flex-shrink-0 h-10 rounded-xl bg-red-100 hover:bg-red-200 flex items-center justify-center gap-2 transition-all duration-300 hover:scale-105 px-3"
                  title="Remove image"
                  aria-label="Remove image"
                >
                  <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-red-200 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </span>
                  <span className="font-semibold text-red-700 text-sm">Remove</span>
                </button>
              </div>
            ) : null}
            <div className="space-y-1 pt-1">
              <ImageTypeIcon imageType={imageType} className={`mx-auto h-10 w-10 ${style.icon}`} />
              <p className={`text-sm font-medium ${style.titleText}`}>{style.replaceHint}</p>
              <p className={`text-xs ${style.hintText}`}>Click to upload or drag and drop</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 py-4">
            {isUploading ? (
              <>
                <svg className={`mx-auto h-8 w-8 animate-spin ${style.icon}`} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className={`text-sm ${style.titleText}`}>Uploading...</p>
              </>
            ) : (
              <>
                <ImageTypeIcon imageType={imageType} className={`mx-auto h-10 w-10 ${style.icon}`} />
                <p className={`text-sm ${style.titleText}`}>
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className={`text-xs ${style.hintText}`}>{style.placeholder}</p>
                <p className={`text-xs ${style.hintText}`}>PNG, JPG, GIF up to 10MB</p>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 p-2 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}
