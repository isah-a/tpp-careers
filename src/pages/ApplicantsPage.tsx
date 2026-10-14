import { ArrowLeft, Download, FileDown, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { applicationsToCsv } from '../lib/csv'
import { supabase } from '../lib/supabase'
import type { Application, ScreeningQuestion, Vacancy } from '../types'

export function ApplicantsPage(){
  const {id}=useParams(); const [job,setJob]=useState<Vacancy|null>(null); const [rows,setRows]=useState<Application[]>([]); const [query,setQuery]=useState('')
  useEffect(()=>{if(!id)return;supabase.from('vacancies').select('*,screening_questions(*)').eq('id',id).single().then(({data})=>setJob(data as Vacancy));supabase.from('applications').select('*').eq('vacancy_id',id).order('created_at',{ascending:false}).range(0,99).then(({data})=>setRows((data||[]) as Application[]))},[id])
  const shown=useMemo(()=>rows.filter(r=>`${r.full_name} ${r.email}`.toLowerCase().includes(query.toLowerCase())),[rows,query])
  async function cv(path:string){const {data,error}=await supabase.storage.from('cvs').createSignedUrl(path,60);if(!error&&data)window.open(data.signedUrl,'_blank','noopener,noreferrer')}
  function exportCsv(){const csv=applicationsToCsv(rows,job?.screening_questions||[]);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=`${job?.slug||'applicants'}-applicants.csv`;a.click();URL.revokeObjectURL(a.href)}
  return <div className="mx-auto max-w-7xl">
    <Link to="/dashboard/vacancies" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-violet"><ArrowLeft size={16}/>Back to vacancies</Link>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Applicants</p><h1 className="page-title">{job?.title||'Applicants'}</h1><p className="mt-2 text-sm text-muted">{rows.length} application{rows.length===1?'':'s'} · newest first</p></div><button className="btn-ghost" onClick={exportCsv} disabled={!rows.length}><FileDown size={16}/>Export CSV</button></div>
    <label className="relative mt-6 block max-w-md"><span className="sr-only">Search applicants</span><Search className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400" size={17}/><input className="field pl-10" placeholder="Search name or email" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    <div className="mt-5 overflow-hidden rounded-xl border border-line bg-white">{shown.map(a=><article key={a.id} className="border-b border-line p-5 last:border-0 hover:bg-slate-50/70"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div><h2 className="font-semibold">{a.full_name}</h2><p className="mt-1 text-sm text-muted">{a.email} · {a.phone}</p><p className="mt-1 text-xs text-slate-500">Applied {new Date(a.created_at).toLocaleString()}</p></div><button className="btn-ghost" onClick={()=>void cv(a.cv_path)}><Download size={16}/>Download CV</button></div>{Object.keys(a.answers||{}).length>0&&<div className="mt-5 grid gap-3 border-t border-line pt-5 md:grid-cols-2">{(job?.screening_questions||[]).map((q:ScreeningQuestion)=><div key={q.id} className="rounded-lg bg-slate-50 p-3"><p className="text-sm font-semibold text-muted">{q.label}</p><p className="mt-1 text-sm leading-6">{a.answers[q.id||String(q.sort_order)]||'—'}</p></div>)}</div>}</article>)}{!shown.length&&<div className="p-10 text-center text-sm text-muted">No applicants found.</div>}</div>
  </div>
}
