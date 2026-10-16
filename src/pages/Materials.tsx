import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Package, Eye } from 'lucide-react';
import { useMaterials, useProjects, useRealtime, showToast } from '../hooks';
import * as materialService from '../services/material.service';
import {
  formatINR, formatDate, formatNumber, materialStatusColor, materialStatusLabel
} from '../utils';
import {
  PageHeader, EmptyState, SearchInput, SelectFilter, FilterBar,
  Modal, FormField, PageLoader, ErrorState
} from '../components/shared';
import { closingStock, outstandingDelivery } from '../types';
import type { MaterialOrder, MaterialCategory, MaterialUnit } from '../types';
import { MATERIAL_CATEGORIES, MATERIAL_UNITS } from '../types';

interface MaterialFormData {
  project_id: string;
  site: string;
  material_name: string;
  material_category: MaterialCategory;
  unit: MaterialUnit;
  supplier: string;
  quantity_ordered: string;
  unit_price: string;
  order_date: string;
  expected_delivery_date: string;
  po_reference: string;
  notes: string;
  opening_stock: string;
}

function MaterialForm({
  projects,
  onSubmit,
  onClose,
  initial,
}: {
  projects: any[];
  onSubmit: (data: MaterialFormData) => void;
  onClose: () => void;
  initial?: Partial<MaterialFormData>;
}) {
  const [searchParams] = useSearchParams();
  const defaultProjectId = searchParams.get('projectId') || initial?.project_id || projects[0]?.id || '';

  const [form, setForm] = useState<MaterialFormData>({
    project_id: defaultProjectId, site: '', material_name: '',
    material_category: 'Cement', unit: 'bags', supplier: '',
    quantity_ordered: '', unit_price: '',
    order_date: new Date().toISOString().slice(0, 10),
    expected_delivery_date: '', po_reference: '', notes: '', opening_stock: '0',
    ...initial,
  });
  const [errors, setErrors] = useState<Partial<MaterialFormData>>({});

  const set = (k: keyof MaterialFormData, v: string) => setForm(p => ({ ...p, [k]: v }));

  const validate = (): boolean => {
    const errs: Partial<MaterialFormData> = {};
    if (!form.project_id) errs.project_id = 'Required';
    if (!form.material_name.trim()) errs.material_name = 'Required';
    if (!form.supplier.trim()) errs.supplier = 'Required';
    const qo = parseFloat(form.quantity_ordered);
    if (!form.quantity_ordered || isNaN(qo) || qo <= 0) errs.quantity_ordered = 'Valid qty required';
    const up = parseFloat(form.unit_price);
    if (!form.unit_price || isNaN(up) || up <= 0) errs.unit_price = 'Valid price required';
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
        <FormField label="Project" error={errors.project_id} required>
          <select className="form-select" value={form.project_id} onChange={e => set('project_id', e.target.value)}>
            <option value="">Select Project</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </FormField>
        <FormField label="Site Location">
          <input className="form-input" value={form.site} onChange={e => set('site', e.target.value)} placeholder="e.g. Block A" />
        </FormField>
        <FormField label="Material Name" error={errors.material_name} required>
          <input className="form-input" value={form.material_name} onChange={e => set('material_name', e.target.value)} placeholder="e.g. OPC 53 Grade Cement" />
        </FormField>
        <FormField label="Category" required>
          <select className="form-select" value={form.material_category} onChange={e => set('material_category', e.target.value as MaterialCategory)}>
            {MATERIAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </FormField>
        <FormField label="Quantity Ordered" error={errors.quantity_ordered} required>
          <input type="number" className="form-input" value={form.quantity_ordered} onChange={e => set('quantity_ordered', e.target.value)} placeholder="e.g. 500" min={0} />
        </FormField>
        <FormField label="Unit of Measurement" required>
          <select className="form-select" value={form.unit} onChange={e => set('unit', e.target.value as MaterialUnit)}>
            {MATERIAL_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </FormField>
        <FormField label="Unit Price (₹)" error={errors.unit_price} required hint="Rate per unit">
          <input type="number" className="form-input" value={form.unit_price} onChange={e => set('unit_price', e.target.value)} placeholder="Rate per unit" min={0} step={0.01} />
        </FormField>
        <FormField label="Supplier / Vendor" error={errors.supplier} required>
          <input className="form-input" value={form.supplier} onChange={e => set('supplier', e.target.value)} placeholder="Vendor name" />
        </FormField>
        <FormField label="Opening Stock (on site)" hint="Existing inventory before this order">
          <input type="number" className="form-input" value={form.opening_stock} onChange={e => set('opening_stock', e.target.value)} placeholder="0" min={0} />
        </FormField>
        <FormField label="PO / Quotation Ref">
          <input className="form-input" value={form.po_reference} onChange={e => set('po_reference', e.target.value)} placeholder="e.g. PO-2024-042" />
        </FormField>
        <FormField label="Order Date" required>
          <input type="date" className="form-input" value={form.order_date} onChange={e => set('order_date', e.target.value)} />
        </FormField>
        <FormField label="Expected Delivery Date">
          <input type="date" className="form-input" value={form.expected_delivery_date} onChange={e => set('expected_delivery_date', e.target.value)} />
        </FormField>
        <div style={{ gridColumn: '1/-1' }}>
          <FormField label="Notes / Specifications">
            <textarea className="form-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Brand specifications, delivery terms, quality requirements" rows={2} />
          </FormField>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary">Create Order</button>
      </div>
    </form>
  );
}

function ReceiptForm({ order, onSubmit, onClose }: {
  order: MaterialOrder;
  onSubmit: (qty: number, date: string) => void;
  onClose: () => void;
}) {
  const outstanding = outstandingDelivery(order);
  const [qty, setQty] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = parseFloat(qty);
    if (!qty || isNaN(q) || q <= 0) { setError('Valid positive quantity required'); return; }
    if (q > outstanding) { setError(`Cannot receive more than ${outstanding} ${order.unit} (outstanding)`); return; }
    onSubmit(q, date);
  };

  return (
    <form onSubmit={handleSubmit}>
      <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: '#6b7280' }}>
        Recording receipt for: <strong>{order.material_name}</strong><br />
        Ordered: {order.quantity_ordered} {order.unit} · Already Received: {order.quantity_received} {order.unit} · Outstanding: <strong>{outstanding} {order.unit}</strong>
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <FormField label={`Quantity Received (${order.unit})`} error={error} required>
          <input type="number" className="form-input" value={qty} onChange={e => { setQty(e.target.value); setError(''); }} placeholder={`Max ${outstanding}`} min={0} max={outstanding} />
        </FormField>
        <FormField label="Delivery Date" required>
          <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
        </FormField>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-success">Record Receipt</button>
      </div>
    </form>
  );
}

