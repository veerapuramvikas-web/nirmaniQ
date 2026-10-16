import { supabase } from '../lib/supabase';
import type { MaterialOrder } from '../types';

export interface MaterialFilters {
  projectId?: string;
  category?:  string;
  status?:    string;
  search?:    string;
}

export async function fetchMaterialOrders(filters?: MaterialFilters) {
  let query = supabase
    .from('material_orders')
    .select('*')
    .order('order_date', { ascending: false });

  if (filters?.projectId) query = query.eq('project_id',       filters.projectId);
  if (filters?.category)  query = query.eq('material_category', filters.category);
  if (filters?.status)    query = query.eq('status',            filters.status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createMaterialOrder(
  data: Omit<MaterialOrder, 'id' | 'created_at' | 'updated_at' | 'created_by'>
) {
  const { data: order, error } = await supabase
    .from('material_orders')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return order;
}

/** Calls the server-side RPC — validates outstanding qty, updates status */
export async function recordMaterialReceipt(
  orderId:      string,
  qty:          number,
  deliveryDate: string,
  challanPath?: string,
) {
  const { error } = await supabase.rpc('record_material_receipt', {
    p_order_id:       orderId,
    p_qty_received:   qty,
    p_delivery_date:  deliveryDate,
    p_challan_path:   challanPath ?? null,
  });
  if (error) throw error;
}

/** Calls the server-side RPC — validates closing stock before deducting */
export async function recordMaterialUsage(orderId: string, qty: number) {
  const { error } = await supabase.rpc('record_material_usage', {
    p_order_id: orderId,
    p_qty_used: qty,
  });
  if (error) throw error;
}
