import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Database } from '@/types/supabase';

// DB imports are no longer needed here
// import { db } from '@/lib/db';
// import { users } from '@/lib/db/schema';
// import { eq } from 'drizzle-orm';

// No longer needed as DB access is removed
// export const runtime = 'nodejs';

// Helper function to create Supabase client
// This ensures cookie operations are attached to the response `res`
const createClient = (req: NextRequest, res: NextResponse) => {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );
};

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createClient(req, res);

  try {
    const path = req.nextUrl.pathname;
    console.log(`[Middleware - Simplified] Handling path: ${path}`);

    // Define public routes
    const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/benefit-status-error']; // Add error page here

    if (publicRoutes.includes(path)) {
      console.log('[Middleware - Simplified] Public route, proceeding.');
      await supabase.auth.getSession(); 
      return res;
    }

    // Explicitly get session early for all non-public routes
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
        console.error('[Middleware - Simplified] Error getting session:', sessionError);
        return res; // Allow access but log error
    }
    console.log(`[Middleware - Simplified] Session check result: ${session ? 'Has session' : 'No session'}`);

    // Routes requiring authentication
    const protectedRoutes = ['/dashboard', '/admin', '/provider', '/step1', '/step2', '/step3', '/step4', '/step5', '/step6']; 
    const requiresAuth = protectedRoutes.some(route => path.startsWith(route));

    if (requiresAuth) {
      if (session) {
        // User has session, allow access (layout will handle status checks)
        console.log('[Middleware - Simplified] Valid session found, allowing access. Layout will check status.');
        return res; 
      } else {
        // No valid session, redirect to login
        console.log('[Middleware - Simplified] No valid session for protected route, redirecting to login');
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = '/login';
        redirectUrl.searchParams.set('redirectedFrom', path);
        return NextResponse.redirect(redirectUrl);
      }
    }

    console.log('[Middleware - Simplified] Path not explicitly public or protected, allowing access.');
    return res;

  } catch (error) {
    console.error('[Middleware - Simplified] Unexpected Error:', error);
    // Redirect to home on unexpected error
    return NextResponse.redirect(new URL('/', req.url)); 
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|fonts|images|favicon.ico|sw.js).*)',
  ],
}; 