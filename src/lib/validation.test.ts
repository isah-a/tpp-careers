import { describe, expect, it } from 'vitest'
import { parseQuestionOptions, vacancyDraftSchema, vacancySchema, validateAnswers, validateCv } from './validation'
describe('application validation',()=>{
  it('requires configured screening answers',()=>expect(validateAnswers([{id:'q',label:'Can you work here?',type:'yes_no',required:true,options:[],sort_order:0}],{})).toContain('Can you work here?'))
  it('rejects unsupported CV formats',()=>expect(validateCv(new File(['x'],'cv.txt',{type:'text/plain'}))).toContain('PDF and DOCX'))
  it('allows incomplete drafts but identifies strict publishing fields',()=>{
    const draft={title:'Designer',slug:'designer',client_name:'',description:'',requirements:'',location:'',employment_type:'Full-time',deadline:null,department:'',workplace_type:'remote',compensation_min:null,compensation_max:null,compensation_currency:'NGN',start_date:null,skills:[],benefits:[],status:'draft'}
    expect(vacancyDraftSchema.safeParse(draft).success).toBe(true)
    const published=vacancySchema.safeParse({...draft,status:'active'}); expect(published.success).toBe(false)
    if(!published.success) expect(published.error.issues.map(issue=>issue.path[0])).toContain('description')
  })
  it('parses comma-separated question options only when saving',()=>expect(parseQuestionOptions('People, Operations, ')).toEqual(['People','Operations']))
})
