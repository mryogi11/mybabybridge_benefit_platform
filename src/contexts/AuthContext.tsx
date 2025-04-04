'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

// Define a simple Profile type (adjust based on your actual profiles table)
interface Profile {
  id: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  // Add other profile fields as needed
}

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
  profile: Profile | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User | null; session: Session | null } | undefined>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ user: User | null; session: Session | null } | undefined>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isProfileLoading: false,
  signIn: async () => undefined,
  signUp: async () => undefined,
  signOut: async () => {},
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // --- Function to fetch profile ---
  const fetchAndSetProfile = async (userId: string) => {
    if (!userId) {
        debugLog('fetchAndSetProfile called with no userId, skipping.');
        setProfile(null);
        return;
    }
    debugLog('Fetching profile (from users table) for user ID:', userId);
    setIsProfileLoading(true);
    try {
      // Corrected table name to 'users'
      const { data, error } = await supabase
        .from('users') 
        .select('*') // Select all relevant user/profile fields
        .eq('id', userId)
        .single();
      if (error) {
        debugLog('Error fetching user profile:', error);
        setProfile(null);
      } else {
        debugLog('User profile fetched successfully:', data);
        // Ensure the fetched data conforms to the Profile interface
        setProfile(data as Profile); 
      }
    } catch (err) {
      debugLog('Caught exception during user profile fetch:', err);
      setProfile(null);
    } finally {
        setIsProfileLoading(false);
    }
  };

  // Initialize auth and check for existing session
  const initializeAuth = async () => {
    debugLog('Initializing auth and checking for session...');
    try {
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
        setSession(null);
        setUser(null);
        setProfile(null);
      } else if (data?.session) {
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
        await fetchAndSetProfile(data.session.user.id);
      } else {
        debugLog('No session found during initialization');
        setSession(null);
        setUser(null);
        setProfile(null);
      }
    } catch (error) {
      debugLog('Error initializing auth:', error);
      setSession(null);
      setUser(null);
      setProfile(null);
    } finally {
      debugLog('Initialization complete. Setting isLoading to false.');
      setIsLoading(false);
    }
  };

  // Function to manually refresh the session
  const refreshSession = async () => {
    try {
      debugLog('Manually refreshing session...');
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        debugLog('Error refreshing session:', error);
        setSession(null);
        setUser(null);
        setProfile(null);
        return;
      }
      
      if (data?.session) {
        debugLog(`Session refreshed for user: ${data.session.user.email}`);
        setSession(data.session);
        setUser(data.session.user);
        await fetchAndSetProfile(data.session.user.id);
      } else {
        debugLog('No session found after refresh');
        setSession(null);
        setUser(null);
        setProfile(null);
      }
    } catch (error) {
      debugLog('Error during session refresh:', error);
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  };

  useEffect(() => {
    debugLog('Auth Provider useEffect running. Initializing auth AND setting up listener...');
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        debugLog(`>>> Auth state change event START: ${event}`);
        debugLog('Auth Event - New session details:', currentSession?.user ? `User: ${currentSession.user.email}` : 'No session or no user');

        // Listener only updates session and user state directly
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        // Profile fetching is handled by the dedicated useEffect below
        // REMOVED fetchAndSetProfile calls from individual event handlers

        debugLog(`<<< Auth state change event END: ${event} (Session/User state updated)`);
      }
    );

    // Cleanup listener on unmount
    return () => {
      debugLog('Cleaning up auth listener.');
      subscription?.unsubscribe();
    };
  }, []); // Runs once on mount

  // Effect specifically for fetching/clearing the profile based on user state
  useEffect(() => {
    // Only run after initial loading is complete
    if (!isLoading) { 
      if (user && (!profile || profile.id !== user.id)) {
        // If we have a user, and either no profile or the wrong profile, fetch it.
        debugLog('Profile Fetch Effect: User detected and profile needs fetching/update. User ID:', user.id);
        fetchAndSetProfile(user.id);
      } else if (!user && profile) {
        // If we have no user, but still have a profile state, clear it.
        debugLog('Profile Fetch Effect: No user detected, clearing profile state.');
        setProfile(null);
      }
    }
  }, [user, profile, isLoading]); // Depend on user, profile, and isLoading

  const signIn = async (email: string, password: string) => {
    debugLog('Attempting sign in for:', email);
    try {
      setIsLoading(true);
      debugLog(`Signing in with email: ${email}`);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        debugLog('Sign in error:', error);
        setIsLoading(false);
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
      
      setIsLoading(false);
      return { user: data.user, session: data.session };
    } catch (error) {
      debugLog('Error during sign in:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    debugLog('Signing up with email:', email);
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Pass first_name and last_name in the data object
          data: { 
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) {
        debugLog('Sign up error:', error);
        // Propagate error to UI if needed
        throw error;
      } else if (data.user) {
        debugLog('Sign up successful:', data.user.email);
        // Note: The onAuthStateChange listener will handle setting user/session/profile state
        return { user: data.user, session: data.session };
      } else {
        // Handle cases like user already exists but unconfirmed, etc.
         debugLog('Sign up returned no user but no error (e.g., needs confirmation):', data);
         return { user: null, session: null }; // Or handle as appropriate
      }
    } catch (err) {
      debugLog('Error during sign up:', err);
      throw err; // Re-throw to be caught by caller
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      debugLog('Signing out...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        debugLog('Sign out error:', error);
        setIsLoading(false);
        throw error;
      }
      
      debugLog('Sign out successful');
      
      setIsLoading(false);
    } catch (error) {
      debugLog('Error during sign out:', error);
      setIsLoading(false);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile,
      isLoading, 
      isProfileLoading,
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