import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedRoutes = ['/dashboard', '/map']
const adminRoutes = ['/dashboard/admin']

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isProtected = protectedRoutes.some(r => pathname.startsWith(r))
  if (!isProtected) return NextResponse.next()

  const token = req.cookies.get('sb-access-token')?.value
  if (!token) return NextResponse.redirect(new URL('/auth/login', req.url))

  if (adminRoutes.some(r => pathname.startsWith(r))) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/users?select=role&id=eq.${req.cookies.get('sb-user-id')?.value || ''}`, {
        headers: { Authorization: `Bearer ${token}`, apikey: supabaseKey },
      })
      const data = await res.json()
      if (data?.[0]?.role !== 'admin') return NextResponse.redirect(new URL('/auth/login', req.url))
    } catch {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/map/:path*'],
}
