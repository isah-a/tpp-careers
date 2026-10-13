import { Link, Outlet } from 'react-router-dom'
import { Brand } from './Brand'
export function PublicLayout() { return <div className="min-h-screen bg-canvas text-ink">
  <header className="sticky top-0 z-30 border-b border-line/70 bg-white/90 backdrop-blur"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8"><Brand/><nav className="flex items-center gap-4"><a href="/#roles" className="hidden text-sm font-semibold text-muted sm:block">Explore roles</a><Link to="/login" className="rounded-lg bg-panel px-3 py-2 text-xs font-bold">Recruiter portal</Link></nav></div></header>
  <Outlet/><footer className="border-t border-line bg-white px-4 py-8 text-center text-xs text-muted">© {new Date().getFullYear()} The People Practice · Connecting people with possibility</footer>
</div> }
