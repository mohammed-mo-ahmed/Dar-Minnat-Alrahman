'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { Loader2, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Sign in
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPhone, setSignInPhone] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  // Sign up (email)
  const [suName, setSuName] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPassword, setSuPassword] = useState('');

  // Sign up (phone)
  const [spName, setSpName] = useState('');
  const [spPhone, setSpPhone] = useState('');
  const [spPassword, setSpPassword] = useState('');

  const [signInMethod, setSignInMethod] = useState<'email' | 'phone'>('email');

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = signInMethod === 'email'
      ? await supabase.auth.signInWithPassword({ email: signInEmail.trim(), password: signInPassword })
      : await supabase.auth.signInWithPassword({ phone: signInPhone.trim(), password: signInPassword });
    setLoading(false);
    if (error) {
      toast.error('بيانات الدخول غير صحيحة: ' + error.message);
      return;
    }
    toast.success('تم تسجيل الدخول بنجاح');
    router.push('/dashboard');
  }

  async function handleSignUpEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: suEmail.trim(),
      password: suPassword,
      options: { data: { full_name: suName.trim() } },
    });
    setLoading(false);
    if (error) {
      toast.error('تعذّر إنشاء الحساب: ' + error.message);
      return;
    }
    if (data.user) {
      // Update profile with display_name + phone
      await supabase
        .from('profiles')
        .update({ display_name: suName.trim() })
        .eq('id', data.user.id);
    }
    toast.success('تم إنشاء الحساب. يرجى استكمال بياناتك.');
    router.push('/dashboard');
  }

  async function handleSignUpPhone(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Supabase email/password auth requires an email field. We synthesize a unique
    // pseudo-email from the phone number so users can register with phone only.
    const pseudoEmail = `${spPhone.trim().replace(/[^0-9]/g, '')}@phone.dar-minna.local`;
    const { data, error } = await supabase.auth.signUp({
      email: pseudoEmail,
      password: spPassword,
      options: { data: { full_name: spName.trim(), phone: spPhone.trim() } },
    });
    setLoading(false);
    if (error) {
      toast.error('تعذّر إنشاء الحساب: ' + error.message);
      return;
    }
    if (data.user) {
      await supabase
        .from('profiles')
        .update({ display_name: spName.trim(), phone: spPhone.trim() })
        .eq('id', data.user.id);
    }
    toast.success('تم إنشاء الحساب. يرجى استكمال بياناتك.');
    router.push('/dashboard');
  }

  async function handleGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      setLoading(false);
      toast.error('تعذّر الدخول عبر Google: ' + error.message);
    }
  }

  return (
    <div className="min-h-screen flex items-stretch bg-gradient-to-br from-primary/5 via-background to-accent/10">
      {/* Form panel (right in RTL) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="h-12 w-12 rounded-2xl overflow-hidden bg-primary/10 relative">
              <Image src="/logo.png" alt="دار منة الرحمن" fill className="object-cover scale-150" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">دار منة الرحمن</h1>
              <p className="text-muted-foreground text-xs">نظام إدارة المقرأة الذكي</p>
            </div>
          </div>

          <Card className="border-border/60 shadow-xl shadow-primary/5">
            <CardHeader>
              <CardTitle className="text-2xl">مرحبًا بك</CardTitle>
              <CardDescription>سجّل دخولك أو أنشئ حسابًا جديدًا للبدء</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">تسجيل الدخول</TabsTrigger>
                  <TabsTrigger value="signup">حساب جديد</TabsTrigger>
                </TabsList>

                {/* Sign in */}
                <TabsContent value="signin" className="mt-6">
                  <Tabs value={signInMethod} onValueChange={(v) => setSignInMethod(v as 'email' | 'phone')}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="email" className="text-xs">
                        <Mail className="h-3.5 w-3.5 me-1.5" /> بالإيميل
                      </TabsTrigger>
                      <TabsTrigger value="phone" className="text-xs">
                        <Phone className="h-3.5 w-3.5 me-1.5" /> بالموبايل
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="email" className="mt-4">
                      <form onSubmit={handleSignIn} className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="si-email">البريد الإلكتروني</Label>
                          <Input
                            id="si-email"
                            type="email"
                            placeholder="you@example.com"
                            value={signInEmail}
                            onChange={(e) => setSignInEmail(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="si-pass">كلمة المرور</Label>
                          <Input
                            id="si-pass"
                            type="password"
                            placeholder="••••••••"
                            value={signInPassword}
                            onChange={(e) => setSignInPassword(e.target.value)}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                          دخول
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="phone" className="mt-4">
                      <form onSubmit={handleSignIn} className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="si-phone">رقم الموبايل</Label>
                          <Input
                            id="si-phone"
                            type="tel"
                            placeholder="01xxxxxxxxx"
                            value={signInPhone}
                            onChange={(e) => setSignInPhone(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="si-pass2">كلمة المرور</Label>
                          <Input
                            id="si-pass2"
                            type="password"
                            placeholder="••••••••"
                            value={signInPassword}
                            onChange={(e) => setSignInPassword(e.target.value)}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                          دخول
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-card px-2 text-muted-foreground">أو</span>
                    </div>
                  </div>
                  <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
                    <svg className="h-4 w-4 me-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    الدخول بحساب Google
                  </Button>
                </TabsContent>

                {/* Sign up */}
                <TabsContent value="signup" className="mt-6">
                  <Tabs defaultValue="email">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="email" className="text-xs">
                        <Mail className="h-3.5 w-3.5 me-1.5" /> بالإيميل
                      </TabsTrigger>
                      <TabsTrigger value="phone" className="text-xs">
                        <Phone className="h-3.5 w-3.5 me-1.5" /> بالموبايل
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="email" className="mt-4">
                      <form onSubmit={handleSignUpEmail} className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="su-name">الاسم الكامل</Label>
                          <Input
                            id="su-name"
                            value={suName}
                            onChange={(e) => setSuName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="su-email">البريد الإلكتروني</Label>
                          <Input
                            id="su-email"
                            type="email"
                            value={suEmail}
                            onChange={(e) => setSuEmail(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="su-pass">كلمة المرور</Label>
                          <Input
                            id="su-pass"
                            type="password"
                            value={suPassword}
                            onChange={(e) => setSuPassword(e.target.value)}
                            minLength={6}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                          إنشاء الحساب
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="phone" className="mt-4">
                      <form onSubmit={handleSignUpPhone} className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="sp-name">الاسم الكامل</Label>
                          <Input
                            id="sp-name"
                            value={spName}
                            onChange={(e) => setSpName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sp-phone">رقم الموبايل</Label>
                          <Input
                            id="sp-phone"
                            type="tel"
                            placeholder="01xxxxxxxxx"
                            value={spPhone}
                            onChange={(e) => setSpPhone(e.target.value)}
                            required
                          />
                          <p className="text-xs text-muted-foreground">
                            يمكن استخدام نفس الرقم لأكثر من حساب دون رفض.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sp-pass">كلمة المرور</Label>
                          <Input
                            id="sp-pass"
                            type="password"
                            value={spPassword}
                            onChange={(e) => setSpPassword(e.target.value)}
                            minLength={6}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                          إنشاء الحساب
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-card px-2 text-muted-foreground">أو</span>
                    </div>
                  </div>
                  <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
                    <svg className="h-4 w-4 me-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    الدخول بحساب Google
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex flex-col items-center text-xs text-muted-foreground">
              <p>بإنشائك حسابًا، فأنت توافق على سياسة استخدام المنصة.</p>
              <p className="mt-1">في حال نسيان كلمة المرور، يُرجى التواصل مع إدارة المقرأة.</p>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Brand panel (left in RTL) */}
      <div className="hidden lg:flex w-1/2 bg-primary text-primary-foreground p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern opacity-20" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl overflow-hidden bg-primary-foreground/15 backdrop-blur relative">
            <Image src="/logo.png" alt="دار منة الرحمن" fill className="object-cover scale-150" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">دار منة الرحمن</h1>
            <p className="text-primary-foreground/80 text-sm">نظام إدارة المقرأة الذكي</p>
          </div>
        </div>
        <div className="relative z-10 space-y-6">
          <h2 className="text-3xl font-bold leading-snug">
            منصة متكاملة لإدارة حلقات تحفيظ القرآن الكريم
          </h2>
          <ul className="space-y-3 text-primary-foreground/90">
            {[
              'حضور وغياب وخصومات مالية تلقائية',
              'نقاط ومكافآت وامتحانات ولوحة صدارة',
              'أنشطة: رحلات وحجز ملاعب كرة القدم',
              'تواصل مباشر مع أولياء الأمور عبر واتساب',
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-accent" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-primary-foreground/70 text-sm">
          «خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ»
        </p>
      </div>
    </div>
  );
}
