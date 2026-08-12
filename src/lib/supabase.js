import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fleiexbcgxrfsfyjrdbn.supabase.co';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsZWlleGJjZ3hyZnNmeWpyZGJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NjIyOTUsImV4cCI6MjA5OTMzODI5NX0.069-Wi2LeZ1Zv5TTOKcGeY3u-unh1WEnc1QWy1C5zhU';

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
