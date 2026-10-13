import { BriefcaseBusiness, LayoutDashboard, LogOut, Users } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { Brand } from './Brand'
import { useAuth } from '../context/AuthContext'
export function DashboardLayout() {
  const { signOut } = useAuth()
  const links = [{to:'/dashboard',label:'Overview',icon:LayoutDashboard,end:true},{to:'/dashboard/vacancies',label:'Vacancies',icon:BriefcaseBusiness},{to:'/dashboard/vacancies',label:'Applicants',icon:Users}]
  return <div className="min-h-screen bg-[#F8F9FC] text-ink md:flex"><aside className="hidden w-64 shrink-0 bg-violet p-6 text-white md:flex md:flex-col"><Brand inverse/><nav className="mt-12 space-y-2">{links.map(({to,label,icon:Icon,end})=><NavLink key={label} to={to} end={end} className={({isActive})=>`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${isActive?'bg-white text-violet':'text-white/75 hover:bg-white/10'}`}><Icon size={18}/>{label}</NavLink>)}</nav><button onClick={()=>void signOut()} className="mt-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/75 hover:bg-white/10"><LogOut size={18}/>Log out</button></aside><div className="min-w-0 flex-1"><header className="flex h-16 items-center justify-between border-b border-line bg-white px-4 md:px-8"><div className="md:hidden"><Brand/></div><div className="hidden md:block"><p className="text-xs font-bold uppercase tracking-[.18em] text-muted">talent operations</p></div><NavLink to="/dashboard/vacancies/new" className="rounded-lg bg-magenta px-4 py-2.5 text-sm font-bold text-white">Create vacancy</NavLink></header><main className="p-4 md:p-8"><Outlet/></main></div></div>
}
