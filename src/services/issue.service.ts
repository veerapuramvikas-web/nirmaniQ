import { supabase } from '../lib/supabase';
import type { Issue } from '../types';

export interface IssueFilters {
  projectId?: string;
  status?:    string;
  priority?:  string;
  search?:    string;
}

export async function fetchIssues(filters?: IssueFilters) {
  let query = supabase
    .from('issues')
    .select(`
      *,
      reporter:profiles!created_by ( name ),
      assignee:profiles!assigned_to ( name )
    `)
    .order('reported_date', { ascending: false });

  if (filters?.projectId) query = query.eq('project_id', filters.projectId);
  if (filters?.status)    query = query.eq('status',     filters.status);
  if (filters?.priority)  query = query.eq('priority',   filters.priority);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchIssueById(id: string) {
  const { data, error } = await supabase
    .from('issues')
    .select(`
      *,
      reporter:profiles!created_by ( name ),
      assignee:profiles!assigned_to ( name )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createIssue(
  data: Omit<Issue, 'id' | 'created_at' | 'updated_at' | 'created_by'>
) {
  const { data: issue, error } = await supabase
    .from('issues')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return issue;
}

export async function updateIssue(id: string, data: Partial<Issue>) {
  const { error } = await supabase
    .from('issues')
    .update(data)
    .eq('id', id);

  if (error) throw error;
}
