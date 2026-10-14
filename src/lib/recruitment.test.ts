import { describe, expect, it } from 'vitest'
import { formatCompensation, initials, pageCount, stageLabel } from './recruitment'

describe('recruitment helpers',()=>{
  it('formats pipeline labels and initials',()=>{expect(stageLabel('interview')).toBe('Interview');expect(initials('Ada Lovelace')).toBe('AL')})
  it('formats compensation bounds',()=>{expect(formatCompensation({compensation_min:100000,compensation_max:200000,compensation_currency:'NGN'})).toContain('100,000')})
  it('calculates at least one page',()=>{expect(pageCount(0,10)).toBe(1);expect(pageCount(21,10)).toBe(3)})
})
