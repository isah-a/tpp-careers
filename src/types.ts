export type VacancyStatus = 'draft' | 'active' | 'closed'
export type QuestionType = 'text' | 'yes_no' | 'single_select'
export type WorkplaceType = 'onsite' | 'hybrid' | 'remote'
export type ApplicationStage = 'screening' | 'review' | 'interview' | 'offer' | 'hired' | 'rejected'

export interface ScreeningQuestion { id?: string; label: string; type: QuestionType; required: boolean; options: string[]; sort_order: number }
export interface Vacancy {
  id: string; title: string; slug: string; client_name?: string; description: string; requirements: string
  location: string; department?: string; employment_type: string; workplace_type?: WorkplaceType
  compensation_min?: number | null; compensation_max?: number | null; compensation_currency?: string
  start_date?: string | null; deadline: string | null; skills?: string[]; benefits?: string[]
  status: VacancyStatus; created_at: string; updated_at?: string; application_count?: number
  screening_questions?: ScreeningQuestion[]
}
export interface Recruiter { user_id: string; display_name: string }
export interface Application {
  id: string; vacancy_id: string; full_name: string; email: string; phone: string
  answers: Record<string,string>; created_at: string; cv_path: string; stage: ApplicationStage
  stage_updated_at?: string; vacancies?: Pick<Vacancy,'id'|'title'|'slug'>
}
export interface JobTemplate {
  id: string; name: string; title: string; description: string; requirements: string; department?: string
  location: string; employment_type: string; workplace_type: WorkplaceType; compensation_min?: number | null
  compensation_max?: number | null; compensation_currency: string; skills: string[]; benefits: string[]
  screening_questions: ScreeningQuestion[]; created_by: string; created_at: string; updated_at: string
}
export interface ApplicationReview { application_id: string; reviewer_id: string; rating: number; assessment?: string | null; created_at: string; updated_at: string; recruiter?: Recruiter }
export interface ApplicationNote { id: string; application_id: string; author_id: string; body: string; created_at: string; updated_at: string; recruiter?: Recruiter }
export interface StageHistory { id: string; application_id: string; from_stage?: ApplicationStage | null; to_stage: ApplicationStage; changed_by: string; note?: string | null; changed_at: string; recruiter?: Recruiter }
