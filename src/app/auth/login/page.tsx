'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const { data: { session }, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
      if (authErr || !session) { setError(authErr?.message || 'Login failed'); return }
      const { data } = await supabase.from('users').select('role').eq('id', session.user.id).single()
      router.push(`/dashboard/${data?.role || 'reporter'}`)
    } catch (err: any) {
      setError(err?.message || 'Connection error. Check console (F12).')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={{ background: 'var(--background)' }}>
      <form onSubmit={handleLogin} className="w-full max-w-sm p-8 rounded-xl space-y-5" style={{ background: 'var(--card)', borderColor: 'var(--card-border)', borderWidth: 1 }}>
        <h1 className="text-2xl font-bold text-center" style={{ color: 'var(--primary)' }}>♻ WasteTrack AI</h1>
        <h2 className="text-lg font-semibold text-center">Sign In</h2>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
          className="w-full p-3 rounded-lg border text-sm" style={{ background: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
          className="w-full p-3 rounded-lg border text-sm" style={{ background: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }} />
        <button type="submit" className="w-full p-3 rounded-lg text-white font-semibold" style={{ background: 'var(--primary)' }}>Sign In</button>
        <p className="text-sm text-center" style={{ color: 'var(--muted)' }}>
          No account? <a href="/auth/register" className="underline" style={{ color: 'var(--primary)' }}>Register</a>
        </p>
      </form>
    </div>
  )
}
