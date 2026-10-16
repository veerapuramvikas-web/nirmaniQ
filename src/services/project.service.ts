import { supabase } from '../lib/supabase';
import type { Project } from '../types';

export async function fetchProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      supervisor:profiles!assigned_supervisor_id ( id, name, email, phone )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchProjectById(id: string) {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      supervisor:profiles!assigned_supervisor_id ( id, name, email, role, phone )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/** Uses the DB view that pre-calculates approved expenditure per project */
export async function fetchProjectFinancialSummary() {
  const { data, error } = await supabase
    .from('project_financial_summary')
    .select('*');

  if (error) throw error;
  return data ?? [];
}

export async function createProject(
  data: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'created_by'>
) {
  const { data: project, error } = await supabase
    .from('projects')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return project;
}

export async function updateProject(id: string, data: Partial<Project>) {
  const { error } = await supabase
    .from('projects')
    .update(data)
    .eq('id', id);

  if (error) throw error;
}
