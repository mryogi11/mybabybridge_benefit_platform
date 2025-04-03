'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
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
  signIn: (email: string, password: string) => Promise<{ user: User | null; session: Session | null } | undefined>;
  signUp: (email: string, password: string) => Promise<{ user: User | null; session: Session | null } | undefined>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
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

  // --- Function to fetch profile ---
  const fetchAndSetProfile = async (userId: string) => {
    debugLog('Fetching profile for user ID:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles') // Assuming your table is named 'profiles'
        .select('*')
        .eq('id', userId)
        .single(); // Assuming one profile per user ID

      if (error) {
        debugLog('Error fetching profile:', error);
        if (error.code !== 'PGRST116') { // PGRST116: "relation [...] does not exist" or "0 rows returned"
           setProfile(null); // Clear profile on fetch error (unless it's just 'not found')
           throw error; // Rethrow other errors
        } else {
             debugLog('Profile not found for user, setting profile to null.');
             setProfile(null); // Set profile to null if not found
        }
      } else if (data) {
        debugLog('Profile fetched successfully:', data);
        setProfile(data as Profile);
      } else {
         debugLog('No profile data returned for user.');
         setProfile(null);
      }
    } catch (err) {
      // Error already logged, just ensure profile is null
      debugLog('Caught exception during profile fetch:', err);
      setProfile(null);
    }
  };

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
        setSession(null);
        setUser(null);
        setProfile(null);
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
    // Run the initialization
    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        debugLog(`Auth state changed: ${event}`);
        // Safely log user email only if session and user exist
        debugLog('New session:', currentSession && currentSession.user ? `User: ${currentSession.user.email}` : 'No session or no user');
        
        setIsLoading(true);

        // If signed in, make sure we update local state
        if (event === 'SIGNED_IN' && currentSession) {
          debugLog('Handling SIGNED_IN');
          setSession(currentSession);
          setUser(currentSession.user);
          await fetchAndSetProfile(currentSession.user.id);
        } 
        // If signed out, clear local state
        else if (event === 'SIGNED_OUT') {
          debugLog('Handling SIGNED_OUT');
          setSession(null);
          setUser(null);
          setProfile(null);
        }
        // Handle token refresh, password recovery etc. if needed
        else if (event === 'TOKEN_REFRESHED' && currentSession) {
          debugLog('Handling TOKEN_REFRESHED');
          setSession(currentSession);
          setUser(currentSession.user);
          await fetchAndSetProfile(currentSession.user.id);
        } else if (event === 'USER_UPDATED' && currentSession) {
          debugLog('Handling USER_UPDATED');
          setSession(currentSession);
          setUser(currentSession.user);
          await fetchAndSetProfile(currentSession.user.id);
        } else if (event === 'PASSWORD_RECOVERY') {
             debugLog('Handling PASSWORD_RECOVERY');
        } else if (event === 'INITIAL_SESSION') {
             debugLog('Handling INITIAL_SESSION');
             if (currentSession) {
                 setSession(currentSession);
                 setUser(currentSession.user);
                 await fetchAndSetProfile(currentSession.user.id);
             } else {
                 // No initial session, user is logged out
                 setSession(null);
                 setUser(null);
                 setProfile(null);
             }
        } else {
             debugLog(`Unhandled auth event: ${event}`);
        }
        setIsLoading(false);
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

  const signUp = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      debugLog(`Signing up with email: ${email}`);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        debugLog('Sign up error:', error);
        setIsLoading(false);
        throw error;
      }
      
      debugLog(`Sign up successful for user: ${data.user?.email}`);
      debugLog(`Email confirmation status: ${data.user?.email_confirmed_at ? 'Confirmed' : 'Not confirmed'}`);
      
      setIsLoading(false);
      return { user: data.user, session: data.session };
    } catch (error) {
      debugLog('Error during sign up:', error);
      setIsLoading(false);
      throw error;
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