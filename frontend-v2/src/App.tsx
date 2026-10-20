import { Suspense, lazy } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { PublicLayout } from './components/layout/PublicLayout'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { ProtectedRoute } from './components/layout/ProtectedRoute'

const HomePage = lazy(() => import('./pages/public/HomePage').then(m => ({ default: m.HomePage })))
const JobPage = lazy(() => import('./pages/public/JobPage').then(m => ({ default: m.JobPage })))
const SuccessPage = lazy(() => import('./pages/public/SuccessPage').then(m => ({ default: m.SuccessPage })))
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })))

const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })))
const PipelinePage = lazy(() => import('./pages/dashboard/PipelinePage').then(m => ({ default: m.PipelinePage })))
const CandidatesPage = lazy(() => import('./pages/dashboard/CandidatesPage').then(m => ({ default: m.CandidatesPage })))
const CandidatePage = lazy(() => import('./pages/dashboard/CandidatePage').then(m => ({ default: m.CandidatePage })))
const VacanciesPage = lazy(() => import('./pages/dashboard/VacanciesPage').then(m => ({ default: m.VacanciesPage })))
const VacancyEditorPage = lazy(() => import('./pages/dashboard/VacancyEditorPage').then(m => ({ default: m.VacancyEditorPage })))
const TemplatesPage = lazy(() => import('./pages/dashboard/TemplatesPage').then(m => ({ default: m.TemplatesPage })))

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-surface font-label-md text-label-md text-on-surface-variant">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl animate-spin">progress_activity</span>
            <span>loading application...</span>
          </div>
        </div>
      }
    >
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/jobs/:slug" element={<JobPage />} />
          <Route path="/application-success" element={<SuccessPage />} />
        </Route>

        {/* Recruiter Authentication */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Recruiter Workspace */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="pipeline" element={<PipelinePage />} />
          
          {/* Candidates / Applicants routes */}
          <Route path="candidates" element={<CandidatesPage />} />
          <Route path="candidates/:applicationId" element={<CandidatePage />} />
          <Route path="applicants" element={<CandidatesPage />} />
          <Route path="applicants/:applicationId" element={<CandidatePage />} />

          {/* Vacancies / Jobs routes */}
          <Route path="vacancies" element={<VacanciesPage />} />
          <Route path="vacancies/new" element={<VacancyEditorPage />} />
          <Route path="vacancies/:id" element={<VacancyEditorPage />} />
          <Route path="jobs" element={<CandidatesPage />} />
          <Route path="jobs/new" element={<VacancyEditorPage />} />
          <Route path="jobs/:id" element={<VacancyEditorPage />} />

          <Route path="templates" element={<TemplatesPage />} />
          <Route
            path="settings"
            element={
              <div className="p-8">
                <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl">
                  <h2 className="text-lg font-bold text-gray-900">Workspace Settings</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage team members, email templates, and organization preferences.
                  </p>
                  <p className="mt-4 text-xs font-medium text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                    Configuration settings are managed through your Supabase project settings.
                  </p>
                </div>
              </div>
            }
          />
        </Route>

        {/* Catch-all Fallback */}
        <Route
          path="*"
          element={
            <div className="grid min-h-screen place-items-center bg-surface p-margin text-center">
              <div className="flex flex-col items-center gap-space-sm">
                <span className="material-symbols-outlined text-outline text-5xl">search_off</span>
                <h1 className="font-headline-md text-headline-md text-on-surface lowercase">
                  destination not found
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
                  the requested careers or workspace view is unavailable.
                </p>
                <Link
                  to="/"
                  className="mt-space-sm px-space-md py-2 rounded-lg bg-primary-container text-on-primary font-label-md"
                >
                  return to careers
                </Link>
              </div>
            </div>
          }
        />
      </Routes>
    </Suspense>
  )
}
