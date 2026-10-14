import { ArrowRight, BriefcaseBusiness, MapPin, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { isConfigured, supabase } from '../lib/supabase'
import type { Vacancy } from '../types'

export function HomePage() {
  const [jobs, setJobs] = useState<Vacancy[]>([])
  const [query, setQuery] = useState('')
  useEffect(() => { if (isConfigured) supabase.from('public_vacancies').select('*').order('created_at',{ascending:false}).then(({data})=>setJobs((data || []) as Vacancy[])) }, [])
  const visible = jobs.filter(j => `${j.title} ${j.location} ${j.employment_type}`.toLowerCase().includes(query.toLowerCase()))
  return <main>
    <section className="border-b border-line bg-white px-4 py-14 md:px-8 md:py-20"><div className="mx-auto max-w-7xl"><p className="eyebrow">Careers at TPP</p><h1 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.1] tracking-[-.04em] text-ink md:text-[3.25rem]">Find work that moves people and businesses forward.</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-muted">Explore opportunities selected by The People Practice and take the next step in your career.</p><a href="#roles" className="btn-primary mt-7">View open roles <ArrowRight size={17}/></a></div></section>
    <section id="roles" className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="eyebrow">Open positions</p><h2 className="page-title">Current opportunities</h2></div><label className="relative block w-full md:max-w-sm"><span className="sr-only">Search roles</span><Search className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400" size={18}/><input className="field pl-10" placeholder="Search role or location" value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search roles"/></label></div>
      <div className="mt-7 divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">{visible.map(job=><Link key={job.id} to={`/jobs/${job.slug}`} className="group flex min-h-36 flex-col justify-between gap-5 p-5 hover:bg-[#FBFAFD] md:min-h-0 md:flex-row md:items-center md:p-6"><div><div className="mb-3 flex flex-wrap items-center gap-2"><span className="rounded-md bg-[#F4EFFF] px-2.5 py-1 text-xs font-semibold text-violet">{job.employment_type}</span><span className="flex items-center gap-1.5 text-sm text-muted"><MapPin size={14}/>{job.location}</span></div><h3 className="text-lg font-semibold tracking-[-.01em] group-hover:text-violet">{job.title}</h3><p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-muted">{job.description}</p></div><span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-line bg-white text-violet group-hover:border-violet group-hover:bg-violet group-hover:text-white"><ArrowRight size={18}/></span></Link>)}
      {!isConfigured && <div className="card p-10 text-center"><BriefcaseBusiness className="mx-auto text-violet"/><h3 className="mt-4 text-lg font-bold">Connect Supabase to load open roles</h3><p className="mt-2 text-sm text-muted">Add the environment variables from .env.example, then seed or publish a vacancy.</p></div>}{isConfigured && !visible.length && <div className="card p-10 text-center text-muted">No open roles match your search.</div>}</div>
    </section>
  </main>
}
