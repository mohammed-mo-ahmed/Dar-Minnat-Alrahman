'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/shared/providers/auth-provider';
import { fetchStudent } from '@/features/students/api';
import { fetchAttendance } from '@/features/attendance/api';
import { fetchFinance } from '@/features/finance/api';
import { fetchPoints, fetchExams } from '@/features/points-rewards/api';
import type { Student, Attendance, FinanceTransaction, PointTransaction, Exam } from '@/shared/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, Loader2, CalendarCheck, Wallet, Star, BookOpen } from 'lucide-react';
import { attendanceLabels, attendanceColors, financeTypeLabelsLedger, formatMoney, formatDate, monthKey, monthLabel } from '@/shared/lib/roles';
import { toast } from 'sonner';

export default function ChildDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile: me } = useAuth();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [finance, setFinance] = useState<FinanceTransaction[]>([]);
  const [points, setPoints] = useState<PointTransaction[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    (async () => {
      try {
        const s = await fetchStudent(studentId);
        setStudent(s);
        const [a, f, p, e] = await Promise.all([
          fetchAttendance(studentId),
          fetchFinance(studentId),
          fetchPoints(studentId),
          fetchExams(studentId),
        ]);
        setAttendance(a); setFinance(f); setPoints(p); setExams(e);
      } catch (err: any) {
        toast.error('تعذّر التحميل: ' + err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!student) return <div className="text-muted-foreground">الطالب غير موجود أو لا تملك صلاحية رؤيته.</div>;

  const month = monthKey();
  const monthFinance = finance.filter((f) => f.month_key === month);
  const monthTotal = monthFinance.reduce((sum, f) => sum + Number(f.amount), 0);

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
        <ArrowRight className="h-4 w-4" /> رجوع
      </button>

      <Card>
        <CardContent className="py-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/20">
              <AvatarImage src={student.photo_url ?? undefined} />
              <AvatarFallback className="bg-primary/15 text-primary text-xl">{student.full_name.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{student.full_name}</h1>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline">{student.group?.name || '—'}</Badge>
                <Badge className="bg-accent/15 text-accent-foreground border-accent/30">
                  <Star className="h-3 w-3 me-1" /> {student.points_balance} نقطة
                </Badge>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <Box label="مقدار الحفظ" value={student.current_memorization || '—'} />
            <Box label="آخر حفظ" value={student.last_memorized || '—'} />
            <Box label="المقرر القادم" value={student.next_assignment || '—'} />
            <Box label="التقييم" value={student.evaluation || '—'} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="attendance">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="attendance" className="gap-1.5"><CalendarCheck className="h-4 w-4" /> الحضور</TabsTrigger>
          <TabsTrigger value="finance" className="gap-1.5"><Wallet className="h-4 w-4" /> المالية</TabsTrigger>
          <TabsTrigger value="points" className="gap-1.5"><Star className="h-4 w-4" /> النقاط</TabsTrigger>
          <TabsTrigger value="exams" className="gap-1.5"><BookOpen className="h-4 w-4" /> الامتحانات</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance">
          <Card>
            <CardHeader><CardTitle className="text-base">سجل الحضور</CardTitle></CardHeader>
            <CardContent>
              {attendance.length === 0 ? <p className="text-center text-muted-foreground py-6">لا يوجد سجل</p> : (
                <div className="space-y-2">
                  {attendance.slice(0, 20).map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border p-2.5">
                      <span className="text-sm">{formatDate(a.session_date)}</span>
                      <Badge variant="outline" className={attendanceColors[a.status]}>{attendanceLabels[a.status]}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance">
          <Card>
            <CardHeader><CardTitle className="text-base">كشف الحساب — {monthLabel(month)}</CardTitle></CardHeader>
            <CardContent>
              {monthFinance.length === 0 ? <p className="text-center text-muted-foreground py-6">لا توجد حركات</p> : (
                <div className="space-y-2">
                  {monthFinance.map((f) => (
                    <div key={f.id} className="flex items-center justify-between rounded-lg border p-2.5">
                      <span className="text-sm">{financeTypeLabelsLedger[f.type]}</span>
                      <span className={`text-sm font-semibold ${Number(f.amount) < 0 ? 'text-success' : 'text-destructive'}`}>
                        {Number(f.amount) < 0 ? '-' : '+'}{formatMoney(Math.abs(Number(f.amount)))}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="font-semibold">الإجمالي المستحق</span>
                    <span className={`font-bold ${monthTotal > 0 ? 'text-destructive' : 'text-success'}`}>{formatMoney(Math.abs(monthTotal))}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="points">
          <Card>
            <CardHeader><CardTitle className="text-base">سجل النقاط</CardTitle></CardHeader>
            <CardContent>
              {points.length === 0 ? <p className="text-center text-muted-foreground py-6">لا يوجد سجل</p> : (
                <div className="space-y-2">
                  {points.slice(0, 20).map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg border p-2.5">
                      <div>
                        <p className="text-sm">{p.reason || p.source || '—'}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(p.created_at)}</p>
                      </div>
                      <span className={`text-sm font-semibold ${p.points > 0 ? 'text-success' : 'text-destructive'}`}>
                        {p.points > 0 ? '+' : ''}{p.points}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exams">
          <Card>
            <CardHeader><CardTitle className="text-base">سجل الامتحانات</CardTitle></CardHeader>
            <CardContent>
              {exams.length === 0 ? <p className="text-center text-muted-foreground py-6">لا يوجد امتحانات</p> : (
                <div className="space-y-2">
                  {exams.map((ex) => (
                    <div key={ex.id} className="flex items-center justify-between rounded-lg border p-2.5">
                      <div>
                        <p className="text-sm font-medium">{ex.subject || 'امتحان'}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(ex.exam_date)}</p>
                      </div>
                      <div className="text-end">
                        <p className="text-sm font-semibold">{ex.score || '—'}</p>
                        {ex.evaluation && <p className="text-xs text-muted-foreground">{ex.evaluation}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  );
}
