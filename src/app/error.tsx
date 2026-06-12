'use client'
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-4xl">⚠</div>
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{error.message || 'Try again.'}</p>
        <button onClick={reset}
          className="px-6 py-2.5 rounded-lg text-white font-medium text-sm"
          style={{ background: 'var(--primary)' }}>
          Try Again
        </button>
      </div>
    </div>
  )
}
