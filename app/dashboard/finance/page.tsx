'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/shared/providers/auth-provider';
import { fetchStudents, fetchStudentsForSheikh } from '@/features/students/api';
import { fetchFinanceForStudents } from '@/features/finance/api';
import type { Student, FinanceTransaction } from '@/shared/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Wallet, TrendingDown, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney, monthKey, monthLabel, financeTypeLabelsLedger } from '@/shared/lib/roles';

export default function FinancePage() {
  const { profile: me } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(monthKey());

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" /> الحسابات المالية
          </h1>
          <p className="text-sm text-muted-foreground">كشف حساب كل طالب شهريًا — خصومات واشتراكات ورسوم أنشطة</p>
        </div>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Array.from({ length: 6 }).map((_, i) => {
              const d = new Date();
              d.setMonth(d.getMonth() - i);
              const k = monthKey(d);
              return <SelectItem key={k} value={k}>{monthLabel(k)}</SelectItem>;
            })}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <StudentFinanceList students={students} month={month} />
      )}
    </div>
  );
}

function StudentFinanceList({ students, month }: { students: Student[]; month: string }) {
  const [rows, setRows] = useState<{ student: Student; transactions: FinanceTransaction[]; total: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const txns = await fetchFinanceForStudents(students.map((s) => s.id), month);
        const grouped: Record<string, FinanceTransaction[]> = {};
        txns.forEach((t) => {
          if (!grouped[t.student_id]) grouped[t.student_id] = [];
          grouped[t.student_id].push(t);
        });
        const out = students.map((s) => {
          const transactions = grouped[s.id] || [];
          const total = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
          return { student: s, transactions, total };
        });
        setRows(out);
      } catch {
        setRows(students.map((s) => ({ student: s, transactions: [], total: 0 })));
      } finally {
        setLoading(false);
      }
    })();
  }, [students, month]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);

  return (
    <div className="space-y-4">
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="py-4 flex items-center justify-between">
          <span className="text-sm">إجمالي المستحق على كل الطلاب — {monthLabel(month)}</span>
          <span className="text-2xl font-bold">{formatMoney(Math.abs(grandTotal))}</span>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map(({ student, transactions, total }) => (
          <Card key={student.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{student.full_name}</CardTitle>
                <Badge variant="outline" className="text-xs">{student.group?.name || '—'}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">لا توجد حركات</p>
              ) : (
                <div className="space-y-1.5 mb-2">
                  {transactions.slice(0, 4).map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-xs">
                      <span>{financeTypeLabelsLedger[t.type]}</span>
                      <span className={Number(t.amount) < 0 ? 'text-success' : 'text-destructive'}>
                        {Number(t.amount) < 0 ? '-' : '+'}{formatMoney(Math.abs(Number(t.amount)))}
                      </span>
                    </div>
                  ))}
                  {transactions.length > 4 && (
                    <p className="text-xs text-muted-foreground">+{transactions.length - 4} حركة أخرى</p>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-xs text-muted-foreground">الإجمالي</span>
                <span className={`text-sm font-bold flex items-center gap-1 ${total > 0 ? 'text-destructive' : 'text-success'}`}>
                  {total > 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
                  {formatMoney(Math.abs(total))}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
