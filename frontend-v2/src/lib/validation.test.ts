import { describe, expect, it } from 'vitest'
import { validateCv, validateAnswers, applicationBaseSchema } from './validation'

describe('CV Validation Rules (frontend-v2)', () => {
  it('rejects missing or undefined CV', () => {
    expect(validateCv(undefined)).toBe('Please attach your CV')
  })

  it('rejects CVs exceeding 5 MB limit', () => {
    // 5MB + 1 byte
    const oversizedFile = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'my-resume.pdf', {
      type: 'application/pdf',
    })
    expect(validateCv(oversizedFile)).toBe('CV must be 5 MB or smaller')
  })

  it('rejects empty CVs', () => {
    const emptyFile = new File([], 'empty.pdf', { type: 'application/pdf' })
    expect(validateCv(emptyFile)).toBe('The selected file is empty')
  })

  it('accepts valid PDF within 5 MB', () => {
    const validPdf = new File([new Uint8Array(1024 * 500)], 'candidate_resume.pdf', {
      type: 'application/pdf',
    })
    expect(validateCv(validPdf)).toBeNull()
  })

  it('accepts valid DOCX within 5 MB', () => {
    const validDocx = new File([new Uint8Array(1024 * 300)], 'candidate_resume.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    expect(validateCv(validDocx)).toBeNull()
  })

  it('accepts valid PDF or DOCX even if browser reports empty MIME type', () => {
    const validDocxNoMime = new File([new Uint8Array(1024 * 100)], 'resume.docx', {
      type: '',
    })
    expect(validateCv(validDocxNoMime)).toBeNull()

    const validPdfNoMime = new File([new Uint8Array(1024 * 100)], 'resume.pdf', {
      type: '',
    })
    expect(validateCv(validPdfNoMime)).toBeNull()
  })

  it('rejects unsupported file formats (.txt, .exe, .png, .zip)', () => {
    const textFile = new File(['text content'], 'resume.txt', { type: 'text/plain' })
    expect(validateCv(textFile)).toBe('Only PDF and DOCX files are accepted')

    const pngFile = new File(['png content'], 'photo.png', { type: 'image/png' })
    expect(validateCv(pngFile)).toBe('Only PDF and DOCX files are accepted')

    const exeFile = new File(['binary'], 'virus.exe', { type: 'application/x-msdownload' })
    expect(validateCv(exeFile)).toBe('Only PDF and DOCX files are accepted')
  })
})
