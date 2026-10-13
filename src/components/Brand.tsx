import { Link } from 'react-router-dom'
export function Brand({ inverse = false }: { inverse?: boolean }) {
  return <Link to="/" className="flex items-center gap-2.5" aria-label="The People Practice careers home">
    <span className={`grid h-9 w-9 place-items-center rounded-xl text-xl font-extrabold ${inverse ? 'bg-white text-violet' : 'bg-violet text-white'}`}>t</span>
    <span className="leading-none"><span className="block text-sm font-extrabold lowercase tracking-tight">the people practice</span><span className={`mt-1 block text-[10px] font-bold uppercase tracking-[.2em] ${inverse ? 'text-white/70' : 'text-muted'}`}>careers</span></span>
  </Link>
}
