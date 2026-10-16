import { AlertCircle } from 'lucide-react';

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      textAlign: 'center',
      background: '#fef2f2',
      borderRadius: 12,
      border: '1px solid #fecaca',
      margin: '20px 0',
    }}>
      <div style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: '#fee2e2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        color: '#dc2626',
      }}>
        <AlertCircle size={24} />
      </div>
      <h3 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700, color: '#991b1b' }}>{title}</h3>
      {message && <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: '#b91c1c', maxWidth: 440 }}>{message}</p>}
      {onRetry && (
        <button className="btn btn-secondary btn-sm" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}

export function PageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 280,
      gap: 14,
    }}>
      <div style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        border: '3px solid #e5e7eb',
        borderTopColor: '#2563eb',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 500 }}>{message}</p>
    </div>
  );
}
