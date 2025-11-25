import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session, Factor } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { logLogin, logLogout, logMFAEnabled, logMFADisabled, logPasswordResetRequest, logPasswordChanged } from '@/lib/auditLogger';

// Session timeout configuration
const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours
const SESSION_WARNING_MS = 5 * 60 * 1000; // 5 minutes before timeout
const ACTIVITY_CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: SignUpData) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any; mfaRequired?: boolean; factorId?: string }>;
  signOut: () => Promise<void>;
  // Password reset
  resetPasswordRequest: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  // MFA functions
  enrollMFA: () => Promise<{ data: any; error: any }>;
  verifyMFA: (factorId: string, code: string) => Promise<{ error: any }>;
  unenrollMFA: (factorId: string) => Promise<{ error: any }>;
  getMFAFactors: () => Promise<{ factors: Factor[]; error: any }>;
  challengeMFA: (factorId: string, code: string) => Promise<{ error: any }>;
}

interface SignUpData {
  firstName: string;
  lastName: string;
  phone: string;
  clinicName?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [warningShown, setWarningShown] = useState(false);
  const navigate = useNavigate();

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
    setWarningShown(false);
  }, []);

  // Session timeout effect
  useEffect(() => {
    if (!session) return;

    // Activity listeners
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, updateActivity));

    // Check session timeout periodically
    const intervalId = setInterval(async () => {
      const timeSinceActivity = Date.now() - lastActivity;

      // Show warning before timeout
      if (timeSinceActivity > SESSION_TIMEOUT_MS - SESSION_WARNING_MS && !warningShown) {
        setWarningShown(true);
        toast.warning('ההתחברות שלך תפוג בעוד 5 דקות בשל חוסר פעילות');
      }

      // Timeout - sign out
      if (timeSinceActivity > SESSION_TIMEOUT_MS) {
        toast.error('התנתקת אוטומטית בשל חוסר פעילות');
        await supabase.auth.signOut();
        navigate('/auth');
      }
    }, ACTIVITY_CHECK_INTERVAL_MS);

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      clearInterval(intervalId);
    };
  }, [session, lastActivity, warningShown, updateActivity, navigate]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session) {
          setLastActivity(Date.now());
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session) {
        setLastActivity(Date.now());
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userData: SignUpData) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone: userData.phone,
            clinic_name: userData.clinicName,
          }
        }
      });
      
      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      // Check if MFA is required
      if (data.user && !data.session) {
        // User has MFA enabled, need to verify
        const { data: factors } = await supabase.auth.mfa.listFactors();
        if (factors?.totp && factors.totp.length > 0) {
          return { error: null, mfaRequired: true, factorId: factors.totp[0].id };
        }
      }

      if (data.session) {
        setLastActivity(Date.now());
        logLogin(); // Audit log
        navigate('/dashboard');
      }

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    logLogout(); // Audit log
    await supabase.auth.signOut();
    navigate('/auth');
  };

  // Password reset functions
  const resetPasswordRequest = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (!error) {
        logPasswordResetRequest(); // Audit log
      }
      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (!error) {
        logPasswordChanged(); // Audit log
      }
      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  // MFA functions
  const enrollMFA = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App',
      });
      return { data, error };
    } catch (error: any) {
      return { data: null, error };
    }
  };

  const verifyMFA = async (factorId: string, code: string) => {
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError || !challenge) {
        return { error: challengeError || new Error('Failed to create challenge') };
      }

      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (!error) {
        logMFAEnabled(); // Audit log
      }
      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  const unenrollMFA = async (factorId: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId,
      });
      if (!error) {
        logMFADisabled(); // Audit log
      }
      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  const getMFAFactors = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      return { factors: data?.totp || [], error };
    } catch (error: any) {
      return { factors: [], error };
    }
  };

  const challengeMFA = async (factorId: string, code: string) => {
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError || !challenge) {
        return { error: challengeError || new Error('Failed to create challenge') };
      }

      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });

      if (!error && data) {
        setLastActivity(Date.now());
        navigate('/dashboard');
      }

      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut,
      resetPasswordRequest,
      updatePassword,
      enrollMFA,
      verifyMFA,
      unenrollMFA,
      getMFAFactors,
      challengeMFA,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
