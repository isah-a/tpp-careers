import { Link, Outlet } from 'react-router-dom'
import { Brand } from './Brand'
export function PublicLayout() { return <div className="min-h-screen bg-[#FAFAFB] text-ink">
  <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur"><div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between px-4 md:px-8"><Brand/><nav aria-label="Primary navigation" className="flex items-center gap-2 sm:gap-5"><a href="/#roles" className="hidden rounded-md px-2 py-2 text-sm font-semibold text-muted hover:text-violet sm:block">Open roles</a><Link to="/login" className="inline-flex min-h-11 items-center rounded-lg border border-line bg-white px-3 text-xs font-semibold text-muted hover:border-violet/30 hover:text-violet sm:px-4 sm:text-sm">Recruiter portal</Link></nav></div></header>
  <Outlet/><footer className="border-t border-line bg-white px-4 py-8 text-center text-xs text-muted">© {new Date().getFullYear()} The People Practice · Connecting people with possibility</footer>
</div> }
