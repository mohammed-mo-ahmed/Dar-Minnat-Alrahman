'use client';

import { supabase } from '@/lib/supabase/client';
import type { Attendance, AttendanceStatus, FinanceTransaction } from '@/shared/types';
import { monthKey } from '@/shared/lib/roles';

export async function fetchAttendance(studentId: string): Promise<Attendance[]> {
  const { data, error } = await supabase()
    .from('attendance')
    .select('*')
    .eq('student_id', studentId)
    .order('session_date', { ascending: false });
  if (error) throw error;
  return (data as Attendance[]) ?? [];
}

export async function fetchTodayAttendance(groupId: string): Promise<Attendance[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase()
    .from('attendance')
    .select('*, student:students(id, full_name)')
    .eq('group_id', groupId)
    .eq('session_date', today);
  if (error) throw error;
  return (data as Attendance[]) ?? [];
}

export async function recordAttendance(
  studentId: string,
  groupId: string | null,
  status: AttendanceStatus,
  excuseNote?: string,
  createdBy?: string
): Promise<{ finance?: FinanceTransaction }> {
  const memorized = status === 'present_memorized';
  const { data, error } = await supabase()
    .from('attendance')
    .insert({
      student_id: studentId,
      group_id: groupId,
      session_date: new Date().toISOString().slice(0, 10),
      status,
      memorized,
      excuse_note: excuseNote || null,
      created_by: createdBy || null,
    })
    .select()
    .maybeSingle();
  if (error) throw error;

  // Auto-create finance transaction based on group finance type
  let finance: FinanceTransaction | undefined;
  if (groupId) {
    const { data: group } = await supabase().from('groups').select('*').eq('id', groupId).maybeSingle();
    if (group && group.finance_type === 'deduction') {
      let amount = 0;
      let type: FinanceTransaction['type'] | null = null;
      if (status === 'absent_unexcused') {
        amount = Number(group.deduction_amount) || 0;
        type = 'absence_deduction';
      } else if (status === 'present_not_memorized') {
        amount = Number(group.no_memorization_deduction) || 0;
        type = 'no_memorization_deduction';
      }
      if (type && amount > 0) {
        const { data: fin, error: finErr } = await supabase()
          .from('finance_transactions')
          .insert({
            student_id: studentId,
            month_key: monthKey(),
            type,
            amount,
            description: type === 'absence_deduction' ? 'خصم غياب' : 'خصم عدم حفظ',
            ref_attendance_id: data?.id || null,
            created_by: createdBy || null,
          })
          .select()
          .maybeSingle();
        if (finErr) throw finErr;
        if (fin) finance = fin as FinanceTransaction;
      }
    }
  }

  return { finance };
}

export async function updateAttendance(id: string, payload: Partial<Attendance>): Promise<void> {
  const { error } = await supabase().from('attendance').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteAttendance(id: string): Promise<void> {
  // Also delete linked finance transactions
  await supabase().from('finance_transactions').delete().eq('ref_attendance_id', id);
  const { error } = await supabase().from('attendance').delete().eq('id', id);
  if (error) throw error;
}
