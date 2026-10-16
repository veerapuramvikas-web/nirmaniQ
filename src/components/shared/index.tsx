import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X, Search } from 'lucide-react';
import { useToasts, type Toast } from '../../hooks';
export { PageLoader, ErrorState } from './LoadingSpinner';
export { OfflineBanner } from './OfflineBanner';

// ─── Toast Container ──────────────────────────────────────────────────────────

export function ToastContainer() {
  const toasts = useToasts();
  if (!toasts.length) return null;

  const icons: Record<Toast['type'], React.ReactNode> = {
    success: <CheckCircle size={18} className="text-green-600" />,
    error: <XCircle size={18} className="text-red-600" />,
    warning: <AlertTriangle size={18} className="text-amber-600" />,
    info: <Info size={18} className="text-blue-600" />,
  };

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {toasts.map((t: Toast) => (
        <div key={t.id} className="toast">
          {icons[t.type]}
          <span style={{ fontSize: '0.875rem', color: '#1f2937', flex: 1 }}>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  footer?: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children, size = 'md', footer }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClass = size === 'lg' ? 'modal-content-lg' : size === 'sm' ? 'modal-content-sm' : '';

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal-content ${sizeClass}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f3f4f6' }}>
          <h2 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 700, color: '#111827', fontFamily: 'var(--font-display)' }}>{title}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '4px', borderRadius: '6px' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '24px' }}>
          {children}
        </div>
        {footer && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

interface ConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  loading?: boolean;
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Confirm', confirmVariant = 'danger', loading }: ConfirmProps) {
  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
          <button className={`btn btn-${confirmVariant}`} onClick={onConfirm} disabled={loading}>
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ margin: 0, color: '#374151', fontSize: '0.9375rem' }}>{message}</p>
    </Modal>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────

export function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`badge ${className}`}>{children}</span>;
}

// ─── Empty State ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state" style={{
      padding: '54px 24px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
    }}>
      <div style={{
        width: 68,
        height: 68,
        borderRadius: 20,
        background: '#fffbeb',
        border: '1px solid #fef3c7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 18,
        color: '#ca8a04',
        boxShadow: '0 4px 14px rgba(255, 221, 0, 0.2)',
      }}>
        {icon}
      </div>
      <h3 style={{
        fontWeight: 800,
        color: '#111111',
        fontSize: '1.15rem',
        margin: '0 0 6px',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        letterSpacing: '-0.02em'
      }}>
        {title}
      </h3>
      {description && (
        <p style={{
          fontSize: '0.85rem',
          margin: '0 0 20px',
          color: '#71717a',
          maxWidth: 380,
          lineHeight: 1.5,
        }}>
          {description}
        </p>
      )}
      {action && (
        <div style={{ marginTop: description ? 0 : 16 }}>
          {action}
        </div>
      )}
    </div>
  );
}

// ─── Loading ─────────────────────────────────────────────────────────────────

