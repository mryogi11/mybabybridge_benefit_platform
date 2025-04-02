import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// Create a client with session persistence in cookies
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'supabase.auth.token',
      storage: {
        getItem: (key) => {
          if (typeof window === 'undefined') {
            return null;
          }
          
          try {
            const item = window.localStorage.getItem(key);
            if (!item) return null;
            
            // Make sure the item is valid JSON before parsing
            return JSON.parse(item);
          } catch (error) {
            console.error('Error parsing localStorage item:', error);
            // Remove the problematic item
            window.localStorage.removeItem(key);
            return null;
          }
        },
        setItem: (key, value) => {
          if (typeof window !== 'undefined') {
            try {
              window.localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
              console.error('Error setting localStorage item:', error);
            }
          }
        },
        removeItem: (key) => {
          if (typeof window !== 'undefined') {
            try {
              window.localStorage.removeItem(key);
            } catch (error) {
              console.error('Error removing localStorage item:', error);
            }
          }
        },
      },
    },
  }
) 