import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface Profile {
  id:         string;
  name:       string;
  email:      string;
  role:       'owner' | 'supervisor' | 'accountant';
  phone?:     string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export function useAuth() {
  const [user,    setUser]    = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data as Profile);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const syncAuth = () => {
      const demoRaw = localStorage.getItem('nirmaniq-demo-session');
      if (demoRaw) {
        try {
          const parsed = JSON.parse(demoRaw);
          setUser(parsed.user as User);
          setProfile(parsed.profile as Profile);
          setLoading(false);
          return;
        } catch {}
      }

      // 1. Seed initial session on mount
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!localStorage.getItem('nirmaniq-demo-session')) {
          setUser(session?.user ?? null);
          if (session?.user) loadProfile(session.user.id);
          else setLoading(false);
        }
      });
    };

    syncAuth();

    // 2. React to auth state changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!localStorage.getItem('nirmaniq-demo-session')) {
        setUser(session?.user ?? null);
        if (session?.user) loadProfile(session.user.id);
        else { setProfile(null); setLoading(false); }
      }
    });

    window.addEventListener('nirmaniq-auth-changed', syncAuth);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('nirmaniq-auth-changed', syncAuth);
    };
  }, []);

  return { user, profile, loading };
}
