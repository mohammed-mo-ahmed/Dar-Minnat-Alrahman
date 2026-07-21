'use client';

import { supabase } from '@/lib/supabase/client';
import type { Activity, ActivityParticipant, Student } from '@/shared/types';
import { monthKey } from '@/shared/lib/roles';

export async function fetchActivities(): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .order('activity_date', { ascending: false });
  if (error) throw error;
  return (data as Activity[]) ?? [];
}

export async function fetchActivity(id: string): Promise<Activity | null> {
  const { data, error } = await supabase.from('activities').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Activity | null;
}

export async function createActivity(payload: Partial<Activity>): Promise<Activity> {
  const { data, error } = await supabase.from('activities').insert(payload).select().maybeSingle();
  if (error) throw error;
  return data as Activity;
}

export async function deleteActivity(id: string): Promise<void> {
  const { error } = await supabase.from('activities').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchParticipants(activityId: string): Promise<ActivityParticipant[]> {
  const { data, error } = await supabase
    .from('activity_participants')
    .select('*, student:students(id, full_name)')
    .eq('activity_id', activityId);
  if (error) throw error;
  return (data as ActivityParticipant[]) ?? [];
}

export async function addParticipant(activityId: string, studentId: string, amount: number, createdBy?: string): Promise<void> {
  const { data: activity } = await supabase.from('activities').select('*').eq('id', activityId).maybeSingle();
  const { error } = await supabase.from('activity_participants').insert({
    activity_id: activityId,
    student_id: studentId,
    amount,
  });
  if (error) throw error;
  // Record finance transaction for this student (activity fee)
  if (activity && amount > 0) {
    await supabase.from('finance_transactions').insert({
      student_id: studentId,
      month_key: monthKey(),
      type: 'activity_fee',
      amount,
      description: `رسوم نشاط: ${activity.title}`,
      ref_activity_id: activityId,
      created_by: createdBy || null,
    });
  }
}

export async function removeParticipant(activityId: string, studentId: string): Promise<void> {
  // Remove linked finance transaction
  await supabase.from('finance_transactions').delete().eq('ref_activity_id', activityId).eq('student_id', studentId);
  const { error } = await supabase
    .from('activity_participants')
    .delete()
    .eq('activity_id', activityId)
    .eq('student_id', studentId);
  if (error) throw error;
}

export async function togglePaid(activityId: string, studentId: string, paid: boolean): Promise<void> {
  const { error } = await supabase
    .from('activity_participants')
    .update({ paid })
    .eq('activity_id', activityId)
    .eq('student_id', studentId);
  if (error) throw error;
}
