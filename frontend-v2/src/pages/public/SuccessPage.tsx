import { Link } from 'react-router-dom'

export function SuccessPage() {
  return (
    <div className="w-full px-margin-mobile md:px-margin py-space-xl flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-full bg-primary-fixed text-primary flex items-center justify-center mb-space-md">
        <span className="material-symbols-outlined text-3xl">task_alt</span>
      </div>
      <h1 className="font-display-mobile md:font-display text-display-mobile md:text-display text-on-surface lowercase">
        application received successfully
      </h1>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-md mt-space-xs">
        your profile has landed squarely on our team's advisory desk for senior evaluation.
      </p>
      <Link to="/" className="mt-space-lg px-space-lg py-2.5 rounded-lg bg-primary-container text-on-primary font-label-md">
        return to careers
      </Link>
    </div>
  )
}
