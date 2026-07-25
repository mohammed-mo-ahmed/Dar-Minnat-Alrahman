'use client';

import { supabase } from '@/lib/supabase/client';
import type { Student, Group, Section } from '@/shared/types';

export async function fetchStudents(): Promise<Student[]> {
  const { data, error } = await supabase()
    .from('students')
    .select('*, group:groups(*, section:sections(*), supervisor:profiles(id, display_name, phone))')
    .order('full_name');
  if (error) throw error;
  return (data as Student[]) ?? [];
}

export async function fetchStudentsForSheikh(sheikhId: string): Promise<Student[]> {
  const { data, error } = await supabase()
    .from('students')
    .select('*, group:groups!inner(*, section:sections(*), supervisor:profiles(id, display_name, phone))')
    .eq('group.supervisor_id', sheikhId)
    .order('full_name');
  if (error) throw error;
  return (data as Student[]) ?? [];
}

export async function fetchStudent(id: string): Promise<Student | null> {
  const { data, error } = await supabase()
    .from('students')
    .select('*, group:groups(*, section:sections(*), supervisor:profiles(id, display_name, phone))')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Student | null;
}

export async function fetchMyStudent(userId: string): Promise<Student | null> {
  const { data, error } = await supabase()
    .from('students')
    .select('*, group:groups(*, section:sections(*), supervisor:profiles(id, display_name, phone))')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Student | null;
}

export async function fetchGuardianStudents(guardianId: string): Promise<Student[]> {
  const { data, error } = await supabase()
    .from('guardian_links')
    .select('student:students(*, group:groups(*, section:sections(*), supervisor:profiles(id, display_name, phone)))')
    .eq('guardian_id', guardianId)
    .eq('status', 'approved');
  if (error) throw error;
  return ((data || []).map((row: any) => row.student).filter(Boolean) as Student[]) ?? [];
}

export async function createStudent(payload: Partial<Student>): Promise<Student> {
  const { data, error } = await supabase()
    .from('students')
    .insert({
      ...payload,
      join_date: payload.join_date || new Date().toISOString().slice(0, 10),
    })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as Student;
}

export async function updateStudent(id: string, payload: Partial<Student>): Promise<void> {
  const { error } = await supabase().from('students').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase().from('students').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchGroupsForStudentAssignment(): Promise<Group[]> {
  const { data, error } = await supabase()
    .from('groups')
    .select('*, section:sections(*)')
    .order('name');
  if (error) throw error;
  return (data as Group[]) ?? [];
}

export async function fetchSections(): Promise<Section[]> {
  const { data, error } = await supabase().from('sections').select('*').order('name');
  if (error) throw error;
  return (data as Section[]) ?? [];
}

/** Get the section IDs for a sheikh — profile.section_id first, then fallback to groups */
export async function fetchMySectionIds(sheikhId: string): Promise<string[]> {
  const { data: profile } = await supabase()
    .from('profiles')
    .select('section_id')
    .eq('id', sheikhId)
    .maybeSingle();
  if (profile?.section_id) return [profile.section_id];

  const { data, error } = await supabase()
    .from('groups')
    .select('section_id')
    .eq('supervisor_id', sheikhId)
    .not('section_id', 'is', null);
  if (error) throw error;
  return [...new Set((data ?? []).map((g: any) => g.section_id))];
}

/** Get all groups supervised by a sheikh */
export async function fetchMyGroups(sheikhId: string): Promise<Group[]> {
  const { data, error } = await supabase()
    .from('groups')
    .select('*, section:sections(*)')
    .eq('supervisor_id', sheikhId)
    .order('name');
  if (error) throw error;
  return (data as Group[]) ?? [];
}

/** Get all students in given sections (with full group info) */
export async function fetchStudentsBySection(sectionIds: string[]): Promise<Student[]> {
  if (sectionIds.length === 0) return [];
  const { data, error } = await supabase()
    .from('students')
    .select('*, group:groups(*, section:sections(*), supervisor:profiles(id, display_name, phone))')
    .in('section_id', sectionIds)
    .order('full_name');
  if (error) throw error;
  return (data as Student[]) ?? [];
}
