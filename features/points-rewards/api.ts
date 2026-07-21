'use client';

import { supabase } from '@/lib/supabase/client';
import type { PointTransaction, Exam, Reward, RewardRedemption } from '@/shared/types';

export async function fetchPoints(studentId: string): Promise<PointTransaction[]> {
  const { data, error } = await supabase
    .from('point_transactions')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as PointTransaction[]) ?? [];
}

export async function awardPoints(
  studentId: string,
  points: number,
  reason: string,
  source: string,
  createdBy?: string
): Promise<void> {
  const { error } = await supabase.from('point_transactions').insert({
    student_id: studentId,
    points,
    reason,
    source,
    created_by: createdBy || null,
  });
  if (error) throw error;
  // Update balance
  const { data: student } = await supabase
    .from('students')
    .select('points_balance')
    .eq('id', studentId)
    .maybeSingle();
  if (student) {
    await supabase
      .from('students')
      .update({ points_balance: (student.points_balance || 0) + points, updated_at: new Date().toISOString() })
      .eq('id', studentId);
  }
}

export async function fetchExams(studentId: string): Promise<Exam[]> {
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('student_id', studentId)
    .order('exam_date', { ascending: false });
  if (error) throw error;
  return (data as Exam[]) ?? [];
}

export async function addExam(payload: Partial<Exam>): Promise<void> {
  const { error } = await supabase.from('exams').insert(payload);
  if (error) throw error;
}

export async function deleteExam(id: string): Promise<void> {
  const { error } = await supabase.from('exams').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchRewards(): Promise<Reward[]> {
  const { data, error } = await supabase.from('rewards').select('*').order('points_cost');
  if (error) throw error;
  return (data as Reward[]) ?? [];
}

export async function createReward(name: string, description: string, pointsCost: number): Promise<void> {
  const { error } = await supabase.from('rewards').insert({ name, description, points_cost: pointsCost });
  if (error) throw error;
}

export async function deleteReward(id: string): Promise<void> {
  const { error } = await supabase.from('rewards').delete().eq('id', id);
  if (error) throw error;
}

export async function redeemReward(studentId: string, rewardId: string, pointsCost: number): Promise<void> {
  // Insert redemption and deduct points
  const { error: rErr } = await supabase.from('reward_redemptions').insert({
    student_id: studentId,
    reward_id: rewardId,
  });
  if (rErr) throw rErr;
  await awardPoints(studentId, -pointsCost, 'استبدال مكافأة', 'reward');
}

export async function fetchRedemptions(studentId: string): Promise<RewardRedemption[]> {
  const { data, error } = await supabase
    .from('reward_redemptions')
    .select('*, reward:rewards(*)')
    .eq('student_id', studentId)
    .order('redeemed_at', { ascending: false });
  if (error) throw error;
  return (data as RewardRedemption[]) ?? [];
}

export async function fetchGroupLeaderboard(groupId: string): Promise<{ student_id: string; full_name: string; points_balance: number; photo_url: string | null }[]> {
  const { data, error } = await supabase
    .from('students')
    .select('id, full_name, points_balance, photo_url')
    .eq('group_id', groupId)
    .order('points_balance', { ascending: false });
  if (error) throw error;
  return ((data || []).map((s: any) => ({
    student_id: s.id,
    full_name: s.full_name,
    points_balance: s.points_balance || 0,
    photo_url: s.photo_url,
  })));
}
