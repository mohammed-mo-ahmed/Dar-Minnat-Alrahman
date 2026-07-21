'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/shared/providers/auth-provider';
import { fetchStudent } from '@/features/students/api';
import { fetchAttendance, recordAttendance } from '@/features/attendance/api';
import { fetchFinance, recordPayment, addFinanceTransaction, deleteFinanceTransaction } from '@/features/finance/api';
import { fetchPoints, awardPoints, fetchExams, addExam, fetchRedemptions, fetchRewards, redeemReward } from '@/features/points-rewards/api';
import type { Student, Attendance, FinanceTransaction, PointTransaction, Exam, Reward, RewardRedemption } from '@/shared/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight,
  Phone,
  MessageCircle,
  Loader2,
  Plus,
  Trash2,
  Trophy,
  Wallet,
  CalendarCheck,
  BookOpen,
  Award,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  attendanceLabels,
  attendanceColors,
  financeTypeLabelsLedger,
  formatMoney,
  formatDate,
  monthKey,
  monthLabel,
} from '@/shared/lib/roles';

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile: me } = useAuth();
  const studentId = params.id as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [finance, setFinance] = useState<FinanceTransaction[]>([]);
  const [points, setPoints] = useState<PointTransaction[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(monthKey());

  const canEdit = me?.role === 'admin' || me?.role === 'sheikh';

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const s = await fetchStudent(studentId);
      setStudent(s);
      const [att, fin, pts, ex, reds, rws] = await Promise.all([
        fetchAttendance(studentId),
        fetchFinance(studentId),
        fetchPoints(studentId),
        fetchExams(studentId),
        fetchRedemptions(studentId),
        fetchRewards(),
      ]);
      setAttendance(att);
      setFinance(fin);
      setPoints(pts);
      setExams(ex);
      setRedemptions(reds);
      setRewards(rws);
    } catch (e: any) {
      toast.error('تعذّر التحميل: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) {
    return <div className="text-muted-foreground">الطالب غير موجود أو لا تملك صلاحية رؤيته.</div>;
  }

  const monthFinance = finance.filter((f) => f.month_key === selectedMonth);
  const monthTotal = monthFinance.reduce((sum, f) => sum + Number(f.amount), 0);

  function whatsappLink() {
    const phone = (student?.guardian_phone || '').replace(/[^0-9]/g, '');
    const intl = phone.startsWith('20') ? phone : phone.startsWith('0') ? '2' + phone.slice(1) : phone;
    const lastAtt = attendance[0];
    const status = lastAtt ? attendanceLabels[lastAtt.status] : '—';
    const msg = encodeURIComponent(
      `الأستاذ الفاضل، بخصوص الطالب ${student?.full_name}: الحالة اليوم ${status}، الحفظ ${lastAtt?.memorized ? 'تم' : 'لم يتم'}، الرصيد المستحق هذا الشهر ${monthTotal} جنيه. جزاكم الله خيرًا - حلقة ${student?.group?.name || ''}.`
    );
    return `https://wa.me/${intl}?text=${msg}`;
  }

  async function handleAttendance(status: any) {
    if (!student) return;
    setBusy(true);
    try {
      await recordAttendance(student.id, student.group_id, status, undefined, me?.id);
      toast.success('تم تسجيل الحضور');
      load();
    } catch (e: any) {
      toast.error('تعذّر التسجيل: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAwardPoints(points: number, reason: string, source: string) {
    if (!student) return;
    setBusy(true);
    try {
      await awardPoints(student.id, points, reason, source, me?.id);
      toast.success('تم منح النقاط');
      load();
    } catch (e: any) {
      toast.error('تعذّر المنح: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAddExam(subject: string, score: string, evaluation: string) {
    if (!student) return;
    setBusy(true);
    try {
      await addExam({
        student_id: student.id,
        subject,
        score,
        evaluation,
        created_by: me?.id,
      });
      toast.success('تم تسجيل الامتحان');
      load();
    } catch (e: any) {
      toast.error('تعذّر التسجيل: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePayment(amount: number) {
    if (!student || amount <= 0) return;
    setBusy(true);
    try {
      await recordPayment(student.id, amount, me?.id);
      toast.success('تم تسجيل الدفعة');
      load();
    } catch (e: any) {
      toast.error('تعذّر التسجيل: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRedeem(rewardId: string, cost: number) {
    if (!student) return;
    if (student.points_balance < cost) {
      toast.error('رصيد النقاط غير كافٍ');
      return;
    }
    setBusy(true);
    try {
      await redeemReward(student.id, rewardId, cost);
      toast.success('تم صرف المكافأة');
      load();
    } catch (e: any) {
      toast.error('تعذّر الصرف: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteFinance(id: string) {
    if (!confirm('حذف هذه الحركة المالية؟')) return;
    try {
      await deleteFinanceTransaction(id);
      load();
    } catch (e: any) {
      toast.error('تعذّر الحذف: ' + e.message);
    }
  }

  const initials = student.full_name.slice(0, 1);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1">
        <ArrowRight className="h-4 w-4" /> رجوع
      </Button>

      {/* Header card */}
      <Card className="overflow-hidden border-primary/20">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={student.photo_url ?? undefined} />
                <AvatarFallback className="bg-primary/15 text-primary text-xl">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">{student.full_name}</h1>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge variant="outline">{student.group?.name || 'بدون مجموعة'}</Badge>
                  <Badge variant="outline">{student.group?.section?.name || '—'}</Badge>
                  <Badge className="bg-accent/15 text-accent-foreground border-accent/30">
                    <Star className="h-3 w-3 me-1" /> {student.points_balance} نقطة
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <a href={whatsappLink()} target="_blank" rel="noreferrer">
                <Button variant="outline" className="gap-2 text-success border-success/30 hover:bg-success/10">
                  <MessageCircle className="h-4 w-4" /> واتساب
                </Button>
              </a>
              <a href={`tel:${student.guardian_phone || ''}`}>
                <Button variant="outline" className="gap-2 text-primary">
                  <Phone className="h-4 w-4" /> اتصال
                </Button>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <InfoBox label="هاتف الطالب" value={student.student_phone || '—'} />
            <InfoBox label="هاتف ولي الأمر" value={student.guardian_phone || '—'} />
            <InfoBox label="مقدار الحفظ" value={student.current_memorization || '—'} />
            <InfoBox label="التقييم" value={student.evaluation || '—'} />
            <InfoBox label="آخر حفظ" value={student.last_memorized || '—'} />
            <InfoBox label="المقرر القادم" value={student.next_assignment || '—'} />
            <InfoBox label="العنوان" value={student.address || '—'} />
            <InfoBox label="تاريخ الانضمام" value={formatDate(student.join_date)} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="attendance">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="attendance" className="gap-1.5"><CalendarCheck className="h-4 w-4" /> الحضور</TabsTrigger>
          <TabsTrigger value="finance" className="gap-1.5"><Wallet className="h-4 w-4" /> المالية</TabsTrigger>
          <TabsTrigger value="points" className="gap-1.5"><Trophy className="h-4 w-4" /> النقاط</TabsTrigger>
          <TabsTrigger value="exams" className="gap-1.5"><BookOpen className="h-4 w-4" /> الامتحانات</TabsTrigger>
          <TabsTrigger value="rewards" className="gap-1.5"><Award className="h-4 w-4" /> المكافآت</TabsTrigger>
        </TabsList>

        {/* Attendance */}
        <TabsContent value="attendance" className="space-y-4">
          {canEdit && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">تسجيل حضور اليوم</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(['present_memorized','present_not_memorized','absent_unexcused','absent_excused'] as const).map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      disabled={busy}
                      onClick={() => handleAttendance(s)}
                      className={`h-auto py-3 flex flex-col gap-1 ${attendanceColors[s]}`}
                    >
                      <span className="text-sm font-semibold">{attendanceLabels[s]}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">سجل الحضور ({attendance.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {attendance.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">لا يوجد سجل</p>
              ) : (
                <div className="space-y-2">
                  {attendance.slice(0, 20).map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border p-2.5">
                      <span className="text-sm">{formatDate(a.session_date)}</span>
                      <Badge variant="outline" className={attendanceColors[a.status]}>
                        {attendanceLabels[a.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Finance */}
        <TabsContent value="finance" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-base">كشف الحساب الشهري</CardTitle>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set(finance.map((f) => f.month_key))).map((m) => (
                      <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>
                    ))}
                    <SelectItem value={monthKey()}>{monthLabel(monthKey())}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {monthFinance.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">لا توجد حركات هذا الشهر</p>
                ) : (
                  monthFinance.map((f) => (
                    <div key={f.id} className="flex items-center justify-between rounded-lg border p-2.5">
                      <div>
                        <p className="text-sm font-medium">{financeTypeLabelsLedger[f.type]}</p>
                        <p className="text-xs text-muted-foreground">{f.description || '—'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${Number(f.amount) < 0 ? 'text-success' : 'text-destructive'}`}>
                          {Number(f.amount) < 0 ? '-' : '+'}{formatMoney(Math.abs(Number(f.amount)))}
                        </span>
                        {me?.role === 'admin' && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteFinance(f.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-center justify-between border-t pt-3 mt-3">
                <span className="font-semibold">الإجمالي المستحق</span>
                <span className={`text-lg font-bold ${monthTotal > 0 ? 'text-destructive' : 'text-success'}`}>
                  {formatMoney(Math.abs(monthTotal))}
                </span>
              </div>
            </CardContent>
          </Card>

          {canEdit && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">تسجيل دفعة / تعديل</CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentForm onSubmit={handlePayment} busy={busy} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Points */}
        <TabsContent value="points" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                رصيد النقاط
                <Badge className="bg-accent/15 text-accent-foreground border-accent/30 text-base">
                  <Trophy className="h-3.5 w-3.5 me-1" /> {student.points_balance}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {canEdit && (
                <AwardPointsForm onAward={handleAwardPoints} busy={busy} />
              )}
              <div className="space-y-2 mt-4">
                {points.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">لا يوجد سجل نقاط</p>
                ) : (
                  points.slice(0, 20).map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg border p-2.5">
                      <div>
                        <p className="text-sm">{p.reason || p.source || '—'}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(p.created_at)}</p>
                      </div>
                      <span className={`text-sm font-semibold ${p.points > 0 ? 'text-success' : 'text-destructive'}`}>
                        {p.points > 0 ? '+' : ''}{p.points}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exams */}
        <TabsContent value="exams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">سجل الامتحانات</CardTitle>
            </CardHeader>
            <CardContent>
              {canEdit && <ExamForm onAdd={handleAddExam} busy={busy} />}
              <div className="space-y-2 mt-4">
                {exams.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">لا يوجد امتحانات</p>
                ) : (
                  exams.map((ex) => (
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
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rewards */}
        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">صرف مكافأة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {rewards.length === 0 ? (
                  <p className="text-muted-foreground col-span-2 text-center py-6">لا توجد مكافآت معرفة</p>
                ) : (
                  rewards.map((r) => {
                    const canAfford = student.points_balance >= r.points_cost;
                    return (
                      <div key={r.id} className="rounded-lg border p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.points_cost} نقطة</p>
                        </div>
                        {canEdit && (
                          <Button
                            size="sm"
                            disabled={busy || !canAfford}
                            onClick={() => handleRedeem(r.id, r.points_cost)}
                          >
                            صرف
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              {redemptions.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-semibold mb-2">المكافآت المصروفة</p>
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

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  );
}

function PaymentForm({ onSubmit, busy }: { onSubmit: (amount: number) => void; busy: boolean }) {
  const [amount, setAmount] = useState('');
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(Number(amount)); setAmount(''); }}
      className="flex gap-2 items-end"
    >
      <div className="flex-1 space-y-1">
        <Label className="text-xs">تسجيل دفعة (ج.م)</Label>
        <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" />
      </div>
      <Button type="submit" disabled={busy || !amount}>تسجيل</Button>
    </form>
  );
}

function AwardPointsForm({ onAward, busy }: { onAward: (p: number, r: string, s: string) => void; busy: boolean }) {
  const [points, setPoints] = useState('1');
  const [reason, setReason] = useState('');
  const [source, setSource] = useState('question');
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onAward(Number(points), reason, source); setReason(''); }}
      className="grid grid-cols-3 gap-2 items-end"
    >
      <div className="space-y-1">
        <Label className="text-xs">النقاط</Label>
        <Input type="number" value={points} onChange={(e) => setPoints(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">السبب</Label>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="إجابة صحيحة" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">المصدر</Label>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="question">سؤال</SelectItem>
            <SelectItem value="exam">امتحان</SelectItem>
            <SelectItem value="extra_memorization">حفظ زيادة</SelectItem>
            <SelectItem value="attendance">انضباط</SelectItem>
            <SelectItem value="manual">يدوي</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={busy} className="col-span-3">منح النقاط</Button>
    </form>
  );
}

function ExamForm({ onAdd, busy }: { onAdd: (s: string, sc: string, ev: string) => void; busy: boolean }) {
  const [subject, setSubject] = useState('');
  const [score, setScore] = useState('');
  const [evaluation, setEvaluation] = useState('');
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onAdd(subject, score, evaluation); setSubject(''); setScore(''); setEvaluation(''); }}
      className="grid grid-cols-3 gap-2 items-end"
    >
      <div className="space-y-1">
        <Label className="text-xs">المقرر</Label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="جزء عم" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">الدرجة</Label>
        <Input value={score} onChange={(e) => setScore(e.target.value)} placeholder="9/10" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">التقييم</Label>
        <Input value={evaluation} onChange={(e) => setEvaluation(e.target.value)} placeholder="ممتاز" />
      </div>
      <Button type="submit" disabled={busy} className="col-span-3">تسجيل الامتحان</Button>
    </form>
  );
}
