import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/Login';
import { Layout } from './components/Layout';
import { ToastContainer, PageLoader } from './components/shared';
import { Dashboard } from './pages/Dashboard';
import { ProjectsPage } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { ExpensesPage } from './pages/Expenses';
import { MaterialsPage } from './pages/Materials';
import { DailyReportsPage, DailyReportDetail } from './pages/DailyReports';
import { IssuesPage, IssueDetail } from './pages/Issues';
import { ReportsPage } from './pages/Reports';
import { SitesPage, TeamPage, SettingsPage } from './pages/Other';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <PageLoader message="Connecting to NirmaniQ..." />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginPage />
        <ToastContainer />
      </>
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/sites" element={<SitesPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/materials" element={<MaterialsPage />} />
          <Route path="/daily-reports" element={<DailyReportsPage />} />
          <Route path="/daily-reports/:id" element={<DailyReportDetail />} />
          <Route path="/issues" element={<IssuesPage />} />
          <Route path="/issues/:id" element={<IssueDetail />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
      <ToastContainer />
    </BrowserRouter>
  );
}
