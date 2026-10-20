import { Link } from 'react-router-dom'

export function VacanciesPage() {
  return (
    <div className="px-margin-mobile md:px-margin py-space-lg flex flex-col gap-space-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface lowercase">
            vacancy management
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            author, configure, and monitor bespoke hiring streams across client portfolios.
          </p>
        </div>
        <Link
          to="/dashboard/vacancies/new"
          className="px-space-lg py-2 rounded-lg bg-primary-container text-on-primary font-label-md flex items-center gap-1.5 self-start"
        >
          <span className="material-symbols-outlined text-base">add</span>
          <span>create vacancy</span>
        </Link>
      </div>
    </div>
  )
}
