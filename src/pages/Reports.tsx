import { useState } from 'react';
import { useProjects, useExpenses, useMaterials, useDailyReports, useIssues, useBudget, useProfiles } from '../hooks';
import { formatINR, formatDate, expenseStatusLabel } from '../utils';
import { PageHeader, PageLoader } from '../components/shared';
import { Download, FileText } from 'lucide-react';
import type { Expense, MaterialOrder, DailyReport, Issue } from '../types';

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPDF(title: string, project: string, period: string, headers: string[], rows: string[][], totals?: string[]) {
  const filename = title.toLowerCase().replace(/[^a-z0-9]/g, '_');
  import('jspdf').then(({ jsPDF }) => {
    import('jspdf-autotable').then(() => {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageW, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('NirmaniQ', 14, 10);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${formatDate(new Date().toISOString())}`, pageW - 14, 16, { align: 'right' });

      // Title section
      doc.setTextColor(17, 24, 39);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 14, 34);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Project: ${project}`, 14, 41);
      doc.text(`Period: ${period}`, 14, 47);

      // Table
      (doc as any).autoTable({
        startY: 53,
        head: [headers],
        body: rows,
        foot: totals ? [totals] : undefined,
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        footStyles: { fillColor: [241, 245, 249], textColor: 17, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        margin: { left: 14, right: 14 },
      });

      doc.save(`${filename}.pdf`);
    });
  });
}

