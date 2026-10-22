export type VacancyStatus = 'draft' | 'active' | 'closed'
export type QuestionType = 'text' | 'yes_no' | 'single_select'
export type WorkplaceType = 'onsite' | 'hybrid' | 'remote'
export type ApplicationStage = 'screening' | 'review' | 'interview' | 'offer' | 'hired' | 'rejected'

export interface ScreeningQuestion {
  id?: string
  vacancy_id?: string
  label: string
  type: QuestionType
  required: boolean
  options: string[]
  sort_order: number
}

export interface Vacancy {
  id: string
  title: string
  slug: string
  client_name?: string
  description: string
  requirements: string
  location: string
  department?: string
  employment_type: string
  workplace_type?: WorkplaceType
  compensation_min?: number | null
  compensation_max?: number | null
  compensation_currency?: string
  start_date?: string | null
  deadline: string | null
  skills?: string[]
  benefits?: string[]
  responsibilities?: string
  code?: string
  created_by?: string
  lead_recruiter_id?: string | null
  recruiter_name?: string
  recruiter_avatar?: string
  lead_recruiter?: Recruiter | null
  collaborators?: Recruiter[]
  vacancy_collaborators?: VacancyCollaborator[]
  status: VacancyStatus
  created_at: string
  updated_at?: string
  application_count?: number
  screening_questions?: ScreeningQuestion[]
}

export interface Recruiter {
  user_id: string
  display_name: string
  role?: 'recruiter' | 'admin'
  created_at?: string
}

export interface VacancyCollaborator {
  id?: string
  vacancy_id: string
  recruiter_id: string
  assigned_by?: string | null
  assigned_at?: string
  recruiter?: Recruiter
}

export interface Application {
  id: string
  vacancy_id: string
  full_name: string
  email: string
  phone: string
  answers: Record<string, string>
  created_at: string
  cv_path: string
  stage: ApplicationStage
  stage_updated_at?: string
  vacancies?: Pick<Vacancy, 'id' | 'title' | 'slug' | 'department' | 'location'>
}

export interface JobTemplate {
  id: string
  name: string
  title: string
  description: string
  requirements: string
  department?: string
  location: string
  employment_type: string
  workplace_type: WorkplaceType
  compensation_min?: number | null
  compensation_max?: number | null
  compensation_currency: string
  skills: string[]
  benefits: string[]
  screening_questions: ScreeningQuestion[]
  created_by: string
  created_at: string
  updated_at: string
}

export interface ApplicationReview {
  application_id: string
  reviewer_id: string
  rating: number
  assessment?: string | null
  created_at: string
  updated_at: string
  recruiter?: Recruiter
}

export interface ApplicationNote {
  id: string
  application_id: string
  author_id: string
  body: string
  created_at: string
  updated_at: string
  recruiter?: Recruiter
}

export interface StageHistory {
  id: string
  application_id: string
  from_stage?: ApplicationStage | null
  to_stage: ApplicationStage
  changed_by: string
  note?: string | null
  changed_at: string
  recruiter?: Recruiter
}

export type InterviewFormat = 'online' | 'phone' | 'in_person'
export type InterviewStatus = 'scheduled' | 'rescheduled' | 'completed' | 'cancelled'

export interface Interview {
  id: string
  application_id: string
  scheduled_at: string
  duration_minutes: number
  timezone: string
  format: InterviewFormat
  location_or_link: string
  notes?: string | null
  status: InterviewStatus
  cancellation_reason?: string | null
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
  interview_history?: InterviewHistory[]
  application?: (Pick<Application, 'id' | 'full_name' | 'email' | 'phone' | 'stage'> & {
    vacancies?: Pick<Vacancy, 'id' | 'title' | 'slug'> | null
  }) | null
  applications?: (Pick<Application, 'id' | 'full_name' | 'email' | 'phone' | 'stage'> & {
    vacancies?: Pick<Vacancy, 'id' | 'title' | 'slug'> | null
  }) | null
}

export interface InterviewHistory {
  id: string
  interview_id: string
  action: 'created' | 'rescheduled' | 'updated' | 'cancelled' | 'completed'
  scheduled_at: string
  duration_minutes: number
  timezone: string
  format: InterviewFormat
  location_or_link: string
  notes?: string | null
  status: InterviewStatus
  cancellation_reason?: string | null
  changed_by: string
  changed_at: string
  recruiter?: Recruiter
}

export interface InterviewOverlapConflict {
  interview_id: string
  application_id: string
  candidate_name: string
  scheduled_at: string
  duration_minutes: number
  format: string
}
