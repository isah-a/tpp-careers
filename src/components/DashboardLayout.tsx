import { BriefcaseBusiness, LayoutDashboard, LogOut, Plus } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { Brand } from './Brand'
import { useAuth } from '../context/AuthContext'

const links = [
  {to:'/dashboard',label:'Overview',icon:LayoutDashboard,end:true},
  {to:'/dashboard/vacancies',label:'Vacancies',icon:BriefcaseBusiness,end:false},
]

export function DashboardLayout() {
  const { signOut } = useAuth()
  return <div className="min-h-screen bg-[#F7F8FB] text-ink md:flex">
    <aside className="hidden w-60 shrink-0 border-r border-violet/20 bg-violet px-4 py-6 text-white md:flex md:flex-col">
      <div className="px-2"><Brand inverse/></div>
      <nav className="mt-10 space-y-1">{links.map(({to,label,icon:Icon,end})=><NavLink key={label} to={to} end={end} className={({isActive})=>`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${isActive?'bg-white text-violet shadow-sm':'text-white/75 hover:bg-white/10 hover:text-white'}`}><Icon size={18}/>{label}</NavLink>)}</nav>
      <button onClick={()=>void signOut()} className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white"><LogOut size={18}/>Log out</button>
    </aside>
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="flex min-h-16 items-center justify-between px-4 md:px-8"><div className="md:hidden"><Brand/></div><p className="hidden text-sm font-semibold text-muted md:block">Talent operations</p><NavLink to="/dashboard/vacancies/new" className="btn-primary min-h-10 px-4"><Plus size={16}/><span className="hidden sm:inline">Create vacancy</span><span className="sm:hidden">New</span></NavLink></div>
        <nav className="flex border-t border-line px-3 md:hidden">{links.map(({to,label,icon:Icon,end})=><NavLink key={label} to={to} end={end} className={({isActive})=>`flex flex-1 items-center justify-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold ${isActive?'border-violet text-violet':'border-transparent text-muted'}`}><Icon size={17}/>{label}</NavLink>)}</nav>
      </header>
      <main className="p-4 sm:p-6 md:p-8"><Outlet/></main>
    </div>
  </div>
}
