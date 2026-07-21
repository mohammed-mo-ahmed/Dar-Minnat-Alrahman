'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/shared/providers/auth-provider';
import { fetchRewards, createReward, deleteReward } from '@/features/points-rewards/api';
import type { Reward } from '@/shared/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Trophy, Plus, Trash2, Loader2, Award, Gift } from 'lucide-react';
import { toast } from 'sonner';

export default function RewardsPage() {
  const { profile: me } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', points_cost: 10 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRewards(await fetchRewards());
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
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await createReward(form.name, form.description, Number(form.points_cost));
      toast.success('تمت إضافة المكافأة');
      setDialog(false);
      setForm({ name: '', description: '', points_cost: 10 });
      load();
    } catch (e: any) {
      toast.error('تعذّر الإضافة: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('حذف هذه المكافأة؟')) return;
    try {
      await deleteReward(id);
      load();
    } catch (e: any) {
      toast.error('تعذّر الحذف: ' + e.message);
    }
  }

  const canManage = me?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" /> المكافآت
          </h1>
          <p className="text-sm text-muted-foreground">
            قائمة المكافآت المتاحة — بدون حد أقصى للكمية، أي طالب يصل للنقاط يقدر يستبدلها.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setDialog(true)}>
            <Plus className="h-4 w-4" /> مكافأة جديدة
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rewards.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Gift className="h-10 w-10 mx-auto mb-2 opacity-50" />
            لا توجد مكافآت بعد
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {rewards.map((r) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-accent/15 text-accent-foreground flex items-center justify-center">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{r.name}</p>
                      <Badge className="bg-accent/15 text-accent-foreground border-accent/30 mt-1">
                        {r.points_cost} نقطة
                      </Badge>
                    </div>
                  </div>
                  {canManage && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {r.description && <p className="text-sm text-muted-foreground mt-2">{r.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>مكافأة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>الاسم</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="هدية / شهادة تقدير" />
            </div>
            <div className="space-y-2">
              <Label>الوصف</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>عدد النقاط المطلوبة</Label>
              <Input type="number" value={form.points_cost} onChange={(e) => setForm({ ...form, points_cost: Number(e.target.value) })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
