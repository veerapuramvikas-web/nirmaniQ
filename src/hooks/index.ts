import { useState, useEffect, useCallback } from 'react';

// ─── Re-export all Supabase data hooks ───────────────────────────────────────
export { useAuth }        from './useAuth';
export type { Profile }   from './useAuth';
export { useRealtime }    from './useRealtime';
export {
  useProjects,
  useProjectDetail,
  useExpenses,
  useMaterials,
  useDailyReports,
  useReportDetail,
  useIssues,
  useIssueDetail,
  useBudget,
  useProfiles,
} from './useData';

/**
 * Hook for a simple toast notification system.
 */
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

let _toastListeners: Set<(toasts: Toast[]) => void> = new Set();
let _toasts: Toast[] = [];

export function showToast(message: string, type: Toast['type'] = 'success'): void {
  const id = `toast_${Date.now()}`;
  _toasts = [..._toasts, { id, type, message }];
  _toastListeners.forEach(fn => fn([..._toasts]));
  setTimeout(() => {
    _toasts = _toasts.filter(t => t.id !== id);
    _toastListeners.forEach(fn => fn([..._toasts]));
  }, 3500);
}

export function useToasts(): Toast[] {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    _toastListeners.add(setToasts);
    return () => { _toastListeners.delete(setToasts); };
  }, []);
  return toasts;
}

/**
 * Hook for modal open/close state.
 */
export function useModal(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(p => !p), []);
  return { isOpen, open, close, toggle };
}

/**
 * Debounce hook
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
