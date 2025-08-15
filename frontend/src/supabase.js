import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mgvpyjqfllmipmlxcrub.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ndnB5anFmbGxtaXBtbHhjcnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNTYyNzcsImV4cCI6MjA3MDczMjI3N30.YVHEvR8hxmSCGy-QnoZNrKqTFE6rvYlr_i4swRm-F6w'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)