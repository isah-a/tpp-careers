import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Info,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  X,
  Check,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Vacancy, VacancyStatus } from '../../types'

interface VacancyWithCount extends Vacancy {
  application_count?: number
}

// 10 Mock records strictly matching Figma Jobs.png for visual verification
export const FIGMA_VACANCIES_FIXTURE: VacancyWithCount[] = [
  {
    id: 'v-10',
    title: 'Finance and Investment Representative',
    code: 'JT-010',
    slug: 'finance-and-investment-representative',
    client_name: 'The People Practice',
    department: 'Finance',
    location: 'Lagos,Nigeria',
    workplace_type: 'hybrid',
    employment_type: 'Full-time',
    status: 'active',
    description: 'Lead finance and investment representation across high-growth mandates.',
    requirements: 'Minimum 5 years of financial analysis or advisory experience.',
    created_at: '2024-02-09T10:00:00Z',
    updated_at: '2024-02-09T10:00:00Z',
    deadline: '2024-12-31',
    application_count: 52,
  },
  {
    id: 'v-9',
    title: 'Operations Manager',
    code: 'JT-09',
    slug: 'operations-manager',
    client_name: 'The People Practice',
    department: 'Operations',
    location: 'Lagos,Nigeria',
    workplace_type: 'onsite',
    employment_type: 'Part-time',
    status: 'active',
    description: 'Coordinate day-to-day operations and workflow execution.',
    requirements: 'Operations leadership experience in fast-paced retail or services.',
    created_at: '2024-02-09T10:00:00Z',
    updated_at: '2024-02-09T10:00:00Z',
    deadline: '2024-12-31',
    application_count: 100,
  },
  {
    id: 'v-8',
    title: 'General Manager',
    code: 'JT-08',
    slug: 'general-manager',
    client_name: 'The People Practice',
    department: 'Executive',
    location: 'Lagos,Nigeria',
    workplace_type: 'onsite',
    employment_type: 'Contract',
    status: 'active',
    description: 'Steer executive leadership and strategic commercial expansion.',
    requirements: 'Executive track record scaling multi-location businesses.',
    created_at: '2024-02-09T10:00:00Z',
    updated_at: '2024-02-09T10:00:00Z',
    deadline: '2024-12-31',
    application_count: 1,
  },
  {
    id: 'v-7',
    title: 'Field Operations Manager',
    code: 'JT-07',
    slug: 'field-operations-manager',
    client_name: 'The People Practice',
    department: 'Operations',
    location: 'Lagos,Nigeria',
    workplace_type: 'onsite',
    employment_type: 'Contract',
    status: 'active',
    description: 'Manage distributed field logistics, supply chain, and local store teams.',
    requirements: 'Experience managing multi-site field teams.',
    created_at: '2024-02-09T10:00:00Z',
    updated_at: '2024-02-09T10:00:00Z',
    deadline: '2024-12-31',
    application_count: 9,
  },
  {
    id: 'v-6',
    title: 'Brand, Communications & Marketing Manager',
    code: 'JT-06',
    slug: 'brand-communications-marketing-manager',
    client_name: 'The People Practice',
    department: 'Marketing',
    location: 'Abuja,Nigeria',
    workplace_type: 'hybrid',
    employment_type: 'Full-time',
    status: 'active',
    description: 'Design marketing infrastructure and communication strategies to scale retail footprint.',
    requirements: 'Minimum 5 years in Brand Management or Marketing.',
    created_at: '2024-02-09T10:00:00Z',
    updated_at: '2024-02-09T10:00:00Z',
    deadline: '2024-05-09',
    application_count: 300,
  },
  {
    id: 'v-5',
    title: 'Product Manager',
    code: 'JT-05',
    slug: 'product-manager',
    client_name: 'The People Practice',
    department: 'Product',
    location: 'Abuja,Nigeria',
    workplace_type: 'remote',
    employment_type: 'Contract',
    status: 'active',
    description: 'Own digital product strategy, backlog discovery, and customer journey.',
    requirements: 'Strong track record delivering enterprise and consumer web applications.',
    created_at: '2024-02-09T10:00:00Z',
    updated_at: '2024-02-09T10:00:00Z',
    deadline: '2024-12-31',
    application_count: 10000,
  },
  {
    id: 'v-4',
    title: 'Associate Commercial',
    code: 'JT-04',
    slug: 'associate-commercial',
    client_name: 'The People Practice',
    department: 'Commercial',
    location: 'Nigeria',
    workplace_type: 'hybrid',
    employment_type: 'Full-time',
    status: 'active',
    description: 'Execute commercial deals, client contracts, and vendor alliances.',
    requirements: 'Commercial analysis, contract negotiation, and market expansion.',
    created_at: '2024-02-12T10:00:00Z',
    updated_at: '2024-02-12T10:00:00Z',
    deadline: '2024-12-31',
    application_count: 1000000,
  },
  {
    id: 'v-3',
    title: 'Lead Event Producer',
    code: 'JT-03',
    slug: 'lead-event-producer',
    client_name: 'The People Practice',
    department: 'Events',
    location: 'Nigeria',
    workplace_type: 'onsite',
    employment_type: 'Contract',
    status: 'active',
    description: 'Lead world-class experiential corporate events and brand showcases.',
    requirements: '5+ years leading large-scale corporate event production.',
    created_at: '2024-02-12T10:00:00Z',
    updated_at: '2024-02-12T10:00:00Z',
    deadline: '2024-12-31',
    application_count: 10000000,
  },
  {
    id: 'v-2',
    title: 'DevOps Engineer',
    code: 'JT-02',
    slug: 'devops-engineer',
    client_name: 'The People Practice',
    department: 'Engineering',
    location: 'Abuja,Nigeria',
    workplace_type: 'remote',
    employment_type: 'Full-time',
    status: 'active',
    description: 'Build CI/CD pipelines, container orchestration, and high-availability cloud architecture.',
    requirements: 'Mastery in Docker, Kubernetes, AWS, and Terraform.',
    created_at: '2024-02-12T10:00:00Z',
    updated_at: '2024-02-12T10:00:00Z',
    deadline: '2024-12-31',
    application_count: 500,
  },
  {
    id: 'v-1',
    title: 'Human Resources',
    code: 'JT-01',
    slug: 'human-resources',
    client_name: 'The People Practice',
    department: 'People',
    location: 'Abuja,Nigeria',
    workplace_type: 'hybrid',
    employment_type: 'Part-time',
    status: 'active',
    description: 'Support recruitment operations, talent onboarding, and employee relations.',
    requirements: 'Demonstrated experience across talent operations and HR compliance.',
    created_at: '2024-02-12T10:00:00Z',
    updated_at: '2024-02-12T10:00:00Z',
    deadline: '2024-12-31',
    application_count: 900,
  },
]

