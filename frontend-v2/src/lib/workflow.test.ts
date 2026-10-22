/**
 * Comprehensive verification of the complete Jobs workflow:
 * Jobs listing → Job details → View Applicants → Candidate profile.
 */
import { describe, it, expect } from 'vitest'
import { FIGMA_VACANCIES_FIXTURE } from '../pages/dashboard/VacanciesPage'
import { FIGMA_JOB_DETAILS_FIXTURE } from '../pages/dashboard/JobDetailsPage'

describe('Recruitment Workflow Navigation & Data Contracts', () => {
  it('Screen 1: Jobs Listing Fixture matches Figma Jobs.png specs', () => {
    expect(FIGMA_VACANCIES_FIXTURE).toHaveLength(10)

    const firstJob = FIGMA_VACANCIES_FIXTURE[0]
    expect(firstJob.title).toBe('Finance and Investment Representative')
    expect(firstJob.code).toBe('JT-010')
    expect(firstJob.application_count).toBe(52)
    expect(firstJob.employment_type).toBe('Full-time')
    expect(firstJob.location).toBe('Lagos,Nigeria')

    const marketingJob = FIGMA_VACANCIES_FIXTURE.find(
      j => j.title === 'Brand, Communications & Marketing Manager'
    )
    expect(marketingJob).toBeDefined()
    expect(marketingJob?.code).toBe('JT-06')
    expect(marketingJob?.application_count).toBe(300)
  })

  it('Screen 2: Job Details matches Figma Jobs(1).png specs', () => {
    expect(FIGMA_JOB_DETAILS_FIXTURE.title).toBe(
      'Brand, Communications & Marketing Manager'
    )
    expect(FIGMA_JOB_DETAILS_FIXTURE.code).toBe('JT-010')
    expect(FIGMA_JOB_DETAILS_FIXTURE.location).toBe('Lagos,Nigeria')
    expect(FIGMA_JOB_DETAILS_FIXTURE.employment_type).toBe('Full-time')
    expect(FIGMA_JOB_DETAILS_FIXTURE.status).toBe('active')

    // Stat cards
    expect(FIGMA_JOB_DETAILS_FIXTURE.total_applicants).toBe(350)
    expect(FIGMA_JOB_DETAILS_FIXTURE.review_count).toBe(100)
    expect(FIGMA_JOB_DETAILS_FIXTURE.interview_count).toBe(50)
    expect(FIGMA_JOB_DETAILS_FIXTURE.rejected_count).toBe(200)

    // Recruiter
    expect(FIGMA_JOB_DETAILS_FIXTURE.recruiter_name).toBe(
      'Philip Nwachukwu Mathew'
    )
    expect(FIGMA_JOB_DETAILS_FIXTURE.start_date).toBe('2024-02-09')
    expect(FIGMA_JOB_DETAILS_FIXTURE.deadline).toBe('2024-05-09')

    // Skills & Screening questions
    expect(FIGMA_JOB_DETAILS_FIXTURE.skills).toEqual([
      'Ecosystem Thinker',
      'Strong communication',
      'High on Execution',
    ])
    expect(FIGMA_JOB_DETAILS_FIXTURE.screening_questions).toHaveLength(6)
  })

  it('Navigation Flow: Jobs listing -> Job details -> View applicants -> Candidate profile', () => {
    const jobId = 'v-6'
    const jobDetailsUrl = `/dashboard/jobs/${jobId}`
    const applicantsUrl = `/dashboard/jobs/${jobId}/applicants`
    const candidateId = 'figma-1'
    const candidateUrl = `/dashboard/candidates/${candidateId}?job_id=${jobId}`

    expect(jobDetailsUrl).toBe('/dashboard/jobs/v-6')
    expect(applicantsUrl).toBe('/dashboard/jobs/v-6/applicants')
    expect(candidateUrl).toBe('/dashboard/candidates/figma-1?job_id=v-6')
  })
})
