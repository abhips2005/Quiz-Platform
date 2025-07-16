import React, { useState, useRef } from 'react';
import { useAuth } from '../../contexts/SupabaseAuthContext';
import './MediaUpload.css';

interface MediaFile {
  id: string;
  type: 'IMAGE' | 'AUDIO' | 'VIDEO';
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

interface MediaUploadProps {
  onUpload: (file: MediaFile) => void;
  acceptedTypes?: string[];
  maxSize?: number; // in MB
  className?: string;
  multiple?: boolean;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  onUpload,
  acceptedTypes = ['image/*', 'audio/*', 'video/*'],
  maxSize = 100,
  className = '',
  multiple = false
}) => {
  const { getAccessToken } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      return `File size must be less than ${maxSize}MB`;
    }

    // Check file type
    const fileType = file.type;
    const isValidType = acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        return fileType.startsWith(type.replace('/*', '/'));
      }
      return fileType === type;
    });

    if (!isValidType) {
      return `File type not supported. Accepted types: ${acceptedTypes.join(', ')}`;
    }

    return null;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0]; // For now, handle single file upload
    const validationError = validateFile(file);
    
    if (validationError) {
      setError(validationError);
      return;
    }

    uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Get authentication token
      const token = await getAccessToken();
      if (!token) {
        setError('Authentication required');
        setUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(progress);
        }
      });

      // Handle successful upload
      xhr.addEventListener('load', () => {
        if (xhr.status === 201) {
          const response = JSON.parse(xhr.responseText);
          onUpload(response);
          setUploadProgress(100);
          setTimeout(() => {
            setUploading(false);
            setUploadProgress(0);
          }, 1000);
        } else {
          const errorResponse = JSON.parse(xhr.responseText);
          setError(errorResponse.error || 'Upload failed');
          setUploading(false);
          setUploadProgress(0);
        }
      });

      // Handle upload error
      xhr.addEventListener('error', () => {
        setError('Upload failed. Please try again.');
        setUploading(false);
        setUploadProgress(0);
      });

      xhr.open('POST', `${import.meta.env.VITE_API_URL}/media/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);

    } catch (error) {
      console.error('Upload error:', error);
      setError('Upload failed. Please try again.');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const validationError = validateFile(file);
      
      if (validationError) {
        setError(validationError);
        return;
      }

      uploadFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`media-upload ${className}`}>
      <div
        className={`upload-zone ${uploading ? 'uploading' : ''}`}
        onClick={!uploading ? openFileDialog : undefined}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          multiple={multiple}
        />
        
        {uploading ? (
          <div className="upload-progress">
            <div className="spinner"></div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <span className="progress-text">{Math.round(uploadProgress)}%</span>
          </div>
        ) : (
          <div className="upload-content">
            <div className="upload-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path
                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points="14,2 14,8 20,8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <line
                  x1="16"
                  y1="13"
                  x2="8"
                  y2="13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <line
                  x1="12"
                  y1="17"
                  x2="12"
                  y2="9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="upload-text">
              <p className="primary-text">Click to upload or drag and drop</p>
              <p className="secondary-text">
                {acceptedTypes.includes('image/*') && 'Images, '}
                {acceptedTypes.includes('audio/*') && 'Audio, '}
                {acceptedTypes.includes('video/*') && 'Video'}
                {' '}(max {maxSize}MB)
              </p>
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <div className="upload-error">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
          <button 
            className="error-close"
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default MediaUpload; 