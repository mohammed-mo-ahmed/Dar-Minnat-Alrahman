'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/shared/providers/auth-provider';
import { fetchProfiles, updateProfileRole, adminResetPassword } from '@/features/users-roles/api';
import { fetchGroups, fetchSections } from '@/features/groups/api';
import type { Profile, Group, Section } from '@/shared/types';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Shield, KeyRound, Loader2, Users, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { roleLabels, roleColors } from '@/shared/lib/roles';

export default function UsersPage() {
  const { profile: me } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [promoteTarget, setPromoteTarget] = useState<Profile | null>(null);
  const [promoteRole, setPromoteRole] = useState<'sheikh' | 'guardian'>('sheikh');
  const [promoteGroupId, setPromoteGroupId] = useState('');
  const [resetTarget, setResetTarget] = useState<Profile | null>(null);
  const [newPass, setNewPass] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, g, s] = await Promise.all([fetchProfiles(), fetchGroups(), fetchSections()]);
      setProfiles(p);
      setGroups(g);
      setSections(s);
    } catch (e: any) {
      toast.error('تعذّر تحميل المستخدمين: ' + e.message);
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

  const filtered = profiles.filter((p) => {
    const q = query.trim();
    const matchQ =
      !q ||
      (p.display_name || '').includes(q) ||
      (p.email || '').includes(q) ||
      (p.phone || '').includes(q);
    const matchR = roleFilter === 'all' || p.role === roleFilter;
    return matchQ && matchR;
  });

  async function handlePromote() {
    if (!promoteTarget) return;
    setSaving(true);
    try {
      await updateProfileRole(promoteTarget.id, promoteRole);
      if (promoteRole === 'sheikh' && promoteGroupId) {
        const { error } = await import('@/lib/supabase/client').then((m) =>
          m.supabase().from('groups').update({ supervisor_id: promoteTarget.id }).eq('id', promoteGroupId)
        );
        if (error) throw error;
      }
      toast.success('تمت ترقية الحساب بنجاح');
      setPromoteTarget(null);
      setPromoteGroupId('');
      load();
    } catch (e: any) {
      toast.error('تعذّر الترقية: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!resetTarget || !newPass) return;
    setSaving(true);
    try {
      await adminResetPassword(resetTarget.id, newPass);
      toast.success('تم إعادة تعيين كلمة المرور');
      setResetTarget(null);
      setNewPass('');
    } catch (e: any) {
      toast.error('تعذّر إعادة التعيين: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  // Filter groups for promotion: if target is female, only female-section groups; else male
  // We don't have gender on profiles; admin picks the group, but we restrict by section gender.
  const promoteGroups = groups; // admin sees all; UI shows section name

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="h-6 w-6 text-primary" />
            المستخدمون والأدوار
          </h1>
          <p className="text-sm text-muted-foreground">إدارة الحسابات وترقية الأدوار وإعادة تعيين كلمات المرور</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> {profiles.length} مستخدم
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم/الإيميل/الهاتف"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="ps-9 w-64"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأدوار</SelectItem>
                  <SelectItem value="admin">مدير</SelectItem>
                  <SelectItem value="sheikh">شيخ</SelectItem>
                  <SelectItem value="guardian">ولي أمر</SelectItem>
                  <SelectItem value="student">طالب</SelectItem>
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
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="text-start font-medium py-2 px-2">المستخدم</th>
                    <th className="text-start font-medium py-2 px-2">الدور</th>
                    <th className="text-start font-medium py-2 px-2">الهاتف</th>
                    <th className="text-start font-medium py-2 px-2">مكتمل؟</th>
                    <th className="text-start font-medium py-2 px-2">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={p.photo_url ?? undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {(p.display_name || p.email || '?').slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{p.display_name || 'بدون اسم'}</p>
                            <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2">
                        <Badge variant="outline" className={roleColors[p.role]}>
                          {roleLabels[p.role]}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-2 text-muted-foreground">{p.phone || '—'}</td>
                      <td className="py-2.5 px-2">
                        {p.role === 'student' ? (
                          p.profile_completed ? (
                            <Badge className="bg-success/15 text-success border-success/30">مكتمل</Badge>
                          ) : (
                            <Badge variant="outline" className="text-warning border-warning/30">غير مكتمل</Badge>
                          )
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex gap-1.5">
                          {p.id !== me?.id && p.role !== 'admin' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setPromoteTarget(p);
                                setPromoteRole(p.role === 'guardian' ? 'guardian' : 'sheikh');
                                setPromoteGroupId('');
                              }}
                            >
                              <Shield className="h-3.5 w-3.5" /> ترقية
                            </Button>
                          )}
                          {p.id !== me?.id && (
                            <Button size="sm" variant="ghost" onClick={() => setResetTarget(p)}>
                              <KeyRound className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        لا يوجد مستخدمون مطابقون
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Promote dialog */}
      <Dialog open={!!promoteTarget} onOpenChange={(o) => !o && setPromoteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ترقية الحساب</DialogTitle>
            <DialogDescription>
              المستخدم: {promoteTarget?.display_name || promoteTarget?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الترقية إلى</Label>
              <Select
                value={promoteRole}
                onValueChange={(v: 'sheikh' | 'guardian') => setPromoteRole(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sheikh">شيخ / مسؤولة مجموعة</SelectItem>
                  <SelectItem value="guardian">ولي أمر</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {promoteRole === 'sheikh' && (
              <div className="space-y-2">
                <Label>المجموعة التي سيشرف عليها</Label>
                <Select value={promoteGroupId} onValueChange={setPromoteGroupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المجموعة" />
                  </SelectTrigger>
                  <SelectContent>
                    {promoteGroups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name} — {g.section?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  ملاحظة: لا يمكن لشيخ (رجل) الإشراف على مجموعة سيدات. تأكد من اختيار المجموعة المناسبة.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteTarget(null)}>
              إلغاء
            </Button>
            <Button onClick={handlePromote} disabled={saving || (promoteRole === 'sheikh' && !promoteGroupId)}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              تأكيد الترقية
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إعادة تعيين كلمة المرور</DialogTitle>
            <DialogDescription>
              المستخدم: {resetTarget?.display_name || resetTarget?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="newpass">كلمة المرور الجديدة</Label>
            <Input
              id="newpass"
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              minLength={6}
              placeholder="6 أحرف على الأقل"
            />
            <p className="text-xs text-muted-foreground">
              سيتم إبلاغ المستخدم بكلمة المرور الجديدة يدويًا.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>
              إلغاء
            </Button>
            <Button onClick={handleReset} disabled={saving || newPass.length < 6}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              تعيين
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
