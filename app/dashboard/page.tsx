'use client';

import Link from 'next/link';
import { useAuth } from '@/shared/providers/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { roleLabels } from '@/shared/lib/roles';
import { navItems } from '@/shared/lib/nav';
import { BookOpen, ChevronLeft, Sparkles } from 'lucide-react';

export default function DashboardHome() {
  const { profile } = useAuth();
  if (!profile) return null;

  const items = navItems(profile.role);

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card to-accent/10">
        <div className="absolute inset-0 bg-pattern opacity-40" />
        <CardContent className="relative z-10 py-8">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">لوحة التحكم</span>
          </div>
          <h1 className="text-3xl font-bold mb-1">
            أهلًا بك، {profile.display_name || 'بني آدم'} 👋
          </h1>
          <p className="text-muted-foreground">
            دورك الحالي: <span className="font-semibold text-foreground">{roleLabels[profile.role]}</span>
          </p>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">اختصارات</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.slice(1).map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="group hover:shadow-md hover:border-primary/40 transition-all hover:-translate-y-0.5 cursor-pointer h-full">
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{item.label}</span>
                    <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <Card className="bg-primary text-primary-foreground border-0">
        <CardContent className="py-6 flex items-center gap-4">
          <BookOpen className="h-10 w-10 shrink-0" />
          <p className="text-sm leading-relaxed">
            «مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ طَرِيقًا إِلَى الْجَنَّةِ»
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
