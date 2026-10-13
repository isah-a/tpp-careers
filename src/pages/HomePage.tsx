import { ArrowRight, BriefcaseBusiness, MapPin, Sparkles } from 'lucide-react'
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
    <section className="relative overflow-hidden bg-violet px-4 py-20 text-white md:py-28"><div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-magenta/25 blur-3xl"/><div className="relative mx-auto max-w-7xl"><span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-bold"><Sparkles size={14}/> People-first opportunities</span><h1 className="mt-7 max-w-4xl text-4xl font-extrabold lowercase leading-tight tracking-[-.04em] md:text-6xl">your next chapter starts with the right opportunity.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-white/75">Discover roles where your experience matters, your ideas are heard, and your work creates meaningful impact.</p><a href="#roles" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-magenta px-6 py-3.5 text-sm font-bold">Explore open roles <ArrowRight size={17}/></a></div></section>
    <section id="roles" className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-24"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-magenta">Open positions</p><h2 className="mt-2 text-3xl font-extrabold lowercase tracking-tight md:text-4xl">find work that fits.</h2></div><input className="field max-w-sm" placeholder="Search roles or locations" value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search roles"/></div>
      <div className="mt-9 grid gap-4">{visible.map(job=><Link key={job.id} to={`/jobs/${job.slug}`} className="card group flex flex-col justify-between gap-5 p-6 hover:-translate-y-0.5 hover:border-violet/30 hover:shadow-float md:flex-row md:items-center"><div><div className="mb-3 flex flex-wrap gap-2"><span className="rounded-full bg-[#F4EFFF] px-3 py-1 text-xs font-bold text-violet">{job.employment_type}</span><span className="flex items-center gap-1 text-xs text-muted"><MapPin size={13}/>{job.location}</span></div><h3 className="text-xl font-bold group-hover:text-violet">{job.title}</h3><p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-muted">{job.description}</p></div><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-panel text-violet group-hover:bg-violet group-hover:text-white"><ArrowRight size={19}/></span></Link>)}
      {!isConfigured && <div className="card p-10 text-center"><BriefcaseBusiness className="mx-auto text-violet"/><h3 className="mt-4 text-lg font-bold">Connect Supabase to load open roles</h3><p className="mt-2 text-sm text-muted">Add the environment variables from .env.example, then seed or publish a vacancy.</p></div>}{isConfigured && !visible.length && <div className="card p-10 text-center text-muted">No open roles match your search.</div>}</div>
    </section>
  </main>
}
