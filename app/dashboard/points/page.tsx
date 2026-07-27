'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/shared/providers/auth-provider';
import { fetchStudents, fetchStudentsForSheikh } from '@/features/students/api';
import { fetchGroupLeaderboard } from '@/features/points-rewards/api';
import type { Student } from '@/shared/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Plus, Trophy, Star } from 'lucide-react';
import { toast } from 'sonner';
import { awardPoints } from '@/features/points-rewards/api';

export default function PointsPage() {
  const { profile: me } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [awardStudent, setAwardStudent] = useState<Student | null>(null);
  const [awardPointsVal, setAwardPointsVal] = useState('');
  const [awardReason, setAwardReason] = useState('');
  const [awarding, setAwarding] = useState(false);

  const load = useCallback(async () => {
    if (!me) return;
    setLoading(true);
    try {
      const sts = me.role === 'sheikh' ? await fetchStudentsForSheikh(me.id) : await fetchStudents();
      setStudents(sts);
    } catch (e: any) {
      toast.error('تعذّر التحميل: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [me]);

  useEffect(() => {
    if (me?.role === 'admin' || me?.role === 'sheikh') load();
  }, [me, load]);

  if (me?.role !== 'admin' && me?.role !== 'sheikh') {
    return <div className="text-muted-foreground">هذه الصفحة متاحة للمدير أو الشيخ فقط.</div>;
  }

  async function handleAward() {
    if (!awardStudent) return;
    const pts = parseInt(awardPointsVal, 10);
    if (isNaN(pts) || pts === 0) {
      toast.error('عدد النقاط يجب أن يكون رقمًا غير صفر');
      return;
    }
    setAwarding(true);
    try {
      await awardPoints(awardStudent.id, pts, awardReason || '', 'sheikh_reward');
      toast.success(pts > 0
        ? `تمت إضافة ${pts} نقطة لـ ${awardStudent.full_name}`
        : `تم خصم ${Math.abs(pts)} نقطة من ${awardStudent.full_name}`
      );
      setAwardStudent(null);
      setAwardPointsVal('');
      setAwardReason('');
      load();
    } catch (e: any) {
      toast.error('تعذّرت إضافة النقاط: ' + e.message);
    } finally {
      setAwarding(false);
    }
  }

  const sorted = [...students].sort((a, b) => b.points_balance - a.points_balance);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" /> النقاط والمكافآت
        </h1>
        <p className="text-sm text-muted-foreground">النقاط تراكمية بدون تصفير — شهر ورا شهر.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">لوحة الصدارة</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : sorted.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">لا يوجد طلاب</p>
          ) : (
            <div className="space-y-2">
              {sorted.slice(0, 20).map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i === 0 ? 'bg-amber-100 text-amber-700' :
                    i === 1 ? 'bg-slate-100 text-slate-600' :
                    i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'
                  }`}>
                    {i + 1}
                  </div>
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={s.photo_url ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{s.full_name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{s.full_name}</p>
                    <p className="text-xs text-muted-foreground">{s.group?.name || '—'}</p>
                  </div>
                  <Badge className="bg-accent/15 text-accent-foreground border-accent/30">
                    <Star className="h-3 w-3 me-1" /> {s.points_balance}
                  </Badge>
                  {me?.role !== 'student' && me?.role !== 'guardian' && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                      setAwardStudent(s);
                      setAwardPointsVal('');
                      setAwardReason('');
                    }}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={!!awardStudent} onOpenChange={(o) => {
        if (!o) { setAwardStudent(null); setAwardPointsVal(''); setAwardReason(''); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>منح نقاط لـ {awardStudent?.full_name}</DialogTitle>
            <DialogDescription>أدخل عدد النقاط (موجب أو سالب) والسبب</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>عدد النقاط *</Label>
              <Input
                type="number"
                value={awardPointsVal}
                onChange={(e) => setAwardPointsVal(e.target.value)}
                placeholder="مثال: 10 أو -5"
              />
            </div>
            <div className="space-y-2">
              <Label>السبب</Label>
              <Input
                value={awardReason}
                onChange={(e) => setAwardReason(e.target.value)}
                placeholder="حفظ سورة البقرة"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAwardStudent(null); setAwardPointsVal(''); setAwardReason(''); }}>
              إلغاء
            </Button>
            <Button onClick={handleAward} disabled={awarding || !awardPointsVal}>
              {awarding && <Loader2 className="h-4 w-4 animate-spin" />} تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
