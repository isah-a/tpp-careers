import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { DashboardLayout } from './components/DashboardLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PublicLayout } from './components/PublicLayout'

const HomePage=lazy(()=>import('./pages/HomePage').then(m=>({default:m.HomePage})))
const JobPage=lazy(()=>import('./pages/JobPage').then(m=>({default:m.JobPage})))
const SuccessPage=lazy(()=>import('./pages/SuccessPage').then(m=>({default:m.SuccessPage})))
const LoginPage=lazy(()=>import('./pages/LoginPage').then(m=>({default:m.LoginPage})))
const DashboardPage=lazy(()=>import('./pages/DashboardPage').then(m=>({default:m.DashboardPage})))
const VacanciesPage=lazy(()=>import('./pages/VacanciesPage').then(m=>({default:m.VacanciesPage})))
const VacancyEditorPage=lazy(()=>import('./pages/VacancyEditorPage').then(m=>({default:m.VacancyEditorPage})))
const ApplicantsPage=lazy(()=>import('./pages/ApplicantsPage').then(m=>({default:m.ApplicantsPage})))
const CandidatePage=lazy(()=>import('./pages/CandidatePage').then(m=>({default:m.CandidatePage})))
const CandidatesPage=lazy(()=>import('./pages/CandidatesPage').then(m=>({default:m.CandidatesPage})))
const PipelinePage=lazy(()=>import('./pages/PipelinePage').then(m=>({default:m.PipelinePage})))
const TemplatesPage=lazy(()=>import('./pages/TemplatesPage').then(m=>({default:m.TemplatesPage})))

export default function App(){return <Suspense fallback={<div className="grid min-h-screen place-items-center text-sm text-muted">Loading…</div>}><Routes><Route element={<PublicLayout/>}><Route path="/" element={<HomePage/>}/><Route path="/jobs/:slug" element={<JobPage/>}/><Route path="/application-success" element={<SuccessPage/>}/></Route><Route path="/login" element={<LoginPage/>}/><Route path="/dashboard" element={<ProtectedRoute><DashboardLayout/></ProtectedRoute>}><Route index element={<DashboardPage/>}/><Route path="pipeline" element={<PipelinePage/>}/><Route path="candidates" element={<CandidatesPage/>}/><Route path="candidates/:applicationId" element={<CandidatePage/>}/><Route path="templates" element={<TemplatesPage/>}/><Route path="vacancies" element={<VacanciesPage/>}/><Route path="vacancies/new" element={<VacancyEditorPage/>}/><Route path="vacancies/:id" element={<VacancyEditorPage/>}/><Route path="vacancies/:id/applicants" element={<ApplicantsPage/>}/></Route><Route path="*" element={<div className="grid min-h-screen place-items-center"><a href="/" className="btn-primary">Return home</a></div>}/></Routes></Suspense>}
