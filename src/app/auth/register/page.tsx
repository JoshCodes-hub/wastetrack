'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/supabase'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const { data: { session }, error: authErr } = await supabase.auth.signUp({ email, password })
    if (authErr || !session) { setError(authErr?.message || 'Registration failed'); return }
    const { error: insertErr } = await supabase.from('users').insert({
      id: session.user.id, email, name, role: 'reporter',
    })
    if (insertErr) { setError(insertErr.message); return }
    router.push('/dashboard/reporter')
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={{ background: 'var(--background)' }}>
      <form onSubmit={handleRegister} className="w-full max-w-sm p-8 rounded-xl space-y-5" style={{ background: 'var(--card)', borderColor: 'var(--card-border)', borderWidth: 1 }}>
        <h1 className="text-2xl font-bold text-center" style={{ color: 'var(--primary)' }}>♻ WasteTrack AI</h1>
        <h2 className="text-lg font-semibold text-center">Create Account</h2>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required
          className="w-full p-3 rounded-lg border text-sm" style={{ background: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }} />
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
          className="w-full p-3 rounded-lg border text-sm" style={{ background: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
          className="w-full p-3 rounded-lg border text-sm" style={{ background: 'var(--background)', borderColor: 'var(--card-border)', color: 'var(--foreground)' }} />
        <button type="submit" className="w-full p-3 rounded-lg text-white font-semibold" style={{ background: 'var(--primary)' }}>Register</button>
        <p className="text-sm text-center" style={{ color: 'var(--muted)' }}>
          Already have an account? <a href="/auth/login" className="underline" style={{ color: 'var(--primary)' }}>Sign In</a>
        </p>
      </form>
    </div>
  )
}
