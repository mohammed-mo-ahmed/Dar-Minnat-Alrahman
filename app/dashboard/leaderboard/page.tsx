'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/shared/providers/auth-provider';
import { fetchMyStudent } from '@/features/students/api';
import { fetchGroupLeaderboard } from '@/features/points-rewards/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Loader2, Medal, Star } from 'lucide-react';
import { toast } from 'sonner';

type Row = { student_id: string; full_name: string; points_balance: number; photo_url: string | null };

export default function LeaderboardPage() {
  const { profile: me } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [myStudentId, setMyStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    (async () => {
      try {
        const s = await fetchMyStudent(me.id);
        setMyStudentId(s?.id || null);
        if (s?.group_id) {
          setRows(await fetchGroupLeaderboard(s.group_id));
        }
      } catch (e: any) {
        toast.error('تعذّر التحميل: ' + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [me]);

  if (me?.role !== 'student') {
    return <div className="text-muted-foreground">هذه الصفحة متاحة للطلاب فقط.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" /> لوحة الصدارة
        </h1>
        <p className="text-sm text-muted-foreground">ترتيب طلاب مجموعتك حسب النقاط — النقاط تراكمية بدون تصفير.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">لا يوجد ترتيب متاح</CardContent></Card>
      ) : (
        <>
          {/* Top 3 podium */}
          {rows.length >= 3 && (
            <div className="grid grid-cols-3 gap-3">
              {[1, 0, 2].map((idx) => {
                const r = rows[idx];
                if (!r) return <div key={idx} />;
                const place = idx + 1;
                const heights = ['h-28', 'h-36', 'h-24'];
                const colors = ['from-slate-300 to-slate-400 text-slate-700', 'from-amber-300 to-amber-500 text-amber-700', 'from-orange-300 to-orange-500 text-orange-700'];
                return (
                  <div key={r.student_id} className="flex flex-col items-center justify-end">
                    <Avatar className="h-14 w-14 mb-2 border-2 border-primary/20">
                      <AvatarImage src={r.photo_url ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">{r.full_name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <p className="font-semibold text-sm text-center truncate w-full">{r.full_name}</p>
                    <Badge className="bg-accent/15 text-accent-foreground border-accent/30 mt-1 mb-2">
                      <Star className="h-3 w-3 me-1" /> {r.points_balance}
                    </Badge>
                    <div className={`w-full ${heights[idx]} rounded-t-lg bg-gradient-to-b ${colors[idx]} flex items-center justify-center text-2xl font-bold`}>
                      {place}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">الترتيب الكامل</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {rows.map((r, i) => {
                  const isMe = r.student_id === myStudentId;
                  return (
                    <div key={r.student_id} className={`flex items-center gap-3 rounded-lg border p-3 ${isMe ? 'border-primary bg-primary/5' : ''}`}>
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        i === 0 ? 'bg-amber-100 text-amber-700' :
                        i === 1 ? 'bg-slate-100 text-slate-600' :
                        i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'
                      }`}>
                        {i < 3 ? <Medal className="h-4 w-4" /> : i + 1}
                      </div>
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={r.photo_url ?? undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">{r.full_name.slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {r.full_name}
                          {isMe && <span className="text-primary text-xs me-2"> (أنت)</span>}
                        </p>
                      </div>
                      <Badge className="bg-accent/15 text-accent-foreground border-accent/30">
                        <Star className="h-3 w-3 me-1" /> {r.points_balance}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
