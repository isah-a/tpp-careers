import { describe, expect, it } from 'vitest'
import { validateAnswers, validateCv } from './validation'
describe('application validation',()=>{
  it('requires configured screening answers',()=>expect(validateAnswers([{id:'q',label:'Can you work here?',type:'yes_no',required:true,options:[],sort_order:0}],{})).toContain('Can you work here?'))
  it('rejects unsupported CV formats',()=>expect(validateCv(new File(['x'],'cv.txt',{type:'text/plain'}))).toContain('PDF and DOCX'))
})
