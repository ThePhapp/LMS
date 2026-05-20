import React, { useState, useEffect } from 'react';
import { FileArchive, ExternalLink, Maximize2, X } from 'lucide-react';
import api, { assetUrl } from '../services/api';

/**
 * PackageViewer - Display extracted web packages in iframe or redirect
 * Supports:
 * - Web packages exported as ZIP files
 * - Automatic iframe embedding
 * - Fullscreen mode
 * - Fallback redirect option
 */
const PackageViewer = ({ lessonId, fileName, packageUrl, inline = false }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [packageInfo, setPackageInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (lessonId) {
      fetchPackageInfo();
    } else {
      setLoading(false);
    }
  }, [lessonId]);

  const fetchPackageInfo = async () => {
    try {
      const response = await api.get(`/lessons/${lessonId}/package-info`);
      setPackageInfo(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load package info');
      console.error('Error fetching package info:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="package-loader" style={styles.loader}>
        <div style={styles.spinnerContainer}>
          <div style={styles.spinner}></div>
          <p>Đang tải gói web...</p>
        </div>
      </div>
    );
  }

  const rawUrl = packageInfo?.packageUrl || packageUrl;
  const fullUrl = rawUrl ? assetUrl(rawUrl) : null;

  if (error) {
    return (
      <div style={styles.error}>
        <FileArchive size={32} color="#ff6b6b" />
        <p>Lỗi: {error}</p>
        {fullUrl && (
          <a href={fullUrl} target="_blank" rel="noopener noreferrer" style={styles.fallbackLink}>
            Mở trong tab mới <ExternalLink size={16} />
          </a>
        )}
      </div>
    );
  }
  
  if (!fullUrl) {
    return (
      <div style={styles.error}>
        <FileArchive size={32} color="#ffa94d" />
        <p>Không tìm thấy gói web</p>
      </div>
    );
  }

  // Fullscreen modal
  if (isFullscreen) {
    return (
      <div style={styles.fullscreenModal}>
        <div style={styles.fullscreenControls}>
          <span style={styles.fileName}>{fileName || 'Web Package'}</span>
          <button
            onClick={() => setIsFullscreen(false)}
            style={styles.closeButton}
            title="Đóng toàn màn hình"
          >
            <X size={20} />
          </button>
        </div>
        <iframe
          src={fullUrl}
          style={styles.fullscreenIframe}
          title="Web Package Viewer"
          allow="accelerometer; ambient-light-sensor; autoplay; battery; camera; display-capture; document-domain; encrypted-media; fullscreen; geolocation; gyroscope; magnetometer; microphone; midi; payment; usb; vr; xr-spatial-tracking"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
        />
      </div>
    );
  }

  // Inline iframe view
  if (inline) {
    return (
      <div style={styles.packageContainer}>
        <div style={styles.packageHeader}>
          <div style={styles.packageTitle}>
            <FileArchive size={20} />
            <span>{fileName || 'Web Package'}</span>
          </div>
          <div style={styles.packageActions}>
            <button
              onClick={() => setIsFullscreen(true)}
              style={styles.iconButton}
              title="Toàn màn hình"
            >
              <Maximize2 size={18} />
            </button>
            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.iconButton}
              title="Mở trong tab mới"
            >
              <ExternalLink size={18} />
            </a>
          </div>
        </div>
        <iframe
          src={fullUrl}
          style={styles.iframe}
          title="Web Package Viewer"
          allow="accelerometer; ambient-light-sensor; autoplay; battery; camera; display-capture; document-domain; encrypted-media; fullscreen; geolocation; gyroscope; magnetometer; microphone; midi; payment; usb; vr; xr-spatial-tracking"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
        />
      </div>
    );
  }

  // Card view (default)
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.cardTitle}>
          <FileArchive size={24} color="var(--primary)" />
          <div>
            <h4>{fileName || 'Web Package'}</h4>
            <p>Gói web tương tác</p>
          </div>
        </div>
      </div>
      <div style={styles.cardActions}>
        <button
          onClick={() => setIsFullscreen(true)}
          style={styles.button}
        >
          <Maximize2 size={16} />
          Xem toàn màn hình
        </button>
        <a
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.button}
        >
          <ExternalLink size={16} />
          Mở trong tab mới
        </a>
      </div>
    </div>
  );
};

const styles = {
  loader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px'
  },
  spinnerContainer: {
    textAlign: 'center'
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid var(--primary)',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 16px',
    '@keyframes spin': {
      '0%': { transform: 'rotate(0deg)' },
      '100%': { transform: 'rotate(360deg)' }
    }
  },
  error: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '8px',
    textAlign: 'center'
  },
  fallbackLink: {
    marginTop: '16px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: 'var(--primary)',
    color: 'white',
    borderRadius: '4px',
    textDecoration: 'none',
    fontSize: '14px',
    cursor: 'pointer'
  },
  packageContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '600px',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: 'white',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  packageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #eee',
    backgroundColor: '#f9f9f9'
  },
  packageTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    fontWeight: '500'
  },
  packageActions: {
    display: 'flex',
    gap: '8px'
  },
  iconButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
    color: 'var(--primary)',
    transition: 'all 0.2s',
    textDecoration: 'none',
    ':hover': {
      backgroundColor: 'var(--primary)',
      color: 'white'
    }
  },
  iframe: {
    flex: 1,
    border: 'none',
    borderRadius: '0 0 8px 8px',
    width: '100%'
  },
  card: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
  },
  cardHeader: {
    marginBottom: '16px'
  },
  cardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  cardActions: {
    display: 'flex',
    gap: '12px'
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: 'var(--primary)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    textDecoration: 'none',
    transition: 'opacity 0.2s',
    ':hover': {
      opacity: 0.9
    }
  },
  fullscreenModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column'
  },
  fullscreenControls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: '#1a1a1a',
    color: 'white'
  },
  fileName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#fff'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.2s',
    ':hover': {
      opacity: 0.7
    }
  },
  fullscreenIframe: {
    flex: 1,
    border: 'none',
    width: '100%',
    height: '100%'
  }
};

export default PackageViewer;
