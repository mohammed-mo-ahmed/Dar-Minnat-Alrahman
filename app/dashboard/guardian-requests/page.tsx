'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/shared/providers/auth-provider';
import { fetchGuardianRequests, approveGuardianRequest, rejectGuardianRequest } from '@/features/guardians/api';
import { fetchStudents } from '@/features/students/api';
import type { GuardianRequest, Student } from '@/shared/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClipboardList, Loader2, Check, X, Search } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/shared/lib/roles';

export default function GuardianRequestsPage() {
  const { profile: me } = useAuth();
  const [requests, setRequests] = useState<GuardianRequest[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveTarget, setApproveTarget] = useState<GuardianRequest | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [rejectTarget, setRejectTarget] = useState<GuardianRequest | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([fetchGuardianRequests(), fetchStudents()]);
      setRequests(r);
      setStudents(s);
    } catch (e: any) {
      toast.error('تعذّر التحميل: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (me?.role === 'admin') load();
  }, [me, load]);

  if (me?.role !== 'admin') {
    return <div className="text-muted-foreground">هذه الصفحة متاحة لمدير النظام فقط.</div>;
  }

  const pending = requests.filter((r) => r.status === 'pending');
  const resolved = requests.filter((r) => r.status !== 'pending');

  // Match students by name (free-text search) — admin verifies manually
  const matchedStudents = studentSearch
    ? students.filter((s) => s.full_name.includes(studentSearch))
    : students;

  async function handleApprove() {
    if (!approveTarget || !selectedStudentId) return;
    setBusy(true);
    try {
      await approveGuardianRequest(approveTarget.id, selectedStudentId, me!.id);
      toast.success('تمت الموافقة وربط الحساب بالطالب');
      setApproveTarget(null);
      setSelectedStudentId('');
      setStudentSearch('');
      load();
    } catch (e: any) {
      toast.error('تعذّر الموافقة: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!rejectTarget) return;
    setBusy(true);
    try {
      await rejectGuardianRequest(rejectTarget.id, rejectNote, me!.id);
      toast.success('تم رفض الطلب');
      setRejectTarget(null);
      setRejectNote('');
      load();
    } catch (e: any) {
      toast.error('تعذّر الرفض: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" /> طلبات أولياء الأمور
        </h1>
        <p className="text-sm text-muted-foreground">
          راجع الطلبات وقارن الاسم المكتوب ببيانات الطلاب، ثم وافق أو ارفض. ملاحظة: لو في أكتر من طالب بنفس الاسم، تأكد من مطابقة رقم الهاتف.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">الطلبات المعلّقة ({pending.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {pending.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">لا توجد طلبات معلّقة</p>
              ) : (
                <div className="space-y-3">
                  {pending.map((r) => (
                    <div key={r.id} className="rounded-lg border p-3">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p className="font-semibold">{r.student_name_text}</p>
                          <p className="text-xs text-muted-foreground">
                            مقدّم من: {r.guardian?.display_name || 'بدون اسم'} — {r.guardian?.phone || r.guardian?.email || '—'}
                          </p>
                          {r.extra_info && <p className="text-sm text-muted-foreground mt-1">{r.extra_info}</p>}
                          <p className="text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => { setApproveTarget(r); setStudentSearch(r.student_name_text); setSelectedStudentId(''); }}>
                            <Check className="h-4 w-4" /> موافقة
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setRejectTarget(r)}>
                            <X className="h-4 w-4" /> رفض
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {resolved.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">الطلبات السابقة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {resolved.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                      <div>
                        <span className="font-medium">{r.student_name_text}</span>
                        <span className="text-muted-foreground text-xs"> — {r.guardian?.display_name || '—'}</span>
                      </div>
                      <Badge variant="outline" className={r.status === 'approved' ? 'text-success border-success/30' : 'text-destructive border-destructive/30'}>
                        {r.status === 'approved' ? 'تمت الموافقة' : 'مرفوض'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Approve dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(o) => !o && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>الموافقة على الطلب</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/40 p-3 text-sm">
              <p>الاسم المكتوب: <span className="font-semibold">{approveTarget?.student_name_text}</span></p>
              <p className="text-muted-foreground text-xs mt-1">ولي الأمر: {approveTarget?.guardian?.display_name || '—'}</p>
            </div>
            <div className="space-y-2">
              <Label>ابحث عن الطالب المطابق</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} className="ps-9" placeholder="اكتب اسم الطالب" />
              </div>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger><SelectValue placeholder="اختر الطالب المطابق" /></SelectTrigger>
                <SelectContent>
                  {matchedStudents.slice(0, 20).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name} — {s.group?.name || '—'} — {s.guardian_phone || 'بدون رقم'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                تأكد من مطابقة رقم هاتف ولي الأمر قبل الموافقة، خصوصًا لو في أكتر من طالب بنفس الاسم.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>إلغاء</Button>
            <Button onClick={handleApprove} disabled={busy || !selectedStudentId}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} تأكيد الموافقة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض الطلب</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>سبب الرفض (اختياري)</Label>
            <Input value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="مثال: لم يتم العثور على طالب مطابق" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleReject} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
