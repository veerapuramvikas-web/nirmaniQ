import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Plus, ClipboardList, Camera, ArrowLeft } from 'lucide-react';
import { useDailyReports, useReportDetail, useProjects, useProfiles, useAuth, useRealtime, showToast } from '../hooks';
import * as reportService from '../services/report.service';
import { uploadFile } from '../services/storage.service';
import { formatDate, formatDateTime } from '../utils';
import {
  PageHeader, EmptyState, SearchInput, SelectFilter, FilterBar,
  Modal, FormField, SectionCard, PageLoader, ErrorState
} from '../components/shared';
import type { DailyReport, DailyReportPhoto, ReportStatus } from '../types';
import { validateFile, ALLOWED_IMAGE_TYPES } from '../utils';

function ReportForm({
  projects,
  onSubmit,
  onClose,
  initial,
}: {
  projects: any[];
  onSubmit: (data: any, files: File[]) => void;
  onClose: () => void;
  initial?: Partial<DailyReport>;
}) {
  const [searchParams] = useSearchParams();
  const defaultProjectId = searchParams.get('projectId') || initial?.project_id || projects[0]?.id || '';

  const [form, setForm] = useState({
    project_id: defaultProjectId,
    site: initial?.site || '',
    report_date: initial?.report_date || new Date().toISOString().slice(0, 10),
    weather: initial?.weather || '',
    work_completed: initial?.work_completed || '',
    work_quantity: initial?.work_quantity || '',
    worker_count: initial?.worker_count ? String(initial.worker_count) : '',
    materials_received: initial?.materials_received || '',
    materials_used: initial?.materials_used || '',
    equipment_notes: initial?.equipment_notes || '',
    issues_and_delays: initial?.issues_and_delays || '',
    follow_up_required: initial?.follow_up_required || '',
    additional_notes: initial?.additional_notes || '',
    status: (initial?.status || 'draft') as ReportStatus,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [existingPhotos, setExistingPhotos] = useState<DailyReportPhoto[]>(initial?.photos || []);
  const [newFiles, setNewFiles] = useState<{ file: File; preview: string }[]>([]);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (existingPhotos.length + newFiles.length + files.length > 8) {
      showToast('Maximum 8 photos per report', 'warning');
      return;
    }

    const added: { file: File; preview: string }[] = [];
    for (const file of files) {
      const err = validateFile(file, ALLOWED_IMAGE_TYPES);
      if (err) { showToast(err, 'error'); continue; }
      added.push({ file, preview: URL.createObjectURL(file) });
    }
    setNewFiles(p => [...p, ...added]);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.project_id) errs.project_id = 'Project is required';
    if (!form.report_date) errs.report_date = 'Date is required';
    if (!form.work_completed.trim()) errs.work_completed = 'Work completed is required';
    const wc = parseInt(form.worker_count);
    if (!form.worker_count || isNaN(wc) || wc < 0) errs.worker_count = 'Valid worker count required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent, submitStatus: ReportStatus) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(
      { ...form, status: submitStatus, worker_count: parseInt(form.worker_count), photos: existingPhotos },
      newFiles.map(nf => nf.file)
    );
  };

  return (
    <form>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FormField label="Project" error={errors.project_id} required>
          <select className="form-select" value={form.project_id} onChange={e => set('project_id', e.target.value)}>
            <option value="">Select Project</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </FormField>
        <FormField label="Site Location">
          <input className="form-input" value={form.site} onChange={e => set('site', e.target.value)} placeholder="e.g. Site A" />
        </FormField>
        <FormField label="Report Date" error={errors.report_date} required>
          <input type="date" className="form-input" value={form.report_date} onChange={e => set('report_date', e.target.value)} />
        </FormField>
        <FormField label="Weather / Site Conditions">
          <input className="form-input" value={form.weather} onChange={e => set('weather', e.target.value)} placeholder="e.g. Clear, 28°C" />
        </FormField>
        <FormField label="Worker Count" error={errors.worker_count} required>
          <input type="number" className="form-input" value={form.worker_count} onChange={e => set('worker_count', e.target.value)} placeholder="Number of workers on site" min={0} />
        </FormField>
        <div style={{ gridColumn: '1/-1' }}>
          <FormField label="Work Completed" error={errors.work_completed} required>
            <textarea className="form-textarea" value={form.work_completed} onChange={e => set('work_completed', e.target.value)} placeholder="Describe the work completed today" rows={3} />
          </FormField>
        </div>
        <FormField label="Work Quantity / Measurement">
          <input className="form-input" value={form.work_quantity} onChange={e => set('work_quantity', e.target.value)} placeholder="e.g. 4 columns cast, 60% slab complete" />
        </FormField>
        <FormField label="Materials Received">
          <input className="form-input" value={form.materials_received} onChange={e => set('materials_received', e.target.value)} placeholder="e.g. 200 bags cement received" />
        </FormField>
        <div style={{ gridColumn: '1/-1' }}>
          <FormField label="Materials Used">
            <textarea className="form-textarea" value={form.materials_used} onChange={e => set('materials_used', e.target.value)} placeholder="e.g. 180 bags cement, 450kg steel, 30 cft sand" rows={2} />
          </FormField>
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <FormField label="Issues & Delays">
            <textarea className="form-textarea" value={form.issues_and_delays} onChange={e => set('issues_and_delays', e.target.value)} placeholder="Any delays, problems, or site issues observed today" rows={2} />
          </FormField>
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <FormField label="Follow-up Required">
            <input className="form-input" value={form.follow_up_required} onChange={e => set('follow_up_required', e.target.value)} placeholder="Actions needed or items to confirm" />
          </FormField>
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <FormField label="Equipment / Machinery Notes">
            <input className="form-input" value={form.equipment_notes} onChange={e => set('equipment_notes', e.target.value)} placeholder="Equipment status, repairs, observations" />
          </FormField>
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <FormField label="Additional Notes">
            <textarea className="form-textarea" value={form.additional_notes} onChange={e => set('additional_notes', e.target.value)} placeholder="Any other observations" rows={2} />
          </FormField>
        </div>

        {/* Photo Upload */}
        <div style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Site Photos (up to 8)</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            {existingPhotos.map((ph, i) => (
              <div key={ph.id || i} style={{ position: 'relative' }}>
                <img src={ph.url} alt={ph.caption || ph.name} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '2px solid #e5e7eb' }} />
                <button
                  type="button"
                  onClick={() => setExistingPhotos(p => p.filter((_, idx) => idx !== i))}
                  style={{ position: 'absolute', top: -6, right: -6, background: '#dc2626', color: 'white', border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >×</button>
              </div>
            ))}
            {newFiles.map((nf, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={nf.preview} alt="preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '2px solid #3b82f6' }} />
                <button
                  type="button"
                  onClick={() => setNewFiles(p => p.filter((_, idx) => idx !== i))}
                  style={{ position: 'absolute', top: -6, right: -6, background: '#dc2626', color: 'white', border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >×</button>
              </div>
            ))}
            {existingPhotos.length + newFiles.length < 8 && (
              <label style={{ width: 80, height: 80, border: '2px dashed #d1d5db', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9ca3af', fontSize: '0.7rem', gap: 4 }}>
                <Camera size={18} />
                <span>Add Photo</span>
                <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </label>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-ghost" onClick={e => handleSubmit(e as any, 'draft')}>Save Draft</button>
        <button type="button" className="btn btn-primary" onClick={e => handleSubmit(e as any, 'submitted')}>Submit Report</button>
      </div>
    </form>
  );
}

export function DailyReportsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { projects } = useProjects();
  const { profiles } = useProfiles();
  const { reports: dailyReports, loading, error, reload } = useDailyReports();

  useRealtime('daily_reports', reload);

  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState(searchParams.get('projectId') || '');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(!!searchParams.get('new'));

  if (loading && dailyReports.length === 0) {
    return <PageLoader message="Loading daily reports..." />;
  }

  if (error && dailyReports.length === 0) {
    return <ErrorState title="Failed to load daily reports" message={error} onRetry={reload} />;
  }

  const filtered = dailyReports
    .filter((r: any) => {
      const q = search.toLowerCase();
      const supervisor = r.supervisor || profiles.find((u: any) => u.id === r.supervisor_id);
      const matchSearch = !q || r.work_completed.toLowerCase().includes(q) || (supervisor?.name || '').toLowerCase().includes(q);
      const matchProject = !projectFilter || r.project_id === projectFilter;
      const matchStatus = !statusFilter || r.status === statusFilter;
      return matchSearch && matchProject && matchStatus;
    })
    .sort((a: any, b: any) => b.report_date.localeCompare(a.report_date));

  const handleCreate = async (data: any, files: File[]) => {
    try {
      const created = await reportService.createDailyReport({
        project_id: data.project_id,
        site: data.site,
        report_date: data.report_date,
        supervisor_id: user?.id || '',
        weather: data.weather,
        work_completed: data.work_completed,
        work_quantity: data.work_quantity,
        worker_count: data.worker_count,
        materials_received: data.materials_received,
        materials_used: data.materials_used,
        equipment_notes: data.equipment_notes,
        issues_and_delays: data.issues_and_delays,
        follow_up_required: data.follow_up_required,
        additional_notes: data.additional_notes,
        status: data.status,
      });

      // Upload photos to storage
      if (files.length > 0 && created?.id) {
        for (const file of files) {
          try {
            const { path } = await uploadFile('site-photos', file, created.id);
            await reportService.addReportPhoto(created.id, path, file.name);
          } catch (phErr) {
            console.warn('Failed to upload report photo:', phErr);
          }
        }
      }

      setShowForm(false);
      reload();
      showToast(data.status === 'submitted' ? 'Daily report submitted' : 'Report saved as draft', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to create report', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="Daily Site Reports"
        subtitle="Track day-to-day progress, worker strength, material deliveries, and site logs"
        action={
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, fontWeight: 700 }}
          >
            <Plus size={18} /> File Daily Report
          </button>
        }
      />

      {/* Construction Site KPI Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 16,
        marginBottom: 24,
      }}>
        <div className="card card-hover" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
            <ClipboardList size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Logs Filed
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              {dailyReports.length}
            </div>
          </div>
        </div>

        <div className="card card-hover" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
            <span style={{ fontSize: '1.2rem' }}>👷‍♂️</span>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Site Strength
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              {dailyReports.slice(0, 5).reduce((s: number, r: any) => s + (r.worker_count || 0), 0)} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>workers</span>
            </div>
          </div>
        </div>

        <div className="card card-hover" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
            <Camera size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Site Photo Documentation
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              {dailyReports.reduce((s: number, r: any) => s + (r.daily_report_photos?.length || 0), 0)} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>photos</span>
            </div>
          </div>
        </div>
      </div>

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search site work, observation, or supervisor…" />
        <SelectFilter value={projectFilter} onChange={setProjectFilter} placeholder="All Projects"
          options={projects.map((p: any) => ({ value: p.id, label: p.name }))} />
        <SelectFilter value={statusFilter} onChange={setStatusFilter} placeholder="All Statuses"
          options={[{ value: 'draft', label: 'Draft' }, { value: 'submitted', label: 'Submitted' }]} />
      </FilterBar>

      {filtered.length === 0 ? (
        <div className="card" style={{ padding: '48px 32px', textAlign: 'center' }}>
          <EmptyState
            icon={<ClipboardList size={32} />}
            title="No daily site logs found"
            description="Start documenting work completed, weather, worker strength, and photos for this project site."
            action={
              <button
                className="btn btn-primary"
                onClick={() => setShowForm(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px' }}
              >
                <Plus size={16} /> File First Daily Report
              </button>
            }
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map((r: any) => {
            const project = projects.find((p: any) => p.id === r.project_id);
            const supervisor = r.supervisor || profiles.find((u: any) => u.id === r.supervisor_id);
            const photosCount = r.daily_report_photos?.length || 0;

            return (
              <div
                key={r.id}
                className="card card-hover"
                style={{ padding: '20px 24px', cursor: 'pointer' }}
                onClick={() => navigate(`/daily-reports/${r.id}`)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <p style={{ margin: 0, fontWeight: 800, color: '#111827', fontSize: '1rem', fontFamily: 'var(--font-display)' }}>{formatDate(r.report_date)}</p>
                      <span className={`badge ${r.status === 'submitted' ? 'badge-green' : 'badge-gray'}`}>{r.status === 'submitted' ? 'Submitted' : 'Draft'}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: '#6b7280' }}>
                      {project?.name || '—'} {r.site ? `· ${r.site}` : ''} · Supervisor: {supervisor?.name || 'Supervisor'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#374151' }}>{r.worker_count} Workers</span>
                    {r.weather && <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>{r.weather}</p>}
                  </div>
                </div>

                <p style={{ margin: '0 0 12px', fontSize: '0.875rem', color: '#374151', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {r.work_completed}
                </p>

                <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: '#6b7280', paddingTop: 10, borderTop: '1px solid #f3f4f6' }}>
                  {r.work_quantity && <span>📐 <strong>Quantity:</strong> {r.work_quantity}</span>}
                  {photosCount > 0 && <span>📷 <strong>{photosCount}</strong> photo{photosCount > 1 ? 's' : ''}</span>}
                  {r.issues_and_delays && <span style={{ color: '#dc2626' }}>⚠️ Issues reported</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Report Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="New Daily Site Report" size="lg">
        <ReportForm projects={projects} onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      </Modal>
    </div>
  );
}

export function DailyReportDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects } = useProjects();
  const { profiles } = useProfiles();
  const { data: report, loading, error, reload } = useReportDetail(id);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);

  if (loading && !report) {
    return <PageLoader message="Loading report detail..." />;
  }

  if (error || (!loading && !report)) {
    return (
      <div>
        <PageHeader title="Report Not Found" subtitle={error || undefined} />
        <button className="btn btn-secondary" onClick={() => navigate('/daily-reports')}><ArrowLeft size={15} /> Back</button>
      </div>
    );
  }

  const project = projects.find((p: any) => p.id === report.project_id);
  const supervisor = report.supervisor || profiles.find((u: any) => u.id === report.supervisor_id);

  const handleUpdate = async (data: any, files: File[]) => {
    try {
      await reportService.updateDailyReport(report.id, { ...data });
      if (files.length > 0) {
        for (const file of files) {
          try {
            const { path } = await uploadFile('site-photos', file, report.id);
            await reportService.addReportPhoto(report.id, path, file.name);
          } catch (phErr) {
            console.warn('Failed to upload report photo:', phErr);
          }
        }
      }
      setShowEdit(false);
      reload();
      showToast('Report updated', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error');
    }
  };

  const reportPhotos = report.daily_report_photos || [];

  return (
    <div>
      <PageHeader
        title={`Site Report — ${formatDate(report.report_date)}`}
        breadcrumb={[
          { label: 'Daily Reports', onClick: () => navigate('/daily-reports') },
          { label: formatDate(report.report_date) },
        ]}
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowEdit(true)}>Edit Report</button>
            <span className={`badge ${report.status === 'submitted' ? 'badge-green' : 'badge-gray'}`} style={{ padding: '6px 14px' }}>
              {report.status === 'submitted' ? 'Submitted' : 'Draft'}
            </span>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Work Summary */}
          <SectionCard title="Work Completed">
            <p style={{ margin: 0, fontSize: '0.9375rem', color: '#374151', lineHeight: 1.6 }}>{report.work_completed}</p>
            {report.work_quantity && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#15803d' }}>Quantity: {report.work_quantity}</p>
              </div>
            )}
          </SectionCard>

          {/* Materials */}
          {(report.materials_received || report.materials_used) && (
            <SectionCard title="Materials">
              {report.materials_received && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.8125rem', color: '#374151' }}>Received:</p>
                  <p style={{ margin: 0, color: '#374151' }}>{report.materials_received}</p>
                </div>
              )}
              {report.materials_used && (
                <div>
                  <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.8125rem', color: '#374151' }}>Used:</p>
                  <p style={{ margin: 0, color: '#374151' }}>{report.materials_used}</p>
                </div>
              )}
            </SectionCard>
          )}

          {/* Issues */}
          {report.issues_and_delays && (
            <SectionCard title="Issues & Delays">
              <p style={{ margin: 0, color: '#374151', lineHeight: 1.6 }}>{report.issues_and_delays}</p>
              {report.follow_up_required && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a' }}>
                  <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#92400e' }}>Follow-up: {report.follow_up_required}</p>
                </div>
              )}
            </SectionCard>
          )}

          {/* Photos */}
          {reportPhotos.length > 0 && (
            <SectionCard title={`Site Photos (${reportPhotos.length})`}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                {reportPhotos.map((ph: any) => (
                  <div key={ph.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedPhoto(ph)}>
                    <img src={ph.url || ph.storage_path} alt={ph.caption || ph.file_name} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                    {ph.caption && <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>{ph.caption}</p>}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SectionCard title="Report Details">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Project', project?.name || '—'],
                ['Site', report.site || '—'],
                ['Supervisor', supervisor?.name || '—'],
                ['Report Date', formatDate(report.report_date)],
                ['Workers on Site', String(report.worker_count)],
                ['Weather', report.weather || '—'],
                ['Submitted', formatDateTime(report.updated_at)],
              ].map(([k, v]) => (
                <div key={k}>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{k}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>{v}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {report.equipment_notes && (
            <SectionCard title="Equipment Notes">
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>{report.equipment_notes}</p>
            </SectionCard>
          )}
          {report.additional_notes && (
            <SectionCard title="Additional Notes">
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>{report.additional_notes}</p>
            </SectionCard>
          )}
        </div>
      </div>

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div className="modal-overlay" onClick={() => setSelectedPhoto(null)}>
          <div style={{ background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <img src={selectedPhoto.url || selectedPhoto.storage_path} alt={selectedPhoto.caption || ''} style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 10, border: '2px solid white' }} />
            {selectedPhoto.caption && <p style={{ color: 'white', fontWeight: 600, margin: 0 }}>{selectedPhoto.caption}</p>}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <Modal isOpen={true} onClose={() => setShowEdit(false)} title="Edit Daily Report" size="lg">
          <ReportForm projects={projects} onSubmit={handleUpdate} onClose={() => setShowEdit(false)} initial={report} />
        </Modal>
      )}
    </div>
  );
}
