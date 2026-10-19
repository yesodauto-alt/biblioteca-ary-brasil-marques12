import { createClient } from '@supabase/supabase-js'

const url =
  import.meta.env.VITE_SUPABASE_URL || 'https://dfulcphjvynhtzaobaqx.supabase.co'
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_yG_xSZqdv1pn8dVb0-hhsA_-83hPWEt'

if (!url || !key) {
  throw new Error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.')
}

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
