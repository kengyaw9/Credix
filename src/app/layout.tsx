import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FlexiFinancing - Multi-Tenant Cloud Lending Platform',
  description: 'Zero-batch multi-tenant financing and loan management system for small financial institutions',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
