'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/shared/providers/auth-provider';
import { fetchGroups } from '@/features/groups/api';
import { fetchStudentsForSheikh, fetchStudents } from '@/features/students/api';
import { fetchTodayAttendance, recordAttendance } from '@/features/attendance/api';
import type { Group, Student, Attendance, AttendanceStatus } from '@/shared/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CalendarCheck, Check, X, AlertCircle, BookX } from 'lucide-react';
import { toast } from 'sonner';
import { attendanceLabels, attendanceColors } from '@/shared/lib/roles';

export default function AttendancePage() {
  const { profile: me } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [todayAtt, setTodayAtt] = useState<Record<string, Attendance>>({});
  const [selectedGroup, setSelectedGroup] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!me) return;
    setLoading(true);
    try {
      let gs: Group[] = [];
      let sts: Student[] = [];
      if (me.role === 'sheikh') {
        gs = await fetchGroups();
        gs = gs.filter((g) => g.supervisor_id === me.id);
        sts = await fetchStudentsForSheikh(me.id);
      } else if (me.role === 'admin') {
        gs = await fetchGroups();
        sts = await fetchStudents();
      }
      setGroups(gs);
      setStudents(sts);
      if (gs[0]) setSelectedGroup(gs[0].id);
    } catch (e: any) {
      toast.error('تعذّر التحميل: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [me]);

  useEffect(() => {
    if (me?.role === 'admin' || me?.role === 'sheikh') load();
  }, [me, load]);

  useEffect(() => {
    if (!selectedGroup) return;
    fetchTodayAttendance(selectedGroup).then((rows) => {
      const map: Record<string, Attendance> = {};
      rows.forEach((r) => { if (r.student_id) map[r.student_id] = r; });
      setTodayAtt(map);
    }).catch(() => setTodayAtt({}));
  }, [selectedGroup]);

  if (me?.role !== 'admin' && me?.role !== 'sheikh') {
    return <div className="text-muted-foreground">هذه الصفحة متاحة للمدير أو الشيخ فقط.</div>;
  }

  const groupStudents = students.filter((s) => s.group_id === selectedGroup);
  const group = groups.find((g) => g.id === selectedGroup);

  async function handleRecord(studentId: string, status: AttendanceStatus) {
    setBusy((b) => ({ ...b, [studentId]: true }));
    try {
      await recordAttendance(studentId, selectedGroup, status, undefined, me?.id);
      // refresh today's attendance for this group
      const rows = await fetchTodayAttendance(selectedGroup);
      const map: Record<string, Attendance> = {};
      rows.forEach((r) => { if (r.student_id) map[r.student_id] = r; });
      setTodayAtt(map);
      toast.success('تم التسجيل');
    } catch (e: any) {
      toast.error('تعذّر التسجيل: ' + e.message);
    } finally {
      setBusy((b) => ({ ...b, [studentId]: false }));
    }
  }

  const statuses: { value: AttendanceStatus; icon: any; color: string }[] = [
    { value: 'present_memorized', icon: Check, color: 'text-success' },
    { value: 'present_not_memorized', icon: BookX, color: 'text-warning' },
    { value: 'absent_unexcused', icon: X, color: 'text-destructive' },
    { value: 'absent_excused', icon: AlertCircle, color: 'text-muted-foreground' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarCheck className="h-6 w-6 text-primary" /> الحضور والغياب
          </h1>
          <p className="text-sm text-muted-foreground">
            سجّل حالة كل طالب لجلسة اليوم. تُحفظ الحالة لحظيًا وتُسجّل الخصومات تلقائيًا.
          </p>
        </div>
        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger className="w-56"><SelectValue placeholder="اختر المجموعة" /></SelectTrigger>
          <SelectContent>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {group && (
        <Card className="bg-muted/30">
          <CardContent className="py-3 flex items-center gap-3 flex-wrap text-sm">
            <span className="font-semibold">{group.name}</span>
            <Badge variant="outline">
              {group.finance_type === 'deduction' ? 'خصومات' : group.finance_type === 'subscription' ? 'اشتراك شهري' : 'بدون'}
            </Badge>
            {group.finance_type === 'deduction' && (
              <span className="text-xs text-muted-foreground">
                خصم غياب {group.deduction_amount} ج.م · خصم عدم حفظ {group.no_memorization_deduction} ج.م
              </span>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">طلاب المجموعة ({groupStudents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : groupStudents.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">لا يوجد طلاب في هذه المجموعة</p>
          ) : (
            <div className="space-y-2">
              {groupStudents.map((s) => {
                const att = todayAtt[s.id];
                return (
                  <div key={s.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 rounded-lg border p-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={s.photo_url ?? undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">{s.full_name.slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{s.full_name}</p>
                        {att ? (
                          <Badge variant="outline" className={attendanceColors[att.status]}>
                            {attendanceLabels[att.status]}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">لم يُسجّل بعد</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {statuses.map((st) => (
                        <Button
                          key={st.value}
                          size="sm"
                          variant={att?.status === st.value ? 'default' : 'outline'}
                          disabled={busy[s.id]}
                          onClick={() => handleRecord(s.id, st.value)}
                          className="h-8 px-2.5 gap-1.5"
                          title={attendanceLabels[st.value]}
                        >
                          <st.icon className={`h-3.5 w-3.5 ${att?.status === st.value ? '' : st.color}`} />
                          <span className="text-xs hidden sm:inline">{attendanceLabels[st.value]}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
