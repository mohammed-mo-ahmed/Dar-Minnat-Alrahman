'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/shared/providers/auth-provider';
import { fetchMyStudent } from '@/features/students/api';
import { fetchAttendance } from '@/features/attendance/api';
import { fetchFinance } from '@/features/finance/api';
import { fetchPoints, fetchExams, fetchRedemptions, fetchRewards, redeemReward } from '@/features/points-rewards/api';
import type { Student, Attendance, FinanceTransaction, PointTransaction, Exam, Reward, RewardRedemption } from '@/shared/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, CalendarCheck, Wallet, Star, Trophy, Award, Loader2 } from 'lucide-react';
import { attendanceLabels, attendanceColors, financeTypeLabelsLedger, formatMoney, formatDate, monthKey, monthLabel } from '@/shared/lib/roles';
import { toast } from 'sonner';

export default function MyProgressPage() {
  const { profile: me } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [finance, setFinance] = useState<FinanceTransaction[]>([]);
  const [points, setPoints] = useState<PointTransaction[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!me) return;
    (async () => {
      try {
        const s = await fetchMyStudent(me.id);
        setStudent(s);
        if (s) {
          const [a, f, p, e, r, reds] = await Promise.all([
            fetchAttendance(s.id), fetchFinance(s.id), fetchPoints(s.id), fetchExams(s.id), fetchRewards(), fetchRedemptions(s.id),
          ]);
          setAttendance(a); setFinance(f); setPoints(p); setExams(e); setRewards(r); setRedemptions(reds);
        }
      } catch (err: any) {
        toast.error('تعذّر التحميل: ' + err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [me]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!student) return <div className="text-muted-foreground">لم يتم العثور على ملف طالب مرتبط بحسابك.</div>;

  const month = monthKey();
  const monthFinance = finance.filter((f) => f.month_key === month);
  const monthTotal = monthFinance.reduce((sum, f) => sum + Number(f.amount), 0);

  async function handleRedeem(rewardId: string, cost: number) {
    if (!student) return;
    if (student.points_balance < cost) { toast.error('رصيدك غير كافٍ'); return; }
    setBusy(true);
    try {
      await redeemReward(student.id, rewardId, cost);
      toast.success('تم استبدال المكافأة');
      // refresh
      const s = await fetchMyStudent(me!.id);
      setStudent(s);
      if (s) {
        setPoints(await fetchPoints(s.id));
        setRedemptions(await fetchRedemptions(s.id));
      }
    } catch (e: any) {
      toast.error('تعذّر الاستبدال: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" /> تقدمي
        </h1>
        <p className="text-sm text-muted-foreground">متابعة حفظك وحضورك ونقاطك وحالتك المالية</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Star} label="رصيد النقاط" value={`${student.points_balance}`} color="accent" />
        <StatCard icon={CalendarCheck} label="عدد سجلّات الحضور" value={`${attendance.length}`} color="primary" />
        <StatCard icon={Wallet} label="مستحق الشهر" value={formatMoney(Math.abs(monthTotal))} color={monthTotal > 0 ? 'destructive' : 'success'} />
        <StatCard icon={Trophy} label="المجموعة" value={student.group?.name || '—'} color="primary" />
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          <TabsTrigger value="rewards" className="gap-1.5"><Award className="h-4 w-4" /> المكافآت</TabsTrigger>
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

        <TabsContent value="rewards">
          <Card>
            <CardHeader><CardTitle className="text-base">استبدال المكافآت</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {rewards.map((r) => {
                  const canAfford = student.points_balance >= r.points_cost;
                  return (
                    <div key={r.id} className="rounded-lg border p-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.points_cost} نقطة</p>
                      </div>
                      <Button size="sm" disabled={busy || !canAfford} onClick={() => handleRedeem(r.id, r.points_cost)}>
                        استبدال
                      </Button>
                    </div>
                  );
                })}
              </div>
              {redemptions.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold mb-2">مكافآتي</p>
                  <div className="space-y-2">
                    {redemptions.map((rd) => (
                      <div key={rd.id} className="flex items-center justify-between rounded-lg border p-2.5">
                        <span className="text-sm">{rd.reward?.name || '—'}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(rd.redeemed_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent/15 text-accent-foreground',
    destructive: 'bg-destructive/10 text-destructive',
    success: 'bg-success/10 text-success',
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
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
