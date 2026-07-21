'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/shared/providers/auth-provider';
import { submitGuardianRequest, fetchMyGuardianRequests } from '@/features/guardians/api';
import type { GuardianRequest } from '@/shared/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Loader2, AlertCircle, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/shared/lib/roles';

export default function GuardianRequestPage() {
  const { profile: me } = useAuth();
  const [studentName, setStudentName] = useState('');
  const [extraInfo, setExtraInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [requests, setRequests] = useState<GuardianRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (me?.id) {
      fetchMyGuardianRequests(me.id).then(setRequests).catch(() => {}).finally(() => setLoading(false));
    }
  }, [me]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentName.trim() || !me) return;
    setBusy(true);
    try {
      await submitGuardianRequest(me.id, studentName.trim(), extraInfo);
      toast.success('تم تقديم الطلب. سيتم مراجعته من إدارة المقرأة.');
      setStudentName('');
      setExtraInfo('');
      const r = await fetchMyGuardianRequests(me.id);
      setRequests(r);
    } catch (e: any) {
      toast.error('تعذّر التقديم: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserPlus className="h-6 w-6 text-primary" /> تقديم طلب ربط
        </h1>
        <p className="text-sm text-muted-foreground">
          اكتب اسم الطالب (ابنك/ابنتك) في حقل نصي. الإدارة ستراجع الطلب وتربطه بملف الطالب بعد التحقق.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">طلب جديد</CardTitle>
          <CardDescription>لا تُعرض أسماء الطلاب — اكتب الاسم بنفسك.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="studentName">اسم الطالب *</Label>
              <Input
                id="studentName"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="اكتب اسم الطالب كاملًا"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extraInfo">معلومات إضافية (اختياري)</Label>
              <Textarea
                id="extraInfo"
                value={extraInfo}
                onChange={(e) => setExtraInfo(e.target.value)}
                placeholder="مثال: المجموعة، رقم الهاتف المسجل لدى الشيخ…"
              />
            </div>
            <Button type="submit" disabled={busy || !studentName.trim()}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} تقديم الطلب
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">طلباتي السابقة</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">لم تقدّم أي طلبات بعد</p>
          ) : (
            <div className="space-y-2">
              {requests.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border p-2.5">
                  <div>
                    <p className="font-medium text-sm">{r.student_name_text}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
                    {r.admin_note && <p className="text-xs text-muted-foreground mt-1">ملاحظة: {r.admin_note}</p>}
                  </div>
                  <Badge variant="outline" className={
                    r.status === 'approved' ? 'text-success border-success/30' :
                    r.status === 'rejected' ? 'text-destructive border-destructive/30' : 'text-warning border-warning/30'
                  }>
                    {r.status === 'approved' ? <><Check className="h-3 w-3 me-1" /> مقبول</> :
                     r.status === 'rejected' ? <><X className="h-3 w-3 me-1" /> مرفوض</> :
                     <><AlertCircle className="h-3 w-3 me-1" /> معلّق</>}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
