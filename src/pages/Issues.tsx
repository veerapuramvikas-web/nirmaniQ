import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Plus, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useIssues, useIssueDetail, useProjects, useProfiles, useRealtime, showToast } from '../hooks';
import * as issueService from '../services/issue.service';
import { formatDate, issueStatusColor, issueStatusLabel, issuePriorityColor, issuePriorityLabel } from '../utils';
import {
  PageHeader, EmptyState, SearchInput, SelectFilter, FilterBar,
  Modal, FormField, SectionCard, PageLoader, ErrorState
} from '../components/shared';
import type { Issue, IssueCategory, IssuePriority, IssueStatus } from '../types';
import { ISSUE_CATEGORIES } from '../types';

function IssueForm({
  projects,
  profiles,
  onSubmit,
  onClose,
  initial,
}: {
  projects: any[];
  profiles: any[];
  onSubmit: (data: any) => void;
  onClose: () => void;
  initial?: Partial<Issue>;
}) {
  const [searchParams] = useSearchParams();
  const defaultProjectId = searchParams.get('projectId') || initial?.project_id || projects[0]?.id || '';

  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    project_id: defaultProjectId,
    site: initial?.site || '',
    category: (initial?.category || 'Other') as IssueCategory,
    priority: (initial?.priority || 'medium') as IssuePriority,
    reported_date: initial?.reported_date || new Date().toISOString().slice(0, 10),
    assigned_to: initial?.assigned_to || '',
    target_resolution_date: initial?.target_resolution_date || '',
    status: (initial?.status || 'open') as IssueStatus,
    resolution_notes: initial?.resolution_notes || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.description.trim()) errs.description = 'Description is required';
    if (!form.project_id) errs.project_id = 'Project is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <FormField label="Issue Title" error={errors.title} required>
            <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Brief, clear title" />
          </FormField>
        </div>
        <FormField label="Project" error={errors.project_id} required>
          <select className="form-select" value={form.project_id} onChange={e => set('project_id', e.target.value)}>
            <option value="">Select Project</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </FormField>
        <FormField label="Site Location">
          <input className="form-input" value={form.site} onChange={e => set('site', e.target.value)} placeholder="e.g. 3rd Floor Slab" />
        </FormField>
        <FormField label="Category" required>
          <select className="form-select" value={form.category} onChange={e => set('category', e.target.value as IssueCategory)}>
            {ISSUE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </FormField>
        <FormField label="Priority" required>
          <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value as IssuePriority)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </FormField>
        <FormField label="Reported Date" required>
          <input type="date" className="form-input" value={form.reported_date} onChange={e => set('reported_date', e.target.value)} />
        </FormField>
        <FormField label="Assigned To">
          <select className="form-select" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
            <option value="">Unassigned</option>
            {profiles.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </FormField>
        <FormField label="Target Resolution Date">
          <input type="date" className="form-input" value={form.target_resolution_date} onChange={e => set('target_resolution_date', e.target.value)} />
        </FormField>
        <div style={{ gridColumn: '1/-1' }}>
          <FormField label="Description" error={errors.description} required>
            <textarea className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Detailed description of the issue" rows={3} />
          </FormField>
        </div>
        {(form.status === 'resolved' || form.status === 'closed') && (
          <div style={{ gridColumn: '1/-1' }}>
            <FormField label="Resolution Notes">
              <textarea className="form-textarea" value={form.resolution_notes} onChange={e => set('resolution_notes', e.target.value)} placeholder="How was this resolved?" rows={2} />
            </FormField>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary">Save Issue</button>
      </div>
    </form>
  );
}

export function IssuesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { projects } = useProjects();
  const { profiles } = useProfiles();
  const { issues, loading, error, reload } = useIssues();

  useRealtime('issues', reload);

  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState(searchParams.get('projectId') || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showForm, setShowForm] = useState(!!searchParams.get('new'));
  const [editIssue, setEditIssue] = useState<Issue | null>(null);

  if (loading && issues.length === 0) {
    return <PageLoader message="Loading issues..." />;
  }

  if (error && issues.length === 0) {
    return <ErrorState title="Failed to load issues" message={error} onRetry={reload} />;
  }

  const filtered = issues.filter((i: Issue) => {
    const q = search.toLowerCase();
    const matchSearch = !q || i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q);
    const matchProject = !projectFilter || i.project_id === projectFilter;
    const matchStatus = !statusFilter || i.status === statusFilter;
    const matchPriority = !priorityFilter || i.priority === priorityFilter;
    return matchSearch && matchProject && matchStatus && matchPriority;
  }).sort((a: Issue, b: Issue) => {
    const pOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (pOrder[a.priority] ?? 4) - (pOrder[b.priority] ?? 4);
  });

  const handleCreate = async (data: any) => {
    try {
      await issueService.createIssue(data);
      setShowForm(false);
      reload();
      showToast('Issue created', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to create issue', 'error');
    }
  };

  const handleEdit = async (data: any) => {
    if (!editIssue) return;
    try {
      await issueService.updateIssue(editIssue.id, data);
      setEditIssue(null);
      reload();
      showToast('Issue updated', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to update issue', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="Issues & Site Delays"
        subtitle="Log and track quality, safety, and delay issues across projects"
        action={
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Report Issue
          </button>
        }
      />

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Open Issues', count: issues.filter((i: Issue) => i.status === 'open').length, color: '#dc2626' },
          { label: 'In Progress', count: issues.filter((i: Issue) => i.status === 'in_progress').length, color: '#d97706' },
          { label: 'Critical / High', count: issues.filter((i: Issue) => (i.priority === 'critical' || i.priority === 'high') && (i.status === 'open' || i.status === 'in_progress')).length, color: '#b91c1c' },
          { label: 'Resolved / Closed', count: issues.filter((i: Issue) => i.status === 'resolved' || i.status === 'closed').length, color: '#16a34a' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</p>
            <p style={{ margin: 0, fontSize: '1.625rem', fontWeight: 800, color: s.color, fontFamily: 'var(--font-display)' }}>{s.count}</p>
          </div>
        ))}
      </div>

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search issues…" />
        <SelectFilter value={projectFilter} onChange={setProjectFilter} placeholder="All Projects"
          options={projects.map((p: any) => ({ value: p.id, label: p.name }))} />
        <SelectFilter value={statusFilter} onChange={setStatusFilter} placeholder="All Statuses"
          options={[
            { value: 'open', label: 'Open' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'resolved', label: 'Resolved' },
            { value: 'closed', label: 'Closed' },
          ]} />
        <SelectFilter value={priorityFilter} onChange={setPriorityFilter} placeholder="All Priorities"
          options={[
            { value: 'critical', label: 'Critical' },
            { value: 'high', label: 'High' },
            { value: 'medium', label: 'Medium' },
            { value: 'low', label: 'Low' },
          ]} />
      </FilterBar>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
        {filtered.length === 0 ? (
          <div style={{ gridColumn: '1/-1' }}>
            <EmptyState icon={<AlertTriangle size={28} />} title="No issues found"
              action={<button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Report Issue</button>}
            />
          </div>
        ) : filtered.map((issue: any) => {
          const project = projects.find((p: any) => p.id === issue.project_id);
          const assignee = issue.assignee || profiles.find((u: any) => u.id === issue.assigned_to);

          return (
            <div
              key={issue.id}
              className="card card-hover"
              style={{ padding: '20px', cursor: 'pointer' }}
              onClick={() => navigate(`/issues/${issue.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <span className="badge badge-gray" style={{ fontSize: '0.6875rem' }}>{issue.category}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className={`badge ${issuePriorityColor(issue.priority)}`}>{issuePriorityLabel(issue.priority)}</span>
                  <span className={`badge ${issueStatusColor(issue.status)}`}>{issueStatusLabel(issue.status)}</span>
                </div>
              </div>

              <h3 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700, color: '#111827', fontFamily: 'var(--font-display)' }}>{issue.title}</h3>
              <p style={{ margin: '0 0 14px', fontSize: '0.8125rem', color: '#6b7280', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {issue.description}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9ca3af', paddingTop: 10, borderTop: '1px solid #f3f4f6' }}>
                <span>{project?.name || '—'}</span>
                <span>{formatDate(issue.reported_date)}</span>
              </div>
              {assignee && (
                <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                  Assigned to: <strong>{assignee.name}</strong>
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* New Issue Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Report New Issue" size="lg">
        <IssueForm projects={projects} profiles={profiles} onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      </Modal>

      {/* Edit Issue Modal */}
      {editIssue && (
        <Modal isOpen={true} onClose={() => setEditIssue(null)} title="Edit Issue" size="lg">
          <IssueForm
            projects={projects}
            profiles={profiles}
            initial={editIssue}
            onSubmit={handleEdit}
            onClose={() => setEditIssue(null)}
          />
        </Modal>
      )}
    </div>
  );
}

export function IssueDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects } = useProjects();
  const { profiles } = useProfiles();
  const { data: issue, loading, error, reload } = useIssueDetail(id);
  const [showEdit, setShowEdit] = useState(false);

  if (loading && !issue) {
    return <PageLoader message="Loading issue details..." />;
  }

  if (error || (!loading && !issue)) {
    return (
      <div>
        <PageHeader title="Issue Not Found" subtitle={error || undefined} />
        <button className="btn btn-secondary" onClick={() => navigate('/issues')}><ArrowLeft size={15} /> Back to Issues</button>
      </div>
    );
  }

  const project = projects.find((p: any) => p.id === issue.project_id);
  const reporter = issue.reporter || profiles.find((u: any) => u.id === issue.created_by);
  const assignee = issue.assignee || profiles.find((u: any) => u.id === issue.assigned_to);

  const handleEdit = async (data: any) => {
    try {
      await issueService.updateIssue(issue.id, data);
      setShowEdit(false);
      reload();
      showToast('Issue updated', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error');
    }
  };

  const handleStatusChange = async (newStatus: IssueStatus) => {
    try {
      await issueService.updateIssue(issue.id, { status: newStatus });
      reload();
      showToast(`Issue status changed to ${newStatus}`, 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Status update failed', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title={issue.title}
        breadcrumb={[
          { label: 'Issues', onClick: () => navigate('/issues') },
          { label: issue.title },
        ]}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowEdit(true)}>Edit Issue</button>
            <span className={`badge ${issueStatusColor(issue.status)}`} style={{ padding: '6px 14px' }}>{issueStatusLabel(issue.status)}</span>
            <span className={`badge ${issuePriorityColor(issue.priority)}`} style={{ padding: '6px 14px' }}>{issuePriorityLabel(issue.priority)}</span>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SectionCard title="Issue Description">
            <p style={{ margin: 0, fontSize: '0.9375rem', color: '#374151', lineHeight: 1.7 }}>{issue.description}</p>
          </SectionCard>
          {issue.resolution_notes && (
            <SectionCard title="Resolution Notes">
              <div style={{ padding: '12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                <p style={{ margin: 0, color: '#374151', lineHeight: 1.6 }}>{issue.resolution_notes}</p>
              </div>
            </SectionCard>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionCard title="Issue Details">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Project', project?.name || '—'],
                ['Site', issue.site || '—'],
                ['Category', issue.category],
                ['Reported By', reporter?.name || '—'],
                ['Reported Date', formatDate(issue.reported_date)],
                ['Assigned To', assignee?.name || 'Unassigned'],
                ['Target Resolution', issue.target_resolution_date ? formatDate(issue.target_resolution_date) : '—'],
              ].map(([k, v]) => (
                <div key={k}>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{k}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>{v}</p>
                </div>
              ))}
            </div>
          </SectionCard>
          <div style={{ display: 'flex', gap: 8 }}>
            {issue.status === 'open' && (
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => handleStatusChange('in_progress')}>
                Mark In Progress
              </button>
            )}
            {issue.status === 'in_progress' && (
              <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={() => setShowEdit(true)}>
                Mark Resolved
              </button>
            )}
          </div>
        </div>
      </div>

      {showEdit && (
        <Modal isOpen={true} onClose={() => setShowEdit(false)} title="Edit Issue" size="lg">
          <IssueForm
            projects={projects}
            profiles={profiles}
            onSubmit={handleEdit}
            onClose={() => setShowEdit(false)}
            initial={issue}
          />
        </Modal>
      )}
    </div>
  );
}
