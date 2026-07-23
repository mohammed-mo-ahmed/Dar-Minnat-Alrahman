'use client';

import { supabase } from '@/lib/supabase/client';
import type { Profile, Group, Section } from '@/shared/types';

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase()
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Profile[]) ?? [];
}

export async function fetchSections(): Promise<Section[]> {
  const { data, error } = await supabase().from('sections').select('*').order('name');
  if (error) throw error;
  return (data as Section[]) ?? [];
}

export async function fetchGroups(): Promise<Group[]> {
  const { data, error } = await supabase()
    .from('groups')
    .select('*, section:sections(*), supervisor:profiles(id, display_name, phone)')
    .order('name');
  if (error) throw error;
  return (data as Group[]) ?? [];
}

export async function updateProfileRole(profileId: string, role: Profile['role']) {
  const { error } = await supabase().from('profiles').update({ role }).eq('id', profileId);
  if (error) throw error;
}

export async function adminResetPassword(userId: string, newPassword: string) {
  const { data: { session } } = await supabase().auth.getSession();
  const res = await fetch('/api/admin-reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token || ''}`,
    },
    body: JSON.stringify({ userId, newPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'تعذّر إعادة تعيين كلمة المرور');
  }
  return res.json();
}
