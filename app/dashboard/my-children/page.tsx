'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/shared/providers/auth-provider';
import { fetchGuardianStudents } from '@/features/students/api';
import { fetchAttendance } from '@/features/attendance/api';
import { fetchFinance } from '@/features/finance/api';
import type { Student, Attendance, FinanceTransaction } from '@/shared/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { GraduationCap, Loader2, Eye, CalendarCheck, Wallet, Star } from 'lucide-react';
import { toast } from 'sonner';
import { attendanceLabels, attendanceColors, formatMoney, monthKey, monthLabel } from '@/shared/lib/roles';

export default function MyChildrenPage() {
  const { profile: me } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!me) return;
    setLoading(true);
    try {
      setStudents(await fetchGuardianStudents(me.id));
    } catch (e: any) {
      toast.error('تعذّر التحميل: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [me]);

  useEffect(() => {
    if (me?.role === 'guardian') load();
  }, [me, load]);

  if (me?.role !== 'guardian') {
    return <div className="text-muted-foreground">هذه الصفحة متاحة لولي الأمر فقط.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" /> أبنائي
        </h1>
        <p className="text-sm text-muted-foreground">متابعة بيانات أبنائك — قراءة فقط</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            لا يوجد أبناء مرتبطون بحسابك بعد. قدّم طلب ربط من صفحة «تقديم طلب ربط».
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {students.map((s) => (
            <ChildCard key={s.id} student={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChildCard({ student }: { student: Student }) {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [finance, setFinance] = useState<FinanceTransaction[]>([]);
  const month = monthKey();

  useEffect(() => {
    Promise.all([fetchAttendance(student.id), fetchFinance(student.id, month)])
      .then(([a, f]) => { setAttendance(a); setFinance(f); })
      .catch(() => {});
  }, [student.id, month]);

  const monthTotal = finance.reduce((sum, f) => sum + Number(f.amount), 0);
  const lastAtt = attendance[0];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={student.photo_url ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">{student.full_name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold">{student.full_name}</p>
            <Badge variant="outline" className="text-xs">{student.group?.name || '—'}</Badge>
          </div>
          <Link href={`/dashboard/my-children/${student.id}`}>
            <Button size="sm" variant="outline"><Eye className="h-3.5 w-3.5" /> تفاصيل</Button>
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-muted/40 p-2">
            <p className="text-xs text-muted-foreground">الحفظ</p>
            <p className="font-medium">{student.current_memorization || '—'}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-2">
            <p className="text-xs text-muted-foreground">التقييم</p>
            <p className="font-medium">{student.evaluation || '—'}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Star className="h-3 w-3" /> النقاط</p>
            <p className="font-medium">{student.points_balance}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Wallet className="h-3 w-3" /> مستحق {monthLabel(month)}</p>
            <p className={`font-medium ${monthTotal > 0 ? 'text-destructive' : 'text-success'}`}>{formatMoney(Math.abs(monthTotal))}</p>
          </div>
        </div>
        {lastAtt && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <CalendarCheck className="h-3.5 w-3.5 text-muted-foreground" />
            آخر حضور: <Badge variant="outline" className={attendanceColors[lastAtt.status]}>{attendanceLabels[lastAtt.status]}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
