import { supabase } from '../lib/supabase';
import type { Expense } from '../types';

export interface ExpenseFilters {
  projectId?:     string;
  status?:        string;
  category?:      string;
  paymentStatus?: string;
  dateFrom?:      string;
  dateTo?:        string;
  search?:        string;
}

export async function fetchExpenses(filters?: ExpenseFilters) {
  let query = supabase
    .from('expenses')
    .select(`
      *,
      submitter:profiles!submitted_by ( name ),
      approver:profiles!approved_by  ( name )
    `)
    .order('expense_date', { ascending: false });

  if (filters?.projectId)     query = query.eq('project_id',    filters.projectId);
  if (filters?.status)        query = query.eq('status',         filters.status);
  if (filters?.category)      query = query.eq('category',       filters.category);
  if (filters?.paymentStatus) query = query.eq('payment_status', filters.paymentStatus);
  if (filters?.dateFrom)      query = query.gte('expense_date',  filters.dateFrom);
  if (filters?.dateTo)        query = query.lte('expense_date',  filters.dateTo);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createExpense(
  data: Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'submitted_by'>
) {
  const { data: expense, error } = await supabase
    .from('expenses')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return expense;
}

/** Calls the server-side PostgreSQL RPC function (role-checked, tamper-proof) */
export async function approveExpense(expenseId: string, notes?: string) {
  const { error } = await supabase.rpc('approve_expense', {
    expense_id:    expenseId,
    approver_notes: notes ?? null,
  });
  if (error) throw error;
}

export async function rejectExpense(expenseId: string, rejectionReason: string) {
  const { error } = await supabase.rpc('reject_expense', {
    expense_id:       expenseId,
    rejection_reason: rejectionReason,
  });
  if (error) throw error;
}

export async function submitExpense(expenseId: string) {
  const { error } = await supabase.rpc('submit_expense', {
    expense_id: expenseId,
  });
  if (error) throw error;
}

export async function fetchApprovalHistory(expenseId: string) {
  const { data, error } = await supabase
    .from('approval_events')
    .select('*, actor:profiles!performed_by ( name )')
    .eq('expense_id', expenseId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}
