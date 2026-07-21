'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/shared/providers/auth-provider';
import { fetchStudents, fetchStudentsForSheikh } from '@/features/students/api';
import { fetchGroupLeaderboard } from '@/features/points-rewards/api';
import type { Student } from '@/shared/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Trophy, Star, Medal } from 'lucide-react';
import { toast } from 'sonner';

export default function PointsPage() {
  const { profile: me } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
