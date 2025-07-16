import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for backend operations
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables:')
  console.error('- SUPABASE_URL:', supabaseUrl ? '✅' : '❌')
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌')
  console.error('\nPlease check your .env file and add the missing Supabase configuration.')
  process.exit(1)
}

// Create admin client for backend operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Create client for auth operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('✅ Supabase client initialized successfully!')

export default supabase 