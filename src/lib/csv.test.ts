import { describe, expect, it } from 'vitest'
import { applicationsToCsv, safeCsvCell } from './csv'

describe('CSV export', () => {
  it('escapes spreadsheet formulas and quotes', () => {
    expect(safeCsvCell('=IMPORTXML("x")')).toBe('"\'=IMPORTXML(""x"")"')
  })
  it('includes screening answers without CV URLs', () => {
    const csv = applicationsToCsv([{id:'1',full_name:'Ada',email:'ada@example.com',phone:'1234567',created_at:'2026-01-01',cv_path:'private/x.pdf',answers:{q1:'Yes'}}],[{id:'q1',label:'Eligible?',type:'yes_no',required:true,options:[],sort_order:0}])
    expect(csv).toContain('Eligible?')
    expect(csv).toContain('Yes')
    expect(csv).not.toContain('private/x.pdf')
  })
})