export function LoadingSpinner({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="#e5e7eb" strokeWidth="3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

export function ProgressBar({ value, max = 100, color }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const fillColor = color || (pct > 100 ? '#dc2626' : pct > 85 ? '#f59e0b' : '#22c55e');
  return (
    <div className="progress-bar">
      <div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%`, background: fillColor }} />
    </div>
  );
}

// ─── Stats Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  trend?: { value: string; isPositive: boolean };
  onClick?: () => void;
  alert?: boolean;
}

export function StatCard({ label, value, sub, icon, iconBg = '#f4f4f5', trend, onClick, alert }: StatCardProps) {
  return (
    <div
      className={`card card-hover ${alert ? 'budget-warning' : ''}`}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        padding: '20px',
        position: 'relative',
        background: '#ffffff',
        border: '1px solid #f4f4f5',
        borderRadius: 20,
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.02)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 110
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{
          margin: 0,
          fontSize: '0.8rem',
          fontWeight: 600,
          color: '#71717a',
          textTransform: 'none',
          letterSpacing: '-0.01em'
        }}>
          {label}
        </p>
        {icon && (
          <div style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: '#71717a'
          }}>
            {icon}
          </div>
        )}
      </div>

      <div style={{ margin: '14px 0 6px' }}>
        <p style={{
          margin: 0,
          fontSize: '1.75rem',
          fontWeight: 800,
          color: alert ? '#ef4444' : '#111111',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
        }}>
          {value}
        </p>
        {sub && (
          <p style={{
            margin: '4px 0 0',
            fontSize: '0.78rem',
            color: '#71717a',
            fontWeight: 500,
          }}>
            {sub}
          </p>
        )}
      </div>

      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.73rem', marginTop: 4 }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            color: trend.isPositive ? '#22c55e' : '#ef4444',
            background: trend.isPositive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            padding: '2px 6px',
            borderRadius: 6,
            fontWeight: 700
          }}>
            {trend.isPositive ? '+' : '-'}{trend.value}
          </span>
          <span style={{ color: '#71717a' }}>from the last month</span>
        </div>
      )}
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

interface SectionCardProps {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  noPad?: boolean;
}

export function SectionCard({ title, action, children, noPad }: SectionCardProps) {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid #f3f4f6' }}>
        <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#111827', fontFamily: 'var(--font-display)' }}>{title}</h3>
        {action}
      </div>
      <div style={noPad ? {} : { padding: '20px 24px' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Form Field ───────────────────────────────────────────────────────────────

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}

export function FormField({ label, error, required, children, hint }: FormFieldProps) {
  return (
    <div>
      <label className="form-label">
        {label}
        {required && <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && !error && <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 4, display: 'block' }}>{hint}</span>}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

// ─── Page Header ─────────────────────────────────────────────────────────────

interface PageHeaderProps {
  title: string;
  breadcrumb?: { label: string; onClick?: () => void }[];
  action?: React.ReactNode;
  subtitle?: string;
}

export function PageHeader({ title, breadcrumb, action, subtitle }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      {breadcrumb && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: '0.8125rem', color: '#a1a1aa' }}>
          {breadcrumb.map((b, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span>/</span>}
              {b.onClick ? (
                <button onClick={b.onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', fontSize: 'inherit', padding: 0, fontWeight: 500 }} className="hover:text-black">
                  {b.label}
                </button>
              ) : (
                <span style={{ color: '#111111', fontWeight: 700 }}>{b.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: '1.65rem',
            fontWeight: 800,
            color: '#111111',
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            letterSpacing: '-0.03em'
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{
              margin: '4px 0 0',
              fontSize: '0.85rem',
              color: '#71717a',
              fontWeight: 500
            }}>
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 22 }}>
      {children}
    </div>
  );
}

// ─── Search Input ─────────────────────────────────────────────────────────────

export function SearchInput({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
      <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa', pointerEvents: 'none' }} />
      <input
        className="form-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          paddingLeft: 38,
          borderRadius: 24,
          height: 42,
          border: '1px solid #e4e4e7',
          background: '#ffffff',
          fontSize: '0.85rem'
        }}
      />
    </div>
  );
}

// ─── Select Filter ────────────────────────────────────────────────────────────

export function SelectFilter({ value, onChange, options, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <select
      className="form-select"
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: 'auto',
        minWidth: 160,
        flex: 'none',
        borderRadius: 24,
        height: 42,
        border: '1px solid #e4e4e7',
        background: '#ffffff',
        fontSize: '0.85rem',
        padding: '0 36px 0 16px'
      }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ─── Demo Banner ──────────────────────────────────────────────────────────────

export function DemoBanner() {
  return (
    <div className="demo-banner">
      <Info size={14} />
      <span><strong>DEMONSTRATION MODE</strong> — All data shown is sample seed data for illustration purposes. No real client records are present.</span>
    </div>
  );
}