export function VacanciesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const isFixtureRequested =
    searchParams.get('fixture') === 'true' ||
    (typeof window !== 'undefined' && window.sessionStorage.getItem('tpp_dev_fixture') === 'true')

  // State
  const [jobs, setJobs] = useState<VacancyWithCount[]>(
    isFixtureRequested ? FIGMA_VACANCIES_FIXTURE : []
  )
  const [loading, setLoading] = useState<boolean>(!isFixtureRequested)
  const [backendError, setBackendError] = useState<string | null>(null)

  // Status Tab: Active | Draft | Closed matching Jobs.png
  const [activeTab, setActiveTab] = useState<VacancyStatus>('active')

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [filterMenuOpen, setFilterMenuOpen] = useState<boolean>(false)
  const [selectedType, setSelectedType] = useState<string>('all')

  // Pagination (Default 8 per page to match Jobs.png "Show 8")
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(8)

  // Load live vacancies from local Supabase
  useEffect(() => {
    if (isFixtureRequested) {
      setJobs(FIGMA_VACANCIES_FIXTURE)
      setLoading(false)
      return
    }

    let isMounted = true

    async function loadVacancies() {
      setLoading(true)
      setBackendError(null)

      try {
        const { data, error } = await supabase
          .from('vacancies')
          .select('*, applications(count)')
          .order('created_at', { ascending: false })

        if (error) throw new Error(error.message)

        if (isMounted) {
          const totalRows = (data || []).length
          const mapped: VacancyWithCount[] = (data || []).map((v: any, idx: number) => ({
            ...v,
            code: v.code || `JT-${String(Math.max(1, totalRows - idx)).padStart(2, '0')}`,
            application_count: v.applications?.[0]?.count || 0,
          }))

          setJobs(mapped)
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Database error'
          console.error('[VacanciesPage] Failed to load vacancies:', msg)
          // If in fixture mode or dev, fallback to fixture so layout is inspectable
          if (isFixtureRequested || !import.meta.env.PROD) {
            setJobs(FIGMA_VACANCIES_FIXTURE)
          } else {
            setBackendError(msg)
            setJobs([])
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadVacancies()

    return () => {
      isMounted = false
    }
  }, [isFixtureRequested])

  // Filtered jobs by Active/Draft/Closed tab, search query, and employment type
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      // 1. Status Tab filter
      if (job.status !== activeTab) return false

      // 2. Search query filter
      const q = searchQuery.toLowerCase().trim()
      if (q) {
        const matchesTitle = job.title.toLowerCase().includes(q)
        const matchesCode = (job.code || '').toLowerCase().includes(q)
        const matchesLocation = job.location.toLowerCase().includes(q)
        const matchesType = job.employment_type.toLowerCase().includes(q)
        if (!matchesTitle && !matchesCode && !matchesLocation && !matchesType) {
          return false
        }
      }

      // 3. Optional employment type filter
      if (selectedType !== 'all' && job.employment_type !== selectedType) {
        return false
      }

      return true
    })
  }, [jobs, activeTab, searchQuery, selectedType])

  // Pagination calculation
  const totalEntries = filteredJobs.length
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize))
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredJobs.slice(start, start + pageSize)
  }, [filteredJobs, currentPage, pageSize])

  const startIndex = totalEntries === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(totalEntries, currentPage * pageSize)

  // Format date helper matching '09 Feb 24'
  const formatDate = (dateString?: string) => {
    if (!dateString) return '09 Feb 24'
    try {
      const d = new Date(dateString)
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
      }).format(d)
    } catch {
      return dateString
    }
  }

  // Row navigation to Job Details matching Jobs listing → Job details
  const handleRowClick = (jobId: string) => {
    navigate(
      `/dashboard/jobs/${jobId}${isFixtureRequested ? '?fixture=true' : ''}`
    )
  }

  return (
    <div className="p-8 max-w-[1440px] mx-auto flex flex-col gap-6">
      {/* Backend Error Banner */}
      {backendError && jobs.length === 0 && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-900 flex items-start gap-3 shadow-xs"
        >
          <CircleAlert size={18} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900">Database Connection Unavailable</p>
            <p className="mt-0.5 text-amber-800">
              Could not retrieve jobs from local Supabase: <span className="font-mono">{backendError}</span>.
            </p>
            {!import.meta.env.PROD && (
              <p className="mt-1 text-amber-700">
                To preview the approved Figma visual fixture in development, append{' '}
                <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[#5C00DD]">?fixture=true</code> to the URL.
              </p>
            )}
          </div>
        </div>
      )}

      {/* 1. Header with Title "Jobs" & Solid Purple "+ Create New Job" matching Jobs.png */}
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-[26px] font-bold text-gray-900 tracking-tight">
          Jobs
        </h1>

        <Link
          to={`/dashboard/jobs/new${isFixtureRequested ? '?fixture=true' : ''}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5C00DD] hover:bg-[#4900B0] text-white text-sm font-semibold transition-colors shadow-xs cursor-pointer active:scale-[0.99]"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Create New Job</span>
        </Link>
      </header>

      {/* 2. Tabs: Active | Draft | Closed matching Jobs.png */}
      <div className="border-b border-gray-200">
        <nav className="flex items-center gap-8 -mb-px" aria-label="Job status tabs">
          {(
            [
              { key: 'active', label: 'Active' },
              { key: 'draft', label: 'Draft' },
              { key: 'closed', label: 'Closed' },
            ] as const
          ).map(tab => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key)
                  setCurrentPage(1)
                }}
                className={`pb-3 text-sm font-medium transition-colors cursor-pointer border-b-2 ${
                  isActive
                    ? 'border-[#5C00DD] text-[#5C00DD] font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* 3. Search Bar and Filters Button matching Jobs.png */}
      <div className="flex items-center gap-4">
        {/* Full-width Search Input */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Search"
            className="block w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C00DD] focus:border-transparent shadow-xs transition-colors placeholder:text-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filters Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterMenuOpen(prev => !prev)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-medium text-gray-700 shadow-xs transition-colors cursor-pointer"
          >
            <SlidersHorizontal size={16} className="text-gray-500" />
            <span>Filters</span>
            {selectedType !== 'all' && (
              <span className="w-2 h-2 rounded-full bg-[#5C00DD]" />
            )}
          </button>

          {/* Filters dropdown panel */}
          {filterMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-modal border border-gray-100 p-2 z-30 animate-in fade-in">
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                Employment Type
              </div>
              <div className="py-1">
                {[
                  { value: 'all', label: 'All Types' },
                  { value: 'Full-time', label: 'Full-time' },
                  { value: 'Part-time', label: 'Part-time' },
                  { value: 'Contract', label: 'Contract' },
                  { value: 'Internship', label: 'Internship' },
                ].map(item => (
                  <button
                    key={item.value}
                    onClick={() => {
                      setSelectedType(item.value)
                      setFilterMenuOpen(false)
                      setCurrentPage(1)
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors text-left cursor-pointer ${
                      selectedType === item.value
                        ? 'bg-[#F3EBFD] text-[#5C00DD] font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{item.label}</span>
                    {selectedType === item.value && <Check size={14} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Jobs Table Container matching Jobs.png */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            {/* Table Header matching Jobs.png */}
            <thead className="bg-[#F9FAFB]/70 border-b border-gray-100 text-[13px] font-semibold text-gray-700 select-none">
              <tr>
                <th className="px-6 py-4">Job Title</th>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">No of Application</th>
                <th className="px-6 py-4">Created on</th>
                <th className="px-6 py-4">Employment Type</th>
                <th className="px-6 py-4">Location</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                    <Loader2 size={24} className="animate-spin text-[#5C00DD] mx-auto mb-2" />
                    <p className="text-sm font-medium">Loading jobs...</p>
                  </td>
                </tr>
              ) : paginatedJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                    <p className="text-sm font-semibold text-gray-800">No jobs found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {searchQuery || selectedType !== 'all'
                        ? 'Try clearing your search or filter parameters.'
                        : `No ${activeTab} job requisitions available.`}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedJobs.map(job => (
                  <tr
                    key={job.id}
                    onClick={() => handleRowClick(job.id)}
                    className="hover:bg-gray-50/70 transition-colors cursor-pointer group"
                  >
                    {/* Job Title */}
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900 group-hover:text-[#5C00DD] transition-colors">
                      {job.title}
                    </td>

                    {/* Code */}
                    <td className="px-6 py-4 text-xs text-gray-600 font-medium">
                      {job.code || 'JT-01'}
                    </td>

                    {/* No of Application */}
                    <td className="px-6 py-4 text-xs text-gray-700 font-medium">
                      {(job.application_count || 0).toLocaleString()}
                    </td>

                    {/* Created on */}
                    <td className="px-6 py-4 text-xs text-gray-600">
                      {formatDate(job.created_at)}
                    </td>

                    {/* Employment Type */}
                    <td className="px-6 py-4 text-xs text-gray-700 capitalize">
                      {job.employment_type}
                    </td>

                    {/* Location */}
                    <td className="px-6 py-4 text-xs text-gray-700">
                      {job.location}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination Bar matching Jobs.png */}
        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs select-none">
          {/* Page numbers: < 1 2 3 ... 10 > */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(
              pageNum => {
                const isCurrent = currentPage === pageNum
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center ${
                      isCurrent
                        ? 'bg-[#F3EBFD] text-[#5C00DD] border border-[#5C00DD]/20'
                        : 'border border-transparent text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              }
            )}

            {totalPages > 5 && (
              <>
                <span className="px-1 text-gray-400">...</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center ${
                    currentPage === totalPages
                      ? 'bg-[#F3EBFD] text-[#5C00DD] border border-[#5C00DD]/20'
                      : 'border border-transparent text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Showing entries & Show 8 dropdown */}
          <div className="flex items-center gap-4 text-gray-500">
            <span>
              Showing {startIndex} to {endIndex} of {totalEntries} entries
            </span>

            <div className="flex items-center gap-1.5">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#5C00DD] cursor-pointer"
              >
                <option value={8}>8</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
