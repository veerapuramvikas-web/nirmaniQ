import { supabase } from '../lib/supabase';
import type { ExpenseCategory } from '../types';

export async function fetchBudgetCategories(projectId: string) {
  const { data, error } = await supabase
    .from('budget_categories')
    .select('*')
    .eq('project_id', projectId)
    .order('category');

  if (error) throw error;
  return data ?? [];
}

/** Uses the DB view which joins budget_categories + approved expenses */
export async function fetchBudgetVariance(projectId: string) {
  const { data, error } = await supabase
    .from('budget_variance_view')
    .select('*')
    .eq('project_id', projectId);

  if (error) throw error;
  return data ?? [];
}

export async function upsertBudgetCategories(
  projectId:  string,
  categories: { category: ExpenseCategory; planned_amount: number; notes?: string }[],
) {
  const rows = categories.map(c => ({
    project_id:     projectId,
    category:       c.category,
    planned_amount: c.planned_amount,
    notes:          c.notes ?? null,
  }));

  const { error } = await supabase
    .from('budget_categories')
    .upsert(rows, { onConflict: 'project_id,category' });

  if (error) throw error;
}

export async function deleteBudgetCategory(id: string) {
  const { error } = await supabase
    .from('budget_categories')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/** Fetch profiles for user dropdowns (e.g. assign supervisor, assign issue) */
export async function fetchProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, phone')
    .order('name');

  if (error) throw error;
  return data ?? [];
}
