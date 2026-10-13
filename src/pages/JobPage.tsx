import { ArrowLeft, CheckCircle2, MapPin, UploadCloud } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { TurnstileWidget, setTurnstileToken, type TurnstileStatus, type TurnstileWidgetHandle } from '../components/TurnstileWidget'
import { applicationBaseSchema, validateAnswers, validateCv } from '../lib/validation'
import { parseSubmissionError } from '../lib/submissionError'
import { isConfigured, supabase } from '../lib/supabase'
import type { Vacancy } from '../types'

export function JobPage() {
  const { slug } = useParams(); const navigate = useNavigate(); const widget = useRef<TurnstileWidgetHandle>(null)
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined
  const [job,setJob]=useState<Vacancy|null>(null); const [loading,setLoading]=useState(true)
  const [error,setError]=useState(''); const [sending,setSending]=useState(false)
  const [file,setFile]=useState<File>(); const [answers,setAnswers]=useState<Record<string,string>>({})
  const [verificationToken,setVerificationToken]=useState<string|null>(null)
  const [verificationStatus,setVerificationStatus]=useState<TurnstileStatus>(siteKey?'loading':'error')

  useEffect(()=>{ if(!isConfigured){setLoading(false);return} supabase.from('public_vacancies').select('*').eq('slug',slug).single().then(async({data})=>{if(data){const {data:questions}=await supabase.from('public_screening_questions').select('*').eq('vacancy_id',data.id).order('sort_order');setJob({...data,screening_questions:questions||[]} as Vacancy)}setLoading(false)}) },[slug])

  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); setError('')
    if(!verificationToken||verificationStatus!=='verified'){setError('Please complete the security verification before submitting.');return}
    const form=new FormData(e.currentTarget)
    const parsed=applicationBaseSchema.safeParse({full_name:form.get('full_name'),email:form.get('email'),phone:form.get('phone'),privacy:form.get('privacy')==='on'})
    if(!parsed.success){setError(parsed.error.issues[0].message);return}
    const fileError=validateCv(file); if(fileError){setError(fileError);return}
    const answerError=validateAnswers(job?.screening_questions||[],answers); if(answerError){setError(answerError);return}
    setSending(true); form.set('answers',JSON.stringify(answers)); form.set('vacancy_slug',slug||''); setTurnstileToken(form,verificationToken)
    const {error:fnError}=await supabase.functions.invoke('submit-application',{body:form}); setSending(false)
    if(fnError){setError(await parseSubmissionError(fnError));widget.current?.reset();return}
    navigate('/application-success',{state:{role:job?.title}})
  }

  if(loading)return <div className="grid min-h-[60vh] place-items-center">Loading role…</div>
  if(!job)return <div className="mx-auto max-w-3xl px-4 py-24 text-center"><h1 className="text-3xl font-bold">This role is unavailable</h1><Link to="/" className="btn-primary mt-6">View open roles</Link></div>
  const questions=[...(job.screening_questions||[])].sort((a,b)=>a.sort_order-b.sort_order)
  const verificationMessage = !siteKey ? 'Security verification is unavailable. Please contact the recruitment team.' : verificationStatus==='expired' ? 'Security verification expired. Please complete it again.' : verificationStatus==='error' ? 'Security verification could not be loaded. Use the retry option or refresh the page.' : verificationStatus==='loading' ? 'Loading security verification…' : verificationStatus==='pending' ? 'Please complete the security verification.' : ''

  return <main className="mx-auto max-w-7xl px-4 py-10 md:px-8"><Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-muted"><ArrowLeft size={16}/>All roles</Link><div className="mt-7 grid gap-8 lg:grid-cols-[.9fr_1.1fr]"><section><div className="sticky top-24"><span className="rounded-full bg-[#F4EFFF] px-3 py-1.5 text-xs font-bold text-violet">{job.employment_type}</span><h1 className="mt-5 text-4xl font-extrabold lowercase tracking-tight">{job.title}</h1><p className="mt-3 flex items-center gap-2 text-sm text-muted"><MapPin size={16}/>{job.location}</p><div className="mt-9 space-y-8 text-sm leading-7 text-muted"><div><h2 className="text-lg font-bold text-ink">About the role</h2><p className="mt-2 whitespace-pre-line">{job.description}</p></div><div><h2 className="text-lg font-bold text-ink">What we're looking for</h2><p className="mt-2 whitespace-pre-line">{job.requirements}</p></div></div></div></section><form onSubmit={submit} className="card p-5 md:p-8"><div className="mb-7"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-magenta">Application</p><h2 className="mt-2 text-2xl font-bold">Tell us about yourself</h2><p className="mt-2 text-sm text-muted">One short form. Your details are used only for this recruitment process.</p></div><div className="grid gap-5 sm:grid-cols-2"><label><span className="label">Full name *</span><input name="full_name" className="field" autoComplete="name"/></label><label><span className="label">Email *</span><input name="email" type="email" className="field" autoComplete="email"/></label><label className="sm:col-span-2"><span className="label">Phone *</span><input name="phone" className="field" autoComplete="tel"/></label><label className="sm:col-span-2"><span className="label">CV — PDF or DOCX, max 5 MB *</span><span className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-line p-5 hover:border-violet"><UploadCloud className="text-violet"/><span className="text-sm text-muted">{file?.name || 'Choose a file'}</span><input name="cv" className="sr-only" type="file" accept=".pdf,.docx" onChange={e=>setFile(e.target.files?.[0])}/></span></label>{questions.map(q=><label key={q.id||q.sort_order} className="sm:col-span-2"><span className="label">{q.label}{q.required?' *':''}</span>{q.type==='text'?<textarea className="field min-h-28" value={answers[q.id||String(q.sort_order)]||''} onChange={e=>setAnswers({...answers,[q.id||String(q.sort_order)]:e.target.value})}/>:<select className="field" value={answers[q.id||String(q.sort_order)]||''} onChange={e=>setAnswers({...answers,[q.id||String(q.sort_order)]:e.target.value})}><option value="">Select an answer</option>{(q.type==='yes_no'?['Yes','No']:q.options).map(o=><option key={o}>{o}</option>)}</select>}</label>)}<label className="flex items-start gap-3 text-sm text-muted sm:col-span-2"><input name="privacy" type="checkbox" className="mt-1 h-4 w-4 accent-violet"/><span>I acknowledge that TPP may process my information for this recruitment process. *</span></label><label className="flex items-start gap-3 rounded-xl bg-panel p-4 text-sm text-muted sm:col-span-2"><input name="ai_review_consent" type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-violet"/><span><strong className="block text-ink">I agree to the use of AI tools to assist in reviewing my application. (Optional)</strong><span className="mt-1 block text-xs leading-5">If AI-assisted review is introduced, AI tools may organise or summarise application information. Human recruiters remain responsible for decisions, no application will be rejected solely by an automated system, and declining does not affect your eligibility. This does not include consent for AI model training.</span></span></label>{siteKey&&<TurnstileWidget ref={widget} siteKey={siteKey} onToken={setVerificationToken} onStatus={setVerificationStatus}/>} {verificationMessage&&<p className={`sm:col-span-2 text-xs ${verificationStatus==='error'||verificationStatus==='expired'?'text-amber-700':'text-muted'}`}>{verificationMessage}</p>}</div>{error&&<p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={sending||!isConfigured||verificationStatus!=='verified'||!verificationToken} className="btn-primary mt-6 w-full bg-magenta hover:bg-[#C900C5]">{sending?'Submitting…':verificationStatus==='verified'?'Submit application':'Complete verification to submit'} <CheckCircle2 size={17}/></button></form></div></main>
}
