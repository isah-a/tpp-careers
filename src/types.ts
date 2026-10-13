export type VacancyStatus = 'draft' | 'active' | 'closed'
export type QuestionType = 'text' | 'yes_no' | 'single_select'
export interface ScreeningQuestion { id?: string; label: string; type: QuestionType; required: boolean; options: string[]; sort_order: number }
export interface Vacancy {
  id: string; title: string; slug: string; client_name?: string; description: string; requirements: string;
  location: string; employment_type: string; deadline: string | null; status: VacancyStatus; created_at: string;
  application_count?: number; screening_questions?: ScreeningQuestion[]
}
export interface Application { id: string; full_name: string; email: string; phone: string; answers: Record<string,string>; created_at: string; cv_path: string }
