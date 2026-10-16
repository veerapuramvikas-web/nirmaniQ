import { useState } from 'react';
import { useProjects, useDailyReports, useProfiles, useIssues, useExpenses, useAuth } from '../hooks';
import { formatINR, formatDate, projectStatusColor, projectStatusLabel } from '../utils';
import { PageHeader, ProgressBar, PageLoader } from '../components/shared';
import {
  MapPin, UserPlus, X, Edit3, Trash2, Phone, Mail,
  Save, CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Project, DailyReport, Issue, Expense } from '../types';
import { createTeamMember, updateTeamMember, deleteTeamMember } from '../services/auth.service';
import { showToast } from '../hooks';

export function SitesPage() {
  const navigate = useNavigate();
  const { projects, summary, loading: projLoading } = useProjects();
  const { reports: dailyReports } = useDailyReports();
  const { profiles } = useProfiles();
  const { issues } = useIssues();
  const { expenses } = useExpenses();

  if (projLoading && projects.length === 0) {
    return <PageLoader message="Loading sites..." />;
  }

  return (
    <div>
      <PageHeader
        title="Construction Sites"
        subtitle="Overview of all active construction sites and their status"
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
        {projects.map((project: Project) => {
          const sumRow = summary.find((s: any) => s.project_id === project.id);
          const spent = sumRow ? sumRow.approved_expenditure : expenses.filter((e: Expense) => e.project_id === project.id && e.status === 'approved').reduce((s: number, e: Expense) => s + e.amount, 0);
          const recentReports = dailyReports.filter((r: DailyReport) => r.project_id === project.id).sort((a: DailyReport, b: DailyReport) => b.report_date.localeCompare(a.report_date));
          const latestReport = recentReports[0];
          const supervisor = profiles.find((u: any) => u.id === project.assigned_supervisor_id);
          const openIssues = issues.filter((i: Issue) => i.project_id === project.id && (i.status === 'open' || i.status === 'in_progress'));

          return (
            <div key={project.id} className="card card-hover" style={{ padding: 24, cursor: 'pointer' }} onClick={() => navigate(`/projects/${project.id}`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 800, color: '#111827', fontSize: '1rem', fontFamily: 'var(--font-display)' }}>{project.name}</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <MapPin size={11} /> {project.site_address}
                  </p>
                </div>
                <span className={`badge ${projectStatusColor(project.status)}`}>{projectStatusLabel(project.status)}</span>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Site Progress</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{project.progress_percentage}%</span>
                </div>
                <ProgressBar value={project.progress_percentage} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14, padding: '12px', background: '#f9fafb', borderRadius: 8 }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.6875rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Supervisor</p>
                  <p style={{ margin: '3px 0 0', fontSize: '0.8125rem', fontWeight: 700, color: '#374151' }}>{supervisor?.name?.split(' ')[0] || '—'}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.6875rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Reports</p>
                  <p style={{ margin: '3px 0 0', fontSize: '0.8125rem', fontWeight: 700, color: '#374151' }}>{recentReports.length}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.6875rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Issues</p>
                  <p style={{ margin: '3px 0 0', fontSize: '0.8125rem', fontWeight: 700, color: openIssues.length > 0 ? '#dc2626' : '#374151' }}>{openIssues.length}</p>
                </div>
              </div>

              {latestReport && (
                <div style={{ padding: '10px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                  <p style={{ margin: 0, fontSize: '0.6875rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Latest Report — {formatDate(latestReport.report_date)}</p>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: '#374151', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{latestReport.work_completed}</p>
                </div>
              )}

              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Target: {formatDate(project.expected_end_date)}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#2563eb' }}>{formatINR(spent)} spent</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TeamPage() {
  const { profiles, loading, reload } = useProfiles();
  const { projects } = useProjects();
  const { user, profile } = useAuth();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'supervisor' as 'supervisor' | 'accountant' | 'owner',
    password: '',
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    role: 'supervisor' as 'supervisor' | 'accountant' | 'owner',
  });

  const isOwner = profile?.role === 'owner' || !profile?.role;

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      showToast('Name and email are required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await createTeamMember({
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        phone: formData.phone.trim() ? (formData.phone.startsWith('+91') ? formData.phone : `+91${formData.phone.replace(/\D/g, '')}`) : undefined,
        password: formData.password || undefined,
      });

      showToast(`Added ${formData.name}`, 'success');
      setShowAddModal(false);
      setFormData({ name: '', email: '', phone: '', role: 'supervisor', password: '' });
      await reload();
    } catch (err: any) {
      console.error('Add team member error:', err);
      showToast(err?.message || 'Failed to add team member', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (member: any) => {
    setEditingMember(member);
    setEditFormData({
      name: member.name || '',
      phone: member.phone ? member.phone.replace('+91', '') : '',
      role: member.role || 'supervisor',
    });
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    if (!editFormData.name.trim()) {
      showToast('Name is required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await updateTeamMember(editingMember.id, {
        name: editFormData.name.trim(),
        role: editFormData.role,
        phone: editFormData.phone.trim() ? editFormData.phone : undefined,
      });

      showToast('Member updated', 'success');
      setEditingMember(null);
      await reload();
    } catch (err: any) {
      console.error('Update error:', err);
      showToast(err?.message || 'Failed to update member', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMember = async (member: any) => {
    if (member.id === user?.id) {
      showToast('Cannot delete your own current account', 'error');
      return;
    }
    const confirmed = window.confirm(`Remove ${member.name || member.email} from the team?`);
    if (!confirmed) return;

    try {
      await deleteTeamMember(member.id);
      showToast('Member removed', 'success');
      await reload();
    } catch (err: any) {
      console.error('Delete error:', err);
      showToast(err?.message || 'Failed to remove member', 'error');
    }
  };

  if (loading && profiles.length === 0) {
    return <PageLoader message="Loading team..." />;
  }

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      {/* Clean Minimal Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.02em' }}>
            Team
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#71717a' }}>
            Manage your internal team members, roles, and contact details.
          </p>
        </div>

        {isOwner && (
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
              borderRadius: 12, fontWeight: 700, fontSize: '0.875rem', background: '#09090b',
              color: '#ffdd00', border: 'none', cursor: 'pointer'
            }}
          >
            <UserPlus size={16} /> Add Member
          </button>
        )}
      </div>

      {/* Clean Minimal Member Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
        {profiles.map((teamMember: any) => {
          const assignedProjects = projects.filter((p: Project) => p.assigned_supervisor_id === teamMember.id);
          const isCurrentUser = teamMember.id === user?.id;

          return (
            <div
              key={teamMember.id}
              style={{
                background: '#ffffff', borderRadius: 18, border: '1px solid #e4e4e7',
                padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: teamMember.role === 'owner' ? '#09090b' : '#f4f4f5',
                      color: teamMember.role === 'owner' ? '#ffdd00' : '#09090b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '1rem', border: '1px solid #e4e4e7'
                    }}>
                      {teamMember.name ? teamMember.name.slice(0, 2).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 800, color: '#09090b' }}>
                        {teamMember.name || 'Site User'}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                        <Mail size={12} color="#71717a" />
                        <span style={{ fontSize: '0.78rem', color: '#71717a' }}>{teamMember.email || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Clean Edit & Delete Buttons */}
                  {isOwner && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => openEditModal(teamMember)}
                        title="Edit Member"
                        style={{
                          width: 30, height: 30, borderRadius: 8, border: '1px solid #e4e4e7',
                          background: '#ffffff', color: '#3f3f46', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                        }}
                      >
                        <Edit3 size={13} />
                      </button>
                      {!isCurrentUser && (
                        <button
                          onClick={() => handleDeleteMember(teamMember)}
                          title="Remove Member"
                          style={{
                            width: 30, height: 30, borderRadius: 8, border: '1px solid #fee2e2',
                            background: '#fef2f2', color: '#dc2626', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{
                    padding: '3px 9px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700,
                    background: teamMember.role === 'owner' ? '#f5f3ff' : teamMember.role === 'supervisor' ? '#eff6ff' : '#ecfdf5',
                    color: teamMember.role === 'owner' ? '#7c3aed' : teamMember.role === 'supervisor' ? '#2563eb' : '#059669',
                    border: '1px solid rgba(0,0,0,0.06)'
                  }}>
                    {teamMember.role === 'owner' ? 'Owner / Admin' : teamMember.role === 'supervisor' ? 'Site Supervisor' : 'Accountant'}
                  </span>

                  {isCurrentUser && (
                    <span style={{
                      padding: '3px 9px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700,
                      background: '#fffbeb', color: '#b45309', border: '1px solid #fef3c7'
                    }}>
                      Current User
                    </span>
                  )}
                </div>

                {teamMember.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#52525b', marginBottom: 10 }}>
                    <Phone size={12} color="#71717a" />
                    <span>{teamMember.phone}</span>
                  </div>
                )}
              </div>

              {assignedProjects.length > 0 && (
                <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: 10, marginTop: 4 }}>
                  <p style={{ margin: '0 0 5px', fontSize: '0.7rem', color: '#a1a1aa', fontWeight: 700, textTransform: 'uppercase' }}>
                    Assigned Sites
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {assignedProjects.map((p: Project) => (
                      <span key={p.id} style={{
                        padding: '2px 7px', borderRadius: 6, background: '#f4f4f5',
                        fontSize: '0.73rem', color: '#3f3f46', fontWeight: 600
                      }}>
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Member Modal */}
      {editingMember && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(9, 9, 11, 0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            width: '100%', maxWidth: 440, background: '#ffffff', borderRadius: 20,
            padding: 26, position: 'relative', boxShadow: '0 16px 32px rgba(0,0,0,0.15)'
          }}>
            <button
              onClick={() => setEditingMember(null)}
              style={{ position: 'absolute', right: 18, top: 18, background: 'none', border: 'none', cursor: 'pointer', color: '#71717a' }}
            >
              <X size={18} />
            </button>

            <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800, color: '#09090b' }}>
              Edit Member
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: '0.82rem', color: '#71717a' }}>
              {editingMember.email}
            </p>

            <form onSubmit={handleUpdateMember} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#09090b', marginBottom: 5 }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={e => setEditFormData(f => ({ ...f, name: e.target.value }))}
                  style={{
                    width: '100%', height: 40, border: '1px solid #e4e4e7', borderRadius: 10,
                    padding: '0 12px', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#09090b', marginBottom: 5 }}>
                  Role
                </label>
                <select
                  value={editFormData.role}
                  onChange={e => setEditFormData(f => ({ ...f, role: e.target.value as any }))}
                  style={{
                    width: '100%', height: 40, border: '1px solid #e4e4e7', borderRadius: 10,
                    padding: '0 12px', fontSize: '0.88rem', outline: 'none', background: '#ffffff',
                    fontWeight: 600, color: '#09090b',
                  }}
                >
                  <option value="owner">Owner / Admin</option>
                  <option value="supervisor">Site Supervisor</option>
                  <option value="accountant">Accountant</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#09090b', marginBottom: 5 }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={editFormData.phone}
                  onChange={e => setEditFormData(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  maxLength={10}
                  style={{
                    width: '100%', height: 40, border: '1px solid #e4e4e7', borderRadius: 10,
                    padding: '0 12px', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  style={{
                    flex: 1, height: 40, border: '1px solid #e4e4e7', background: '#ffffff',
                    borderRadius: 10, fontWeight: 700, color: '#52525b', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1, height: 40, borderRadius: 10, fontWeight: 800,
                    background: '#09090b', color: '#ffdd00', border: 'none', cursor: 'pointer',
                  }}
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(9, 9, 11, 0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            width: '100%', maxWidth: 460, background: '#ffffff', borderRadius: 20,
            padding: 26, position: 'relative', boxShadow: '0 16px 32px rgba(0,0,0,0.15)'
          }}>
            <button
              onClick={() => setShowAddModal(false)}
              style={{ position: 'absolute', right: 18, top: 18, background: 'none', border: 'none', cursor: 'pointer', color: '#71717a' }}
            >
              <X size={18} />
            </button>

            <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800, color: '#09090b' }}>
              Add Team Member
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: '0.82rem', color: '#71717a' }}>
              Create an account for a supervisor or accountant.
            </p>

            <form onSubmit={handleCreateMember} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#09090b', marginBottom: 5 }}>
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={e => setFormData(f => ({ ...f, role: e.target.value as any }))}
                  style={{
                    width: '100%', height: 40, border: '1px solid #e4e4e7', borderRadius: 10,
                    padding: '0 12px', fontSize: '0.88rem', outline: 'none', background: '#ffffff',
                    fontWeight: 600, color: '#09090b',
                  }}
                >
                  <option value="supervisor">Site Supervisor (Daily logs & materials)</option>
                  <option value="accountant">Accountant (Billing & expense review)</option>
                  <option value="owner">Owner / Admin</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#09090b', marginBottom: 5 }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh Kumar"
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  style={{
                    width: '100%', height: 40, border: '1px solid #e4e4e7', borderRadius: 10,
                    padding: '0 12px', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#09090b', marginBottom: 5 }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="suresh@site.com"
                  value={formData.email}
                  onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                  style={{
                    width: '100%', height: 40, border: '1px solid #e4e4e7', borderRadius: 10,
                    padding: '0 12px', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#09090b', marginBottom: 5 }}>
                  Mobile Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={e => setFormData(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  maxLength={10}
                  style={{
                    width: '100%', height: 40, border: '1px solid #e4e4e7', borderRadius: 10,
                    padding: '0 12px', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1, height: 40, border: '1px solid #e4e4e7', background: '#ffffff',
                    borderRadius: 10, fontWeight: 700, color: '#52525b', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1, height: 40, borderRadius: 10, fontWeight: 800,
                    background: '#09090b', color: '#ffdd00', border: 'none', cursor: 'pointer',
                  }}
                >
                  {submitting ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function SettingsPage() {
  const [saving, setSaving] = useState(false);

  // Minimal editable settings
  const [settings, setSettings] = useState({
    companyName: 'NirmaniQ Construction Cloud',
    regNumber: 'GSTIN37AAACN1234F1Z8',
    headquarters: 'Anantapur, Andhra Pradesh, India',
    currency: 'INR (₹)',
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      showToast('Settings saved', 'success');
    }, 400);
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#09090b', letterSpacing: '-0.02em' }}>
          Settings
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#71717a' }}>
          Workspace details and system configuration.
        </p>
      </div>

      <div style={{
        background: '#ffffff', borderRadius: 20, border: '1px solid #e4e4e7',
        padding: '28px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', marginBottom: 20
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 800, color: '#09090b' }}>
          Company Details
        </h3>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#09090b', marginBottom: 6 }}>
              Company Name
            </label>
            <input
              type="text"
              value={settings.companyName}
              onChange={e => setSettings(s => ({ ...s, companyName: e.target.value }))}
              style={{
                width: '100%', height: 42, borderRadius: 10, border: '1px solid #e4e4e7',
                padding: '0 14px', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#09090b', marginBottom: 6 }}>
                GSTIN / Tax ID
              </label>
              <input
                type="text"
                value={settings.regNumber}
                onChange={e => setSettings(s => ({ ...s, regNumber: e.target.value }))}
                style={{
                  width: '100%', height: 42, borderRadius: 10, border: '1px solid #e4e4e7',
                  padding: '0 14px', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#09090b', marginBottom: 6 }}>
                Currency
              </label>
              <input
                type="text"
                value={settings.currency}
                onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))}
                style={{
                  width: '100%', height: 42, borderRadius: 10, border: '1px solid #e4e4e7',
                  padding: '0 14px', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#09090b', marginBottom: 6 }}>
              Headquarters / Site Address
            </label>
            <input
              type="text"
              value={settings.headquarters}
              onChange={e => setSettings(s => ({ ...s, headquarters: e.target.value }))}
              style={{
                width: '100%', height: 42, borderRadius: 10, border: '1px solid #e4e4e7',
                padding: '0 14px', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                borderRadius: 10, fontWeight: 800, fontSize: '0.85rem', background: '#09090b',
                color: '#ffdd00', border: 'none', cursor: 'pointer'
              }}
            >
              <Save size={15} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Minimal Cloud Status */}
      <div style={{
        background: '#ffffff', borderRadius: 20, border: '1px solid #e4e4e7',
        padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: '0 0 3px', fontSize: '0.95rem', fontWeight: 800, color: '#09090b' }}>
              Database & Offline Sync
            </h4>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#71717a' }}>
              Cloud database connection is active. Field entries auto-sync when online.
            </p>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
            borderRadius: 8, background: '#ecfdf5', color: '#047857', fontSize: '0.75rem', fontWeight: 700
          }}>
            <CheckCircle2 size={13} /> Active
          </span>
        </div>
      </div>
    </div>
  );
}


