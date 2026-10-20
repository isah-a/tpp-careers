import { useParams, Link } from 'react-router-dom'

export function VacancyEditorPage() {
  const { id } = useParams()

  return (
    <div className="px-margin-mobile md:px-margin py-space-lg flex flex-col gap-space-md">
      <Link to="/dashboard/vacancies" className="inline-flex items-center gap-1 text-primary font-label-md mb-2">
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        <span>back to vacancies</span>
      </Link>
      <h1 className="font-headline-lg text-headline-lg text-on-surface lowercase">
        {id ? 'edit requisition' : 'create vacancy requisition'}
      </h1>
    </div>
  )
}