function UsageForm({ order, onSubmit, onClose }: {
  order: MaterialOrder;
  onSubmit: (qty: number) => void;
  onClose: () => void;
}) {
  const closing = closingStock(order);
  const [qty, setQty] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = parseFloat(qty);
    if (!qty || isNaN(q) || q <= 0) { setError('Valid positive quantity required'); return; }
    if (q > closing) { setError(`Cannot use more than available stock: ${closing} ${order.unit}`); return; }
    onSubmit(q);
  };

  return (
    <form onSubmit={handleSubmit}>
      <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: '#6b7280' }}>
        Recording usage for: <strong>{order.material_name}</strong><br />
        Available Closing Stock: <strong>{closing} {order.unit}</strong>
      </p>
      <FormField label={`Quantity Used (${order.unit})`} error={error} required>
        <input type="number" className="form-input" value={qty} onChange={e => { setQty(e.target.value); setError(''); }} placeholder={`Max ${closing}`} min={0} max={closing} />
      </FormField>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary">Record Usage</button>
      </div>
    </form>
  );
}

function MaterialDetail({
  order,
  projects,
  onReceipt,
  onUsage
}: {
  order: MaterialOrder;
  projects: any[];
  onReceipt: () => void;
  onUsage: () => void;
}) {
  const project = projects.find((p: any) => p.id === order.project_id);
  const closing = closingStock(order);
  const outstanding = outstandingDelivery(order);
  const totalValue = order.quantity_ordered * order.unit_price;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          ['Project', project?.name || '—'],
          ['Category', order.material_category],
          ['Supplier', order.supplier],
          ['PO Reference', order.po_reference || '—'],
          ['Order Date', formatDate(order.order_date)],
          ['Expected Delivery', order.expected_delivery_date ? formatDate(order.expected_delivery_date) : '—'],
          ['Actual Delivery', order.actual_delivery_date ? formatDate(order.actual_delivery_date) : 'Pending'],
          ['Unit Price', formatINR(order.unit_price) + ' / ' + order.unit],
          ['Total Order Value', formatINR(totalValue)],
        ].map(([k, v]) => (
          <div key={k}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{k}</p>
            <p style={{ margin: '3px 0 0', fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>{v}</p>
          </div>
        ))}
      </div>

      {/* Stock Summary */}
      <div style={{ background: '#f9fafb', borderRadius: 10, padding: '16px', marginBottom: 16 }}>
        <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: '0.875rem', color: '#374151' }}>Stock Calculation</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, textAlign: 'center' }}>
          {[
            ['Opening Stock', order.opening_stock, ''],
            ['+ Received', order.quantity_received, 'text-green-600'],
            ['- Used', order.quantity_used, 'text-blue-600'],
            ['= Closing Stock', closing, closing < 0 ? 'text-red-600 font-bold' : 'font-bold'],
            ['Outstanding Delivery', outstanding, 'text-amber-600 font-bold'],
          ].map(([label, val, cls]) => (
            <div key={String(label)} style={{ padding: '8px', background: 'white', borderRadius: 6 }}>
              <p style={{ margin: 0, fontSize: '0.6875rem', color: '#9ca3af', fontWeight: 600 }}>{label}</p>
              <p style={{ margin: '4px 0 0', fontSize: '1.0625rem', fontWeight: 700 }} className={String(cls)}>
                {formatNumber(Number(val))} {order.unit}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        {outstanding > 0 && (
          <button className="btn btn-success" style={{ flex: 1 }} onClick={onReceipt}>
            Record Material Receipt ({outstanding} {order.unit} outstanding)
          </button>
        )}
        {closing > 0 && (
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onUsage}>
            Record Material Usage ({closing} {order.unit} in stock)
          </button>
        )}
      </div>
    </div>
  );
}

