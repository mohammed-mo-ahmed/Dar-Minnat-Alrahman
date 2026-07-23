'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/shared/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Loader2, Upload, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import type { Section } from '@/shared/types';

export default function CompleteProfilePage() {
  const { profile, refreshProfile, session } = useAuth();
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: '',
    student_phone: '',
    guardian_phone: '',
    address: '',
    section_id: '',
    current_memorization: '',
    photo_url: '',
  });

  useEffect(() => {
    supabase().from('sections').select('*').order('name').then(({ data }) => {
      if (data) setSections(data as Section[]);
    });
  }, []);

  // Pre-fill name from profile
  useEffect(() => {
    if (profile?.display_name) setForm((f) => ({ ...f, full_name: f.full_name || profile.display_name || '' }));
    if (profile?.phone) setForm((f) => ({ ...f, student_phone: f.student_phone || profile.phone || '' }));
  }, [profile]);

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);

    const section = sections.find((s) => s.id === form.section_id);
    const photoRequired = section?.gender === 'male';
    if (photoRequired && !photoDataUrl && !form.photo_url) {
      toast.error('الصورة الشخصية إجبارية لقسم الشباب.');
      setLoading(false);
      return;
    }

    try {
      // 1. Update profile: phone + photo + completed flag
      const profileUpdate: Record<string, unknown> = {
        profile_completed: true,
        updated_at: new Date().toISOString(),
      };
      if (form.student_phone) profileUpdate.phone = form.student_phone;
      if (photoDataUrl) profileUpdate.photo_url = photoDataUrl;

      const { error: pErr } = await supabase().from('profiles').update(profileUpdate).eq('id', profile.id);
      if (pErr) throw pErr;

      // 2. Create student record linked to this user
      const studentInsert: Record<string, unknown> = {
        user_id: profile.id,
        full_name: form.full_name || profile.display_name || 'بدون اسم',
        student_phone: form.student_phone || null,
        guardian_phone: form.guardian_phone || null,
        address: form.address || null,
        section_id: form.section_id || null,
        current_memorization: form.current_memorization || null,
        photo_url: photoDataUrl || null,
      };
      const { data: student, error: sErr } = await supabase()
        .from('students')
        .insert(studentInsert)
        .select()
        .maybeSingle();
      if (sErr) throw sErr;

      // 3. If photo uploaded, also set on student row
      if (photoDataUrl && student) {
        await supabase().from('students').update({ photo_url: photoDataUrl }).eq('id', student.id);
      }

      await refreshProfile();
      toast.success('تم استكمال بياناتك. مرحبًا بك في المنصة!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error('حدث خطأ: ' + (err.message || 'تعذّر حفظ البيانات'));
    } finally {
      setLoading(false);
    }
  }

  const section = sections.find((s) => s.id === form.section_id);
  const photoRequired = section?.gender === 'male';

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-2xl shadow-primary/10 border-primary/20">
          <CardHeader className="text-center">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              <UserPlus className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl">استكمال البيانات الأساسية</CardTitle>
            <CardDescription className="text-base">
              علشان تقدر تستخدم حسابك، لازم تكمل بياناتك الأساسية أولًا.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/30 mb-6">
              <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-warning/90">
                لن تتمكن من الوصول لباقي صفحات الموقع حتى تُكمل هذه البيانات.
                هذا الشرط يُلغى تلقائيًا إذا تمت ترقية حسابك لشيخ أو ولي أمر.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">الاسم الكامل *</Label>
                  <Input
                    id="full_name"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student_phone">رقم موبايل الطالب *</Label>
                  <Input
                    id="student_phone"
                    type="tel"
                    placeholder="01xxxxxxxxx"
                    value={form.student_phone}
                    onChange={(e) => setForm({ ...form, student_phone: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardian_phone">رقم ولي الأمر *</Label>
                  <Input
                    id="guardian_phone"
                    type="tel"
                    placeholder="01xxxxxxxxx"
                    value={form.guardian_phone}
                    onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="section_id">القسم</Label>
                  <Select value={form.section_id} onValueChange={(v) => setForm({ ...form, section_id: v })}>
                    <SelectTrigger id="section_id">
                      <SelectValue placeholder="اختر القسم" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">العنوان</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="current_memorization">مقدار الحفظ الحالي</Label>
                  <Input
                    id="current_memorization"
                    placeholder="مثال: حفظ 5 أجزاء"
                    value={form.current_memorization}
                    onChange={(e) => setForm({ ...form, current_memorization: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="photo">
                    الصورة الشخصية {photoRequired ? '(إجباري لقسم الشباب)' : '(اختياري لقسم السيدات)'}
                  </Label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors text-sm">
                      <Upload className="h-4 w-4" />
                      اختر صورة
                      <input id="photo" type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
                    </label>
                    {photoDataUrl && (
                      <img src={photoDataUrl} alt="معاينة" className="h-12 w-12 rounded-full object-cover border" />
                    )}
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                حفظ ومتابعة
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
