'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Building2, Users, CreditCard, Calculator, ShieldCheck, 
  DollarSign, LayoutDashboard, LogOut, User as UserIcon, PlusCircle
} from 'lucide-react';

interface SessionData {
  userId: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: string;
  tenantName: string;
  tenantCode: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSession(data.data);
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/v1/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium">
        Authenticating and loading institute workspace...
      </div>
    );
  }

  if (!session) return null;

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Borrowers (CIF)', href: '/customers', icon: Users },
    { name: 'Financing Facilities', href: '/financing', icon: CreditCard },
    { name: 'New Loan Calculator', href: '/financing/new', icon: Calculator },
    { name: 'Early Settlement', href: '/settlement', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Left Sidebar */}
      <aside className="w-full lg:w-64 bg-slate-900 text-slate-200 flex flex-col justify-between border-r border-slate-800 shrink-0">
        <div>
          {/* Brand & Institute */}
          <div className="p-5 border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="bg-indigo-600 text-white p-2 rounded-xl font-bold shadow-md">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-base font-bold text-white tracking-tight">FlexiFinancing</div>
                <div className="text-[11px] text-indigo-400 font-medium uppercase tracking-wider">Lending Core SaaS</div>
              </div>
            </div>

            {/* Current Subscribed Institute */}
            <div className="mt-4 bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subscribed Institute</div>
              <div className="text-sm font-bold text-white mt-0.5 truncate">{session.tenantName}</div>
              <div className="flex items-center mt-1.5 text-[10px] text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                <span>Isolated DB (Code: {session.tenantCode})</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Quick Actions in Sidebar */}
          <div className="p-4 mx-3 mt-4 bg-slate-800/40 rounded-xl border border-slate-800 space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Actions</div>
            <Link
              href="/customers/new"
              className="flex items-center space-x-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition"
            >
              <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>Register Borrower</span>
            </Link>
            <Link
              href="/financing/new"
              className="flex items-center space-x-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Create Financing</span>
            </Link>
          </div>
        </div>

        {/* User Profile & Logout in Sidebar footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{session.fullName}</div>
                <div className="text-[10px] text-slate-400 truncate">{session.email}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-semibold text-slate-700">{session.tenantName}</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
              Tenant ID: {session.tenantId.substring(0, 8)}...
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Row-Level Security Active
            </div>
            <button
              onClick={handleLogout}
              className="text-xs font-semibold text-slate-600 hover:text-rose-600 flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-rose-200 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
