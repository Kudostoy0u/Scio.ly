import { createClient } from '@supabase/supabase-js'
import { Database } from './types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qzwdlqeicmcaoggdavdm.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6d2RscWVpY21jYW9nZ2RhdmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNjQ1MTQsImV4cCI6MjA2OTY0MDUxNH0.-b8RDZFGrJekuDCTQtXayaozxyfwoOV4RLf_jOORYkk'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Helper function to get current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    console.error('Error getting user:', error)
    return null
  }
  return user
}

// Helper function to get user profile
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
    console.error('Error getting user profile:', error)
    return null
  }
  
  return data
}