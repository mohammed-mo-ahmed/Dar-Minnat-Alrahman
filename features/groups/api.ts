'use client';

import { supabase } from '@/lib/supabase/client';
import type { Group, Section } from '@/shared/types';

export async function fetchSections(): Promise<Section[]> {
  const { data, error } = await supabase.from('sections').select('*').order('name');
  if (error) throw error;
  return (data as Section[]) ?? [];
}

export async function fetchGroups(): Promise<Group[]> {
  const { data, error } = await supabase
    .from('groups')
    .select('*, section:sections(*), supervisor:profiles(id, display_name, phone)')
    .order('name');
  if (error) throw error;
  return (data as Group[]) ?? [];
}

export async function fetchProfilesForSupervisors(): Promise<{ id: string; display_name: string | null; phone: string | null; role: string }[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, phone, role')
    .in('role', ['sheikh', 'admin'])
    .order('display_name');
  if (error) throw error;
  return data ?? [];
}

export async function createGroup(payload: {
  section_id: string;
  name: string;
  supervisor_id?: string | null;
  finance_type: Group['finance_type'];
  fee_mode: Group['fee_mode'];
  monthly_fee: number;
  deduction_amount: number;
  no_memorization_deduction: number;
}) {
  const { data, error } = await supabase.from('groups').insert(payload).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateGroup(id: string, payload: Partial<Group>) {
  const { error } = await supabase.from('groups').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteGroup(id: string) {
  const { error } = await supabase.from('groups').delete().eq('id', id);
  if (error) throw error;
}

export async function createSection(name: string, gender: 'male' | 'female') {
  const { data, error } = await supabase
    .from('sections')
    .insert({ name, gender })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}
