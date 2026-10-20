import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, MapPin, Briefcase, ArrowRight, AlertCircle, Building2, Clock } from 'lucide-react'
import { isConfigured, supabase } from '../../lib/supabase'
import { stripHtml } from '../../lib/sanitize'
import type { Vacancy } from '../../types'

export function HomePage() {
  const [jobs, setJobs] = useState<Vacancy[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [connectionError, setConnectionError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadVacancies() {
      if (!isConfigured) {
        setLoading(false)
        setConnectionError('Supabase client is not configured (.env.local missing)')
        return
      }

      setLoading(true)
      setConnectionError(null)

      try {
        const { data, error } = await supabase
          .from('public_vacancies')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          throw new Error(error.message)
        }

        if (isMounted) {
          setJobs((data || []) as Vacancy[])
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to load vacancies'
          console.warn('[HomePage] Failed to fetch public vacancies:', err)
          if (msg.includes('Failed to fetch') || msg.includes('ECONNREFUSED')) {
            setConnectionError('Local Supabase endpoint (http://127.0.0.1:54321) is unreachable. Ensure local Supabase is running.')
          } else {
            setConnectionError(msg)
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
  }, [])

  // Filter jobs by title, department, location, and employment type
  const filteredJobs = jobs.filter(j => {
    const term = searchQuery.toLowerCase().trim()
    if (!term) return true
    return (
      j.title.toLowerCase().includes(term) ||
      (j.department && j.department.toLowerCase().includes(term)) ||
      (j.location && j.location.toLowerCase().includes(term)) ||
      (j.employment_type && j.employment_type.toLowerCase().includes(term))
    )
  })

  return (
    <div className="w-full min-h-screen bg-[#F9FAFB]">
      {/* Hero Section */}
      <section className="bg-white border-b border-gray-100 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center flex flex-col items-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F3EBFD] text-[#5C00DD] mb-4">
            Careers at OnCulture
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900 leading-[1.15]">
            Find work that moves people and businesses forward.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-gray-600 max-w-2xl leading-relaxed">
            Explore active opportunities selected by our recruitment team and take the next step in your career.
          </p>

          {/* Search Box */}
          <div className="mt-8 w-full max-w-xl relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by job title, department, or location..."
              className="block w-full pl-11 pr-4 py-3.5 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#5C00DD] focus:border-transparent shadow-xs transition-colors"
            />
          </div>
        </div>
      </section>

      {/* Main Jobs Listing Section */}
      <section className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Backend Connection Limitation Notice */}
        {connectionError && (
          <div
            role="alert"
            className="mb-8 p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-sm flex items-start gap-3 shadow-xs"
          >
            <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">Backend Connection Limitation</p>
              <p className="mt-1 text-xs text-amber-700">{connectionError}</p>
            </div>
          </div>
        )}

        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Open Opportunities</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {loading ? 'Checking for published roles...' : `${filteredJobs.length} published position${filteredJobs.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-12 text-center bg-white rounded-2xl border border-gray-100">
            <div className="w-8 h-8 rounded-full border-2 border-[#5C00DD] border-t-transparent animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading open vacancies from database...</p>
          </div>
        )}

        {/* Empty State: No Jobs Found */}
        {!loading && !connectionError && filteredJobs.length === 0 && (
          <div className="p-12 text-center bg-white rounded-2xl border border-gray-100 shadow-xs">
            <Briefcase size={36} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-base font-semibold text-gray-800">No open positions found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'No roles match your current search criteria. Try modifying your search term.'
                : 'There are currently no published vacancies. Please check back later.'}
            </p>
          </div>
        )}

        {/* Real Vacancies List */}
        {!loading && filteredJobs.length > 0 && (
          <div className="flex flex-col gap-4">
            {filteredJobs.map(job => (
              <Link
                key={job.id}
                to={`/jobs/${job.slug}`}
                className="group bg-white rounded-2xl border border-gray-100 p-6 shadow-xs hover:border-[#5C00DD]/30 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F3EBFD] text-[#5C00DD]">
                      {job.employment_type}
                    </span>
                    {job.workplace_type && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                        {job.workplace_type}
                      </span>
                    )}
                    {job.department && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Building2 size={12} />
                        {job.department}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#5C00DD] transition-colors tracking-tight">
                    {job.title}
                  </h3>

                  <p className="mt-1.5 text-xs text-gray-500 line-clamp-2 max-w-2xl leading-relaxed">
                    {stripHtml(job.description)}
                  </p>

                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <MapPin size={13} className="text-gray-400" />
                      {job.location || 'Remote'}
                    </span>
                    {job.deadline && (
                      <span className="flex items-center gap-1">
                        <Clock size={13} className="text-gray-400" />
                        Deadline: {job.deadline}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#5C00DD] bg-[#F3EBFD] group-hover:bg-[#5C00DD] group-hover:text-white transition-colors">
                    <span>View Role</span>
                    <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
