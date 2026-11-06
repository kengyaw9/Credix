'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Building2, Users, CreditCard, Calculator, ShieldCheck, 
  DollarSign, LayoutDashboard, LogOut, PlusCircle,
  Menu, X
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold tracking-wide uppercase">Loading Workspace...</p>
      </div>
    );
  }

  if (!session) return null;

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Borrowers (CIF)', href: '/customers', icon: Users },
    { name: 'Financing Facilities', href: '/financing', icon: CreditCard },
    { name: 'Loan Simulator', href: '/calculator', icon: Calculator },
    { name: 'Early Settlement', href: '/settlement', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row antialiased">
      {/* Mobile Top Bar */}
      <div className="lg:hidden bg-slate-950 border-b border-slate-800 p-4 flex items-center justify-between text-white">
        <div className="flex items-center space-x-2">
          <div className="bg-indigo-600 p-2 rounded-xl">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight">{session.tenantName}</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Left Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-950 text-slate-200 flex flex-col justify-between border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div>
          {/* Brand Header */}
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white p-2.5 rounded-2xl shadow-lg shadow-indigo-600/30">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-base font-extrabold text-white tracking-tight leading-none">Credix</div>
                <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">Lending Core SaaS</div>
              </div>
            </div>

            {/* Current Subscribed Institute Card */}
            <div className="mt-5 bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Institute</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-xs font-bold text-white mt-1 truncate">{session.tenantName}</div>
              <div className="flex items-center mt-2 text-[10px] text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 mr-1 shrink-0" />
                <span className="truncate">RLS Isolated • {session.tenantCode}</span>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <div className="px-3 py-4 space-y-1">
            <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Navigation
            </div>
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Quick Shortcuts */}
          <div className="p-4 mx-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Actions</div>
            <Link
              href="/customers/new"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 p-2 rounded-xl transition"
            >
              <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>Register Borrower</span>
            </Link>
            <Link
              href="/customers?selectForLoan=true"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 p-2 rounded-xl transition"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>New Loan</span>
            </Link>
          </div>
        </div>

        {/* User Identity in Sidebar Footer (No duplicate logout button here) */}
        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
              {session.fullName.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">{session.fullName}</div>
              <div className="text-[10px] text-slate-400 truncate">{session.role} • {session.email}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar with the ONLY Sign Out button */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-bold text-slate-900">{session.tenantName}</span>
            <span className="hidden sm:inline-flex text-[11px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-mono border border-slate-200">
              Institute Code: {session.tenantCode}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Row-Level Security Active
            </div>
            {/* The single official Sign Out button */}
            <button
              onClick={handleLogout}
              className="text-xs font-bold text-slate-700 hover:text-rose-600 flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50/50 transition cursor-pointer"
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