export function MaterialsPage() {
  const [searchParams] = useSearchParams();
  const { projects } = useProjects();
  const { materialOrders, loading, error, reload } = useMaterials();

  useRealtime('material_orders', reload);

  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState(searchParams.get('projectId') || '');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(!!searchParams.get('new'));
  const [selectedOrder, setSelectedOrder] = useState<MaterialOrder | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showUsage, setShowUsage] = useState(false);

  if (loading && materialOrders.length === 0) {
    return <PageLoader message="Loading material orders..." />;
  }

  if (error && materialOrders.length === 0) {
    return <ErrorState title="Failed to load materials" message={error} onRetry={reload} />;
  }

  const filtered = materialOrders.filter((m: MaterialOrder) => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.material_name.toLowerCase().includes(q) || m.supplier.toLowerCase().includes(q);
    const matchProject = !projectFilter || m.project_id === projectFilter;
    const matchCategory = !categoryFilter || m.material_category === categoryFilter;
    const matchStatus = !statusFilter || m.status === statusFilter;
    return matchSearch && matchProject && matchCategory && matchStatus;
  });

  const handleCreate = async (data: MaterialFormData) => {
    try {
      await materialService.createMaterialOrder({
        project_id: data.project_id,
        site: data.site,
        material_name: data.material_name,
        material_category: data.material_category,
        unit: data.unit,
        supplier: data.supplier,
        quantity_ordered: parseFloat(data.quantity_ordered),
        quantity_received: 0,
        quantity_used: 0,
        unit_price: parseFloat(data.unit_price),
        order_date: data.order_date,
        expected_delivery_date: data.expected_delivery_date || undefined,
        po_reference: data.po_reference,
        status: 'ordered',
        opening_stock: parseFloat(data.opening_stock) || 0,
        notes: data.notes,
      });
      setShowForm(false);
      reload();
      showToast('Material order created', 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to create order', 'error');
    }
  };

  const handleReceipt = async (qty: number, date: string) => {
    if (!selectedOrder) return;
    try {
      await materialService.recordMaterialReceipt(selectedOrder.id, qty, date);
      setShowReceipt(false);
      setSelectedOrder(null);
      reload();
      showToast(`Receipt recorded: ${qty} ${selectedOrder.unit} received`, 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Receipt recording failed', 'error');
    }
  };

  const handleUsage = async (qty: number) => {
    if (!selectedOrder) return;
    try {
      await materialService.recordMaterialUsage(selectedOrder.id, qty);
      setShowUsage(false);
      setSelectedOrder(null);
      reload();
      showToast(`Usage recorded: ${qty} ${selectedOrder.unit} used`, 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Usage recording failed', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title="Material Orders & Inventory"
        subtitle="Track material purchases, deliveries, and stock levels"
        action={
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> New Material Order
          </button>
        }
      />

      {/* Stock Health Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="stat-card">
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Total Orders</p>
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#111827', fontFamily: 'var(--font-display)' }}>{filtered.length}</p>
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>All materials</p>
        </div>
        <div className="stat-card">
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Pending Delivery</p>
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#d97706', fontFamily: 'var(--font-display)' }}>
            {filtered.filter((m: MaterialOrder) => outstandingDelivery(m) > 0).length}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>Orders with outstanding deliveries</p>
        </div>
        <div className="stat-card">
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Fully Received</p>
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', fontFamily: 'var(--font-display)' }}>
            {filtered.filter((m: MaterialOrder) => m.status === 'received').length}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>Delivered to site</p>
        </div>
        <div className="stat-card">
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Total Material Spend</p>
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#2563eb', fontFamily: 'var(--font-display)' }}>
            {formatINR(filtered.reduce((s: number, m: MaterialOrder) => s + m.quantity_ordered * m.unit_price, 0))}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>Ordered value</p>
        </div>
      </div>

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search materials or suppliers…" />
        <SelectFilter value={projectFilter} onChange={setProjectFilter} placeholder="All Projects"
          options={projects.map((p: any) => ({ value: p.id, label: p.name }))} />
        <SelectFilter value={categoryFilter} onChange={setCategoryFilter} placeholder="All Categories"
          options={MATERIAL_CATEGORIES.map(c => ({ value: c, label: c }))} />
        <SelectFilter value={statusFilter} onChange={setStatusFilter} placeholder="All Statuses"
          options={[
            { value: 'ordered', label: 'Ordered' },
            { value: 'partially_received', label: 'Partially Received' },
            { value: 'received', label: 'Fully Received' },
          ]} />
        {(search || projectFilter || categoryFilter || statusFilter) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setProjectFilter(''); setCategoryFilter(''); setStatusFilter(''); }}>
            Clear Filters
          </button>
        )}
      </FilterBar>

      <div className="card" style={{ overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <EmptyState icon={<Package size={28} />} title="No material orders found"
            description="Create a purchase order or adjust filters"
            action={<button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> New Order</button>}
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 950 }}>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Project</th>
                  <th>Supplier</th>
                  <th>Ordered</th>
                  <th>Received</th>
                  <th>Used</th>
                  <th>Closing Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m: MaterialOrder) => {
                  const project = projects.find((p: any) => p.id === m.project_id);
                  const closing = closingStock(m);
                  const outstanding = outstandingDelivery(m);

                  return (
                    <tr key={m.id}>
                      <td style={{ maxWidth: 220 }}>
                        <p style={{ margin: 0, fontWeight: 700, color: '#111827', fontSize: '0.875rem' }}>{m.material_name}</p>
                        <span className="badge badge-blue" style={{ fontSize: '0.6875rem', marginTop: 2 }}>{m.material_category}</span>
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{project?.name || '—'}</td>
                      <td style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                        <p style={{ margin: 0, fontWeight: 600, color: '#374151' }}>{m.supplier}</p>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#9ca3af' }}>{formatINR(m.unit_price)} / {m.unit}</p>
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatNumber(m.quantity_ordered)} {m.unit}</td>
                      <td>
                        <span style={{ color: m.quantity_received > 0 ? '#16a34a' : '#9ca3af', fontWeight: 600 }}>
                          {formatNumber(m.quantity_received)} {m.unit}
                        </span>
                        {outstanding > 0 && <span style={{ fontSize: '0.7rem', color: '#d97706', display: 'block' }}>({outstanding} left)</span>}
                      </td>
                      <td style={{ color: '#2563eb', fontWeight: 600 }}>{formatNumber(m.quantity_used)} {m.unit}</td>
                      <td>
                        <span style={{ fontWeight: 800, color: closing < 0 ? '#dc2626' : '#111827', fontSize: '0.9375rem' }}>
                          {formatNumber(closing)} {m.unit}
                        </span>
                      </td>
                      <td><span className={`badge ${materialStatusColor(m.status)}`}>{materialStatusLabel(m.status)}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', color: '#2563eb', fontSize: '0.75rem' }}
                            onClick={() => setSelectedOrder(m)}>
                            <Eye size={12} />
                          </button>
                          {outstanding > 0 && (
                            <button className="btn btn-success btn-sm" style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={() => { setSelectedOrder(m); setShowReceipt(true); }}>
                              Receive
                            </button>
                          )}
                          {closing > 0 && (
                            <button className="btn btn-primary btn-sm" style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={() => { setSelectedOrder(m); setShowUsage(true); }}>
                              Use
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Order Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="New Material Order" size="lg">
        <MaterialForm projects={projects} onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      </Modal>

      {/* Detail Modal */}
      {selectedOrder && !showReceipt && !showUsage && (
        <Modal isOpen={true} onClose={() => setSelectedOrder(null)} title={selectedOrder.material_name} size="lg">
          <MaterialDetail
            order={selectedOrder}
            projects={projects}
            onReceipt={() => setShowReceipt(true)}
            onUsage={() => setShowUsage(true)}
          />
        </Modal>
      )}

      {/* Receipt Modal */}
      {selectedOrder && showReceipt && (
        <Modal isOpen={true} onClose={() => { setShowReceipt(false); setSelectedOrder(null); }} title="Record Material Receipt" size="md">
          <ReceiptForm order={selectedOrder} onSubmit={handleReceipt} onClose={() => { setShowReceipt(false); setSelectedOrder(null); }} />
        </Modal>
      )}

      {/* Usage Modal */}
      {selectedOrder && showUsage && (
        <Modal isOpen={true} onClose={() => { setShowUsage(false); setSelectedOrder(null); }} title="Record Material Usage" size="md">
          <UsageForm order={selectedOrder} onSubmit={handleUsage} onClose={() => { setShowUsage(false); setSelectedOrder(null); }} />
        </Modal>
      )}
    </div>
  );
}
