import { Copy, Pencil, Plus, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Vacancy } from '../types'
import { Status } from './DashboardPage'

export function VacanciesPage(){
  const [jobs,setJobs]=useState<Vacancy[]>([]); const [filter,setFilter]=useState('all')
  useEffect(()=>{void supabase.from('vacancies').select('*,applications(count)').order('updated_at',{ascending:false}).then(({data})=>setJobs((data||[]).map((v:any)=>({...v,application_count:v.applications?.[0]?.count||0}))))},[])
  const shown=filter==='all'?jobs:jobs.filter(j=>j.status===filter)
  return <div className="mx-auto max-w-7xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-magenta">Vacancy management</p><h1 className="mt-2 text-3xl font-extrabold lowercase">roles & requisitions.</h1></div><Link to="/dashboard/vacancies/new" className="btn-primary"><Plus size={17}/>Create vacancy</Link></div><div className="mt-7 flex gap-2">{['all','draft','active','closed'].map(x=><button key={x} onClick={()=>setFilter(x)} className={`rounded-full px-4 py-2 text-xs font-bold capitalize ${filter===x?'bg-violet text-white':'border border-line bg-white text-muted'}`}>{x}</button>)}</div><div className="mt-5 grid gap-4">{shown.map(j=><article key={j.id} className="card flex flex-col gap-5 p-5 lg:flex-row lg:items-center"><div className="min-w-0 flex-1"><div className="flex items-center gap-3"><h2 className="truncate text-lg font-bold">{j.title}</h2><Status value={j.status}/></div><p className="mt-2 text-sm text-muted">{j.client_name} · {j.location} · {j.employment_type}</p></div><div className="flex flex-wrap items-center gap-2"><Link className="btn-ghost" to={`/dashboard/vacancies/${j.id}/applicants`}><Users size={16}/>{j.application_count||0}</Link>{j.status==='active'&&<button className="btn-ghost" onClick={()=>void navigator.clipboard.writeText(`${location.origin}/jobs/${j.slug}`)}><Copy size={16}/>Copy link</button>}<Link className="btn-ghost" to={`/dashboard/vacancies/${j.id}`}><Pencil size={16}/>Edit</Link></div></article>)}{!shown.length&&<div className="card p-10 text-center text-muted">No {filter==='all'?'':filter} vacancies found.</div>}</div></div>
}
