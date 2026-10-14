import { Files, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { JobTemplate } from '../types'

export function TemplatesPage(){
  const [items,setItems]=useState<JobTemplate[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
  async function load(){const {data,error}=await supabase.from('job_templates').select('*').order('updated_at',{ascending:false});setItems((data||[]) as JobTemplate[]);setError(error?.message||'');setLoading(false)}
  useEffect(()=>{void load()},[])
  async function remove(id:string){if(!window.confirm('Delete this template? Existing vacancies are unaffected.'))return;const {error}=await supabase.from('job_templates').delete().eq('id',id);if(error)setError(error.message);else setItems(rows=>rows.filter(x=>x.id!==id))}
  return <div className="workspace"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Reusable content</p><h1 className="page-title">Job templates</h1><p className="meta mt-2">Start vacancies from standard role details and screening questions.</p></div><Link to="/dashboard/vacancies/new" className="btn-primary"><Plus size={17}/>Create vacancy</Link></div>{error&&<p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{loading?<p className="card p-8 text-muted">Loading templates…</p>:items.map(item=><article key={item.id} className="card flex flex-col p-5"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[#F4EFFF] text-violet"><Files size={19}/></span><h2 className="mt-4 font-semibold">{item.name}</h2><p className="mt-1 text-sm text-muted">{item.title} · {item.location||'Flexible location'}</p><p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">{item.description}</p><div className="mt-auto flex gap-2 pt-5"><Link className="btn-primary flex-1" to={`/dashboard/vacancies/new?template=${item.id}`}>Use template</Link><button className="btn-danger px-3" onClick={()=>void remove(item.id)} aria-label={`Delete ${item.name}`}><Trash2 size={16}/></button></div></article>)}{!loading&&!items.length&&<div className="card p-10 text-center md:col-span-2 xl:col-span-3"><p className="font-semibold">No templates yet</p><p className="meta mt-1">Save a completed vacancy as a template from the vacancy editor.</p></div>}</div></div>
}
