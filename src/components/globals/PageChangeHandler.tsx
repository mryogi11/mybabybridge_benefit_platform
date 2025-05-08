'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation'; // Using usePathname and useSearchParams for route change detection
import { usePageLoading } from '@/contexts/LoadingContext';

export function PageChangeHandler() {
  const { setIsLoadingPage } = usePageLoading();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // For initial load or when component mounts after a non-Link navigation, ensure loading is false.
    // This addresses cases where routeChangeStart might not fire for the very first page load.
    setIsLoadingPage(false);
  }, []); // Runs once on mount

  useEffect(() => {
    // This effect will run when pathname or searchParams changes, indicating a route change has completed.
    // We set loading to false here. The actual setting to true will be handled by Link clicks or similar.
    // For a more robust solution, one would typically use router events if available in this Next.js version/setup.
    // However, to avoid relying on deprecated router.events, we can infer from path changes.
    // A drawback: this won't show a loader if the page takes time to *start* rendering after navigation, only after it *has* rendered.
    // For now, we will rely on setting isLoadingPage to true *before* navigation is initiated (e.g. in NavLink components).
    // And setting it to false here upon completion.
    setIsLoadingPage(false); 
  }, [pathname, searchParams, setIsLoadingPage]);

  // The primary mechanism for setting isLoadingPage to true will be in shared NavLink components
  // that wrap NextLink. Those components will call setIsLoadingPage(true) onClick before navigation.

  return null; // This component does not render anything itself
}

// Note: For a truly global router event-based loader, if Next.js App Router has a stable API for it,
// that would be preferred. The above uses pathname/searchParams as a proxy for route completion.
// The `isLoadingPage` state would typically be set to true in response to `routeChangeStart` 
// and false on `routeChangeComplete` or `routeChangeError`.
// If `next/router` events are usable (e.g. if still partially in pages router or for specific setups):
/*
import { useRouter } from 'next/router'; // from 'next/router' for events

export function PageChangeHandlerWithRouterEvents() {
  const { setIsLoadingPage } = usePageLoading();
  const router = useRouter(); // from 'next/router'

  useEffect(() => {
    const handleRouteChangeStart = () => {
      setIsLoadingPage(true);
    };
    const handleRouteChangeComplete = () => {
      setIsLoadingPage(false);
    };
    const handleRouteChangeError = () => {
      setIsLoadingPage(false);
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    router.events.on('routeChangeError', handleRouteChangeError);

    // Initial check (if needed, though Link clicks should handle it)
    setIsLoadingPage(false);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
      router.events.off('routeChangeError', handleRouteChangeError);
    };
  }, [router, setIsLoadingPage]);

  return null;
}
*/ 