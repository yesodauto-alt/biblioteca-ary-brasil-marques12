import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'

interface AppUser {
  id: string
  name: string
  email?: string
  role: 'administrador' | 'voluntario'
  status: 'ativo' | 'inativo'
}

interface AuthContextType {
  user: AppUser | null
  isAuthenticated: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

async function loadProfile(userId: string, email?: string): Promise<AppUser | null> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id, nome, role, status')
      .eq('id', userId)
      .maybeSingle()
    if (data && data.status === 'inativo') return null
    if (data) {
      return {
        id: data.id,
        name: data.nome || email || 'Usuário',
        email,
        role: data.role || 'administrador',
        status: data.status || 'ativo',
      }
    }
  } catch {
    // ignore
  }

  const defaultUser: AppUser = {
    id: userId,
    name: email?.split('@')[0] || 'Administrador',
    email,
    role: 'administrador',
    status: 'ativo',
  }

  try {
    await supabase.from('profiles').upsert({
      id: userId,
      nome: defaultUser.name,
      role: 'administrador',
      status: 'ativo',
    })
  } catch {
    // ignore
  }

  return defaultUser
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const hydrate = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const profile = authUser ? await loadProfile(authUser.id, authUser.email) : null
      if (!active) return
      setUser(profile)
      if (authUser && !profile) await supabase.auth.signOut()
      setLoading(false)
    }
    hydrate()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null)
        setLoading(false)
        return
      }
      void loadProfile(session.user.id, session.user.email).then(async (profile) => {
        if (!active) return
        setUser(profile)
        if (!profile) await supabase.auth.signOut()
        setLoading(false)
      })
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isAdmin: user?.role === 'administrador', signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
