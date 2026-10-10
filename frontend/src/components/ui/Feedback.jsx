import React from 'react';
import { RefreshCw } from 'lucide-react';

export function PageLoadingState({ label = 'Đang tải nội dung' }) {
  return (
    <div className="page-state page-state-loading" role="status" aria-live="polite">
      <div className="page-skeleton" aria-hidden="true">
        <span className="page-skeleton-title" />
        <span className="page-skeleton-line" />
        <span className="page-skeleton-line page-skeleton-line-short" />
        <div className="page-skeleton-grid">
          <span />
          <span />
          <span />
        </div>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function EmptyState({ children, action = null, page = false }) {
  return (
    <div className={`empty-state ${page ? 'empty-state-page' : 'empty-state-compact'}`}>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function ErrorState({ title, detail, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <div>
        <p className="error-state-title">{title}</p>
        {detail && <p className="error-state-detail">{detail}</p>}
      </div>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          <RefreshCw size={16} aria-hidden="true" /> Thử lại
        </button>
      )}
    </div>
  );
}
