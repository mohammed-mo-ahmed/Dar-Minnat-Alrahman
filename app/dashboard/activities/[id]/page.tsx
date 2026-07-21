'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/shared/providers/auth-provider';
import { fetchActivity, fetchParticipants, addParticipant, removeParticipant, togglePaid } from '@/features/activities/api';
import { fetchStudents, fetchStudentsForSheikh } from '@/features/students/api';
import type { Activity, ActivityParticipant, Student } from '@/shared/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowRight, Loader2, Plus, Trash2, Check, X, Users, MapPin, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney, formatDate } from '@/shared/lib/roles';

export default function ActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile: me } = useAuth();
  const activityId = params.id as string;

  const [activity, setActivity] = useState<Activity | null>(null);
  const [participants, setParticipants] = useState<ActivityParticipant[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [addStudentId, setAddStudentId] = useState('');

  const canManage = me?.role === 'admin' || me?.role === 'sheikh';

  const load = useCallback(async () => {
    if (!activityId) return;
    setLoading(true);
    try {
      const [a, p] = await Promise.all([fetchActivity(activityId), fetchParticipants(activityId)]);
      setActivity(a);
      setParticipants(p);
      if (me?.role === 'sheikh') setStudents(await fetchStudentsForSheikh(me.id));
      else if (me?.role === 'admin') setStudents(await fetchStudents());
    } catch (e: any) {
      toast.error('تعذّر التحميل: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [activityId, me]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!activity) return <div className="text-muted-foreground">النشاط غير موجود.</div>;

  async function handleAdd() {
    if (!addStudentId || !activity) return;
    setBusy(true);
    try {
      const amount = Number(activity.cost_per_person) || 0;
      await addParticipant(activity.id, addStudentId, amount, me?.id);
      toast.success('تمت إضافة المشارك وتسجيل الرسوم في كشف الحساب');
      setAddStudentId('');
      load();
    } catch (e: any) {
      toast.error('تعذّر الإضافة: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(studentId: string) {
    if (!activity) return;
    if (!confirm('إزالة هذا المشارك؟ سيتم حذف رسوم النشاط من كشف حسابه.')) return;
    try {
      await removeParticipant(activity.id, studentId);
      load();
    } catch (e: any) {
      toast.error('تعذّر الإزالة: ' + e.message);
    }
  }

  async function handleTogglePaid(studentId: string, paid: boolean) {
    if (!activity) return;
    try {
      await togglePaid(activity.id, studentId, paid);
      load();
    } catch (e: any) {
      toast.error('تعذّر التحديث: ' + e.message);
    }
  }

  const participantIds = new Set(participants.map((p) => p.student_id));
  const availableStudents = students.filter((s) => !participantIds.has(s.id));
  const paidCount = participants.filter((p) => p.paid).length;
  const totalAmount = participants.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1">
        <ArrowRight className="h-4 w-4" /> رجوع
      </Button>

      <Card>
        <CardContent className="py-5">
          <div className="flex items-center gap-3 mb-3">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${activity.type === 'trip' ? 'bg-blue-500/15 text-blue-600' : 'bg-green-500/15 text-green-600'}`}>
              {activity.type === 'trip' ? <MapPin className="h-6 w-6" /> : <Users className="h-6 w-6" />}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{activity.title}</h1>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline">{activity.type === 'trip' ? 'رحلة' : 'كرة قدم'}</Badge>
                <Badge variant="outline">{formatDate(activity.activity_date)}</Badge>
                {activity.location && <Badge variant="outline">{activity.location}</Badge>}
              </div>
            </div>
          </div>
          {activity.description && <p className="text-sm text-muted-foreground">{activity.description}</p>}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <p className="text-xs text-muted-foreground">المشاركون</p>
              <p className="text-lg font-bold">{participants.length}{activity.capacity ? `/${activity.capacity}` : ''}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <p className="text-xs text-muted-foreground">مدفوع</p>
              <p className="text-lg font-bold text-success">{paidCount}</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <p className="text-xs text-muted-foreground">إجمالي الرسوم</p>
              <p className="text-lg font-bold">{formatMoney(totalAmount)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">إضافة مشارك</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Select value={addStudentId} onValueChange={setAddStudentId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="اختر الطالب" /></SelectTrigger>
                <SelectContent>
                  {availableStudents.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name} — {s.group?.name || '—'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAdd} disabled={busy || !addStudentId}>
                <Plus className="h-4 w-4" /> إضافة
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              عند الإضافة تُسجّل رسوم النشاط ({formatMoney(Number(activity.cost_per_person) || 0)}) تلقائيًا في كشف حساب الطالب الشهري.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">المشاركون</CardTitle>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">لا يوجد مشاركون</p>
          ) : (
            <div className="space-y-2">
              {participants.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border p-2.5">
                  <div>
                    <p className="font-medium text-sm">{p.student?.full_name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{formatMoney(Number(p.amount))}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {p.paid ? (
                      <Badge className="bg-success/15 text-success border-success/30">
                        <Check className="h-3 w-3 me-1" /> مدفوع
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-warning border-warning/30">غير مدفوع</Badge>
                    )}
                    {canManage && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => handleTogglePaid(p.student_id, !p.paid)}>
                          {p.paid ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleRemove(p.student_id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
