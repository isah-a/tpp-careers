import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isConfigured, supabase } from '../lib/supabase'

type AuthState = { session: Session | null; authorized: boolean; loading: boolean; signOut: () => Promise<void> }
const AuthContext = createContext<AuthState>({ session: null, authorized: false, loading: true, signOut: async () => {} })
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!isConfigured) { setLoading(false); return }
    const apply = async (next: Session | null) => {
      setSession(next)
      if (!next) setAuthorized(false)
      else setAuthorized(Boolean((await supabase.from('recruiters').select('user_id').eq('user_id', next.user.id).maybeSingle()).data))
      setLoading(false)
    }
    supabase.auth.getSession().then(({ data }) => apply(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { void apply(next) })
    return () => data.subscription.unsubscribe()
  }, [])
  return <AuthContext.Provider value={{ session, authorized, loading, signOut: async () => { await supabase.auth.signOut() } }}>{children}</AuthContext.Provider>
}
export const useAuth = () => useContext(AuthContext)
