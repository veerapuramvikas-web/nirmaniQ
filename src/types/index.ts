// ─── Core Enums ─────────────────────────────────────────────────────────────

export type UserRole = 'owner' | 'supervisor' | 'accountant';

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed';

export type ExpenseStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export type MaterialOrderStatus = 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled';

export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';

export type ReportStatus = 'draft' | 'submitted';

// ─── User / Auth ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  created_at: string;
}

// ─── Project ──────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  code: string;
  client_name: string;
  site_address: string;
  project_type: string;
  status: ProjectStatus;
  start_date: string;        // ISO date
  expected_end_date: string; // ISO date
  total_budget: number;      // INR, numeric(15,2)
  progress_percentage: number;
  assigned_supervisor_id: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Budget ──────────────────────────────────────────────────────────────────

export interface BudgetCategory {
  id: string;
  project_id: string;
  category: ExpenseCategory;
  planned_amount: number;    // INR, numeric(15,2)
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type ExpenseCategory =
  | 'Cement & Concrete'
  | 'Steel & Metal'
  | 'Sand, Aggregate & Bricks'
  | 'Labour'
  | 'Electrical'
  | 'Plumbing'
  | 'Equipment & Machinery'
  | 'Transportation'
  | 'Site Miscellaneous';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Cement & Concrete',
  'Steel & Metal',
  'Sand, Aggregate & Bricks',
  'Labour',
  'Electrical',
  'Plumbing',
  'Equipment & Machinery',
  'Transportation',
  'Site Miscellaneous',
];

// ─── Expense ─────────────────────────────────────────────────────────────────

export type PaymentMethod = 'cash' | 'bank_transfer' | 'cheque' | 'upi' | 'credit';

export interface Expense {
  id: string;
  title: string;
  project_id: string;
  site?: string;
  expense_date: string;       // ISO date
  category: ExpenseCategory;
  amount: number;             // INR, numeric(15,2)
  supplier?: string;
  invoice_number?: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: ExpenseStatus;
  notes?: string;
  attachment_url?: string;
  attachment_name?: string;
  submitted_by: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  material_order_id?: string; // link to material order if applicable
  created_at: string;
  updated_at: string;
}

// ─── Material ─────────────────────────────────────────────────────────────────

export type MaterialUnit = 'bags' | 'kg' | 'tonnes' | 'cft' | 'cum' | 'pcs' | 'litres' | 'rft' | 'sqft';

export const MATERIAL_UNITS: MaterialUnit[] = ['bags', 'kg', 'tonnes', 'cft', 'cum', 'pcs', 'litres', 'rft', 'sqft'];

export type MaterialCategory = 'Cement' | 'Steel' | 'Sand & Aggregate' | 'Bricks & Blocks' | 'Electrical' | 'Plumbing' | 'Hardware' | 'Miscellaneous';

export const MATERIAL_CATEGORIES: MaterialCategory[] = [
  'Cement', 'Steel', 'Sand & Aggregate', 'Bricks & Blocks',
  'Electrical', 'Plumbing', 'Hardware', 'Miscellaneous',
];

export interface MaterialOrder {
  id: string;
  project_id: string;
  site?: string;
  material_name: string;
  material_category: MaterialCategory;
  unit: MaterialUnit;
  supplier: string;
  quantity_ordered: number;
  quantity_received: number;
  quantity_used: number;
  unit_price: number;         // INR per unit
  order_date: string;         // ISO date
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  po_reference?: string;
  challan_url?: string;
  challan_name?: string;
  status: MaterialOrderStatus;
  opening_stock: number;
  expense_id?: string;        // linked expense record
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Derived: closing stock = opening_stock + quantity_received - quantity_used
export function closingStock(order: MaterialOrder): number {
  return order.opening_stock + order.quantity_received - order.quantity_used;
}

export function outstandingDelivery(order: MaterialOrder): number {
  return Math.max(0, order.quantity_ordered - order.quantity_received);
}

// ─── Daily Report ─────────────────────────────────────────────────────────────

export interface DailyReportPhoto {
  id: string;
  report_id: string;
  url: string;
  name: string;
  caption?: string;
}

export interface DailyReport {
  id: string;
  project_id: string;
  site?: string;
  report_date: string;        // ISO date
  supervisor_id: string;
  weather?: string;
  work_completed: string;
  work_quantity?: string;
  worker_count: number;
  materials_received?: string;
  materials_used?: string;
  equipment_notes?: string;
  issues_and_delays?: string;
  follow_up_required?: string;
  additional_notes?: string;
  status: ReportStatus;
  photos: DailyReportPhoto[];
  created_at: string;
  updated_at: string;
}

// ─── Issue ────────────────────────────────────────────────────────────────────

export type IssueCategory = 'Safety' | 'Quality' | 'Material Shortage' | 'Labour' | 'Equipment' | 'Design' | 'Weather' | 'Other';

export const ISSUE_CATEGORIES: IssueCategory[] = [
  'Safety', 'Quality', 'Material Shortage', 'Labour', 'Equipment', 'Design', 'Weather', 'Other',
];

export interface Issue {
  id: string;
  title: string;
  description: string;
  project_id: string;
  site?: string;
  category: IssueCategory;
  priority: IssuePriority;
  reported_date: string;      // ISO date
  assigned_to?: string;
  target_resolution_date?: string;
  status: IssueStatus;
  related_report_id?: string;
  photo_url?: string;
  resolution_notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ─── Approval Event ───────────────────────────────────────────────────────────

export interface ApprovalEvent {
  id: string;
  expense_id: string;
  action: 'submitted' | 'approved' | 'rejected' | 'revised';
  performed_by: string;
  notes?: string;
  created_at: string;
}

// ─── App State ────────────────────────────────────────────────────────────────

export interface AppStore {
  users: User[];
  currentUser: User;
  projects: Project[];
  budgetCategories: BudgetCategory[];
  expenses: Expense[];
  materialOrders: MaterialOrder[];
  dailyReports: DailyReport[];
  issues: Issue[];
  approvalEvents: ApprovalEvent[];
}
