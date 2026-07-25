'use client';

import { useState } from 'react';
import { useAuth } from '@/shared/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Loader2, Upload, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      const update: Record<string, unknown> = {
        display_name: displayName.trim(),
        phone: phone.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (photoDataUrl) update.photo_url = photoDataUrl;

      const { error } = await supabase().from('profiles').update(update).eq('id', profile.id);
      if (error) {
        if (error.message.includes('idx_profiles_phone_unique')) {
          toast.error('رقم الهاتف مستخدم بالفعل من قبل حساب آخر.');
          setSaving(false);
          return;
        }
        throw error;
      }

      await refreshProfile();
      toast.success('تم حفظ التعديلات');
    } catch (e: any) {
      toast.error('تعذّر الحفظ: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return null;

  const previewUrl = photoDataUrl || profile.photo_url;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="h-6 w-6 text-primary" /> الملف الشخصي
        </h1>
        <p className="text-sm text-muted-foreground">تعديل بياناتك الشخصية</p>
      </div>

      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-border">
                <AvatarImage src={previewUrl ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {(profile.display_name || '?').slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <label className="absolute -bottom-1 -left-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-md hover:bg-primary/90 transition-colors">
                <Upload className="h-3.5 w-3.5" />
                <input type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
              </label>
            </div>
          </div>
          <CardTitle className="text-lg">{profile.display_name || 'بدون اسم'}</CardTitle>
          <CardDescription>
            {profile.role === 'admin' && 'مدير النظام'}
            {profile.role === 'sheikh' && 'شيخ'}
            {profile.role === 'guardian' && 'ولي أمر'}
            {profile.role === 'student' && 'طالب'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">الاسم</Label>
              <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01xxxxxxxxx" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" value={profile.email || ''} disabled className="bg-muted/50" />
              <p className="text-xs text-muted-foreground">لا يمكن تغيير البريد الإلكتروني</p>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4 ms-1" /> حفظ التعديلات
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
