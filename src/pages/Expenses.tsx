import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Receipt, Check, X, Eye } from 'lucide-react';
import { useExpenses, useProjects, useProfiles, useAuth, useRealtime, showToast } from '../hooks';
import * as expenseService from '../services/expense.service';
import { uploadFile, getSignedUrl } from '../services/storage.service';
import {
  formatINR, formatDate, expenseStatusColor, expenseStatusLabel,
  paymentStatusColor, paymentStatusLabel, validateFile, ALLOWED_DOC_TYPES
} from '../utils';
import {
  PageHeader, EmptyState, SearchInput,
  SelectFilter, FilterBar, Modal, FormField, PageLoader, ErrorState
} from '../components/shared';
import type { Expense, ExpenseCategory, PaymentMethod, PaymentStatus, ExpenseStatus } from '../types';
import { EXPENSE_CATEGORIES } from '../types';

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'upi', label: 'UPI' },
  { value: 'credit', label: 'Credit' },
];

interface ExpenseFormData {
  title: string;
  project_id: string;
  site: string;
  expense_date: string;
  category: ExpenseCategory;
  amount: string;
  supplier: string;
  invoice_number: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: ExpenseStatus;
  notes: string;
  file?: File;
}

function ExpenseForm({
  projects,
  initial,
  onSubmit,
  onClose
}: {
  projects: any[];
  initial?: Partial<ExpenseFormData>;
  onSubmit: (data: ExpenseFormData) => void;
  onClose: () => void;
}) {
  const [searchParams] = useSearchParams();
  const defaultProjectId = searchParams.get('projectId') || initial?.project_id || (projects[0]?.id || '');

  const [form, setForm] = useState<ExpenseFormData>({
    title: '', project_id: defaultProjectId, site: '', expense_date: new Date().toISOString().slice(0, 10),
    category: 'Cement & Concrete', amount: '', supplier: '', invoice_number: '',
    payment_method: 'bank_transfer', payment_status: 'unpaid', status: 'draft', notes: '',
    ...initial,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ExpenseFormData, string>>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const set = (k: keyof ExpenseFormData, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file, ALLOWED_DOC_TYPES);
    if (err) { showToast(err, 'error'); return; }
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof ExpenseFormData, string>> = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.project_id) errs.project_id = 'Project is required';
    if (!form.expense_date) errs.expense_date = 'Date is required';
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) errs.amount = 'Valid positive amount required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSubmit({ ...form, file: selectedFile || undefined });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <FormField label="Expense Title / Description" error={errors.title} required>
            <input className={`form-input ${errors.title ? 'error' : ''}`} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. OPC 53 Grade Cement — Batch 1" />
          </FormField>
        </div>
        <FormField label="Project" error={errors.project_id} required>
          <select className={`form-select ${errors.project_id ? 'error' : ''}`} value={form.project_id} onChange={e => set('project_id', e.target.value)}>
            <option value="">Select Project</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </FormField>
        <FormField label="Site">
          <input className="form-input" value={form.site} onChange={e => set('site', e.target.value)} placeholder="e.g. Site A" />
        </FormField>
        <FormField label="Expense Date" error={errors.expense_date} required>
          <input type="date" className={`form-input ${errors.expense_date ? 'error' : ''}`} value={form.expense_date} onChange={e => set('expense_date', e.target.value)} />
        </FormField>
        <FormField label="Category" required>
          <select className="form-select" value={form.category} onChange={e => set('category', e.target.value as ExpenseCategory)}>
            {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </FormField>
        <FormField label="Amount (₹)" error={errors.amount} required>
          <input type="number" className={`form-input ${errors.amount ? 'error' : ''}`} value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="Amount in INR" min={0} step={0.01} />
        </FormField>
        <FormField label="Supplier / Payee">
          <input className="form-input" value={form.supplier} onChange={e => set('supplier', e.target.value)} placeholder="Supplier name" />
        </FormField>
        <FormField label="Invoice / Bill No.">
          <input className="form-input" value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)} placeholder="e.g. INV-2024-001" />
        </FormField>
        <FormField label="Payment Method" required>
          <select className="form-select" value={form.payment_method} onChange={e => set('payment_method', e.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </FormField>
        <FormField label="Payment Status" required>
          <select className="form-select" value={form.payment_status} onChange={e => set('payment_status', e.target.value as PaymentStatus)}>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
        </FormField>
        <div style={{ gridColumn: '1/-1' }}>
          <FormField label="Notes">
            <textarea className="form-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes or remarks" rows={2} />
          </FormField>
        </div>

        {/* Bill Upload */}
        <div style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Bill / Receipt Attachment</label>
          <div style={{ border: '2px dashed #d1d5db', borderRadius: 10, padding: '20px', textAlign: 'center', background: '#fafafa', position: 'relative' }}>
            {preview ? (
              <div>
                {selectedFile?.type.startsWith('image') ? (
                  <img src={preview} alt="attachment" style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 6, marginBottom: 8 }} />
                ) : (
                  <p style={{ margin: '0 0 8px', fontSize: '0.875rem', fontWeight: 600 }}>📄 {selectedFile?.name}</p>
                )}
                <br />
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSelectedFile(null); setPreview(null); }}>Remove</button>
              </div>
            ) : (
              <div>
                <p style={{ margin: '0 0 8px', fontSize: '0.875rem', color: '#6b7280' }}>Upload invoice image or PDF document</p>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                  Browse File
                  <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFileChange} style={{ display: 'none' }} />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary">Save Expense</button>
      </div>
    </form>
  );
}

