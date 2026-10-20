import { Outlet } from 'react-router-dom'
import { PublicHeader } from './PublicHeader'
import { PublicFooter } from './PublicFooter'

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface">
      <PublicHeader />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}
