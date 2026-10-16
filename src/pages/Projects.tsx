import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2, Calendar, Users } from 'lucide-react';
import { useProjects, useProfiles, useRealtime, showToast } from '../hooks';
import * as projectService from '../services/project.service';
import { formatINR, formatDate, projectStatusColor, projectStatusLabel, percentage } from '../utils';
import {
  PageHeader, ProgressBar, EmptyState, SearchInput,
  SelectFilter, FilterBar, StatCard, Modal, FormField, PageLoader, ErrorState
} from '../components/shared';
import type { Project, ProjectStatus } from '../types';

const PROJECT_TYPES = ['Residential Construction', 'Commercial Construction', 'Villa Construction', 'Infrastructure', 'Industrial', 'Renovation', 'Other'];
const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
];

interface ProjectFormData {
  name: string;
  code: string;
  client_name: string;
  site_address: string;
  project_type: string;
  status: ProjectStatus;
  start_date: string;
  expected_end_date: string;
  total_budget: string;
  progress_percentage: string;
  assigned_supervisor_id: string;
  notes: string;
}

const defaultForm: ProjectFormData = {
  name: '', code: '', client_name: '', site_address: '',
  project_type: 'Residential Construction', status: 'planning',
  start_date: '', expected_end_date: '', total_budget: '',
  progress_percentage: '0', assigned_supervisor_id: '', notes: '',
};

