import { createBrowserClient } from '@supabase/ssr'

const createClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase environment variables')
  return createBrowserClient(url, key)
}

let client: ReturnType<typeof createClient> | null = null

const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    if (!client) client = createClient()
    return (client as any)[prop]
  },
})

export default supabase
