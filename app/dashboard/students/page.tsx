'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/shared/providers/auth-provider';
import {
  fetchStudents,
  fetchStudentsForSheikh,
  createStudent,
  updateStudent,
  deleteStudent,
} from '@/features/students/api';
import { fetchGroups } from '@/features/groups/api';
import type { Student, Group } from '@/shared/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import {
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Phone,
  MessageCircle,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { formatMoney } from '@/shared/lib/roles';

export default function StudentsPage() {
  const { profile: me } = useAuth();
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [editing, setEditing] = useState<Student | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

  const empty = {
    full_name: '',
    student_phone: '',
    guardian_phone: '',
    address: '',
    section_id: '',
    group_id: '',
    current_memorization: '',
    last_memorized: '',
    next_assignment: '',
    evaluation: '',
    subscription_amount: 0,
    photo_url: '',
  };
  const [form, setForm] = useState<any>(empty);

  const load = useCallback(async () => {
    if (!me) return;
    setLoading(true);
    try {
      const [s, g] = await Promise.all([
        me.role === 'sheikh' ? fetchStudentsForSheikh(me.id) : fetchStudents(),
        fetchGroups(),
      ]);
      setStudents(s);
      setGroups(g);
    } catch (e: any) {
      toast.error('تعذّر تحميل الطلاب: ' + e.message);
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

  const filtered = students.filter((s) => {
    const q = query.trim();
    const matchQ = !q || s.full_name.includes(q) || (s.student_phone || '').includes(q) || (s.guardian_phone || '').includes(q);
    const matchG = groupFilter === 'all' || s.group_id === groupFilter;
    return matchQ && matchG;
  });

  function openNew() {
    setIsNew(true);
    setEditing({} as Student);
    setForm({ ...empty, section_id: groups[0]?.section_id || '', group_id: groups[0]?.id || '' });
    setPhotoDataUrl(null);
  }

  function openEdit(s: Student) {
    setIsNew(false);
    setEditing(s);
    setForm({
      full_name: s.full_name,
      student_phone: s.student_phone || '',
      guardian_phone: s.guardian_phone || '',
      address: s.address || '',
      section_id: s.section_id || '',
      group_id: s.group_id || '',
      current_memorization: s.current_memorization || '',
      last_memorized: s.last_memorized || '',
      next_assignment: s.next_assignment || '',
      evaluation: s.evaluation || '',
      subscription_amount: s.subscription_amount || 0,
      photo_url: s.photo_url || '',
    });
    setPhotoDataUrl(null);
  }

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!form.full_name.trim()) {
      toast.error('الاسم مطلوب');
      return;
    }
    setSaving(true);
    try {
      const group = groups.find((g) => g.id === form.group_id);
      const payload: Partial<Student> = {
        full_name: form.full_name,
        student_phone: form.student_phone || null,
        guardian_phone: form.guardian_phone || null,
        address: form.address || null,
        section_id: form.section_id || group?.section_id || null,
        group_id: form.group_id || null,
        current_memorization: form.current_memorization || null,
        last_memorized: form.last_memorized || null,
        next_assignment: form.next_assignment || null,
        evaluation: form.evaluation || null,
        subscription_amount: Number(form.subscription_amount) || 0,
        photo_url: photoDataUrl || form.photo_url || null,
      };
      if (isNew) {
        await createStudent(payload);
        toast.success('تمت إضافة الطالب');
      } else if (editing?.id) {
        await updateStudent(editing.id, payload);
        toast.success('تم تحديث البيانات');
      }
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error('تعذّر الحفظ: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(s: Student) {
    if (!confirm(`حذف الطالب "${s.full_name}"؟ لا يمكن التراجع.`)) return;
    try {
      await deleteStudent(s.id);
      toast.success('تم الحذف');
      load();
    } catch (e: any) {
      toast.error('تعذّر الحذف: ' + e.message);
    }
  }

  function whatsappLink(s: Student) {
    const phone = (s.guardian_phone || '').replace(/[^0-9]/g, '');
    const intl = phone.startsWith('20') ? phone : phone.startsWith('0') ? '2' + phone.slice(1) : phone;
    const msg = encodeURIComponent(
      `الأستاذ الفاضل، بخصوص الطالب ${s.full_name}: ${s.group?.name ? 'حلقة ' + s.group.name + ' — ' : ''}جزاكم الله خيرًا.`
    );
    return `https://wa.me/${intl}?text=${msg}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" /> الطلاب
          </h1>
          <p className="text-sm text-muted-foreground">
            {me.role === 'sheikh' ? 'طلاب مجموعتك' : 'كل الطلاب'} — {students.length} طالب
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> طالب جديد
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <CardTitle className="text-base">قائمة الطلاب</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم/الهاتف"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="ps-9 w-56"
                />
              </div>
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="كل المجموعات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المجموعات</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">لا يوجد طلاب</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="text-start font-medium py-2 px-2">الطالب</th>
                    <th className="text-start font-medium py-2 px-2">المجموعة</th>
                    <th className="text-start font-medium py-2 px-2">الحفظ</th>
                    <th className="text-start font-medium py-2 px-2">النقاط</th>
                    <th className="text-start font-medium py-2 px-2">الاشتراك</th>
                    <th className="text-start font-medium py-2 px-2">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={s.photo_url ?? undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {s.full_name.slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{s.full_name}</p>
                            <p className="text-xs text-muted-foreground">{s.student_phone || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        <Badge variant="outline" className="text-xs">{s.group?.name || 'بدون'}</Badge>
                      </td>
                      <td className="py-2.5 px-2 text-muted-foreground text-xs">{s.current_memorization || '—'}</td>
                      <td className="py-2.5 px-2">
                        <Badge className="bg-accent/15 text-accent-foreground border-accent/30">{s.points_balance}</Badge>
                      </td>
                      <td className="py-2.5 px-2 text-xs">{s.subscription_amount ? formatMoney(s.subscription_amount) : '—'}</td>
                      <td className="py-2.5 px-2">
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="عرض" onClick={() => router.push(`/dashboard/students/${s.id}`)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="تعديل" onClick={() => openEdit(s)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <a href={whatsappLink(s)} target="_blank" rel="noreferrer" title="واتساب">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-success">
                              <MessageCircle className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                          <a href={`tel:${s.guardian_phone || ''}`} title="اتصال">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-primary">
                              <Phone className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                          {me.role === 'admin' && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(s)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? 'طالب جديد' : 'تعديل بيانات الطالب'}</DialogTitle>
            <DialogDescription>أدخل بيانات الطالب الأساسية ومتابعة الحفظ</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 col-span-2">
              <Label>الاسم الكامل *</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>هاتف الطالب</Label>
              <Input value={form.student_phone} onChange={(e) => setForm({ ...form, student_phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>هاتف ولي الأمر</Label>
              <Input value={form.guardian_phone} onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>العنوان</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>المجموعة</Label>
              <Select value={form.group_id} onValueChange={(v) => {
                const g = groups.find((x) => x.id === v);
                setForm({ ...form, group_id: v, section_id: g?.section_id || form.section_id });
              }}>
                <SelectTrigger><SelectValue placeholder="اختر المجموعة" /></SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name} — {g.section?.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>القسم</Label>
              <Input value={groups.find((g) => g.id === form.group_id)?.section?.name || '—'} disabled />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>مقدار الحفظ الحالي</Label>
              <Input value={form.current_memorization} onChange={(e) => setForm({ ...form, current_memorization: e.target.value })} placeholder="مثال: حفظ 5 أجزاء" />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>آخر ما تم حفظه</Label>
              <Input value={form.last_memorized} onChange={(e) => setForm({ ...form, last_memorized: e.target.value })} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>المقرر القادم</Label>
              <Input value={form.next_assignment} onChange={(e) => setForm({ ...form, next_assignment: e.target.value })} />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>التقييم</Label>
              <Input value={form.evaluation} onChange={(e) => setForm({ ...form, evaluation: e.target.value })} placeholder="ممتاز / جيد جدًا / 8 من 10" />
            </div>
            <div className="space-y-2">
              <Label>الاشتراك الشهري (ج.م)</Label>
              <Input type="number" value={form.subscription_amount} onChange={(e) => setForm({ ...form, subscription_amount: Number(e.target.value) })} />
              <p className="text-xs text-muted-foreground">يُستخدم للمجموعات ذات الاشتراك لكل طالب</p>
            </div>
            <div className="space-y-2">
              <Label>الصورة الشخصية</Label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors text-sm">
                  <Plus className="h-4 w-4" /> اختر صورة
                  <input type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
                </label>
                {(photoDataUrl || form.photo_url) && (
                  <img src={photoDataUrl || form.photo_url} alt="معاينة" className="h-10 w-10 rounded-full object-cover border" />
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>إلغاء</Button>
            <Button onClick={handleSave} disabled={saving || !form.full_name.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
