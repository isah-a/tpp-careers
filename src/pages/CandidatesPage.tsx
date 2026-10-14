import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { pageCount, PIPELINE_STAGES, stageLabel } from '../lib/recruitment'
import { supabase } from '../lib/supabase'
import type { Application, ApplicationStage } from '../types'

const SIZE=10
export function CandidatesPage(){
  const [rows,setRows]=useState<Application[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
  const [query,setQuery]=useState(''),[stage,setStage]=useState<'all'|ApplicationStage>('all'),[page,setPage]=useState(1)
  useEffect(()=>{void supabase.from('applications').select('*,vacancies(id,title,slug)').order('created_at',{ascending:false}).then(({data,error})=>{setRows((data||[]) as unknown as Application[]);setError(error?.message||'');setLoading(false)})},[])
  const filtered=useMemo(()=>rows.filter(row=>(stage==='all'||row.stage===stage)&&`${row.full_name} ${row.email} ${row.vacancies?.title||''}`.toLowerCase().includes(query.toLowerCase())),[rows,query,stage])
  const pages=pageCount(filtered.length,SIZE), shown=filtered.slice((Math.min(page,pages)-1)*SIZE,Math.min(page,pages)*SIZE)
  function reset(){setPage(1)}
  return <div className="workspace"><p className="eyebrow">Candidate directory</p><h1 className="page-title">All applicants</h1><p className="meta mt-2">Search and review candidates across every vacancy.</p>
    <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_220px]"><label className="relative"><span className="sr-only">Search candidates</span><Search className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400" size={17}/><input className="field pl-10" placeholder="Search name, email, or role" value={query} onChange={e=>{setQuery(e.target.value);reset()}}/></label><select className="field" aria-label="Filter by stage" value={stage} onChange={e=>{setStage(e.target.value as typeof stage);reset()}}><option value="all">All pipeline stages</option>{PIPELINE_STAGES.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></div>
    {error&&<p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="mt-5 overflow-hidden rounded-xl border border-line bg-white">{loading?<p className="p-10 text-center text-muted">Loading candidates…</p>:shown.map(row=><Link key={row.id} to={`/dashboard/candidates/${row.id}`} className="grid gap-2 border-b border-line p-5 last:border-0 hover:bg-[#FBFAFD] sm:grid-cols-[1fr_1fr_auto] sm:items-center"><div><p className="font-semibold">{row.full_name}</p><p className="mt-1 text-sm text-muted">{row.email}</p></div><p className="text-sm text-muted">{row.vacancies?.title||'Vacancy unavailable'}</p><span className="w-fit rounded-full bg-[#F4EFFF] px-3 py-1 text-xs font-bold text-violet">{stageLabel(row.stage)}</span></Link>)}{!loading&&!shown.length&&<p className="p-10 text-center text-muted">No candidates match these filters.</p>}</div>
    <div className="mt-4 flex items-center justify-between text-sm text-muted"><span>{filtered.length} candidate{filtered.length===1?'':'s'}</span><div className="flex items-center gap-2"><button className="btn-ghost min-h-9 px-3" disabled={page<=1} onClick={()=>setPage(p=>p-1)} aria-label="Previous page"><ChevronLeft size={16}/></button><span>Page {Math.min(page,pages)} of {pages}</span><button className="btn-ghost min-h-9 px-3" disabled={page>=pages} onClick={()=>setPage(p=>p+1)} aria-label="Next page"><ChevronRight size={16}/></button></div></div>
  </div>
}
