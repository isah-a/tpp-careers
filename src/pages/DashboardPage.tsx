import { BriefcaseBusiness, CircleCheck, FileText, Plus, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Vacancy } from '../types'

export function DashboardPage(){
  const [jobs,setJobs]=useState<Vacancy[]>([])
  useEffect(()=>{void supabase.from('vacancies').select('*,applications(count)').order('created_at',{ascending:false}).limit(5).then(({data})=>setJobs((data||[]).map((v:any)=>({...v,application_count:v.applications?.[0]?.count||0}))))},[])
  const active=jobs.filter(j=>j.status==='active').length
  const apps=jobs.reduce((n,j)=>n+(j.application_count||0),0)
  return <div className="mx-auto max-w-7xl"><div className="flex items-end justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-magenta">Recruitment pulse</p><h1 className="mt-2 text-3xl font-extrabold lowercase">welcome to talent operations.</h1></div><Link to="/dashboard/vacancies/new" className="btn-primary hidden sm:inline-flex"><Plus size={17}/>New vacancy</Link></div><div className="mt-8 grid gap-4 sm:grid-cols-3"><Metric icon={BriefcaseBusiness} label="Total vacancies" value={jobs.length}/><Metric icon={CircleCheck} label="Active roles" value={active}/><Metric icon={FileText} label="Applications" value={apps}/></div><section className="card mt-8 overflow-hidden"><div className="flex items-center justify-between border-b border-line p-5"><h2 className="font-bold">Recent vacancies</h2><Link to="/dashboard/vacancies" className="text-sm font-bold text-violet">View all</Link></div>{jobs.map(j=><Link key={j.id} to={`/dashboard/vacancies/${j.id}`} className="flex items-center justify-between border-b border-line/70 p-5 last:border-0 hover:bg-panel/50"><div><p className="font-bold">{j.title}</p><p className="mt-1 text-xs text-muted">{j.location} · {j.employment_type}</p></div><div className="flex items-center gap-4"><Status value={j.status}/><span className="hidden text-xs font-semibold text-muted sm:block">{j.application_count} applicants</span></div></Link>)}{!jobs.length&&<p className="p-8 text-center text-sm text-muted">No vacancies yet. Create your first role.</p>}</section></div>
}
function Metric({icon:Icon,label,value}:{icon:LucideIcon,label:string,value:number}){return <div className="card p-5"><div className="grid h-10 w-10 place-items-center rounded-lg bg-[#F4EFFF] text-violet"><Icon size={19}/></div><p className="mt-5 text-3xl font-extrabold tabular-nums">{value}</p><p className="mt-1 text-xs font-semibold text-muted">{label}</p></div>}
export function Status({value}:{value:string}){const cls=value==='active'?'bg-emerald-50 text-emerald-700':value==='closed'?'bg-slate-100 text-slate-600':'bg-amber-50 text-amber-700';return <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${cls}`}>{value}</span>}
