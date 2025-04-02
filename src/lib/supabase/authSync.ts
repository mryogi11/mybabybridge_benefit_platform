'use client';

import { supabase } from './client';

/**
 * Helper function to ensure auth state is properly synced
 * between localStorage and Supabase client
 */
export const syncAuthState = async () => {
  try {
    console.log('[AuthSync] Checking for stored auth token');
    const storedTokenData = localStorage.getItem('supabase.auth.token');
    
    if (storedTokenData) {
      try {
        // Parse the stored token data
        const tokenData = JSON.parse(storedTokenData);
        
        if (!tokenData || !tokenData.access_token) {
          console.log('[AuthSync] Invalid token data format, removing');
          localStorage.removeItem('supabase.auth.token');
          return;
        }
        
        console.log('[AuthSync] Found valid stored auth token, ensuring it is set in Supabase client');
        
        // Check if we already have a session in Supabase client
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (!sessionData.session) {
          console.log('[AuthSync] No session in Supabase client, attempting to set session from stored token');
          
          // Try to use the access token to refresh the session
          const { data, error } = await supabase.auth.refreshSession({
            refresh_token: tokenData.refresh_token,
          });
          
          if (error || !data.session) {
            console.error('[AuthSync] Failed to refresh session:', error);
            localStorage.removeItem('supabase.auth.token');
          } else {
            console.log('[AuthSync] Successfully refreshed session');
          }
        } else {
          console.log('[AuthSync] Session already exists in Supabase client');
        }
      } catch (parseError) {
        console.error('[AuthSync] Error parsing token data:', parseError);
        localStorage.removeItem('supabase.auth.token');
      }
    } else {
      console.log('[AuthSync] No stored auth token found');
    }
  } catch (error) {
    console.error('[AuthSync] Error syncing auth state:', error);
  }
}; 