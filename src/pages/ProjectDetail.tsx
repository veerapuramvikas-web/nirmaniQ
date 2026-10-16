import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  AlertTriangle, ClipboardList,
  ArrowLeft, Edit, AlertCircle, Plus
} from 'lucide-react';
import {
  useProjectDetail, useExpenses, useMaterials, useDailyReports,
  useIssues, useBudget, useRealtime, showToast
} from '../hooks';
import * as budgetService from '../services/budget.service';
import {
  formatINR, formatDate, projectStatusColor, projectStatusLabel,
  expenseStatusColor, expenseStatusLabel, issuePriorityColor, issuePriorityLabel,
  issueStatusColor, issueStatusLabel, percentage, budgetUsedColor
} from '../utils';
import {
  PageHeader, SectionCard, ProgressBar, EmptyState, Modal, FormField, PageLoader
} from '../components/shared';
import type { ExpenseCategory, Expense, MaterialOrder, DailyReport, Issue } from '../types';
import { EXPENSE_CATEGORIES } from '../types';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
        <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ margin: 0, fontSize: '0.8125rem', color: p.color }}>
            {p.name}: {formatINR(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function BudgetEditor({
  projectId,
  existingCategories,
  projectBudget,
  onClose,
  onSaved,
}: {
  projectId: string;
  existingCategories: any[];
  projectBudget: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amounts, setAmounts] = useState<Record<ExpenseCategory, string>>(() => {
    const init = {} as Record<ExpenseCategory, string>;
    EXPENSE_CATEGORIES.forEach(cat => {
      const found = existingCategories.find((bc: any) => bc.category === cat);
      init[cat] = found ? String(found.planned_amount) : '';
    });
    return init;
  });

  const [saving, setSaving] = useState(false);
  const total = EXPENSE_CATEGORIES.reduce((s, c) => s + (parseFloat(amounts[c]) || 0), 0);
  const isOverAllocated = total > projectBudget;

  const handleSave = async () => {
    setSaving(true);
    try {
      const cats = EXPENSE_CATEGORIES
        .filter(c => parseFloat(amounts[c]) > 0)
        .map(c => ({
          category: c,
          planned_amount: parseFloat(amounts[c]),
        }));
      await budgetService.upsertBudgetCategories(projectId, cats);
      showToast('Budget categories updated', 'success');
      onSaved();
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to update budget categories', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, padding: '10px 14px', background: isOverAllocated ? '#fef2f2' : '#f0fdf4', borderRadius: 8, border: `1px solid ${isOverAllocated ? '#fecaca' : '#bbf7d0'}` }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isOverAllocated ? '#dc2626' : '#16a34a' }}>
          Total Allocated: {formatINR(total)}
        </span>
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Project Budget: {formatINR(projectBudget)}
        </span>
      </div>
      {isOverAllocated && (
        <p style={{ color: '#dc2626', fontSize: '0.8125rem', marginBottom: 12 }}>
          ⚠ Category allocations exceed the project budget by {formatINR(total - projectBudget)}. Please review before saving.
        </p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {EXPENSE_CATEGORIES.map(cat => (
          <FormField key={cat} label={cat}>
            <input
              type="number"
              className="form-input"
              placeholder="0"
              value={amounts[cat]}
              onChange={e => setAmounts(p => ({ ...p, [cat]: e.target.value }))}
              min={0}
            />
          </FormField>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Budget'}
        </button>
      </div>
    </div>
  );
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);

  const { data: project, loading: projLoading, error: projError, reload: reloadProject } = useProjectDetail(id);
  const { expenses, loading: expLoading, reload: reloadExpenses } = useExpenses(id ? { projectId: id } : undefined);
  const { materialOrders, loading: matLoading, reload: reloadMaterials } = useMaterials(id ? { projectId: id } : undefined);
  const { reports: projectReports, loading: repLoading, reload: reloadReports } = useDailyReports(id ? { projectId: id } : undefined);
  const { issues: projectIssues, loading: issLoading, reload: reloadIssues } = useIssues(id ? { projectId: id } : undefined);
  const { categories: budgetCategories, variance, loading: budLoading, reload: reloadBudget } = useBudget(id);

  useRealtime('projects', reloadProject);
  useRealtime('expenses', () => { reloadExpenses(); reloadBudget(); });
  useRealtime('material_orders', reloadMaterials);
  useRealtime('daily_reports', reloadReports);
  useRealtime('issues', reloadIssues);

  const loading = projLoading || expLoading || matLoading || repLoading || issLoading || budLoading;

  if (loading && !project) {
    return <PageLoader message="Loading project details..." />;
  }

  if (projError || (!loading && !project)) {
    return (
      <div>
        <PageHeader title="Project Not Found" subtitle={projError || undefined} />
        <button className="btn btn-secondary" onClick={() => navigate('/projects')}>
          <ArrowLeft size={15} /> Back to Projects
        </button>
      </div>
    );
  }

  const supervisor = project.supervisor;
  const spent = expenses.filter((e: Expense) => e.status === 'approved').reduce((s: number, e: Expense) => s + e.amount, 0);
  const remainingBudget = project.total_budget - spent;
  const budgetPct = percentage(spent, project.total_budget);
  const projectExpenses = expenses;
  const projectMaterials = materialOrders;

  const filterCategory = searchParams.get('category') || '';

  // Variance view calculations
  const displayVariance = variance.length > 0 ? variance : budgetCategories.map((bc: any) => {
    const catExpenses = projectExpenses.filter((e: Expense) => e.category === bc.category && e.status === 'approved');
    const actual = catExpenses.reduce((s: number, e: Expense) => s + e.amount, 0);
    const varianceVal = actual - bc.planned_amount;
    return {
      category: bc.category,
      planned: bc.planned_amount,
      actual,
      variance: varianceVal,
      isOverrun: varianceVal > 0,
      utilization_percentage: bc.planned_amount > 0 ? (actual / bc.planned_amount) * 100 : 0,
    };
  });

  const chartData = displayVariance.map((v: any) => ({
    name: v.category.length > 14 ? v.category.slice(0, 12) + '…' : v.category,
    Planned: v.planned,
    Actual: v.actual,
  }));

  const overruns = displayVariance.filter((v: any) => v.isOverrun);

  return (
    <div>
      <PageHeader
        title={project.name}
        subtitle={`${project.code} · ${project.project_type} · Client: ${project.client_name}`}
        breadcrumb={[
          { label: 'Projects', onClick: () => navigate('/projects') },
          { label: project.name },
        ]}
        action={
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => setShowBudgetEditor(true)}>
              <Edit size={14} /> Edit Budget
            </button>
            <button className="btn btn-primary" onClick={() => navigate(`/expenses?new=1&projectId=${project.id}`)}>
              <Plus size={14} /> Add Expense
            </button>
          </div>
        }
      />

      {/* Overview Banner */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Status</p>
            <span className={`badge ${projectStatusColor(project.status)}`} style={{ marginTop: 6, display: 'inline-block' }}>
              {projectStatusLabel(project.status)}
            </span>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Total Budget</p>
            <p style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#111827', fontFamily: 'var(--font-display)' }}>{formatINR(project.total_budget)}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Approved Spent</p>
            <p style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800, color: budgetPct > 100 ? '#dc2626' : '#2563eb', fontFamily: 'var(--font-display)' }}>
              {formatINR(spent)}
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginLeft: 6 }}>({budgetPct}%)</span>
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Remaining</p>
            <p style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800, color: remainingBudget < 0 ? '#dc2626' : '#16a34a', fontFamily: 'var(--font-display)' }}>
              {formatINR(remainingBudget)}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Supervisor</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>{supervisor?.name || 'Unassigned'}</p>
          </div>
        </div>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: '0.8125rem', color: '#6b7280', fontWeight: 600 }}>Site Construction Progress</span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 800 }}>{project.progress_percentage}% Complete</span>
          </div>
          <ProgressBar value={project.progress_percentage} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb', marginBottom: 24 }}>
        {[
          { id: 'overview', label: 'Overview & Variance' },
          { id: 'budget', label: `Budget Breakdown (${displayVariance.length})` },
          { id: 'expenses', label: `Expenses (${projectExpenses.length})` },
          { id: 'materials', label: `Materials (${projectMaterials.length})` },
          { id: 'reports', label: `Daily Reports (${projectReports.length})` },
          { id: 'issues', label: `Issues (${projectIssues.length})` },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
              fontWeight: activeTab === t.id ? 700 : 500,
              color: activeTab === t.id ? '#2563eb' : '#6b7280',
              borderBottom: activeTab === t.id ? '2px solid #2563eb' : '2px solid transparent',
              fontSize: '0.875rem', transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Variance Chart */}
            <SectionCard title="Budget vs Actual by Category">
              {chartData.length === 0 ? (
                <EmptyState
                  icon={<AlertCircle size={24} />}
                  title="No budget categories set"
                  description="Set up planned budget per category to track cost overruns"
                  action={<button className="btn btn-primary btn-sm" onClick={() => setShowBudgetEditor(true)}>Set Budget Categories</button>}
                />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-20} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Planned" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Actual" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>

            {/* Overrun Alerts */}
            {overruns.length > 0 && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <AlertTriangle size={18} color="#dc2626" />
                  <h4 style={{ margin: 0, fontWeight: 700, color: '#991b1b', fontSize: '0.9375rem' }}>
                    Cost Overrun Alerts ({overruns.length} Categories)
                  </h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {overruns.map((v: any) => (
                    <div key={v.category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
                      <span style={{ fontWeight: 600, color: '#7f1d1d' }}>{v.category}</span>
                      <span style={{ color: '#dc2626', fontWeight: 700 }}>
                        Overrun by {formatINR(v.variance)} ({v.utilization_percentage.toFixed(0)}% used)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick info column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SectionCard title="Financial Summary">
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>Total Budget</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#374151' }}>{formatINR(project.total_budget)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>Approved Spent</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#2563eb' }}>{formatINR(spent)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>Pending Approval</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#d97706' }}>
                  {formatINR(projectExpenses.filter((e: Expense) => e.status === 'pending_approval').reduce((s: number, e: Expense) => s + e.amount, 0))}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>Remaining</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: remainingBudget < 0 ? '#dc2626' : '#16a34a' }}>{formatINR(remainingBudget)}</span>
              </div>
            </SectionCard>

            <SectionCard title="Quick Stats">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Total Expenses', value: projectExpenses.length },
                  { label: 'Pending Approval', value: projectExpenses.filter((e: Expense) => e.status === 'pending_approval').length },
                  { label: 'Material Orders', value: projectMaterials.length },
                  { label: 'Daily Reports', value: projectReports.length },
                  { label: 'Open Issues', value: projectIssues.filter((i: Issue) => i.status === 'open' || i.status === 'in_progress').length },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{label}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#374151' }}>{value}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* Tab: Budget */}
      {activeTab === 'budget' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
            <h3 style={{ margin: 0, fontWeight: 700, fontSize: '0.9375rem' }}>Category Budget Allocation & Utilization</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowBudgetEditor(true)}>
              <Edit size={14} /> Edit Allocations
            </button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Planned Budget</th>
                <th>Approved Actual</th>
                <th>Variance (Over/Under)</th>
                <th>Utilization</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {displayVariance.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No budget categories planned yet</td></tr>
              ) : displayVariance.map((v: any) => (
                <tr key={v.category}>
                  <td style={{ fontWeight: 600, color: '#111827' }}>{v.category}</td>
                  <td>{formatINR(v.planned)}</td>
                  <td style={{ fontWeight: 700 }}>{formatINR(v.actual)}</td>
                  <td style={{ fontWeight: 700, color: v.isOverrun ? '#dc2626' : '#16a34a' }}>
                    {v.isOverrun ? `+${formatINR(v.variance)}` : `-${formatINR(Math.abs(v.variance))}`}
                  </td>
                  <td style={{ minWidth: 160 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ProgressBar value={v.utilization_percentage} color={budgetUsedColor(v.utilization_percentage)} />
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, minWidth: 40 }}>{v.utilization_percentage.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${v.isOverrun ? 'badge-red' : 'badge-green'}`}>
                      {v.isOverrun ? 'Overrun' : 'On Track'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Expenses */}
      {activeTab === 'expenses' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/expenses?new=1&projectId=${project.id}`)}>
              <Plus size={14} /> New Expense
            </button>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Supplier</th>
                  <th>Status</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {projectExpenses.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No expenses recorded</td></tr>
                ) : (
                  projectExpenses
                    .filter((e: Expense) => !filterCategory || e.category === filterCategory)
                    .sort((a: Expense, b: Expense) => b.expense_date.localeCompare(a.expense_date))
                    .map((e: Expense) => (
                      <tr key={e.id} style={filterCategory && e.category === filterCategory ? { background: '#fffbeb' } : {}}>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(e.expense_date)}</td>
                        <td style={{ maxWidth: 200 }}>
                          <p style={{ margin: 0, fontWeight: 600, color: '#111827' }}>{e.title}</p>
                          {e.invoice_number && <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>{e.invoice_number}</p>}
                        </td>
                        <td><span className="badge badge-blue" style={{ fontSize: '0.6875rem' }}>{e.category}</span></td>
                        <td style={{ fontWeight: 700, color: '#111827' }}>{formatINR(e.amount)}</td>
                        <td style={{ color: '#6b7280' }}>{e.supplier || '—'}</td>
                        <td><span className={`badge ${expenseStatusColor(e.status)}`}>{expenseStatusLabel(e.status)}</span></td>
                        <td><span className="badge badge-gray">{e.payment_status}</span></td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Materials */}
      {activeTab === 'materials' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/materials?new=1&projectId=${project.id}`)}>
              <Plus size={14} /> New Order
            </button>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Supplier</th>
                  <th>Ordered</th>
                  <th>Received</th>
                  <th>Used</th>
                  <th>Closing Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {projectMaterials.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No material orders</td></tr>
                ) : projectMaterials.map((m: MaterialOrder) => {
                  const closing = m.opening_stock + m.quantity_received - m.quantity_used;
                  return (
                    <tr key={m.id}>
                      <td>
                        <p style={{ margin: 0, fontWeight: 600, color: '#111827' }}>{m.material_name}</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>{m.material_category}</p>
                      </td>
                      <td style={{ color: '#6b7280' }}>{m.supplier}</td>
                      <td>{m.quantity_ordered} {m.unit}</td>
                      <td>{m.quantity_received} {m.unit}</td>
                      <td>{m.quantity_used} {m.unit}</td>
                      <td style={{ fontWeight: 700, color: closing < 0 ? '#dc2626' : '#374151' }}>{closing} {m.unit}</td>
                      <td><span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{m.status.replace('_', ' ')}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Reports */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/daily-reports?new=1&projectId=${project.id}`)}>
              <Plus size={14} /> New Report
            </button>
          </div>
          {projectReports.length === 0 ? (
            <div className="card" style={{ padding: 40 }}><EmptyState icon={<ClipboardList size={24} />} title="No daily reports yet" /></div>
          ) : (
            [...projectReports].sort((a: DailyReport, b: DailyReport) => b.report_date.localeCompare(a.report_date)).map((r: any) => {
              const sup = r.supervisor;
              return (
                <div key={r.id} className="card card-hover" style={{ padding: '16px 20px', cursor: 'pointer' }} onClick={() => navigate(`/daily-reports/${r.id}`)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, color: '#111827', fontSize: '0.9375rem' }}>{formatDate(r.report_date)}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#6b7280' }}>{sup?.name || 'Supervisor'} · {r.worker_count} workers</p>
                    </div>
                    <span className={`badge ${r.status === 'submitted' ? 'badge-green' : 'badge-gray'}`}>{r.status === 'submitted' ? 'Submitted' : 'Draft'}</span>
                  </div>
                  <p style={{ margin: '8px 0 0', fontSize: '0.875rem', color: '#374151' }}>{r.work_completed}</p>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Issues */}
      {activeTab === 'issues' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/issues?new=1&projectId=${project.id}`)}>
              <Plus size={14} /> Report Issue
            </button>
          </div>
          {projectIssues.length === 0 ? (
            <div className="card" style={{ padding: 40 }}><EmptyState icon={<AlertTriangle size={24} />} title="No issues reported" /></div>
          ) : (
            projectIssues.map((issue: Issue) => (
              <div key={issue.id} className="card card-hover" style={{ padding: '16px 20px', cursor: 'pointer' }} onClick={() => navigate(`/issues/${issue.id}`)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: '#111827', fontSize: '0.9375rem' }}>{issue.title}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#6b7280' }}>{issue.category} · {formatDate(issue.reported_date)}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span className={`badge ${issuePriorityColor(issue.priority)}`}>{issuePriorityLabel(issue.priority)}</span>
                    <span className={`badge ${issueStatusColor(issue.status)}`}>{issueStatusLabel(issue.status)}</span>
                  </div>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: '0.875rem', color: '#374151' }}>{issue.description}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Budget Editor Modal */}
      <Modal isOpen={showBudgetEditor} onClose={() => setShowBudgetEditor(false)} title="Edit Budget Allocations" size="lg">
        <BudgetEditor
          projectId={project.id}
          existingCategories={budgetCategories}
          projectBudget={project.total_budget}
          onClose={() => setShowBudgetEditor(false)}
          onSaved={() => reloadBudget()}
        />
      </Modal>
    </div>
  );
}
