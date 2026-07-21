import './globals.css';
import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import { AuthProvider } from '@/shared/providers/auth-provider';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'دار منة الرحمن | نظام إدارة المقرأة',
  description: 'منصة ذكية لإدارة حلقات تحفيظ القرآن الكريم — شباب وسيدات',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${cairo.variable} font-cairo antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
