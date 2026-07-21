'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/shared/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { roleLabels, roleColors } from '@/shared/lib/roles';
import { navItems } from '@/shared/lib/nav';
import { BookOpen, LogOut, Menu, User as UserIcon, ChevronLeft } from 'lucide-react';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!profile) return null;
  const items = navItems(profile.role);
  const initials = (profile.display_name || profile.email || '?').slice(0, 1);

  async function handleSignOut() {
    await signOut();
    router.replace('/auth');
  }

  const NavList = (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-muted/30 flex" dir="rtl">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex w-64 flex-col border-s border-border bg-card">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border">
          <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="font-bold text-sm">دار منة الرحمن</p>
            <p className="text-[10px] text-muted-foreground">إدارة المقرأة</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">{NavList}</div>
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-muted/50">
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile.photo_url ?? undefined} />
              <AvatarFallback className="bg-primary/15 text-primary text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">
                {profile.display_name || 'بدون اسم'}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {roleLabels[profile.role]}
              </p>
            </div>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSignOut} title="خروج">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur sticky top-0 z-30 flex items-center gap-3 px-4 lg:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 p-0">
              <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border">
                <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="leading-tight">
                  <p className="font-bold text-sm">دار منة الرحمن</p>
                  <p className="text-[10px] text-muted-foreground">إدارة المقرأة</p>
                </div>
              </div>
              {NavList}
            </SheetContent>
          </Sheet>

          <div className="flex-1">
            <h2 className="font-semibold text-sm lg:text-base">
              {items.find((i) => pathname === i.href || pathname.startsWith(i.href + '/'))?.label ?? 'لوحة التحكم'}
            </h2>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile.photo_url ?? undefined} />
                  <AvatarFallback className="bg-primary/15 text-primary text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-xs font-medium">
                  {profile.display_name || 'حسابي'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{profile.display_name || 'بدون اسم'}</span>
                  <span className={cn('text-[10px] font-medium', roleColors[profile.role])}>
                    {roleLabels[profile.role]}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 me-2" />
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-4 lg:p-6 animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
