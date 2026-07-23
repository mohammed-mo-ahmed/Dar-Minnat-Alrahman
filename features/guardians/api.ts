'use client';

import { supabase } from '@/lib/supabase/client';
import type { GuardianRequest, GuardianLink } from '@/shared/types';

export async function fetchGuardianRequests(): Promise<GuardianRequest[]> {
  const { data, error } = await supabase()
    .from('guardian_requests')
    .select('*, guardian:profiles(id, display_name, phone, email)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as GuardianRequest[]) ?? [];
}

export async function fetchMyGuardianRequests(guardianId: string): Promise<GuardianRequest[]> {
  const { data, error } = await supabase()
    .from('guardian_requests')
    .select('*')
    .eq('guardian_id', guardianId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as GuardianRequest[]) ?? [];
}

export async function submitGuardianRequest(guardianId: string, studentNameText: string, extraInfo?: string): Promise<void> {
  const { error } = await supabase().from('guardian_requests').insert({
    guardian_id: guardianId,
    student_name_text: studentNameText,
    extra_info: extraInfo || null,
  });
  if (error) throw error;
}

export async function approveGuardianRequest(requestId: string, studentId: string, adminId: string): Promise<void> {
  // 1. Update request
  const { error: rErr } = await supabase()
    .from('guardian_requests')
    .update({
      status: 'approved',
      resolved_student_id: studentId,
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', requestId);
  if (rErr) throw rErr;

  // 2. Fetch the guardian_id from the request
  const { data: req } = await supabase()
    .from('guardian_requests')
    .select('guardian_id')
    .eq('id', requestId)
    .maybeSingle();
  if (!req) throw new Error('الطلب غير موجود');

  // 3. Create guardian_link (upsert)
  const { error: lErr } = await supabase()
    .from('guardian_links')
    .upsert(
      { guardian_id: req.guardian_id, student_id: studentId, status: 'approved' },
      { onConflict: 'guardian_id,student_id' }
    );
  if (lErr) throw lErr;
}

export async function rejectGuardianRequest(requestId: string, adminNote: string, adminId: string): Promise<void> {
  const { error } = await supabase()
    .from('guardian_requests')
    .update({
      status: 'rejected',
      admin_note: adminNote || null,
      resolved_by: adminId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', requestId);
  if (error) throw error;
}

export async function fetchGuardianLinks(guardianId: string): Promise<GuardianLink[]> {
  const { data, error } = await supabase()
    .from('guardian_links')
    .select('*, student:students(id, full_name)')
    .eq('guardian_id', guardianId)
    .eq('status', 'approved');
  if (error) throw error;
  return (data as GuardianLink[]) ?? [];
}
