import { useState, useEffect, useCallback } from 'react';
import * as projectService from '../services/project.service';
import * as expenseService from '../services/expense.service';
import * as materialService from '../services/material.service';
import * as reportService from '../services/report.service';
import * as issueService from '../services/issue.service';
import * as budgetService from '../services/budget.service';
import type { ExpenseFilters } from '../services/expense.service';
import type { MaterialFilters } from '../services/material.service';
import type { ReportFilters } from '../services/report.service';
import type { IssueFilters } from '../services/issue.service';

// ─── Generic async state factory ──────────────────────────────────────────────

function useAsync<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
) {
  const [data,    setData]    = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetcher();
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export function useProjects() {
  const { data: projects, loading, error, reload } = useAsync(
    () => projectService.fetchProjects(),
    [],
  );
  const { data: summary, reload: reloadSummary } = useAsync(
    () => projectService.fetchProjectFinancialSummary(),
    [],
  );

  const reloadAll = useCallback(async () => {
    await Promise.all([reload(), reloadSummary()]);
  }, [reload, reloadSummary]);

  return {
    projects: projects ?? [],
    summary:  summary  ?? [],
    loading,
    error,
    reload: reloadAll,
  };
}

export function useProjectDetail(id: string | undefined) {
  return useAsync(
    () => id ? projectService.fetchProjectById(id) : Promise.resolve(null),
    [id],
  );
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export function useExpenses(filters?: ExpenseFilters) {
  const key = JSON.stringify(filters ?? {});
  const { data: expenses, loading, error, reload } = useAsync(
    () => expenseService.fetchExpenses(filters),
    [key],
  );

  return { expenses: expenses ?? [], loading, error, reload };
}

// ─── Materials ────────────────────────────────────────────────────────────────

export function useMaterials(filters?: MaterialFilters) {
  const key = JSON.stringify(filters ?? {});
  const { data: materialOrders, loading, error, reload } = useAsync(
    () => materialService.fetchMaterialOrders(filters),
    [key],
  );

  return { materialOrders: materialOrders ?? [], loading, error, reload };
}

// ─── Daily Reports ────────────────────────────────────────────────────────────

export function useDailyReports(filters?: ReportFilters) {
  const key = JSON.stringify(filters ?? {});
  const { data: reports, loading, error, reload } = useAsync(
    () => reportService.fetchDailyReports(filters),
    [key],
  );

  return { reports: reports ?? [], loading, error, reload };
}

export function useReportDetail(id: string | undefined) {
  return useAsync(
    () => id ? reportService.fetchReportById(id) : Promise.resolve(null),
    [id],
  );
}

// ─── Issues ───────────────────────────────────────────────────────────────────

export function useIssues(filters?: IssueFilters) {
  const key = JSON.stringify(filters ?? {});
  const { data: issues, loading, error, reload } = useAsync(
    () => issueService.fetchIssues(filters),
    [key],
  );

  return { issues: issues ?? [], loading, error, reload };
}

export function useIssueDetail(id: string | undefined) {
  return useAsync(
    () => id ? issueService.fetchIssueById(id) : Promise.resolve(null),
    [id],
  );
}

// ─── Budget ───────────────────────────────────────────────────────────────────

export function useBudget(projectId: string | undefined) {
  const { data: categories, loading: catLoading, error: catError, reload: reloadCats } = useAsync(
    () => projectId ? budgetService.fetchBudgetCategories(projectId) : Promise.resolve([]),
    [projectId],
  );

  const { data: variance, loading: varLoading, error: varError, reload: reloadVariance } = useAsync(
    () => projectId ? budgetService.fetchBudgetVariance(projectId) : Promise.resolve([]),
    [projectId],
  );

  const reload = useCallback(async () => {
    await Promise.all([reloadCats(), reloadVariance()]);
  }, [reloadCats, reloadVariance]);

  return {
    categories: categories ?? [],
    variance:   variance   ?? [],
    loading:    catLoading || varLoading,
    error:      catError   || varError,
    reload,
  };
}

// ─── Profiles (team members) ─────────────────────────────────────────────────

export function useProfiles() {
  const { data: profiles, loading, error, reload } = useAsync(
    () => budgetService.fetchProfiles(),
    [],
  );

  return { profiles: profiles ?? [], loading, error, reload };
}
