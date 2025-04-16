import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Database } from '@/types/supabase';

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
    console.log(`[Middleware] Handling path: ${path}`);

    // Define public routes
    const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password'];

    if (publicRoutes.includes(path)) {
      console.log('[Middleware] Public route, proceeding.');
      // Explicitly get session even for public routes to handle potential cookie refresh?
      // This might not be necessary but trying it for debugging.
      await supabase.auth.getSession(); 
      return res;
    }

    // Explicitly get session early for all non-public routes
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
        console.error('[Middleware] Error getting session:', sessionError);
        // Potentially redirect to login on session error?
        // return NextResponse.redirect(new URL('/login', req.url));
        return res; // For now, allow access but log error
    }
    console.log(`[Middleware] Session check result: ${session ? 'Has session' : 'No session'}`);

    // Routes requiring authentication
    const protectedRoutes = ['/dashboard', '/admin', '/provider', '/step1', '/step2', '/step3', '/step4', '/step5', '/step6']; 
    const requiresAuth = protectedRoutes.some(route => path.startsWith(route));

    if (requiresAuth) {
      if (session) {
        console.log('[Middleware] Valid session found for protected route, allowing access');
        return res; 
      } else {
        console.log('[Middleware] No valid session for protected route, redirecting to login');
        const redirectUrl = req.nextUrl.clone();
        redirectUrl.pathname = '/login';
        redirectUrl.searchParams.set('redirectedFrom', path);
        return NextResponse.redirect(redirectUrl);
      }
    }

    console.log('[Middleware] Path not explicitly public or protected, allowing access.');
    return res;

  } catch (error) {
    console.error('[Middleware] Unexpected Error:', error);
    return NextResponse.redirect(new URL('/', req.url));
  }
}

export const config = {
  // Matcher includes API routes and excludes static assets
  // Adjusted to potentially include Server Action paths if they follow a convention
  matcher: [
    '/((?!_next/static|_next/image|fonts|images|favicon.ico|sw.js).*)',
    // If server actions are handled via specific API routes, adjust matcher accordingly
    // Example: '/api/actions/:path*',
  ],
}; 