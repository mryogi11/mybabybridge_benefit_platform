import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Database } from '@/types/supabase';

export async function middleware(req: NextRequest) {
  // Define res object early for cookie handlers
  const res = NextResponse.next(); 
  try {
    // Get the pathname of the request
    const path = req.nextUrl.pathname;
    console.log(`[Middleware] Handling path: ${path}`);
    
    // Define public routes that don't need protection
    const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
    
    // If it's a public route, proceed without checks
    if (publicRoutes.includes(path)) {
      console.log('[Middleware] Public route detected, proceeding without checks');
      return NextResponse.next();
    }
    
    // Create Supabase client configured to use cookies
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            // Only set cookie on the response
            // req.cookies.set({ name, value, ...options }); // REMOVED
            res.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            // Only remove cookie on the response
            // req.cookies.set({ name, value: '', ...options }); // REMOVED
            res.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );
    
    // Get the session
    const { data: { session } } = await supabase.auth.getSession();
    console.log(`[Middleware] Session check result: ${session ? 'Has session' : 'No session'}`);
    
    // Protected routes
    if (path.startsWith('/dashboard') || path.startsWith('/admin') || path.startsWith('/provider')) {
      // If there's a session, allow access
      if (session) {
        console.log('[Middleware] Valid session found, allowing access');
        return NextResponse.next();
      }
      
      // If no session, redirect to login
      console.log('[Middleware] No valid session, redirecting to login');
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Return the response object to persist cookies if needed
    return res; 
  } catch (error) {
    console.error('[Middleware] Error:', error);
    // On error, redirect to home page
    return NextResponse.redirect(new URL('/', req.url));
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|fonts|images|favicon.ico|sw.js).*)'],
}; 