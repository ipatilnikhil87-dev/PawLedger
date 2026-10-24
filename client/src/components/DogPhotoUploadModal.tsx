import React, { useState, useRef, useEffect } from 'react';
import { Dog } from '../types';
import { useApp } from '../context/AppContext';
import { Camera, Upload, Trash2, X, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';

interface DogPhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  dog: Dog | null;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const DEFAULT_FALLBACK_PHOTO = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=300&q=80';

export const DogPhotoUploadModal: React.FC<DogPhotoUploadModalProps> = ({
  isOpen,
  onClose,
  dog,
}) => {
  const { updateDog } = useApp();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize preview with current dog photo when modal opens
  useEffect(() => {
    if (dog) {
      setPreviewUrl(dog.photoUrl || null);
      setFileInfo(null);
      setErrorMessage(null);
      setIsSaving(false);
    }
  }, [dog, isOpen]);

  if (!isOpen || !dog) return null;

  // Compress and resize image using HTML5 Canvas for optimal IndexedDB and cloud sync storage
  const optimizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 800; // 800px max width/height provides crisp resolution on high-DPI screens
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          // Export as JPEG with 0.86 quality
          const optimized = canvas.toDataURL('image/jpeg', 0.86);
          resolve(optimized);
        };
        img.onerror = () => reject(new Error('Failed to decode image file.'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file from disk.'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelection = async (file: File) => {
    setErrorMessage(null);

    // 1. Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMessage('Please select a valid image file (JPEG, PNG, WebP, or GIF).');
      return;
    }

    // 2. Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage('Image file is too large (maximum 10 MB). Please choose a smaller photo.');
      return;
    }

    try {
      const formattedSize =
        file.size < 1024 * 1024
          ? `${(file.size / 1024).toFixed(1)} KB`
          : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

      setFileInfo({
        name: file.name,
        size: formattedSize,
      });

      // Optimize and preview
      const optimizedDataUrl = await optimizeImage(file);
      setPreviewUrl(optimizedDataUrl);
    } catch (err: any) {
      console.error('Error optimizing image:', err);
      setErrorMessage('Could not process this image. Please try another file.');
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleSave = async () => {
    if (!dog || !previewUrl) return;

    try {
      setIsSaving(true);
      setErrorMessage(null);

      const updatedDog: Dog = {
        ...dog,
        photoUrl: previewUrl,
        updatedAt: new Date().toISOString(),
      };

      await updateDog(updatedDog);
      setIsSaving(false);
      onClose();
    } catch (err: any) {
      console.error('Error saving dog photo:', err);
      setIsSaving(false);
      setErrorMessage('Failed to save profile picture: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleRemovePhoto = async () => {
    if (!dog) return;

    try {
      setIsSaving(true);
      setErrorMessage(null);

      const updatedDog: Dog = {
        ...dog,
        photoUrl: '', // remove custom picture
        updatedAt: new Date().toISOString(),
      };

      await updateDog(updatedDog);
      setPreviewUrl(null);
      setFileInfo(null);
      setIsSaving(false);
      onClose();
    } catch (err: any) {
      console.error('Error removing dog photo:', err);
      setIsSaving(false);
      setErrorMessage('Failed to remove photo: ' + (err?.message || 'Unknown error'));
    }
  };

  const isNewImageSelected = Boolean(previewUrl && previewUrl !== dog.photoUrl);
  const hasExistingCustomPhoto = Boolean(dog.photoUrl && dog.photoUrl.trim() !== '');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        style={{
          maxWidth: '460px',
          width: '92%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.15))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-amber)',
              }}
            >
              <Camera size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Dog Profile Picture</h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Upload or change photo for <strong>{dog.name}</strong>
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '20px', overflowY: 'auto' }}>
          {/* Current / Preview Image Display */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '124px',
                height: '124px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid var(--accent-amber)',
                boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)',
                background: 'var(--bg-surface-elevated)',
              }}
            >
              <img
                src={previewUrl || DEFAULT_FALLBACK_PHOTO}
                alt={dog.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>

            <div style={{ marginTop: '10px', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{dog.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {isNewImageSelected ? (
                  <span style={{ color: 'var(--accent-teal)', fontWeight: 600 }}>
                    ✓ Ready to save new picture ({fileInfo?.size})
                  </span>
                ) : hasExistingCustomPhoto ? (
                  <span>Current Profile Picture</span>
                ) : (
                  <span>Using Default Breed Avatar</span>
                )}
              </div>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileInputChange}
            accept="image/jpeg,image/png,image/webp,image/gif"
            style={{ display: 'none' }}
            id="dog-photo-file-input"
          />

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? 'var(--accent-amber)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-md)',
              padding: '24px 16px',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragging ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-surface-elevated)',
              transition: 'all 0.2s ease',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'var(--bg-surface)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-amber)',
                marginBottom: '10px',
              }}
            >
              <Upload size={22} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>
              Select Photo from Device
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Drag & drop or tap to browse
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '6px' }}>
              JPEG, PNG, WebP or GIF up to 10 MB
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '0.82rem',
                marginBottom: '16px',
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            {isNewImageSelected && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={isSaving}
                id="save-dog-photo-btn"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Check size={16} />
                {isSaving ? 'Saving Picture...' : 'Save Profile Picture'}
              </button>
            )}

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <ImageIcon size={16} />
              {isNewImageSelected ? 'Choose Different Photo' : 'Choose Photo'}
            </button>

            {hasExistingCustomPhoto && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleRemovePhoto}
                disabled={isSaving}
                style={{
                  width: '100%',
                  color: 'var(--accent-crimson)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <Trash2 size={15} />
                Remove Picture
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
