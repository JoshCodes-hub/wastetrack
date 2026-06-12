export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="spinner w-10 h-10 border-4 rounded-full" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}></div>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading...</p>
      </div>
    </div>
  )
}
