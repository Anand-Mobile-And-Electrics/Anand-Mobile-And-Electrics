import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { isDemoMode } from '../data/demoMode';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: string | null;
  signOut: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  const fetchRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (!mountedRef.current) return;
      if (error) {
        // A failed profile lookup leaves role null; surface it rather than
        // silently treating an authenticated user as having no role.
        console.error('Failed to fetch role:', error.message);
        setRole(null);
      } else if (data) {
        setRole(data.role);
      }
    } catch (err) {
      console.error('Error fetching role:', err);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    // Demo mode: no live auth — present a signed-in demo Owner so admin flows
    // are usable locally against the in-memory adapter. No Supabase calls.
    if (isDemoMode()) {
      setSession({ user: { id: 'demo-owner' } } as unknown as Session);
      setUser({ id: 'demo-owner', email: 'demo.owner@anandtest.local' } as unknown as User);
      setRole('owner');
      setIsLoading(false);
      return () => { mountedRef.current = false; };
    }

    // Get initial session. A failure here must still resolve isLoading,
    // otherwise the admin area is stuck on "Loading…" forever.
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!mountedRef.current) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchRole(session.user.id);
        } else {
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to restore session:', err);
        if (mountedRef.current) setIsLoading(false);
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mountedRef.current) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
      } else {
        setRole(null);
        setIsLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    if (isDemoMode()) {
      setSession(null);
      setUser(null);
      setRole(null);
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setSession(null);
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, role, signOut, isLoading }}>
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
