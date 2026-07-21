'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/shared/providers/auth-provider';
import { fetchActivities, createActivity, deleteActivity } from '@/features/activities/api';
import type { Activity } from '@/shared/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PartyPopper, Plus, Trash2, Loader2, MapPin, Calendar, Users, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney, formatDate } from '@/shared/lib/roles';
import Link from 'next/link';

export default function ActivitiesPage() {
  const { profile: me } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({
    type: 'trip' as 'trip' | 'football',
    title: '',
    description: '',
    activity_date: new Date().toISOString().slice(0, 10),
    cost_per_person: 0,
    total_cost: 0,
    capacity: 30,
    location: '',
  });
  const [saving, setSaving] = useState(false);

  const canManage = me?.role === 'admin' || me?.role === 'sheikh';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setActivities(await fetchActivities());
    } catch (e: any) {
      toast.error('تعذّر التحميل: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await createActivity({
        type: form.type,
        title: form.title,
        description: form.description || null,
        activity_date: form.activity_date,
        cost_per_person: Number(form.cost_per_person) || 0,
        total_cost: Number(form.total_cost) || 0,
        capacity: Number(form.capacity) || null,
        location: form.location || null,
        created_by: me?.id,
      });
      toast.success('تم إنشاء النشاط');
      setDialog(false);
      setForm({ ...form, title: '', description: '', location: '' });
      load();
    } catch (e: any) {
      toast.error('تعذّر الإنشاء: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('حذف هذا النشاط؟')) return;
    try {
      await deleteActivity(id);
      toast.success('تم الحذف');
      load();
    } catch (e: any) {
      toast.error('تعذّر الحذف: ' + e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PartyPopper className="ح-6 w-6 text-primary" /> الأنشطة
          </h1>
          <p className="text-sm text-muted-foreground">رحلات وحجوزات كرة القدم — مفتوحة لكل الأقسام</p>
        </div>
        {canManage && (
          <Button onClick={() => setDialog(true)}>
            <Plus className="h-4 w-4" /> نشاط جديد
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : activities.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">لا توجد أنشطة بعد</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activities.map((a) => (
            <Card key={a.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${a.type === 'trip' ? 'bg-blue-500/15 text-blue-600' : 'bg-green-500/15 text-green-600'}`}>
                      {a.type === 'trip' ? <MapPin className="h-5 w-5" /> : <Trophy className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-semibold">{a.title}</p>
                      <Badge variant="outline" className="text-xs mt-0.5">
                        {a.type === 'trip' ? 'رحلة' : 'كرة قدم'}
                      </Badge>
                    </div>
                  </div>
                  {canManage && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(a.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {a.description && <p className="text-sm text-muted-foreground mt-2">{a.description}</p>}
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {formatDate(a.activity_date)}</div>
                  {a.location && <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {a.location}</div>}
                  <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {a.capacity || '∞'}</div>
                  <div>{formatMoney(a.cost_per_person)} / فرد</div>
                </div>
                <Link href={`/dashboard/activities/${a.id}`}>
                  <Button variant="outline" size="sm" className="w-full mt-3">إدارة المشاركين</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>نشاط جديد</DialogTitle>
            <DialogDescription>رحلة أو حجز ملعب كرة قدم</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 col-span-2">
              <Label>النوع</Label>
              <Select value={form.type} onValueChange={(v: 'trip' | 'football') => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trip">رحلة</SelectItem>
                  <SelectItem value="football">كرة قدم / حجز ملعب</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>العنوان</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>الوصف</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>التاريخ</Label>
              <Input type="date" value={form.activity_date} onChange={(e) => setForm({ ...form, activity_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>المكان</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>التكلفة للفرد (ج.م)</Label>
              <Input type="number" value={form.cost_per_person} onChange={(e) => setForm({ ...form, cost_per_person: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>السعة</Label>
              <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>التكلفة الإجمالية (اختياري — لتقسيمها على المشاركين)</Label>
              <Input type="number" value={form.total_cost} onChange={(e) => setForm({ ...form, total_cost: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={saving || !form.title.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
