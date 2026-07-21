'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/shared/providers/auth-provider';
import { DashboardShell } from '@/shared/components/dashboard-shell';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/auth');
      return;
    }
    if (!profile) return; // still loading profile

    // Students must complete profile before accessing anything else
    if (
      profile.role === 'student' &&
      !profile.profile_completed &&
      pathname !== '/dashboard/complete-profile'
    ) {
      router.replace('/dashboard/complete-profile');
    }
  }, [session, profile, loading, pathname, router]);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        جارٍ تجهيز حسابك…
      </div>
    );
  }

  // If student hasn't completed profile and is on the complete-profile page, render it bare
  if (
    profile.role === 'student' &&
    !profile.profile_completed &&
    pathname === '/dashboard/complete-profile'
  ) {
    return <div className="min-h-screen bg-muted/30">{children}</div>;
  }

  return <DashboardShell>{children}</DashboardShell>;
}