function ProjectForm({ initial, onSubmit, onClose, supervisors }: {
  initial?: ProjectFormData;
  onSubmit: (data: ProjectFormData) => void;
  onClose: () => void;
  supervisors: any[];
}) {
  const [form, setForm] = useState<ProjectFormData>(initial || {
    ...defaultForm,
    assigned_supervisor_id: supervisors[0]?.id || '',
  });
  const [errors, setErrors] = useState<Partial<ProjectFormData>>({});

  const set = (k: keyof ProjectFormData, v: string) => setForm(p => ({ ...p, [k]: v }));

  const validate = (): boolean => {
    const errs: Partial<ProjectFormData> = {};
    if (!form.name.trim()) errs.name = 'Project name is required';
    if (!form.code.trim()) errs.code = 'Project code is required';
    if (!form.client_name.trim()) errs.client_name = 'Client name is required';
    if (!form.site_address.trim()) errs.site_address = 'Site address is required';
    if (!form.start_date) errs.start_date = 'Start date is required';
    if (!form.expected_end_date) errs.expected_end_date = 'Expected end date is required';
    if (form.start_date && form.expected_end_date && form.expected_end_date <= form.start_date) {
      errs.expected_end_date = 'End date must be after start date';
    }
    const budget = parseFloat(form.total_budget);
    if (!form.total_budget || isNaN(budget) || budget <= 0) errs.total_budget = 'Valid budget is required';
    const prog = parseInt(form.progress_percentage);
    if (isNaN(prog) || prog < 0 || prog > 100) errs.progress_percentage = 'Must be 0–100';
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
        <FormField label="Project Name" error={errors.name} required>
          <input className={`form-input ${errors.name ? 'error' : ''}`} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Sri Lakshmi Residency" />
        </FormField>
        <FormField label="Project Code" error={errors.code} required>
          <input className={`form-input ${errors.code ? 'error' : ''}`} value={form.code} onChange={e => set('code', e.target.value)} placeholder="e.g. SLR-2024-01" />
        </FormField>
        <FormField label="Client Name" error={errors.client_name} required>
          <input className={`form-input ${errors.client_name ? 'error' : ''}`} value={form.client_name} onChange={e => set('client_name', e.target.value)} placeholder="Client or owner name" />
        </FormField>
        <FormField label="Project Type" required>
          <select className="form-select" value={form.project_type} onChange={e => set('project_type', e.target.value)}>
            {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </FormField>
        <div style={{ gridColumn: '1 / -1' }}>
          <FormField label="Site Address" error={errors.site_address} required>
            <input className={`form-input ${errors.site_address ? 'error' : ''}`} value={form.site_address} onChange={e => set('site_address', e.target.value)} placeholder="Full site address" />
          </FormField>
        </div>
        <FormField label="Status" required>
          <select className="form-select" value={form.status} onChange={e => set('status', e.target.value as ProjectStatus)}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>
        <FormField label="Assigned Supervisor" required>
          <select className="form-select" value={form.assigned_supervisor_id} onChange={e => set('assigned_supervisor_id', e.target.value)}>
            <option value="">Unassigned</option>
            {supervisors.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </FormField>
        <FormField label="Start Date" error={errors.start_date} required>
          <input type="date" className={`form-input ${errors.start_date ? 'error' : ''}`} value={form.start_date} onChange={e => set('start_date', e.target.value)} />
        </FormField>
        <FormField label="Expected Completion Date" error={errors.expected_end_date} required>
          <input type="date" className={`form-input ${errors.expected_end_date ? 'error' : ''}`} value={form.expected_end_date} onChange={e => set('expected_end_date', e.target.value)} />
        </FormField>
        <FormField label="Total Budget (₹)" error={errors.total_budget} required hint="e.g. 2500000 for ₹25,00,000">
          <input type="number" className={`form-input ${errors.total_budget ? 'error' : ''}`} value={form.total_budget} onChange={e => set('total_budget', e.target.value)} placeholder="Amount in INR" min={0} />
        </FormField>
        <FormField label="Progress (%)" error={errors.progress_percentage} required>
          <input type="number" className={`form-input ${errors.progress_percentage ? 'error' : ''}`} value={form.progress_percentage} onChange={e => set('progress_percentage', e.target.value)} min={0} max={100} />
        </FormField>
        <div style={{ gridColumn: '1 / -1' }}>
          <FormField label="Notes">
            <textarea className="form-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes about the project" rows={3} />
          </FormField>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary">Save Project</button>
      </div>
    </form>
  );
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const { projects, summary, loading, error, reload } = useProjects();
  const { profiles } = useProfiles();
  const supervisors = profiles.filter((u: any) => u.role === 'supervisor');

  useRealtime('projects', reload);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);

  if (loading && projects.length === 0) {
    return <PageLoader message="Loading projects..." />;
  }

  if (error && projects.length === 0) {
    return <ErrorState title="Failed to load projects" message={error} onRetry={reload} />;
  }

  const filtered = projects.filter((p: Project) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.client_name.toLowerCase().includes(q);
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = async (data: ProjectFormData) => {
    try {
      await projectService.createProject({
        name: data.name, code: data.code, client_name: data.client_name,
        site_address: data.site_address, project_type: data.project_type,
        status: data.status, start_date: data.start_date,
        expected_end_date: data.expected_end_date, total_budget: parseFloat(data.total_budget),
        progress_percentage: parseInt(data.progress_percentage),
        assigned_supervisor_id: data.assigned_supervisor_id, notes: data.notes,
      });
      setShowCreate(false);
      reload();
      showToast('Project created successfully', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to create project', 'error');
    }
  };

  const handleEdit = async (data: ProjectFormData) => {
    if (!editProject) return;
    try {
      await projectService.updateProject(editProject.id, {
        name: data.name, code: data.code, client_name: data.client_name,
        site_address: data.site_address, project_type: data.project_type,
        status: data.status, start_date: data.start_date,
        expected_end_date: data.expected_end_date, total_budget: parseFloat(data.total_budget),
        progress_percentage: parseInt(data.progress_percentage),
        assigned_supervisor_id: data.assigned_supervisor_id, notes: data.notes,
      });
      setEditProject(null);
      reload();
      showToast('Project updated successfully', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to update project', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} total projects · ${projects.filter((p: Project) => p.status === 'active').length} active`}
        action={
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Project
          </button>
        }
      />

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {['planning', 'active', 'on_hold', 'completed'].map(s => (
          <StatCard
            key={s}
            label={projectStatusLabel(s)}
            value={projects.filter((p: Project) => p.status === s).length}
            icon={<Building2 size={18} color="#2563eb" />}
            iconBg="#eff6ff"
            onClick={() => setStatusFilter(s === statusFilter ? '' : s)}
          />
        ))}
      </div>

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search projects…" />
        <SelectFilter value={statusFilter} onChange={setStatusFilter} placeholder="All Statuses" options={STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))} />
      </FilterBar>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
        {filtered.length === 0 ? (
          <div style={{ gridColumn: '1/-1' }}>
            <EmptyState icon={<Building2 size={28} />} title="No projects found" description="Try adjusting your search or create a new project"
              action={<button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={15} /> New Project</button>} />
          </div>
        ) : filtered.map((project: any) => {
          const sumRow = summary.find((s: any) => s.project_id === project.id);
          const spent = sumRow ? sumRow.approved_expenditure : 0;
          const budgetPct = percentage(spent, project.total_budget);
          const supervisor = project.supervisor || profiles.find((u: any) => u.id === project.assigned_supervisor_id);
          return (
            <div
              key={project.id}
              className="card card-hover"
              style={{ padding: '20px', cursor: 'pointer' }}
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.6875rem', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{project.code}</p>
                  <h3 style={{ margin: '3px 0 4px', fontSize: '1rem', fontWeight: 700, color: '#111827', fontFamily: 'var(--font-display)' }}>{project.name}</h3>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: '#6b7280' }}>{project.client_name}</p>
                </div>
                <span className={`badge ${projectStatusColor(project.status)}`}>{projectStatusLabel(project.status)}</span>
              </div>

              <p style={{ margin: '0 0 14px', fontSize: '0.8125rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Building2 size={12} /> {project.site_address}
              </p>

              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>Progress</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151' }}>{project.progress_percentage}%</span>
                </div>
                <ProgressBar value={project.progress_percentage} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.6875rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Budget</p>
                  <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>{formatINR(project.total_budget)}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.6875rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Spent (Approved)</p>
                  <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: budgetPct > 100 ? '#dc2626' : '#111827' }}>{formatINR(spent)}</p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#6b7280' }}>
                  <Users size={12} />
                  <span>{supervisor?.name || 'Unassigned'}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, fontSize: '0.75rem', color: '#9ca3af', alignItems: 'center' }}>
                  <Calendar size={11} />
                  <span>{formatDate(project.expected_end_date)}</span>
                </div>
              </div>

              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1 }}
                  onClick={e => { e.stopPropagation(); setEditProject(project); }}
                >Edit</button>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                  onClick={e => { e.stopPropagation(); navigate(`/projects/${project.id}`); }}
                >View Details</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Project" size="lg">
        <ProjectForm supervisors={supervisors} onSubmit={handleCreate} onClose={() => setShowCreate(false)} />
      </Modal>

      {/* Edit Modal */}
      {editProject && (
        <Modal isOpen={true} onClose={() => setEditProject(null)} title="Edit Project" size="lg">
          <ProjectForm
            supervisors={supervisors}
            initial={{
              name: editProject.name, code: editProject.code, client_name: editProject.client_name,
              site_address: editProject.site_address, project_type: editProject.project_type,
              status: editProject.status, start_date: editProject.start_date,
              expected_end_date: editProject.expected_end_date,
              total_budget: String(editProject.total_budget),
              progress_percentage: String(editProject.progress_percentage),
              assigned_supervisor_id: editProject.assigned_supervisor_id || '',
              notes: editProject.notes || '',
            }}
            onSubmit={handleEdit}
            onClose={() => setEditProject(null)}
          />
        </Modal>
      )}
    </div>
  );
}
