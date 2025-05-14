'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { createActivityLog } from '@/lib/actions/loggingActions';
import { assignRandomAvatar } from '@/actions/userActions'; // Ensure this import is present

// Define a simple Profile type (adjust based on your actual profiles table)
interface Profile {
  id: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  theme_preference?: 'light' | 'dark' | 'system' | null; 
  benefit_status?: 'pending_verification' | 'verified' | 'declined' | 'not_applicable' | 'not_started' | null; 
  avatar_filename?: string | null; // Ensure this is string | null
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
  fetchAndSetProfile: (userId: string) => Promise<void>;
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
  fetchAndSetProfile: async () => {},
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
      const { data, error } = await supabase
        .from('users') 
        .select('id, first_name, last_name, role, theme_preference, benefit_status, avatar_filename') 
        .eq('id', userId)
        .single();

      if (error) {
        debugLog('Error fetching user profile:', error);
        setProfile(null);
      } else if (data) {
        debugLog('User profile fetched successfully:', data);
        let userProfile = data as unknown as Profile; // Cast to unknown first

        if (!userProfile.avatar_filename) { // Check if avatar_filename is missing
          debugLog('User has no avatar, assigning random one for user ID:', userId);
          try {
            const newAvatarFilename = await assignRandomAvatar(userId); // Call server action
            if (newAvatarFilename) {
              userProfile = { ...userProfile, avatar_filename: newAvatarFilename }; // Update local profile
              debugLog('Random avatar assigned and profile updated locally:', newAvatarFilename);
            }
          } catch (avatarError) {
            debugLog('Error assigning random avatar:', avatarError);
            // Proceed with profile without avatar if assignment fails
          }
        }
        setProfile(userProfile); // Set the potentially updated profile
      } else {
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

        if (event === 'SIGNED_OUT') {
            debugLog('SIGNED_OUT event detected, clearing profile.');
            setProfile(null);
            // Add logout activity log
            if (user) { // Use the 'user' state from before it's cleared by this event if possible
              createActivityLog({
                userId: user.id,
                userEmail: user.email,
                actionType: 'USER_LOGOUT',
                status: 'SUCCESS',
                description: 'User logged out.'
              });
            }
        } else if (event === 'SIGNED_IN' && currentSession?.user) {
          debugLog('SIGNED_IN event detected.');
          
          // Attempt to make logging idempotent for a single login flow
          const loginEventKey = `loginLogged_${currentSession.user.id}_${currentSession.access_token.substring(0,10)}`;
          
          if (typeof window !== 'undefined' && !sessionStorage.getItem(loginEventKey)) {
            debugLog('Logging USER_LOGIN_SUCCESS activity for key:', loginEventKey);
            createActivityLog({
              userId: currentSession.user.id,
              userEmail: currentSession.user.email,
              actionType: 'USER_LOGIN_SUCCESS',
              status: 'SUCCESS',
              description: 'User successfully logged in.',
              details: { provider: currentSession.user.app_metadata.provider || 'email' }
            }).then(() => {
              if (typeof window !== 'undefined') {
                sessionStorage.setItem(loginEventKey, 'true');
              }
            });
          } else if (typeof window !== 'undefined') {
            debugLog('USER_LOGIN_SUCCESS already logged for this session event or sessionStorage not available.', loginEventKey);
          }
        }
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
    if (!isLoading) { 
      if (user && (!profile || profile.id !== user.id)) {
        debugLog('Profile Fetch Effect: User detected and profile needs fetching/update. User ID:', user.id);
        fetchAndSetProfile(user.id);
      } else if (!user && profile) {
        debugLog('Profile Fetch Effect: No user detected, clearing profile state.');
        setProfile(null);
      }
    }
  }, [user, profile, isLoading]); // Removed fetchAndSetProfile from dependencies as it's stable

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
          data: { 
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) {
        debugLog('Sign up error:', error);
        throw error;
      } else if (data.user) {
        debugLog('Sign up successful:', data.user.email);
        return { user: data.user, session: data.session };
      } else {
         debugLog('Sign up returned no user but no error (e.g., needs confirmation):', data);
         return { user: null, session: null }; 
      }
    } catch (err) {
      debugLog('Error during sign up:', err);
      throw err; 
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      debugLog('Signing out...');
      const { data: { session: currentSessionB }, error: sessionErrorB } = await supabase.auth.getSession();
      if (sessionErrorB) { debugLog('Error fetching session before sign out (B):', sessionErrorB); }
      if (!currentSessionB) { debugLog('Supabase client reports no active session before calling signOut (B).'); } 
      else { debugLog('Supabase client confirms active session before calling signOut (B).'); }

      const { error } = await supabase.auth.signOut();
      
      if (error) {
        debugLog('Error returned from supabase.auth.signOut():', error); 
        setIsLoading(false);
        throw error; 
      }
      
      debugLog('Sign out seems successful based on supabase.auth.signOut() return.');
      setIsLoading(false);
    } catch (error) {
      debugLog('Error during sign out process:', error); 
      setIsLoading(false);
      throw error; 
    }
  };

  const value = {
    user,
    session,
    profile,
    isLoading,
    isProfileLoading,
    fetchAndSetProfile,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  return useContext(AuthContext);
};