'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/shared/providers/auth-provider';
import {
  fetchSections,
  fetchGroups,
  fetchProfilesForSupervisors,
  createSection,
  createGroup,
  updateGroup,
  deleteGroup,
} from '@/features/groups/api';
import type { Group, Section } from '@/shared/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Users, Plus, Pencil, Trash2, Loader2, UserRound, BookMarked } from 'lucide-react';
import { toast } from 'sonner';
import { financeTypeLabels, feeModeLabels } from '@/shared/lib/roles';

type Supervisor = { id: string; display_name: string | null; phone: string | null; role: string };

export default function GroupsPage() {
  const { profile: me } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);

  const [sectionDialog, setSectionDialog] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionGender, setNewSectionGender] = useState<'male' | 'female'>('male');

  const [groupDialog, setGroupDialog] = useState<Group | null>(null);
  const [isNewGroup, setIsNewGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({
    name: '',
    section_id: '',
    supervisor_id: '',
    finance_type: 'deduction' as Group['finance_type'],
    fee_mode: 'per_student' as Group['fee_mode'],
    monthly_fee: 0,
    deduction_amount: 50,
    no_memorization_deduction: 50,
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, g, sup] = await Promise.all([fetchSections(), fetchGroups(), fetchProfilesForSupervisors()]);
      setSections(s);
      setGroups(g);
      setSupervisors(sup);
    } catch (e: any) {
      toast.error('تعذّر التحميل: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (me?.role === 'admin') load();
  }, [me, load]);

  if (me?.role !== 'admin') {
    return <div className="text-muted-foreground">هذه الصفحة متاحة لمدير النظام فقط.</div>;
  }

  async function handleCreateSection() {
    if (!newSectionName.trim()) return;
    setSaving(true);
    try {
      await createSection(newSectionName.trim(), newSectionGender);
      toast.success('تم إنشاء القسم');
      setSectionDialog(false);
      setNewSectionName('');
      load();
    } catch (e: any) {
      toast.error('تعذّر الإنشاء: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  function openNewGroup(sectionId?: string) {
    setIsNewGroup(true);
    setGroupDialog(null);
    setGroupForm({
      name: '',
      section_id: sectionId || sections[0]?.id || '',
      supervisor_id: '__none__',
      finance_type: 'deduction',
      fee_mode: 'per_student',
      monthly_fee: 0,
      deduction_amount: 50,
      no_memorization_deduction: 50,
    });
    setGroupDialog({} as Group); // open dialog
  }

  function openEditGroup(g: Group) {
    setIsNewGroup(false);
    setGroupForm({
      name: g.name,
      section_id: g.section_id,
      supervisor_id: g.supervisor_id || '__none__',
      finance_type: g.finance_type,
      fee_mode: g.fee_mode,
      monthly_fee: g.monthly_fee,
      deduction_amount: g.deduction_amount,
      no_memorization_deduction: g.no_memorization_deduction,
    });
    setGroupDialog(g);
  }

  async function handleSaveGroup() {
    setSaving(true);
    try {
      const payload = {
        name: groupForm.name,
        section_id: groupForm.section_id,
        supervisor_id: groupForm.supervisor_id === '__none__' ? null : groupForm.supervisor_id,
        finance_type: groupForm.finance_type,
        fee_mode: groupForm.fee_mode,
        monthly_fee: Number(groupForm.monthly_fee) || 0,
        deduction_amount: Number(groupForm.deduction_amount) || 0,
        no_memorization_deduction: Number(groupForm.no_memorization_deduction) || 0,
      };
      if (isNewGroup) {
        await createGroup(payload);
        toast.success('تم إنشاء المجموعة');
      } else if (groupDialog?.id) {
        await updateGroup(groupDialog.id, payload);
        toast.success('تم تحديث المجموعة');
      }
      setGroupDialog(null);
      load();
    } catch (e: any) {
      toast.error('تعذّر الحفظ: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGroup(g: Group) {
    if (!confirm(`حذف المجموعة "${g.name}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) return;
    try {
      await deleteGroup(g.id);
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
            <Users className="h-6 w-6 text-primary" /> الأقسام والمجموعات
          </h1>
          <p className="text-sm text-muted-foreground">إدارة الأقسام والمجموعات وأنظمتها المالية</p>
        </div>
        <Button onClick={() => setSectionDialog(true)} variant="outline">
          <Plus className="h-4 w-4" /> قسم جديد
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-5">
          {sections.map((section) => {
            const sectionGroups = groups.filter((g) => g.section_id === section.id);
            return (
              <Card key={section.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${section.gender === 'male' ? 'bg-blue-500/15 text-blue-600' : 'bg-pink-500/15 text-pink-600'}`}>
                        <BookMarked className="h-5 w-5" />
                      </div>
                      {section.name}
                      <Badge variant="outline" className="text-xs">
                        {sectionGroups.length} مجموعة
                      </Badge>
                    </CardTitle>
                    <Button size="sm" variant="ghost" onClick={() => openNewGroup(section.id)}>
                      <Plus className="h-4 w-4" /> مجموعة
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {sectionGroups.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">لا توجد مجموعات في هذا القسم</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {sectionGroups.map((g) => (
                        <div key={g.id} className="rounded-lg border p-3 hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{g.name}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <UserRound className="h-3 w-3" />
                                {g.supervisor?.display_name || 'بدون مشرف'}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditGroup(g)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteGroup(g)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {financeTypeLabels[g.finance_type]}
                            </Badge>
                            {g.finance_type === 'subscription' && (
                              <Badge variant="outline" className="text-xs">
                                {feeModeLabels[g.fee_mode]}
                              </Badge>
                            )}
                            {g.finance_type === 'deduction' && (
                              <Badge variant="outline" className="text-xs">
                                خصم {g.deduction_amount} ج.م
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Section dialog */}
      <Dialog open={sectionDialog} onOpenChange={setSectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>قسم جديد</DialogTitle>
            <DialogDescription>أضف قسمًا جديدًا (شباب أو سيدات)</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>اسم القسم</Label>
              <Input value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} placeholder="مثال: ناشئة" />
            </div>
            <div className="space-y-2">
              <Label>النوع</Label>
              <Select value={newSectionGender} onValueChange={(v: 'male' | 'female') => setNewSectionGender(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">شباب (ذكور)</SelectItem>
                  <SelectItem value="female">سيدات (إناث)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionDialog(false)}>إلغاء</Button>
            <Button onClick={handleCreateSection} disabled={saving || !newSectionName.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} إنشاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group dialog */}
      <Dialog open={!!groupDialog} onOpenChange={(o) => !o && setGroupDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isNewGroup ? 'مجموعة جديدة' : 'تعديل المجموعة'}</DialogTitle>
            <DialogDescription>حدد الاسم والقسم والمشرف والنظام المالي</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 col-span-2">
              <Label>اسم المجموعة</Label>
              <Input value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>القسم</Label>
              <Select value={groupForm.section_id} onValueChange={(v) => setGroupForm({ ...groupForm, section_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر القسم" /></SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>المشرف</Label>
              <Select value={groupForm.supervisor_id} onValueChange={(v) => setGroupForm({ ...groupForm, supervisor_id: v })}>
                <SelectTrigger><SelectValue placeholder="بدون مشرف" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">بدون مشرف</SelectItem>
                  {supervisors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.display_name || s.phone || 'بدون اسم'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>النظام المالي</Label>
              <Select value={groupForm.finance_type} onValueChange={(v: Group['finance_type']) => setGroupForm({ ...groupForm, finance_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deduction">خصومات</SelectItem>
                  <SelectItem value="subscription">اشتراك شهري</SelectItem>
                  <SelectItem value="none">بدون</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {groupForm.finance_type === 'subscription' && (
              <div className="space-y-2">
                <Label>طريقة تحديد الاشتراك</Label>
                <Select value={groupForm.fee_mode} onValueChange={(v: Group['fee_mode']) => setGroupForm({ ...groupForm, fee_mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_student">لكل طالب</SelectItem>
                    <SelectItem value="per_group">موحّد للمجموعة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {groupForm.finance_type === 'deduction' && (
              <>
                <div className="space-y-2">
                  <Label>خصم الغياب (ج.م)</Label>
                  <Input type="number" value={groupForm.deduction_amount} onChange={(e) => setGroupForm({ ...groupForm, deduction_amount: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>خصم عدم الحفظ (ج.م)</Label>
                  <Input type="number" value={groupForm.no_memorization_deduction} onChange={(e) => setGroupForm({ ...groupForm, no_memorization_deduction: Number(e.target.value) })} />
                </div>
              </>
            )}
            {groupForm.finance_type === 'subscription' && groupForm.fee_mode === 'per_group' && (
              <div className="space-y-2 col-span-2">
                <Label>الاشتراك الشهري الموحّد (ج.م)</Label>
                <Input type="number" value={groupForm.monthly_fee} onChange={(e) => setGroupForm({ ...groupForm, monthly_fee: Number(e.target.value) })} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialog(null)}>إلغاء</Button>
            <Button onClick={handleSaveGroup} disabled={saving || !groupForm.name.trim() || !groupForm.section_id}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
