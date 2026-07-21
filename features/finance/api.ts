'use client';

import { supabase } from '@/lib/supabase/client';
import type { FinanceTransaction } from '@/shared/types';
import { monthKey } from '@/shared/lib/roles';

export async function fetchFinance(studentId: string, month?: string): Promise<FinanceTransaction[]> {
  let q = supabase.from('finance_transactions').select('*').eq('student_id', studentId);
  if (month) q = q.eq('month_key', month);
  const { data, error } = await q.order('created_at', { ascending: false });
  if (error) throw error;
  return (data as FinanceTransaction[]) ?? [];
}

export async function fetchFinanceByMonth(studentId: string, month: string): Promise<FinanceTransaction[]> {
  const { data, error } = await supabase
    .from('finance_transactions')
    .select('*')
    .eq('student_id', studentId)
    .eq('month_key', month)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as FinanceTransaction[]) ?? [];
}

export async function addFinanceTransaction(payload: Partial<FinanceTransaction>): Promise<void> {
  const { error } = await supabase.from('finance_transactions').insert({
    ...payload,
    month_key: payload.month_key || monthKey(),
  });
  if (error) throw error;
}

export async function deleteFinanceTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('finance_transactions').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchFinanceForStudents(studentIds: string[], month: string): Promise<FinanceTransaction[]> {
  if (studentIds.length === 0) return [];
  const { data, error } = await supabase
    .from('finance_transactions')
    .select('*')
    .in('student_id', studentIds)
    .eq('month_key', month)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as FinanceTransaction[]) ?? [];
}

export async function recordMonthlySubscription(studentId: string, amount: number, createdBy?: string): Promise<void> {
  const { error } = await supabase.from('finance_transactions').insert({
    student_id: studentId,
    month_key: monthKey(),
    type: 'subscription',
    amount,
    description: 'اشتراك شهري',
    created_by: createdBy || null,
  });
  if (error) throw error;
}

export async function recordPayment(studentId: string, amount: number, createdBy?: string): Promise<void> {
  const { error } = await supabase.from('finance_transactions').insert({
    student_id: studentId,
    month_key: monthKey(),
    type: 'payment',
    amount: -Math.abs(amount),
    description: 'دفعة',
    created_by: createdBy || null,
  });
  if (error) throw error;
}
