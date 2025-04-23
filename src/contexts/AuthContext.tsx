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
  theme_preference?: 'light' | 'dark' | 'system' | null; // Added optional theme preference
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
      // Select specific columns including the new one, or keep '*'. Using '*' for now.
      const { data, error } = await supabase
        .from('users') 
        .select('id, first_name, last_name, role, theme_preference') // Explicitly select needed fields including theme
        .eq('id', userId)
        .single();
      if (error) {
        debugLog('Error fetching user profile:', error);
        setProfile(null);
      } else if (data) {
        debugLog('User profile fetched successfully:', data);
        // Now the type assertion is safer
        setProfile(data as Profile); 
      } else {
        // Handle case where query succeeded but no user found (data is null)
        debugLog('User profile not found for ID:', userId);
        setProfile(null);
      }
    } catch (err) {
      debugLog('Caught exception during user profile fetch:', err);
      setProfile(null);
    } finally {
        setIsProfileLoading(false);
    }
  };

  // --- Simplified Initialization and Auth Listener Setup --- 
  useEffect(() => {
    debugLog('Setting up auth listener...');

    // Fetch the initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      debugLog('Initial getSession call completed.', { hasSession: !!session });
      setSession(session);
      setUser(session?.user ?? null);
      // Initial profile fetch is handled by the separate useEffect below
      setIsLoading(false); // Mark initial loading as complete
      debugLog('Auth state initialized.');
    }).catch((error) => {
        debugLog('Error fetching initial session:', error);
        setIsLoading(false); // Still complete loading on error
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        debugLog(`>>> Auth state change event START: ${event}`);
        debugLog('Auth Event - New session details:', currentSession?.user ? `User: ${currentSession.user.email}` : 'No session or no user');

        // Update session and user state directly from the listener
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        // If user signs out, explicitly clear profile
        if (event === 'SIGNED_OUT') {
            debugLog('SIGNED_OUT event detected, clearing profile.');
            setProfile(null);
        }
        // Profile fetching for SIGNED_IN/USER_UPDATED is handled by the useEffect below

        debugLog(`<<< Auth state change event END: ${event} (Session/User state updated)`);
      }
    );

    // Cleanup listener on unmount
    return () => {
      debugLog('Cleaning up auth listener.');
      subscription?.unsubscribe();
    };
  }, []); // Runs once on mount

  // --- End Simplified Initialization ---

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

      // Explicitly try to get session right before signing out
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        debugLog('Error fetching session before sign out:', sessionError);
        // Decide if we should proceed or throw here? Let's proceed but log.
      }

      if (!currentSession) {
          debugLog('Supabase client reports no active session before calling signOut.');
          // If no session, maybe we don't even need to call signOut?
          // Or we call it anyway and expect the AuthSessionMissingError?
          // For now, let's just log and proceed to call signOut, mirroring current behavior.
      } else {
           debugLog('Supabase client confirms active session before calling signOut.');
      }

      // Proceed with the actual sign out call
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        // Log the specific error from signOut
        debugLog('Error returned from supabase.auth.signOut():', error); 
        setIsLoading(false);
        throw error; 
      }
      
      debugLog('Sign out seems successful based on supabase.auth.signOut() return.');
      setIsLoading(false);
    } catch (error) {
      // Catch any error from getSession or signOut
      debugLog('Error during sign out process:', error); 
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
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
}; 