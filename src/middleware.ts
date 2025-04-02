import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
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
    
    // Check for our custom loggedIn cookie
    const hasLoggedInCookie = req.cookies.has('loggedIn');
    console.log(`[Middleware] loggedIn cookie exists: ${hasLoggedInCookie}`);
    
    // If this cookie exists, allow access without further checks
    if (hasLoggedInCookie) {
      console.log('[Middleware] loggedIn cookie found, allowing access');
      return NextResponse.next();
    }
    
    // Create a response object
    const res = NextResponse.next();
    
    // Create the Supabase middleware client
    const supabase = createMiddlewareClient({ req, res });
    
    // Get the session
    const { data: { session } } = await supabase.auth.getSession();
    console.log(`[Middleware] Session check result: ${session ? 'Has session' : 'No session'}`);
    
    // Protected routes
    if (path.startsWith('/dashboard') || path.startsWith('/admin') || path.startsWith('/provider')) {
      // If there's a session, allow access
      if (session) {
        console.log('[Middleware] Valid session found, allowing access');
        
        // Set the loggedIn cookie for future requests
        const response = NextResponse.next();
        response.cookies.set('loggedIn', 'true', { path: '/' });
        return response;
      }
      
      // If no session, redirect to login
      console.log('[Middleware] No valid session, redirecting to login');
      return NextResponse.redirect(new URL('/login', req.url));
    }

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