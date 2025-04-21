import { createServerClient, type CookieOptions } from '@supabase/ssr'
// Import only 'cookies' from next/headers
import { cookies } from 'next/headers' 
// Import the specific type for the parameter
import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'; 

// Correct Database type import based on client.ts
import type { Database } from '@/types/supabase'; 
// type Database = any; // Remove placeholder

// Simplified function for Route Handlers based on Supabase docs
// This directly uses the cookies() function within createServerClient
export const createSupabaseRouteHandlerClient = async () => {
  const cookieStore = await cookies()

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
  }
   if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('Missing env.SUPABASE_SERVICE_ROLE_KEY. Falling back to ANON_KEY for server client. Admin actions might fail.');
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY as fallback.');
    }
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        // Stubs remain as Route Handlers cannot directly set response cookies here
        set(name: string, value: string, options: CookieOptions) {
           console.warn('Attempted to set cookie in Route Handler via createServerClient. This has no effect. Use Middleware or Server Actions.');
        },
        remove(name: string, options: CookieOptions) {
           console.warn('Attempted to remove cookie in Route Handler via createServerClient. This has no effect. Use Middleware or Server Actions.');
        },
      },
    }
  )
}

// You might have another one for Server Actions / Server Components if needed
// export const createSupabaseServerActionClient = () => { ... } 