import { supabase } from '../lib/supabase';
import type { DailyReport } from '../types';

export interface ReportFilters {
  projectId?: string;
  dateFrom?:  string;
  dateTo?:    string;
}

export async function fetchDailyReports(filters?: ReportFilters) {
  let query = supabase
    .from('daily_reports')
    .select(`
      *,
      supervisor:profiles!supervisor_id ( name, email ),
      daily_report_photos ( * )
    `)
    .order('report_date', { ascending: false });

  if (filters?.projectId) query = query.eq('project_id',  filters.projectId);
  if (filters?.dateFrom)  query = query.gte('report_date', filters.dateFrom);
  if (filters?.dateTo)    query = query.lte('report_date', filters.dateTo);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchReportById(id: string) {
  const { data, error } = await supabase
    .from('daily_reports')
    .select(`
      *,
      supervisor:profiles!supervisor_id ( name, email ),
      daily_report_photos ( * )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createDailyReport(
  data: Omit<DailyReport, 'id' | 'created_at' | 'updated_at' | 'photos'>
) {
  const { data: report, error } = await supabase
    .from('daily_reports')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return report;
}

export async function updateDailyReport(id: string, data: Partial<DailyReport>) {
  const { error } = await supabase
    .from('daily_reports')
    .update(data)
    .eq('id', id);

  if (error) throw error;
}

export async function addReportPhoto(
  reportId:    string,
  storagePath: string,
  fileName:    string,
  caption?:    string,
  sortOrder?:  number,
) {
  const { error } = await supabase
    .from('daily_report_photos')
    .insert({
      report_id:    reportId,
      storage_path: storagePath,
      file_name:    fileName,
      caption,
      sort_order:   sortOrder ?? 0,
    });

  if (error) throw error;
}

export async function deleteReportPhoto(photoId: string) {
  const { error } = await supabase
    .from('daily_report_photos')
    .delete()
    .eq('id', photoId);

  if (error) throw error;
}
