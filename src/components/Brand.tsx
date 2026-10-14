import { Link } from 'react-router-dom'
export function Brand({ inverse = false }: { inverse?: boolean }) {
  return <Link to="/" className="group flex items-center gap-3" aria-label="The People Practice careers home">
    <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-white ring-1 ring-black/5">
      <img src="/tpp-logo.jpg" alt="" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03] motion-reduce:transition-none"/>
    </span>
    <span className="leading-none"><span className="block text-sm font-bold tracking-[-.01em]">The People Practice</span><span className={`mt-1.5 block text-[11px] font-semibold tracking-wide ${inverse ? 'text-white/70' : 'text-muted'}`}>Careers</span></span>
  </Link>
}
