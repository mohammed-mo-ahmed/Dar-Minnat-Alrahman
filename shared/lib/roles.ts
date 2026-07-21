import { Role } from '@/shared/types';
import { cn } from '@/lib/utils';

export const roleLabels: Record<Role, string> = {
  admin: 'مدير النظام',
  sheikh: 'شيخ / مسؤولة مجموعة',
  guardian: 'ولي أمر',
  student: 'طالب',
};

export const roleColors: Record<Role, string> = {
  admin: 'text-primary font-semibold',
  sheikh: 'text-blue-600 font-semibold',
  guardian: 'text-amber-600 font-semibold',
  student: 'text-muted-foreground font-semibold',
};

export const financeTypeLabels: Record<string, string> = {
  deduction: 'خصومات',
  subscription: 'اشتراك شهري',
  none: 'بدون',
};

export const feeModeLabels: Record<string, string> = {
  per_student: 'لكل طالب',
  per_group: 'موحّد للمجموعة',
};

export const attendanceLabels: Record<string, string> = {
  present_memorized: 'حاضر وحفظ',
  present_not_memorized: 'حاضر ولم يحفظ',
  absent_unexcused: 'غائب بدون عذر',
  absent_excused: 'غائب بعذر',
};

export const attendanceColors: Record<string, string> = {
  present_memorized: 'bg-success/15 text-success border-success/30',
  present_not_memorized: 'bg-warning/15 text-warning border-warning/30',
  absent_unexcused: 'bg-destructive/15 text-destructive border-destructive/30',
  absent_excused: 'bg-muted text-muted-foreground border-border',
};

export const financeTypeLabelsLedger: Record<string, string> = {
  absence_deduction: 'خصم غياب',
  no_memorization_deduction: 'خصم عدم حفظ',
  subscription: 'اشتراك شهري',
  activity_fee: 'رسوم نشاط',
  payment: 'دفعة',
  adjustment: 'تعديل',
};

export function formatMoney(n: number): string {
  return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(n) + ' ج.م';
}

export function formatDate(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

export function monthKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('ar-EG', { month: 'long', year: 'numeric' }).format(new Date(y, m - 1));
}

export { cn };
