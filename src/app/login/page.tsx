'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ShieldCheck, Lock, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('officer@apex.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPassword?: string) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    const loginEmail = customEmail || email;
    const loginPassword = customPassword || password;

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'Failed to sign in');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
    handleLogin(undefined, quickEmail, quickPass);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 selection:bg-indigo-500 selection:text-white">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">FlexiFinancing Core</h1>
          <p className="text-sm text-slate-400">
            Cloud Multi-Tenant Lending &amp; Financing SaaS
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700">
            <span className="text-sm font-semibold text-slate-200">Financial Institute Sign In</span>
            <span className="flex items-center text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />
              RLS Isolated DB
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Staff / Officer Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                  placeholder="name@institute.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-sm transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Login for Testing */}
          <div className="pt-4 border-t border-slate-700/80 space-y-2.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
              Quick Test Accounts (Click to Sign In)
            </div>

            <button
              type="button"
              onClick={() => handleQuickLogin('officer@apex.com', 'password123')}
              className="w-full text-left p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-700 hover:border-indigo-500/50 transition flex items-center justify-between group"
            >
              <div>
                <div className="text-xs font-bold text-indigo-300 group-hover:text-indigo-200">
                  Apex Credit Capital Sdn Bhd
                </div>
                <div className="text-[11px] text-slate-400">officer@apex.com (Tenant 1)</div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-slate-500 group-hover:text-indigo-400" />
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('officer@metro.com', 'password123')}
              className="w-full text-left p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-700 hover:border-emerald-500/50 transition flex items-center justify-between group"
            >
              <div>
                <div className="text-xs font-bold text-emerald-300 group-hover:text-emerald-200">
                  Metro Micro-Financing Ltd
                </div>
                <div className="text-[11px] text-slate-400">officer@metro.com (Tenant 2)</div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500">
          FlexiFinancing SaaS • Multi-Tenant Shared Database Architecture
        </div>
      </div>
    </div>
  );
}
