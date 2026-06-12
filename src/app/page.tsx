'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.from('users').select('role').eq('id', session.user.id).single().then(
          ({ data }) => router.push(`/dashboard/${data?.role || 'reporter'}`)
        )
      } else {
        router.push('/auth/login')
      }
    })
  }, [router])
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="spinner w-8 h-8 border-4 rounded-full" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}></div>
    </div>
  )
}
