import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

type Table =
  | 'expenses'
  | 'approval_events'
  | 'material_orders'
  | 'daily_reports'
  | 'issues'
  | 'projects'
  | 'budget_categories'
  | 'daily_report_photos';

/**
 * Subscribe to Postgres change events on a single table.
 * Calls `onUpdate` on any INSERT / UPDATE / DELETE.
 *
 * Usage:
 *   useRealtime('expenses', reloadExpenses);
 */
export function useRealtime(table: Table, onUpdate: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel(`rt:${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => onUpdate(),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [table, onUpdate]);
}
