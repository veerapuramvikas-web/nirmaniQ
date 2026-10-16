// ─── Currency Formatting ─────────────────────────────────────────────────────

/**
 * Format a number as INR with Indian locale (e.g., ₹18,50,000)
 */
export function formatINR(amount: number, compact = false): string {
  if (compact) {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a number with Indian commas (no currency symbol)
 */
export function formatNumber(num: number, decimals = 0): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

// ─── Date Formatting ──────────────────────────────────────────────────────────

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Format ISO date string as "15 Mar 2024"
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

/**
 * Format ISO datetime string as "15 Mar 2024, 10:30 AM"
 */
export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${time}`;
  } catch {
    return dateStr;
  }
}

/**
 * Today's date as YYYY-MM-DD
 */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Get relative time string
 */
export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

// ─── Status Helpers ───────────────────────────────────────────────────────────

export function projectStatusLabel(status: string): string {
  const map: Record<string, string> = {
    planning: 'Planning',
    active: 'Active',
    on_hold: 'On Hold',
    completed: 'Completed',
  };
  return map[status] || status;
}

export function projectStatusColor(status: string): string {
  const map: Record<string, string> = {
    planning: 'badge-purple',
    active: 'badge-green',
    on_hold: 'badge-amber',
    completed: 'badge-gray',
  };
  return map[status] || 'badge-gray';
}

export function expenseStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Draft',
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    rejected: 'Rejected',
  };
  return map[status] || status;
}

export function expenseStatusColor(status: string): string {
  const map: Record<string, string> = {
    draft: 'badge-gray',
    pending_approval: 'badge-amber',
    approved: 'badge-green',
    rejected: 'badge-red',
  };
  return map[status] || 'badge-gray';
}

export function paymentStatusLabel(status: string): string {
  const map: Record<string, string> = {
    unpaid: 'Unpaid',
    partial: 'Partial',
    paid: 'Paid',
  };
  return map[status] || status;
}

export function paymentStatusColor(status: string): string {
  const map: Record<string, string> = {
    unpaid: 'badge-red',
    partial: 'badge-amber',
    paid: 'badge-green',
  };
  return map[status] || 'badge-gray';
}

export function materialStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Draft',
    ordered: 'Ordered',
    partially_received: 'Partially Received',
    received: 'Received',
    cancelled: 'Cancelled',
  };
  return map[status] || status;
}

export function materialStatusColor(status: string): string {
  const map: Record<string, string> = {
    draft: 'badge-gray',
    ordered: 'badge-blue',
    partially_received: 'badge-amber',
    received: 'badge-green',
    cancelled: 'badge-red',
  };
  return map[status] || 'badge-gray';
}

export function issueStatusLabel(status: string): string {
  const map: Record<string, string> = {
    open: 'Open',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
  };
  return map[status] || status;
}

export function issueStatusColor(status: string): string {
  const map: Record<string, string> = {
    open: 'badge-red',
    in_progress: 'badge-amber',
    resolved: 'badge-green',
    closed: 'badge-gray',
  };
  return map[status] || 'badge-gray';
}

export function issuePriorityLabel(priority: string): string {
  const map: Record<string, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    critical: 'Critical',
  };
  return map[priority] || priority;
}

export function issuePriorityColor(priority: string): string {
  const map: Record<string, string> = {
    low: 'badge-gray',
    medium: 'badge-blue',
    high: 'badge-amber',
    critical: 'badge-red',
  };
  return map[priority] || 'badge-gray';
}

export function roleLabel(role: string): string {
  const map: Record<string, string> = {
    owner: 'Owner / Admin',
    supervisor: 'Site Supervisor',
    accountant: 'Accountant',
  };
  return map[role] || role;
}

// ─── Progress Color ───────────────────────────────────────────────────────────

export function progressColor(pct: number): string {
  if (pct >= 90) return '#22c55e';
  if (pct >= 60) return '#3b82f6';
  if (pct >= 30) return '#f59e0b';
  return '#ef4444';
}

export function budgetUsedColor(pct: number): string {
  if (pct > 100) return '#dc2626';
  if (pct > 85) return '#f59e0b';
  return '#22c55e';
}

// ─── File helpers ─────────────────────────────────────────────────────────────

export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
export const ALLOWED_DOC_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const MAX_FILE_SIZE_MB = 5;

export function validateFile(file: File, allowedTypes: string[]): string | null {
  if (!allowedTypes.includes(file.type)) {
    return `Invalid file type. Allowed: ${allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}`;
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `File size must be under ${MAX_FILE_SIZE_MB}MB`;
  }
  return null;
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function truncate(str: string, maxLen: number): string {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

export function percentage(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}
