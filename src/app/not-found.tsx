import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="text-center space-y-4">
        <div className="text-6xl">404</div>
        <h2 className="text-xl font-semibold">Page not found</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>The page you are looking for does not exist.</p>
        <Link href="/"
          className="inline-block px-6 py-2.5 rounded-lg text-white font-medium text-sm"
          style={{ background: 'var(--primary)' }}>
          Go Home
        </Link>
      </div>
    </div>
  )
}
