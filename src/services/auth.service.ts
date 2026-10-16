import { supabase } from '../lib/supabase';

// ─── Email + Password ─────────────────────────────────────────────────────────

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string, name: string, role: 'owner' | 'supervisor' | 'accountant' = 'owner', phone?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role,
        phone: phone || null,
      },
    },
  });
  if (error) throw error;
  return data;
}

/**
 * Creates a team member from the Admin Dashboard.
 * Calls RPC if configured or registers the profile directly into profiles table.
 */
export async function createTeamMember(member: {
  name: string;
  email: string;
  role: 'supervisor' | 'accountant' | 'owner';
  phone?: string;
  password?: string;
}) {
  const pwd = member.password && member.password.trim().length >= 6 ? member.password.trim() : 'Welcome@123';

  // 1. First try creating via standard Supabase Auth using a standalone client instance
  // This avoids altering or logging out the current Owner/Admin session
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const tempClient = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: authData, error: authError } = await tempClient.auth.signUp({
      email: member.email,
      password: pwd,
      options: {
        data: {
          name: member.name,
          role: member.role,
          phone: member.phone || null,
        },
      },
    });

    if (authError) throw authError;

    // If trigger already populated profiles, update it to ensure role & name match
    if (authData.user) {
      await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          name: member.name,
          email: member.email,
          role: member.role,
          phone: member.phone || null,
        });
    }

    return authData.user;
  } catch (err: any) {
    console.error('Error creating team member:', err);
    throw new Error(err?.message || 'Failed to register team member');
  }
}

/**
 * Updates an existing team member profile (name, role, phone).
 */
export async function updateTeamMember(id: string, updates: {
  name: string;
  role: 'supervisor' | 'accountant' | 'owner';
  phone?: string;
}) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      name: updates.name.trim(),
      role: updates.role,
      phone: updates.phone?.trim() ? (updates.phone.startsWith('+91') ? updates.phone : `+91${updates.phone.replace(/\D/g, '')}`) : null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Removes a profile from the database.
 */
export async function deleteTeamMember(id: string) {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ─── Phone OTP ────────────────────────────────────────────────────────────────

/**
 * Send a 6-digit OTP to the given phone number.
 * Phone must be E.164 format, e.g. +919876543210
 */
export async function sendPhoneOTP(phone: string) {
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw error;
}

/**
 * Verify the OTP the user typed in.
 */
export async function verifyPhoneOTP(phone: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  });
  if (error) throw error;
  return data;
}

// ─── Session ──────────────────────────────────────────────────────────────────

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
