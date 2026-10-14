import type { ApplicationStage, Vacancy } from '../types'

export const PIPELINE_STAGES: {value:ApplicationStage;label:string}[] = [
  {value:'screening',label:'Screening'}, {value:'review',label:'Review'}, {value:'interview',label:'Interview'},
  {value:'offer',label:'Offer'}, {value:'hired',label:'Hired'}, {value:'rejected',label:'Rejected'},
]
export function stageLabel(stage: ApplicationStage) { return PIPELINE_STAGES.find(item=>item.value===stage)?.label || stage }
export function initials(name: string) { return name.trim().split(/\s+/).slice(0,2).map(part=>part[0]?.toUpperCase()).join('') || '?' }
export function formatCompensation(vacancy: Pick<Vacancy,'compensation_min'|'compensation_max'|'compensation_currency'>) {
  const {compensation_min:min, compensation_max:max, compensation_currency:currency='NGN'}=vacancy
  if (min == null && max == null) return 'Not specified'
  const fmt=(value:number)=>new Intl.NumberFormat('en-NG',{style:'currency',currency,maximumFractionDigits:0}).format(value)
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`
  return min != null ? `From ${fmt(min)}` : `Up to ${fmt(max!)}`
}
export function pageCount(total:number,size:number){ return Math.max(1,Math.ceil(total/size)) }
