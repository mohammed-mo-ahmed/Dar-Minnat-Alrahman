import { Role } from '@/shared/types';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  Wallet,
  Trophy,
  PartyPopper,
  UserCog,
  ClipboardList,
  BookOpen,
  HeartHandshake,
  Send,
  UserPlus,
} from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

export function navItems(role: Role): NavItem[] {
  switch (role) {
    case 'admin':
      return [
        { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
        { href: '/dashboard/users', label: 'المستخدمون والأدوار', icon: UserCog },
        { href: '/dashboard/groups', label: 'الأقسام والمجموعات', icon: Users },
        { href: '/dashboard/students', label: 'الطلاب', icon: GraduationCap },
        { href: '/dashboard/attendance', label: 'الحضور والغياب', icon: CalendarCheck },
        { href: '/dashboard/finance', label: 'الحسابات المالية', icon: Wallet },
        { href: '/dashboard/points', label: 'النقاط والمكافآت', icon: Trophy },
        { href: '/dashboard/activities', label: 'الأنشطة', icon: PartyPopper },
        { href: '/dashboard/guardian-requests', label: 'طلبات أولياء الأمور', icon: ClipboardList },
        { href: '/dashboard/rewards', label: 'المكافآت', icon: HeartHandshake },
      ];
    case 'sheikh':
      return [
        { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
        { href: '/dashboard/students', label: 'طلاب مجموعتي', icon: GraduationCap },
        { href: '/dashboard/attendance', label: 'الحضور والغياب', icon: CalendarCheck },
        { href: '/dashboard/finance', label: 'الحسابات المالية', icon: Wallet },
        { href: '/dashboard/points', label: 'النقاط والمكافآت', icon: Trophy },
        { href: '/dashboard/activities', label: 'الأنشطة', icon: PartyPopper },
        { href: '/dashboard/rewards', label: 'صرف المكافآت', icon: HeartHandshake },
      ];
    case 'guardian':
      return [
        { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
        { href: '/dashboard/my-children', label: 'أبنائي', icon: GraduationCap },
        { href: '/dashboard/guardian-request', label: 'تقديم طلب ربط', icon: UserPlus },
      ];
    case 'student':
      return [
        { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
        { href: '/dashboard/my-progress', label: 'تقدمي', icon: BookOpen },
        { href: '/dashboard/leaderboard', label: 'لوحة الصدارة', icon: Trophy },
        { href: '/dashboard/rewards', label: 'المكافآت', icon: HeartHandshake },
        { href: '/dashboard/activities', label: 'الأنشطة', icon: PartyPopper },
      ];
  }
}
