import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hpjqetugksblfiojwhzh.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwanFldHVna3NibGZpb2p3aHpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MzA5NDgsImV4cCI6MjA3NTAwNjk0OH0.FHkiqYWD6kbHNlNfbp3Gasi1RGpel7erVAx98hkfl0c';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

