import { useParams, Link } from 'react-router-dom'

export function CandidatePage() {
  const { applicationId } = useParams()

  return (
    <div className="px-margin-mobile md:px-margin py-space-lg">
      <Link to="/dashboard/candidates" className="inline-flex items-center gap-1 text-primary font-label-md mb-4">
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        <span>back to candidate roster</span>
      </Link>
      <h1 className="font-headline-lg text-headline-lg text-on-surface lowercase">
        candidate dossier: {applicationId}
      </h1>
    </div>
  )
}
