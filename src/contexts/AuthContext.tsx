'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

// Enhanced debug logging function
const debugLog = (message: string, data?: any) => {
  const timestamp = new Date().toISOString().substring(11, 19);
  const logMessage = `[AUTH-DEBUG ${timestamp}] ${message}`;
  
  if (data) {
    console.log(logMessage, data);
  } else {
    console.log(logMessage);
  }
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User | null; session: Session | null } | undefined>;
  signUp: (email: string, password: string) => Promise<{ user: User | null; session: Session | null } | undefined>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signIn: async () => undefined,
  signUp: async () => undefined,
  signOut: async () => {},
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth and check for existing session
  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      debugLog('Initializing auth and checking for session...');
      
      // First, check if we have any token in localStorage
      if (typeof window !== 'undefined') {
        try {
          const storedTokenData = localStorage.getItem('supabase.auth.token');
          if (storedTokenData) {
            debugLog('Found stored auth token, attempting to parse and use it');
            
            // Try to parse the token data
            const tokenData = JSON.parse(storedTokenData);
            if (tokenData && tokenData.access_token) {
              debugLog('Valid token data found, setting session');
              
              // Try to use the refresh token if available
              if (tokenData.refresh_token) {
                debugLog('Attempting to refresh session with stored refresh token');
                await supabase.auth.refreshSession({
                  refresh_token: tokenData.refresh_token
                });
              }
            } else {
              debugLog('Invalid token format found in localStorage, removing');
              localStorage.removeItem('supabase.auth.token');
            }
          }
        } catch (error) {
          debugLog('Error processing stored token:', error);
          localStorage.removeItem('supabase.auth.token');
        }
      }
      
      // Now get the session
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        debugLog('Error getting session:', error);
        return;
      }
      
      if (data?.session) {
        debugLog(`Session found during initialization for user: ${data.session.user.email}`);
        if (data.session.expires_at) {
          debugLog(`Session expires at: ${new Date(data.session.expires_at * 1000).toISOString()}`);
        }
        
        // Store the session token in localStorage for backup
        if (typeof window !== 'undefined' && data.session.access_token) {
          debugLog('Storing access token in localStorage');
          try {
            // Store in a way that's compatible with Supabase's expected format
            const authObject = {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_at: data.session.expires_at,
              expires_in: data.session.expires_in,
              token_type: 'bearer'
            };
            localStorage.setItem('supabase.auth.token', JSON.stringify(authObject));
          } catch (error) {
            debugLog('Error storing token:', error);
          }
        }
        
        setSession(data.session);
        setUser(data.session.user);
      } else {
        debugLog('No session found during initialization');
      }
    } catch (error) {
      debugLog('Error initializing auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to manually refresh the session
  const refreshSession = async () => {
    try {
      debugLog('Manually refreshing session...');
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        debugLog('Error refreshing session:', error);
        return;
      }
      
      if (data?.session) {
        debugLog(`Session refreshed for user: ${data.session.user.email}`);
        setSession(data.session);
        setUser(data.session.user);
      } else {
        debugLog('No session found after refresh');
        setSession(null);
        setUser(null);
      }
    } catch (error) {
      debugLog('Error during session refresh:', error);
    }
  };

  useEffect(() => {
    // Run the initialization
    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        debugLog(`Auth state changed: ${event}`);
        // Safely log user email only if session and user exist
        debugLog('New session:', currentSession && currentSession.user ? `User: ${currentSession.user.email}` : 'No session or no user');
        
        // If signed in, make sure we update local state
        if (event === 'SIGNED_IN' && currentSession) {
          debugLog('Handling SIGNED_IN');
          setSession(currentSession);
          // Fetch profile immediately after sign-in
          await fetchAndSetProfile(currentSession.user.id);
          setIsLoading(false);
        } 
        // If signed out, clear local state
        else if (event === 'SIGNED_OUT') {
          debugLog('Handling SIGNED_OUT');
          setSession(null);
          setUser(null);
          setIsLoading(false);
        }
        // Handle token refresh, password recovery etc. if needed
        else if (event === 'TOKEN_REFRESHED' && currentSession) {
          debugLog('Handling TOKEN_REFRESHED');
          setSession(currentSession);
          setIsLoading(false);
        } else if (event === 'USER_UPDATED' && currentSession) {
          debugLog('Handling USER_UPDATED');
          setSession(currentSession);
           await fetchAndSetProfile(currentSession.user.id); // Re-fetch profile on user update
          setIsLoading(false);
        } else if (event === 'PASSWORD_RECOVERY') {
             debugLog('Handling PASSWORD_RECOVERY');
             setIsLoading(false); // Allow UI to proceed for password reset flow
        } else {
             debugLog(`Unhandled auth event: ${event}`);
             // Potentially handle INITIAL_SESSION differently if needed
             if (event === 'INITIAL_SESSION' && currentSession) {
                 setSession(currentSession);
                 await fetchAndSetProfile(currentSession.user.id);
             } else if (event === 'INITIAL_SESSION' && !currentSession) {
                 // No initial session, user is logged out
                 setSession(null);
                 setUser(null);
             }
             setIsLoading(false);
        }
      }
    );

    // Cleanup on unmount
    return () => {
      debugLog('Auth provider unmounting, cleaning up subscription');
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      debugLog(`Signing in with email: ${email}`);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        debugLog('Sign in error:', error);
        throw error;
      }
      
      debugLog(`Sign in successful for user: ${data.user?.email}`);
      
      if (data.session) {
        if (data.session.expires_at) {
          debugLog(`Session created with expiry: ${new Date(data.session.expires_at * 1000).toISOString()}`);
        }
        debugLog('Session details:', {
          accessToken: `${data.session.access_token.substring(0, 10)}...`,
          refreshToken: data.session.refresh_token ? 'Present' : 'Missing',
          expiresIn: data.session.expires_in,
          providerToken: data.session.provider_token ? 'Present' : 'Missing'
        });
        
        // Store tokens in localStorage for backup access
        if (typeof window !== 'undefined') {
          debugLog('Storing tokens in localStorage');
          try {
            // Store in a way that's compatible with Supabase's expected format
            const authObject = {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_at: data.session.expires_at,
              expires_in: data.session.expires_in,
              token_type: 'bearer'
            };
            localStorage.setItem('supabase.auth.token', JSON.stringify(authObject));
          } catch (error) {
            debugLog('Error storing token:', error);
          }
        }
      } else {
        debugLog('No session created after sign in');
      }
      
      // Update context state
      setSession(data.session);
      setUser(data.session?.user ?? null);
      
      return { user: data.user, session: data.session };
    } catch (error) {
      debugLog('Error during sign in:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      debugLog(`Signing up with email: ${email}`);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        debugLog('Sign up error:', error);
        throw error;
      }
      
      debugLog(`Sign up successful for user: ${data.user?.email}`);
      debugLog(`Email confirmation status: ${data.user?.email_confirmed_at ? 'Confirmed' : 'Not confirmed'}`);
      
      // Update context state if session exists
      if (data.session) {
        debugLog('Session created after sign up');
        setSession(data.session);
        setUser(data.user);
      } else {
        debugLog('No session created after sign up (email confirmation may be required)');
      }
      
      return { user: data.user, session: data.session };
    } catch (error) {
      debugLog('Error during sign up:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      debugLog('Signing out...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        debugLog('Sign out error:', error);
        throw error;
      }
      
      debugLog('Sign out successful');
      
      // Clear context state
      setSession(null);
      setUser(null);
    } catch (error) {
      debugLog('Error during sign out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      isLoading, 
      signIn, 
      signUp, 
      signOut,
      refreshSession
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
}; 