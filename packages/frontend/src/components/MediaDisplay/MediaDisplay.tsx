import React, { useState } from 'react';
import './MediaDisplay.css';

interface MediaFile {
  id: string;
  type: 'IMAGE' | 'AUDIO' | 'VIDEO';
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
}

interface MediaDisplayProps {
  media: MediaFile;
  className?: string;
  showControls?: boolean;
  showFileName?: boolean;
  maxWidth?: string;
  maxHeight?: string;
  onDelete?: (mediaId: string) => void;
  editable?: boolean;
}

export const MediaDisplay: React.FC<MediaDisplayProps> = ({
  media,
  className = '',
  showControls = true,
  showFileName = true,
  maxWidth = '100%',
  maxHeight = '400px',
  onDelete,
  editable = false
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLoad = () => {
    setIsLoading(false);
    setError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError(true);
  };

  const handleDelete = () => {
    if (onDelete && window.confirm('Are you sure you want to delete this media file?')) {
      onDelete(media.id);
    }
  };

  const openFullscreen = () => {
    if (media.type === 'IMAGE') {
      setIsFullscreen(true);
    }
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
  };

  const renderImage = () => (
    <div className="media-image-container">
      {isLoading && (
        <div className="media-loading">
          <div className="spinner"></div>
        </div>
      )}
      {error ? (
        <div className="media-error">
          <span className="error-icon">📷</span>
          <span>Failed to load image</span>
        </div>
      ) : (
        <img
          src={media.url}
          alt={media.filename}
          style={{ maxWidth, maxHeight }}
          onLoad={handleLoad}
          onError={handleError}
          onClick={openFullscreen}
          className="media-image"
        />
      )}
    </div>
  );

  const renderAudio = () => (
    <div className="media-audio-container">
      <div className="audio-info">
        <div className="audio-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
              fill="currentColor"
            />
          </svg>
        </div>
        <div className="audio-details">
          <span className="audio-filename">{media.filename}</span>
          {media.duration && (
            <span className="audio-duration">{formatDuration(media.duration)}</span>
          )}
        </div>
      </div>
      {showControls && (
        <audio
          controls
          preload="metadata"
          onLoadedData={handleLoad}
          onError={handleError}
          className="audio-player"
        >
          <source src={media.url} type={media.mimeType} />
          Your browser does not support the audio element.
        </audio>
      )}
    </div>
  );

  const renderVideo = () => (
    <div className="media-video-container">
      {isLoading && (
        <div className="media-loading">
          <div className="spinner"></div>
        </div>
      )}
      {error ? (
        <div className="media-error">
          <span className="error-icon">🎬</span>
          <span>Failed to load video</span>
        </div>
      ) : (
        <video
          controls={showControls}
          preload="metadata"
          style={{ maxWidth, maxHeight }}
          onLoadedData={handleLoad}
          onError={handleError}
          className="media-video"
        >
          <source src={media.url} type={media.mimeType} />
          Your browser does not support the video element.
        </video>
      )}
    </div>
  );

  const renderMediaContent = () => {
    switch (media.type) {
      case 'IMAGE':
        return renderImage();
      case 'AUDIO':
        return renderAudio();
      case 'VIDEO':
        return renderVideo();
      default:
        return (
          <div className="media-error">
            <span className="error-icon">❓</span>
            <span>Unsupported media type</span>
          </div>
        );
    }
  };

  return (
    <>
      <div className={`media-display ${media.type.toLowerCase()} ${className}`}>
        <div className="media-content">
          {renderMediaContent()}
          
          {showFileName && (
            <div className="media-info">
              <span className="media-filename">{media.filename}</span>
              <div className="media-metadata">
                <span className="media-size">{formatFileSize(media.size)}</span>
                {media.width && media.height && media.type === 'IMAGE' && (
                  <span className="media-dimensions">
                    {media.width} × {media.height}
                  </span>
                )}
                {media.duration && media.type === 'VIDEO' && (
                  <span className="media-duration">
                    {formatDuration(media.duration)}
                  </span>
                )}
              </div>
            </div>
          )}
          
          {editable && (
            <div className="media-actions">
              <button
                onClick={handleDelete}
                className="delete-button"
                title="Delete media file"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="10"
                    y1="11"
                    x2="10"
                    y2="17"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="14"
                    y1="11"
                    x2="14"
                    y2="17"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen modal for images */}
      {isFullscreen && media.type === 'IMAGE' && (
        <div className="fullscreen-overlay" onClick={closeFullscreen}>
          <div className="fullscreen-content">
            <img
              src={media.url}
              alt={media.filename}
              className="fullscreen-image"
            />
            <button
              className="fullscreen-close"
              onClick={closeFullscreen}
              title="Close fullscreen"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default MediaDisplay; 