function ExpenseDetail({
  expense,
  projects,
  profiles,
  currentUserRole,
  onClose: _onClose,
  onApprove,
  onReject,
  onSubmit,
}: {
  expense: any;
  projects: any[];
  profiles: any[];
  currentUserRole?: string;
  onClose: () => void;
  onApprove?: () => void;
  onReject?: (reason: string) => void;
  onSubmit?: () => void;
}) {
  const project = projects.find((p: any) => p.id === expense.project_id);
  const submitter = expense.submitter || profiles.find((u: any) => u.id === expense.submitted_by);
  const approver = expense.approver || profiles.find((u: any) => u.id === expense.approved_by);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [signedDocUrl, setSignedDocUrl] = useState<string | null>(expense.attachment_url || null);

  React.useEffect(() => {
    if (expense.attachment_path) {
      getSignedUrl('expense-attachments', expense.attachment_path)
        .then(url => setSignedDocUrl(url))
        .catch(() => {});
    }
  }, [expense.attachment_path]);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        {[
          ['Project', project?.name || '—'],
          ['Category', expense.category],
          ['Amount', formatINR(expense.amount)],
          ['Date', formatDate(expense.expense_date)],
          ['Supplier', expense.supplier || '—'],
          ['Invoice No.', expense.invoice_number || '—'],
          ['Payment Method', (expense.payment_method || '').replace('_', ' ')],
          ['Payment Status', paymentStatusLabel(expense.payment_status)],
          ['Submitted By', submitter?.name || '—'],
          ['Submission Status', expenseStatusLabel(expense.status)],
          ...(approver ? [['Approved By', approver.name]] : []),
          ...(expense.rejection_reason ? [['Rejection Reason', expense.rejection_reason]] : []),
        ].map(([k, v]) => (
          <div key={k}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{k}</p>
            <p style={{ margin: '3px 0 0', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>{v}</p>
          </div>
        ))}
      </div>

      {expense.notes && (
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '12px', marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#6b7280', fontWeight: 600, marginBottom: 4 }}>Notes</p>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>{expense.notes}</p>
        </div>
      )}

      {signedDocUrl && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Attachment</p>
          {signedDocUrl.includes('.pdf') ? (
            <a href={signedDocUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm"><Eye size={13} /> View PDF Invoice</a>
          ) : (
            <img src={signedDocUrl} alt="bill" style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8, border: '1px solid #e5e7eb' }} />
          )}
        </div>
      )}

      {/* Actions */}
      {expense.status === 'pending_approval' && (currentUserRole === 'owner' || !currentUserRole) && (
        <div style={{ display: 'flex', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
          {!showReject ? (
            <>
              <button className="btn btn-secondary" onClick={() => setShowReject(true)} style={{ flex: 1 }}>
                <X size={14} /> Reject
              </button>
              <button className="btn btn-success" onClick={onApprove} style={{ flex: 1 }}>
                <Check size={14} /> Approve
              </button>
            </>
          ) : (
            <div style={{ width: '100%' }}>
              <textarea className="form-textarea" placeholder="Rejection reason (required)" value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2} style={{ marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowReject(false)}>Cancel</button>
                <button className="btn btn-danger btn-sm" onClick={() => rejectReason.trim() && onReject?.(rejectReason)} disabled={!rejectReason.trim()}>
                  Confirm Rejection
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {expense.status === 'draft' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
          <button className="btn btn-primary" onClick={onSubmit}>Submit for Approval</button>
        </div>
      )}
    </div>
  );
}

export function ExpensesPage() {
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const { projects } = useProjects();
  const { profiles } = useProfiles();
  const { expenses, loading, error, reload } = useExpenses();

  useRealtime('expenses', reload);

  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState(searchParams.get('projectId') || '');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [showForm, setShowForm] = useState(!!searchParams.get('new'));
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  if (loading && expenses.length === 0) {
    return <PageLoader message="Loading expenses..." />;
  }

  if (error && expenses.length === 0) {
    return <ErrorState title="Failed to load expenses" message={error} onRetry={reload} />;
  }

  const filtered = expenses.filter((e: Expense) => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.title.toLowerCase().includes(q) || (e.supplier || '').toLowerCase().includes(q) || (e.invoice_number || '').toLowerCase().includes(q);
    const matchProject = !projectFilter || e.project_id === projectFilter;
    const matchCategory = !categoryFilter || e.category === categoryFilter;
    const matchStatus = !statusFilter || e.status === statusFilter;
    const matchPayment = !paymentFilter || e.payment_status === paymentFilter;
    return matchSearch && matchProject && matchCategory && matchStatus && matchPayment;
  }).sort((a: Expense, b: Expense) => b.expense_date.localeCompare(a.expense_date));

  const totalFiltered = filtered.reduce((s: number, e: Expense) => s + e.amount, 0);
  const approvedFiltered = filtered.filter((e: Expense) => e.status === 'approved').reduce((s: number, e: Expense) => s + e.amount, 0);

  const handleCreate = async (data: ExpenseFormData) => {
    try {
      let attachmentPath = '';
      let attachmentName = '';

      if (data.file) {
        try {
          const uploaded = await uploadFile('expense-attachments', data.file, data.project_id);
          attachmentPath = uploaded.path;
          attachmentName = data.file.name;
        } catch (uploadErr) {
          console.warn('Storage upload error (fallbacking without attachment):', uploadErr);
        }
      }

      await expenseService.createExpense({
        title: data.title,
        project_id: data.project_id,
        site: data.site,
        expense_date: data.expense_date,
        category: data.category,
        amount: parseFloat(data.amount),
        supplier: data.supplier,
        invoice_number: data.invoice_number,
        payment_method: data.payment_method,
        payment_status: data.payment_status,
        status: 'draft',
        notes: data.notes,
        attachment_url: attachmentPath || undefined,
        attachment_name: attachmentName || undefined,
      });

      setShowForm(false);
      reload();
      showToast('Expense saved as draft. Submit for approval when ready.', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to create expense', 'error');
    }
  };

  const handleApprove = async (expense: Expense) => {
    try {
      await expenseService.approveExpense(expense.id);
      setSelectedExpense(null);
      reload();
      showToast('Expense approved', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Approval failed', 'error');
    }
  };

  const handleReject = async (expense: Expense, reason: string) => {
    try {
      await expenseService.rejectExpense(expense.id, reason);
      setSelectedExpense(null);
      reload();
      showToast('Expense rejected', 'warning');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Rejection failed', 'error');
    }
  };

  const handleSubmit = async (expense: Expense) => {
    try {
      await expenseService.submitExpense(expense.id);
      setSelectedExpense(null);
      reload();
      showToast('Expense submitted for approval', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Submission failed', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="Expenses & Billing"
        subtitle="Record, review, and approve project expenses"
        action={
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Add Expense
          </button>
        }
      />

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="stat-card">
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Filtered Total</p>
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#111827', fontFamily: 'var(--font-display)' }}>{formatINR(totalFiltered)}</p>
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>{filtered.length} transactions</p>
        </div>
        <div className="stat-card">
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Approved Amount</p>
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', fontFamily: 'var(--font-display)' }}>{formatINR(approvedFiltered)}</p>
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>Used in budget calculations</p>
        </div>
        <div className="stat-card">
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Pending Approval</p>
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#d97706', fontFamily: 'var(--font-display)' }}>
            {formatINR(filtered.filter((e: Expense) => e.status === 'pending_approval').reduce((s: number, e: Expense) => s + e.amount, 0))}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>Not yet in budget totals</p>
        </div>
      </div>

      {/* Filters */}
      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search expenses…" />
        <SelectFilter value={projectFilter} onChange={setProjectFilter} placeholder="All Projects"
          options={projects.map((p: any) => ({ value: p.id, label: p.name }))} />
        <SelectFilter value={categoryFilter} onChange={setCategoryFilter} placeholder="All Categories"
          options={EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }))} />
        <SelectFilter value={statusFilter} onChange={setStatusFilter} placeholder="All Statuses"
          options={[
            { value: 'draft', label: 'Draft' },
            { value: 'pending_approval', label: 'Pending Approval' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
          ]} />
        <SelectFilter value={paymentFilter} onChange={setPaymentFilter} placeholder="Payment Status"
          options={[
            { value: 'unpaid', label: 'Unpaid' },
            { value: 'partial', label: 'Partial' },
            { value: 'paid', label: 'Paid' },
          ]} />
        {(search || projectFilter || categoryFilter || statusFilter || paymentFilter) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setProjectFilter(''); setCategoryFilter(''); setStatusFilter(''); setPaymentFilter(''); }}>
            Clear Filters
          </button>
        )}
      </FilterBar>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <EmptyState icon={<Receipt size={28} />} title="No expenses found"
            description="Add an expense or adjust your filters"
            action={<button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Add Expense</button>}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Project</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Supplier</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e: any) => {
                  const project = projects.find((p: any) => p.id === e.project_id);
                  return (
                    <tr key={e.id}>
                      <td style={{ whiteSpace: 'nowrap', color: '#6b7280' }}>{formatDate(e.expense_date)}</td>
                      <td style={{ maxWidth: 200 }}>
                        <p style={{ margin: 0, fontWeight: 600, color: '#111827', fontSize: '0.8125rem' }}>{e.title}</p>
                        {e.invoice_number && <p style={{ margin: 0, fontSize: '0.7rem', color: '#9ca3af' }}>{e.invoice_number}</p>}
                        {(e.attachment_url || e.attachment_path) && <span style={{ fontSize: '0.7rem', color: '#2563eb' }}>📎 Attached</span>}
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{project?.name}</td>
                      <td><span className="badge badge-blue" style={{ fontSize: '0.6875rem' }}>{e.category}</span></td>
                      <td style={{ fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>{formatINR(e.amount)}</td>
                      <td style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{e.supplier || '—'}</td>
                      <td><span className={`badge ${expenseStatusColor(e.status)}`}>{expenseStatusLabel(e.status)}</span></td>
                      <td><span className={`badge ${paymentStatusColor(e.payment_status)}`}>{paymentStatusLabel(e.payment_status)}</span></td>
                      <td>
                        <button className="btn btn-ghost btn-sm" style={{ color: '#2563eb', fontSize: '0.8125rem' }} onClick={() => setSelectedExpense(e)}>
                          <Eye size={13} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="New Expense" size="lg">
        <ExpenseForm projects={projects} onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      </Modal>

      {/* Detail Modal */}
      {selectedExpense && (
        <Modal isOpen={true} onClose={() => setSelectedExpense(null)} title={selectedExpense.title} size="lg">
          <ExpenseDetail
            expense={selectedExpense}
            projects={projects}
            profiles={profiles}
            currentUserRole={profile?.role}
            onClose={() => setSelectedExpense(null)}
            onApprove={() => handleApprove(selectedExpense)}
            onReject={reason => handleReject(selectedExpense, reason)}
            onSubmit={() => handleSubmit(selectedExpense)}
          />
        </Modal>
      )}
    </div>
  );
}
