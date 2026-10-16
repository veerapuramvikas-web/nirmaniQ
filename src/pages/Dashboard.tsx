import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Building2, Wallet, TrendingUp, Clock, AlertTriangle, HardHat,
  ArrowRight, Search, SlidersHorizontal, Plus
} from 'lucide-react';
import {
  useProjects, useExpenses, useDailyReports, useIssues, useRealtime
} from '../hooks';
import { formatINR, formatDate } from '../utils';
import { PageLoader, ErrorState } from '../components/shared';

const CHART_COLORS = ['#ffdd00', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#64748b'];

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#18181b',
        borderRadius: 14,
        padding: '12px 16px',
        color: '#ffffff',
        boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif"
      }}>
        <p style={{ margin: '0 0 6px', fontSize: '0.825rem', fontWeight: 800, color: '#ffdd00' }}>{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ margin: '3px 0', fontSize: '0.8rem', color: p.color || '#ffffff', fontWeight: 700 }}>
            {p.name}: {formatINR(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function Dashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const { projects, summary, loading: projLoading, error: projError, reload: reloadProjects } = useProjects();
  const { expenses, loading: expLoading, error: expError, reload: reloadExpenses } = useExpenses();
  const { reports: dailyReports, loading: repLoading, error: repError, reload: reloadReports } = useDailyReports();
  const { issues, loading: issLoading, error: issError, reload: reloadIssues } = useIssues();

  // Real-time synchronization
  useRealtime('projects', reloadProjects);
  useRealtime('expenses', reloadExpenses);
  useRealtime('daily_reports', reloadReports);
  useRealtime('issues', reloadIssues);

  const loading = projLoading || expLoading || repLoading || issLoading;
  const error = projError || expError || repError || issError;

  if (loading && projects.length === 0) {
    return <PageLoader message="Loading Builder's Command Center..." />;
  }

  if (error && projects.length === 0) {
    return (
      <ErrorState
        title="Failed to load Dashboard data"
        message={error}
        onRetry={() => {
          reloadProjects();
          reloadExpenses();
          reloadReports();
          reloadIssues();
        }}
      />
    );
  }

  // --- Real Construction Overview Calculations ---
  const totalBudget = projects.reduce((s, p) => s + (p.total_budget || 0), 0);
  const totalExpenditure = summary.length > 0
    ? summary.reduce((s: number, p: any) => s + (p.approved_expenditure || 0), 0)
    : expenses.filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0);

  const remainingBudget = totalBudget - totalExpenditure;
  const pendingApprovals = expenses.filter(e => e.status === 'pending_approval');
  const pendingApprovalAmount = pendingApprovals.reduce((s, e) => s + e.amount, 0);

  const projectsOverBudget = projects.filter(p => {
    const sumRow = summary.find((s: any) => s.project_id === p.id);
    const spent = sumRow ? sumRow.approved_expenditure : expenses.filter(e => e.project_id === p.id && e.status === 'approved').reduce((s, e) => s + e.amount, 0);
    return spent > p.total_budget;
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayReports = dailyReports.filter(r => r.report_date === todayStr);
  const openIssues = issues.filter(i => i.status === 'open' || i.status === 'in_progress');
  const criticalIssues = issues.filter(i => (i.status === 'open' || i.status === 'in_progress') && i.priority === 'critical');

  const activeProjects = projects.filter(p => p.status === 'active');

  // Budget vs Actual per project data
  const budgetVsActualData = activeProjects.map(p => {
    const sumRow = summary.find((s: any) => s.project_id === p.id);
    const spent = sumRow ? sumRow.approved_expenditure : expenses.filter(e => e.project_id === p.id && e.status === 'approved').reduce((s, e) => s + e.amount, 0);
    return {
      name: p.name.length > 18 ? p.name.slice(0, 16) + '…' : p.name,
      Budget: p.total_budget,
      Spent: spent,
    };
  });

  // Category breakdown for selected / all projects
  const categoryData: { name: string; value: number }[] = [];
  const catMap: Record<string, number> = {};
  expenses
    .filter(e => e.status === 'approved' && (!selectedProjectId || e.project_id === selectedProjectId))
    .forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
  Object.entries(catMap).forEach(([name, value]) => categoryData.push({ name, value }));
  categoryData.sort((a, b) => b.value - a.value);

  // Recent transactions table
  const filteredRecentExpenses = expenses
    .filter(e => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const proj = projects.find(p => p.id === e.project_id);
      return (
        e.title?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q) ||
        e.supplier?.toLowerCase().includes(q) ||
        proj?.name?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (b.expense_date || '').localeCompare(a.expense_date || ''))
    .slice(0, 6);

  // Overall budget utilization %
  const budgetUtilPercent = totalBudget > 0 ? Math.min(100, Math.round((totalExpenditure / totalBudget) * 100)) : 0;

  return (
    <div style={{
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      color: '#111111'
    }}>
      {/* ── TOP ACTION & SEARCH HEADER ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24
      }}>
        <div>
          <h2 style={{
            fontSize: '1.45rem',
            fontWeight: 800,
            color: '#111111',
            margin: 0,
            letterSpacing: '-0.02em'
          }}>
            Builder's Command Center
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: '0.825rem', color: '#71717a' }}>
            Real-time monitoring across {projects.length} sites · {activeProjects.length} active construction phases
          </p>
        </div>

        {/* Right Search & Action Controls */}
        <div className="dashboard-top-actions" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Rounded Search Bar */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
            <Search size={15} color="#a1a1aa" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search expenses, sites..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: 40,
                borderRadius: 24,
                border: '1px solid #e4e4e7',
                background: '#ffffff',
                padding: '0 16px 0 40px',
                fontSize: '0.84rem',
                outline: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Quick Filter Pill Button */}
            <button
              onClick={() => navigate('/expenses')}
              title="Filter expenses"
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#ffffff',
                border: '1px solid #e4e4e7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#71717a',
                flexShrink: 0
              }}
            >
              <SlidersHorizontal size={16} />
            </button>

            {/* Add New Expense Pill Button */}
            <button
              onClick={() => navigate('/expenses?action=new')}
              style={{
                height: 40,
                borderRadius: 24,
                background: '#111111',
                color: '#ffffff',
                border: 'none',
                padding: '0 18px',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <span>Add Expense</span>
              <Plus size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* ── TOP KPI ROW (EXACT 4-CARD DESIGN DRESSED IN AXIOM THEME) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        {/* CARD 1: Total Project Budget */}
        <div style={{
          background: '#ffffff',
          borderRadius: 20,
          padding: '20px',
          border: '1px solid #f4f4f5',
          boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: '#71717a', fontWeight: 600 }}>Total Project Budget</span>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: '#fffbeb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ca8a04'
            }}>
              <Building2 size={16} />
            </div>
          </div>

          <div style={{ margin: '14px 0 10px' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111111', letterSpacing: '-0.02em' }}>
              {formatINR(totalBudget)}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.73rem' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              color: '#22c55e',
              background: 'rgba(34, 197, 94, 0.1)',
              padding: '2px 6px',
              borderRadius: 6,
              fontWeight: 700
            }}>
              {projects.length} Projects
            </span>
            <span style={{ color: '#71717a' }}>{activeProjects.length} Under Construction</span>
          </div>
        </div>

        {/* CARD 2: Approved Spend */}
        <div style={{
          background: '#ffffff',
          borderRadius: 20,
          padding: '20px',
          border: '1px solid #f4f4f5',
          boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: '#71717a', fontWeight: 600 }}>Approved Spend</span>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: '#f4f4f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#71717a'
            }}>
              <Wallet size={16} />
            </div>
          </div>

          <div style={{ margin: '14px 0 10px' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111111', letterSpacing: '-0.02em' }}>
              {formatINR(totalExpenditure)}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.73rem' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              color: budgetUtilPercent > 90 ? '#ef4444' : '#22c55e',
              background: budgetUtilPercent > 90 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
              padding: '2px 6px',
              borderRadius: 6,
              fontWeight: 700
            }}>
              {budgetUtilPercent}% Utilized
            </span>
            <span style={{ color: '#71717a' }}>Of Total Budget</span>
          </div>
        </div>

        {/* CARD 3: Remaining Balance */}
        <div style={{
          background: '#ffffff',
          borderRadius: 20,
          padding: '20px',
          border: '1px solid #f4f4f5',
          boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: '#71717a', fontWeight: 600 }}>Remaining Balance</span>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: '#f4f4f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#71717a'
            }}>
              <TrendingUp size={16} />
            </div>
          </div>

          <div style={{ margin: '14px 0 10px' }}>
            <div style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: remainingBudget < 0 ? '#ef4444' : '#111111',
              letterSpacing: '-0.02em'
            }}>
              {formatINR(remainingBudget)}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.73rem' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              color: remainingBudget >= 0 ? '#22c55e' : '#ef4444',
              background: remainingBudget >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              padding: '2px 6px',
              borderRadius: 6,
              fontWeight: 700
            }}>
              {remainingBudget >= 0 ? 'Surplus' : 'Deficit'}
            </span>
            <span style={{ color: '#71717a' }}>
              {projectsOverBudget.length > 0 ? `${projectsOverBudget.length} site over budget` : 'All sites on track'}
            </span>
          </div>
        </div>

        {/* CARD 4: Pending Approvals */}
        <div style={{
          background: '#ffffff',
          borderRadius: 20,
          padding: '20px',
          border: '1px solid #f4f4f5',
          boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: '#71717a', fontWeight: 600 }}>Pending Approvals</span>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444'
            }}>
              <Clock size={16} />
            </div>
          </div>

          <div style={{ margin: '14px 0 10px' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111111', letterSpacing: '-0.02em' }}>
              {pendingApprovals.length} Bills
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.73rem' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              color: pendingApprovals.length > 0 ? '#d97706' : '#22c55e',
              background: pendingApprovals.length > 0 ? 'rgba(217, 119, 6, 0.1)' : 'rgba(34, 197, 94, 0.1)',
              padding: '2px 6px',
              borderRadius: 6,
              fontWeight: 700
            }}>
              {formatINR(pendingApprovalAmount)}
            </span>
            <span style={{ color: '#71717a' }}>Awaiting Sign-off</span>
          </div>
        </div>
      </div>

      {/* ── MIDDLE ROW: BUDGET VS SPENT BARCHART & EXPENSE DONUT ── */}
      <div className="dashboard-charts-grid" style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: 20,
        marginBottom: 24
      }}>
        {/* Main Chart: Project Budget vs Actual Expenditure */}
        <div style={{
          background: '#ffffff',
          borderRadius: 24,
          padding: '24px 28px',
          border: '1px solid #f4f4f5',
          boxShadow: '0 2px 12px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#111111', letterSpacing: '-0.02em' }}>
                Budget vs Actual Spent (Active Projects)
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#71717a' }}>
                Comparing allocated site budgets with cumulative approved costs
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#71717a' }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: '#e4e4e7' }} />
                Budget
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#111111', fontWeight: 700 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: '#ffdd00' }} />
                Spent
              </div>
            </div>
          </div>

          <div style={{ height: 260, width: '100%' }}>
            {budgetVsActualData.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a1a1aa', fontSize: '0.85rem' }}>
                No active projects found.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetVsActualData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#f4f4f5" vertical={false} />
                  <XAxis dataKey="name" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#a1a1aa"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="Budget" fill="#e4e4e7" radius={[6, 6, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="Spent" fill="#ffdd00" radius={[6, 6, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Breakdown (Donut) */}
        <div style={{
          background: '#ffffff',
          borderRadius: 24,
          padding: '24px 28px',
          border: '1px solid #f4f4f5',
          boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#111111', letterSpacing: '-0.02em' }}>
              Expense Breakdown
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#71717a', fontWeight: 600 }}>By Category</span>
          </div>

          {/* Project selector dropdown */}
          <div style={{ marginBottom: 12 }}>
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 14px',
                borderRadius: 20,
                border: '1px solid #e4e4e7',
                background: '#ffffff',
                fontSize: '0.8rem',
                color: '#111111',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            >
              <option value="">All Construction Sites</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div style={{ height: 160, width: '100%', position: 'relative' }}>
            {categoryData.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a1a1aa', fontSize: '0.8rem' }}>
                No expense data recorded.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatINR(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Top 3 Legend items */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 10 }}>
            {categoryData.slice(0, 3).map((cat, idx) => (
              <div key={cat.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.775rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#52525b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: CHART_COLORS[idx % CHART_COLORS.length], flexShrink: 0 }} />
                  {cat.name}
                </span>
                <span style={{ fontWeight: 800, color: '#111111' }}>{formatINR(cat.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BOTTOM ROW: SITE OPERATIONS SUMMARY & RECENT EXPENSES ── */}
      <div className="dashboard-bottom-grid" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 2fr',
        gap: 20
      }}>
        {/* Left Column: Live Site Pulse Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Today's Daily Reports Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: 22,
            padding: '22px',
            border: '1px solid #f4f4f5',
            boxShadow: '0 2px 12px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: '#f0fdf4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#16a34a'
                }}>
                  <HardHat size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.925rem', fontWeight: 800, color: '#111111' }}>Daily Site Reports</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#71717a' }}>Today's submissions</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/daily-reports')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#111111',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                View All <ArrowRight size={13} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#111111' }}>{todayReports.length}</span>
              <span style={{ fontSize: '0.8rem', color: '#71717a' }}>of {activeProjects.length} active sites logged</span>
            </div>

            <div style={{
              marginTop: 14,
              padding: '10px 14px',
              borderRadius: 14,
              background: '#fafafa',
              border: '1px solid #f4f4f5',
              fontSize: '0.775rem',
              color: '#52525b'
            }}>
              {todayReports.length === activeProjects.length && activeProjects.length > 0 ? (
                <span style={{ color: '#16a34a', fontWeight: 700 }}>
                  ✓ 100% Site logs synchronized today
                </span>
              ) : (
                <span>{activeProjects.length - todayReports.length} sites yet to submit daily work log</span>
              )}
            </div>
          </div>

          {/* Open Issues & Delays Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: 22,
            padding: '22px',
            border: '1px solid #f4f4f5',
            boxShadow: '0 2px 12px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444'
                }}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.925rem', fontWeight: 800, color: '#111111' }}>Site Issues & Delays</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#71717a' }}>Blockers & Material bottlenecks</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/issues')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                Inspect <ArrowRight size={13} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: openIssues.length > 0 ? '#ef4444' : '#10b981' }}>
                {openIssues.length}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#71717a' }}>active issues flagged</span>
            </div>

            <div style={{
              marginTop: 14,
              padding: '10px 14px',
              borderRadius: 14,
              background: criticalIssues.length > 0 ? '#fef2f2' : '#fafafa',
              border: criticalIssues.length > 0 ? '1px solid #fecaca' : '1px solid #f4f4f5',
              fontSize: '0.775rem',
              color: criticalIssues.length > 0 ? '#b91c1c' : '#71717a',
              fontWeight: criticalIssues.length > 0 ? 700 : 500
            }}>
              {criticalIssues.length > 0
                ? `⚠️ ${criticalIssues.length} Critical escalation requiring urgent action`
                : 'No critical delay bottlenecks currently recorded.'}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Construction Expenses Table */}
        <div style={{
          background: '#ffffff',
          borderRadius: 24,
          padding: '24px 28px',
          border: '1px solid #f4f4f5',
          boxShadow: '0 2px 12px rgba(0,0,0,0.02)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#111111', letterSpacing: '-0.02em' }}>
                Recent Construction Expenses
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#71717a' }}>
                Live billing, material purchases & subcontractor invoices
              </p>
            </div>
            <button
              onClick={() => navigate('/expenses')}
              style={{
                background: 'none',
                border: 'none',
                color: '#111111',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              View All <ArrowRight size={14} />
            </button>
          </div>

          {filteredRecentExpenses.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: '#a1a1aa' }}>
              No expenses recorded yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f4f4f5', color: '#a1a1aa', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '8px 12px 12px 0', fontWeight: 700 }}>Expense / Description</th>
                    <th style={{ padding: '8px 12px 12px', fontWeight: 700 }}>Project Site</th>
                    <th style={{ padding: '8px 12px 12px', fontWeight: 700 }}>Date</th>
                    <th style={{ padding: '8px 12px 12px', fontWeight: 700, textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '8px 0 12px 12px', fontWeight: 700, textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecentExpenses.map((exp: any) => {
                    const proj = projects.find(p => p.id === exp.project_id);
                    const isApproved = exp.status === 'approved';
                    const isPending = exp.status === 'pending_approval';
                    return (
                      <tr
                        key={exp.id}
                        onClick={() => navigate(`/expenses?expenseId=${exp.id}`)}
                        style={{
                          borderBottom: '1px solid #fafafa',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fbfbfa')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '14px 12px 14px 0' }}>
                          <div style={{ fontWeight: 800, color: '#111111' }}>{exp.title}</div>
                          <div style={{ fontSize: '0.73rem', color: '#71717a' }}>{exp.category}</div>
                        </td>
                        <td style={{ padding: '14px 12px', color: '#52525b', fontWeight: 500 }}>
                          {proj?.name || 'General Site'}
                        </td>
                        <td style={{ padding: '14px 12px', color: '#71717a', fontSize: '0.78rem' }}>
                          {formatDate(exp.expense_date)}
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 800, color: '#111111' }}>
                          {formatINR(exp.amount)}
                        </td>
                        <td style={{ padding: '14px 0 14px 12px', textAlign: 'right' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: 20,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: isApproved ? 'rgba(34, 197, 94, 0.1)' : isPending ? '#fffbeb' : '#fef2f2',
                            color: isApproved ? '#16a34a' : isPending ? '#ca8a04' : '#ef4444'
                          }}>
                            {isApproved ? 'Approved' : isPending ? 'Pending' : exp.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .dashboard-charts-grid {
            grid-template-columns: 1fr !important;
          }
          .dashboard-bottom-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
