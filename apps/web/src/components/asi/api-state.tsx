'use client';
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import * as React from 'react';

interface ApiStateProps {
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
  onRetry?: () => void;
  loadingText?: string;
}

export function ApiState({ loading, error, children, onRetry, loadingText = 'Loading...' }: ApiStateProps) {
  if (loading) {
    return (
      <div style={{
        padding: 24,
        textAlign: 'center',
        color: 'var(--muted)',
        fontSize: 13,
        background: '#FAFBF9',
        borderRadius: 10,
        border: '1px solid var(--border)',
      }}>
        <div style={{
          display: 'inline-block',
          width: 14,
          height: 14,
          border: '2px solid var(--border)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginRight: 8,
          verticalAlign: 'middle',
        }}/>
        {loadingText}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: 16,
        background: '#FEF2F2',
        border: '1px solid #FECACA',
        borderRadius: 10,
        color: '#B91C1C',
        fontSize: 13,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Failed to load data</div>
        <div style={{ fontSize: 12, color: '#7F1D1D', marginBottom: onRetry ? 12 : 0 }}>{error}</div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="btn btn-sm"
            style={{ background: 'white', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 12 }}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Inline small loading placeholder.
 */
export function InlineLoader({ text = 'Loading' }: { text?: string }) {
  return (
    <span style={{ color: 'var(--muted)', fontSize: 11, fontStyle: 'italic' }}>
      {text}...
    </span>
  );
}

/**
 * Empty state component.
 */
export function EmptyState({ title, description, icon }: { title: string; description?: string; icon?: React.ReactNode }) {
  return (
    <div style={{
      padding: 32,
      textAlign: 'center',
      color: 'var(--muted)',
      background: '#FAFBF9',
      borderRadius: 10,
      border: '1px dashed var(--border)',
    }}>
      {icon && <div style={{ marginBottom: 10 }}>{icon}</div>}
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{title}</div>
      {description && <div style={{ fontSize: 12 }}>{description}</div>}
    </div>
  );
}