export function ReportsPage() {
  const { projects, loading: projLoading } = useProjects();
  const { expenses } = useExpenses();
  const { materialOrders } = useMaterials();
  const { reports: dailyReports } = useDailyReports();
  const { issues } = useIssues();
  const { profiles } = useProfiles();

  const [selectedReport, setSelectedReport] = useState('expense_summary');
  const [projectFilter, setProjectFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('2024-01-01');
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));

  const effectiveProjectId = projectFilter || projects[0]?.id || '';
  const { variance } = useBudget(effectiveProjectId || undefined);

  if (projLoading && projects.length === 0) {
    return <PageLoader message="Loading reports..." />;
  }

  const project = projects.find((p: any) => p.id === effectiveProjectId);
  const projectName = project?.name || 'All Projects';
  const period = `${formatDate(dateFrom)} to ${formatDate(dateTo)}`;

  // Report data computations
  const filteredExpenses = expenses.filter((e: Expense) =>
    (!effectiveProjectId || e.project_id === effectiveProjectId) &&
    e.expense_date >= dateFrom && e.expense_date <= dateTo
  );

  const approvedExpenses = filteredExpenses.filter((e: Expense) => e.status === 'approved');
  const filteredMaterials = materialOrders.filter((m: MaterialOrder) =>
    (!effectiveProjectId || m.project_id === effectiveProjectId) &&
    m.order_date >= dateFrom && m.order_date <= dateTo
  );
  const filteredReports = dailyReports.filter((r: DailyReport) =>
    (!effectiveProjectId || r.project_id === effectiveProjectId) &&
    r.report_date >= dateFrom && r.report_date <= dateTo
  ).sort((a: DailyReport, b: DailyReport) => b.report_date.localeCompare(a.report_date));
  const filteredIssues = issues.filter((i: Issue) =>
    (!effectiveProjectId || i.project_id === effectiveProjectId)
  );
  const pendingExpenses = filteredExpenses.filter((e: Expense) => e.status === 'pending_approval');

  const reports = [
    { id: 'expense_summary', label: 'Expense Summary', icon: '📊' },
    { id: 'budget_variance', label: 'Budget Variance', icon: '📈' },
    { id: 'material_report', label: 'Material Delivery', icon: '📦' },
    { id: 'daily_progress', label: 'Daily Progress', icon: '📋' },
    { id: 'pending_approvals', label: 'Pending Approvals', icon: '⏳' },
    { id: 'issues_report', label: 'Issues & Delays', icon: '⚠️' },
  ];

  const handleExportCSV = () => {
    if (selectedReport === 'expense_summary') {
      downloadCSV('expense_summary', ['Date', 'Description', 'Category', 'Amount (₹)', 'Supplier', 'Status', 'Payment'],
        filteredExpenses.map((e: Expense) => [formatDate(e.expense_date), e.title, e.category, String(e.amount), e.supplier || '—', expenseStatusLabel(e.status), e.payment_status])
      );
    } else if (selectedReport === 'budget_variance') {
      downloadCSV('budget_variance', ['Category', 'Planned (₹)', 'Actual (₹)', 'Variance (₹)', 'Status'],
        variance.map((v: any) => [v.category, String(v.planned), String(v.actual), String(v.variance), v.isOverrun ? 'Overrun' : 'On Track'])
      );
    } else if (selectedReport === 'material_report') {
      downloadCSV('material_report', ['Material', 'Category', 'Supplier', 'Ordered', 'Received', 'Used', 'Closing Stock', 'Unit', 'Status'],
        filteredMaterials.map((m: MaterialOrder) => [m.material_name, m.material_category, m.supplier, String(m.quantity_ordered), String(m.quantity_received), String(m.quantity_used), String(m.opening_stock + m.quantity_received - m.quantity_used), m.unit, m.status])
      );
    } else if (selectedReport === 'issues_report') {
      downloadCSV('issues_delays', ['Title', 'Category', 'Priority', 'Status', 'Reported Date', 'Target Resolution'],
        filteredIssues.map((i: Issue) => [i.title, i.category, i.priority, i.status, formatDate(i.reported_date), i.target_resolution_date ? formatDate(i.target_resolution_date) : '—'])
      );
    }
  };

  const handleExportPDF = () => {
    if (selectedReport === 'expense_summary') {
      downloadPDF(
        'Project Expense Summary', projectName, period,
        ['Date', 'Description', 'Category', 'Amount (₹)', 'Status'],
        filteredExpenses.map((e: Expense) => [formatDate(e.expense_date), e.title.slice(0, 35), e.category.slice(0, 20), formatINR(e.amount), expenseStatusLabel(e.status)]),
        ['', 'TOTAL APPROVED', '', formatINR(approvedExpenses.reduce((s: number, e: Expense) => s + e.amount, 0)), '']
      );
    } else if (selectedReport === 'budget_variance') {
      downloadPDF(
        'Budget Variance Analysis', projectName, period,
        ['Category', 'Planned (₹)', 'Actual (₹)', 'Variance (₹)', 'Status'],
        variance.map((v: any) => [v.category, formatINR(v.planned), formatINR(v.actual), (v.isOverrun ? '+' : '') + formatINR(v.variance), v.isOverrun ? 'OVERRUN' : 'On Track']),
        ['TOTAL', formatINR(variance.reduce((s: number, v: any) => s + v.planned, 0)), formatINR(variance.reduce((s: number, v: any) => s + v.actual, 0)), '', '']
      );
    } else if (selectedReport === 'material_report') {
      downloadPDF(
        'Material Delivery Report', projectName, period,
        ['Material', 'Supplier', 'Ordered', 'Received', 'Outstanding', 'Used', 'Closing Stock', 'Status'],
        filteredMaterials.map((m: MaterialOrder) => [
          m.material_name, m.supplier.slice(0, 20),
          `${m.quantity_ordered} ${m.unit}`, `${m.quantity_received} ${m.unit}`,
          `${Math.max(0, m.quantity_ordered - m.quantity_received)} ${m.unit}`,
          `${m.quantity_used} ${m.unit}`, `${m.opening_stock + m.quantity_received - m.quantity_used} ${m.unit}`,
          m.status.replace('_', ' ')
        ])
      );
    } else if (selectedReport === 'daily_progress') {
      downloadPDF(
        'Site Daily Progress Log', projectName, period,
        ['Date', 'Workers', 'Work Completed Summary', 'Weather', 'Status'],
        filteredReports.map((r: any) => [formatDate(r.report_date), `${r.worker_count} workers`, r.work_completed.slice(0, 60), r.weather || '—', r.status])
      );
    } else if (selectedReport === 'pending_approvals') {
      downloadPDF(
        'Pending Approval Expenses', projectName, period,
        ['Date', 'Description', 'Category', 'Amount (₹)', 'Supplier', 'Submitted By'],
        pendingExpenses.map((e: any) => [formatDate(e.expense_date), e.title.slice(0, 30), e.category.slice(0, 18), formatINR(e.amount), e.supplier || '—', e.submitter?.name || '—']),
        ['', 'TOTAL PENDING', '', formatINR(pendingExpenses.reduce((s: number, e: Expense) => s + e.amount, 0)), '', '']
      );
    } else if (selectedReport === 'issues_report') {
      downloadPDF(
        'Issues and Delays Log', projectName, period,
        ['Title', 'Category', 'Priority', 'Reported', 'Status', 'Assigned To'],
        filteredIssues.map((i: any) => [i.title.slice(0, 30), i.category, i.priority, formatDate(i.reported_date), i.status, i.assignee?.name || '—'])
      );
    }
  };

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Generate printable and downloadable reports for projects and accounts"
      />

      {/* Control bar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Project</label>
            <select className="form-select" value={effectiveProjectId} onChange={e => setProjectFilter(e.target.value)} style={{ width: 'auto', minWidth: 200 }}>
              {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>From</label>
            <input type="date" className="form-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 'auto' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>To</label>
            <input type="date" className="form-input" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 'auto' }} />
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignSelf: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
              <Download size={14} /> Export CSV
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleExportPDF}>
              <FileText size={14} /> Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Report selector tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {reports.map(r => (
          <button
            key={r.id}
            onClick={() => setSelectedReport(r.id)}
            className={`btn btn-sm ${selectedReport === r.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ whiteSpace: 'nowrap' }}
          >
            <span>{r.icon}</span> {r.label}
          </button>
        ))}
      </div>

      {/* Report preview container */}
      <div className="card" style={{ padding: 24, overflow: 'hidden' }}>
        <div style={{ borderBottom: '1px solid #f3f4f6', paddingBottom: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#111827', fontFamily: 'var(--font-display)' }}>
                {reports.find(r => r.id === selectedReport)?.label}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#6b7280' }}>
                Project: <strong>{projectName}</strong> · Period: <strong>{period}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* 1. Expense Summary */}
        {selectedReport === 'expense_summary' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
              <div style={{ padding: 14, background: '#f9fafb', borderRadius: 8 }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600 }}>Total Recorded</p>
                <p style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#111827' }}>{formatINR(filteredExpenses.reduce((s: number, e: Expense) => s + e.amount, 0))}</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>{filteredExpenses.length} transactions</p>
              </div>
              <div style={{ padding: 14, background: '#f0fdf4', borderRadius: 8 }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#15803d', fontWeight: 600 }}>Approved Total</p>
                <p style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#15803d' }}>{formatINR(approvedExpenses.reduce((s: number, e: Expense) => s + e.amount, 0))}</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>{approvedExpenses.length} approved</p>
              </div>
              <div style={{ padding: 14, background: '#fffbeb', borderRadius: 8 }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#b45309', fontWeight: 600 }}>Pending Approval</p>
                <p style={{ margin: '4px 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#b45309' }}>{formatINR(pendingExpenses.reduce((s: number, e: Expense) => s + e.amount, 0))}</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>{pendingExpenses.length} pending</p>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Supplier</th><th>Status</th><th>Payment</th></tr>
                </thead>
                <tbody>
                  {filteredExpenses.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>No expenses found for this period</td></tr>
                  ) : filteredExpenses.map((e: Expense) => (
                    <tr key={e.id}>
                      <td>{formatDate(e.expense_date)}</td>
                      <td style={{ fontWeight: 600 }}>{e.title}</td>
                      <td><span className="badge badge-blue">{e.category}</span></td>
                      <td style={{ fontWeight: 700 }}>{formatINR(e.amount)}</td>
                      <td>{e.supplier || '—'}</td>
                      <td><span className={`badge ${e.status === 'approved' ? 'badge-green' : e.status === 'rejected' ? 'badge-red' : 'badge-amber'}`}>{e.status}</span></td>
                      <td><span className="badge badge-gray">{e.payment_status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. Budget Variance */}
        {selectedReport === 'budget_variance' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Category</th><th>Planned Budget</th><th>Approved Actual</th><th>Variance</th><th>Utilization</th><th>Status</th></tr>
              </thead>
              <tbody>
                {variance.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>No budget allocations defined for this project</td></tr>
                ) : variance.map((v: any) => (
                  <tr key={v.category}>
                    <td style={{ fontWeight: 600 }}>{v.category}</td>
                    <td>{formatINR(v.planned)}</td>
                    <td style={{ fontWeight: 700 }}>{formatINR(v.actual)}</td>
                    <td style={{ fontWeight: 700, color: v.isOverrun ? '#dc2626' : '#16a34a' }}>
                      {v.isOverrun ? `+${formatINR(v.variance)}` : `-${formatINR(Math.abs(v.variance))}`}
                    </td>
                    <td>{v.planned > 0 ? `${((v.actual / v.planned) * 100).toFixed(0)}%` : '—'}</td>
                    <td><span className={`badge ${v.isOverrun ? 'badge-red' : 'badge-green'}`}>{v.isOverrun ? 'OVERRUN' : 'On Track'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. Material Report */}
        {selectedReport === 'material_report' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Material</th><th>Supplier</th><th>Ordered</th><th>Received</th><th>Used</th><th>Closing Stock</th><th>Unit Price</th><th>Status</th></tr>
              </thead>
              <tbody>
                {filteredMaterials.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>No material orders found for this period</td></tr>
                ) : filteredMaterials.map((m: MaterialOrder) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.material_name}</td>
                    <td>{m.supplier}</td>
                    <td>{m.quantity_ordered} {m.unit}</td>
                    <td style={{ color: '#16a34a' }}>{m.quantity_received} {m.unit}</td>
                    <td style={{ color: '#2563eb' }}>{m.quantity_used} {m.unit}</td>
                    <td style={{ fontWeight: 700 }}>{m.opening_stock + m.quantity_received - m.quantity_used} {m.unit}</td>
                    <td>{formatINR(m.unit_price)}</td>
                    <td><span className="badge badge-blue">{m.status.replace('_', ' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Daily Progress */}
        {selectedReport === 'daily_progress' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredReports.length === 0 ? (
              <p style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>No daily reports found for this period</p>
            ) : filteredReports.map((r: any) => {
              const supervisor = r.supervisor || profiles.find((u: any) => u.id === r.supervisor_id);
              return (
                <div key={r.id} style={{ padding: '14px 18px', background: '#f9fafb', borderRadius: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, color: '#111827' }}>{formatDate(r.report_date)}</span>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{supervisor?.name || 'Supervisor'} · {r.worker_count} workers</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>{r.work_completed}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* 5. Pending Approvals */}
        {selectedReport === 'pending_approvals' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Supplier</th><th>Submitted By</th></tr>
              </thead>
              <tbody>
                {pendingExpenses.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: '#16a34a', fontWeight: 600 }}>All clear — no pending approvals!</td></tr>
                ) : pendingExpenses.map((e: any) => {
                  const submitter = e.submitter || profiles.find((u: any) => u.id === e.submitted_by);
                  return (
                    <tr key={e.id}>
                      <td>{formatDate(e.expense_date)}</td>
                      <td style={{ fontWeight: 600 }}>{e.title}</td>
                      <td><span className="badge badge-blue">{e.category}</span></td>
                      <td style={{ fontWeight: 700, color: '#d97706' }}>{formatINR(e.amount)}</td>
                      <td>{e.supplier || '—'}</td>
                      <td>{submitter?.name || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. Issues */}
        {selectedReport === 'issues_report' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Title</th><th>Category</th><th>Priority</th><th>Status</th><th>Reported Date</th><th>Target Resolution</th></tr>
              </thead>
              <tbody>
                {filteredIssues.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>No issues found</td></tr>
                ) : filteredIssues.map((i: Issue) => (
                  <tr key={i.id}>
                    <td style={{ fontWeight: 600 }}>{i.title}</td>
                    <td>{i.category}</td>
                    <td><span className="badge badge-amber">{i.priority}</span></td>
                    <td><span className="badge badge-gray">{i.status}</span></td>
                    <td>{formatDate(i.reported_date)}</td>
                    <td>{i.target_resolution_date ? formatDate(i.target_resolution_date) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
