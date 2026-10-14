import { BriefcaseBusiness, Columns3, Files, LayoutDashboard, LogOut, Plus, Users } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { Brand } from './Brand'
import { useAuth } from '../context/AuthContext'

const links = [
  {to:'/dashboard',label:'Overview',icon:LayoutDashboard,end:true},
  {to:'/dashboard/pipeline',label:'Pipeline',icon:Columns3,end:false},
  {to:'/dashboard/vacancies',label:'Vacancies',icon:BriefcaseBusiness,end:false},
  {to:'/dashboard/templates',label:'Templates',icon:Files,end:false},
  {to:'/dashboard/candidates',label:'Candidates',icon:Users,end:false},
]

export function DashboardLayout() {
  const { signOut } = useAuth()
  return <div className="min-h-screen bg-[#F7F7F9] text-ink md:flex">
    <aside className="hidden w-56 shrink-0 border-r border-[#3F00A6] bg-violet px-3 py-5 text-white md:sticky md:top-0 md:flex md:h-screen md:flex-col">
      <div className="px-2"><Brand inverse/></div>
      <nav aria-label="Recruiter navigation" className="mt-9 space-y-1">{links.map(({to,label,icon:Icon,end})=><NavLink key={label} to={to} end={end} className={({isActive})=>`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold ${isActive?'bg-white text-violet shadow-sm':'text-white/75 hover:bg-white/10 hover:text-white'}`}><Icon size={18} strokeWidth={1.8}/>{label}</NavLink>)}</nav>
      <button onClick={()=>void signOut()} className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white"><LogOut size={18}/>Log out</button>
    </aside>
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="flex min-h-16 items-center justify-between px-4 md:px-8"><div className="md:hidden"><Brand/></div><p className="hidden text-sm font-semibold text-muted md:block">Talent operations</p><NavLink to="/dashboard/vacancies/new" className="btn-primary min-h-10 px-4"><Plus size={16}/><span className="hidden sm:inline">Create vacancy</span><span className="sm:hidden">New</span></NavLink></div>
        <nav className="flex overflow-x-auto border-t border-line px-3 md:hidden">{links.map(({to,label,icon:Icon,end})=><NavLink key={label} to={to} end={end} className={({isActive})=>`flex shrink-0 items-center justify-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold ${isActive?'border-violet text-violet':'border-transparent text-muted'}`}><Icon size={17}/>{label}</NavLink>)}</nav>
      </header>
      <main className="p-4 pb-10 sm:p-6 md:p-8 lg:p-10"><Outlet/></main>
    </div>
  </div>
}
