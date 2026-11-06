'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, ShieldCheck, Lock, Mail, ArrowRight, 
  Sparkles, CheckCircle2, ChevronRight, Landmark, Layers
} from 'lucide-react';

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
        setError(data.error || 'Invalid credentials');
      }
    } catch {
      setError('Connection failed. Please try again.');
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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background ambient decorative glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-600/20 to-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-xl shadow-indigo-500/25 border border-indigo-400/20">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Credix</h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Cloud Multi-Tenant Lending Core • Real-Time Zero-Batch Architecture
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-7 shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
            <div>
              <h2 className="text-sm font-bold text-white">Institute Staff Login</h2>
              <p className="text-[11px] text-slate-400">Sign in to your financial institute workspace</p>
            </div>
            <span className="flex items-center text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
              Isolated DB
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center space-x-2">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Staff Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  placeholder="officer@institute.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold py-3 rounded-xl text-sm transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Authenticating...' : 'Enter Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick-Test Institution Selector */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <span>Quick Test Sign In</span>
              <span className="text-[10px] text-indigo-400 lowercase font-normal">Click to switch</span>
            </div>

            <button
              type="button"
              onClick={() => handleQuickLogin('officer@apex.com', 'password123')}
              className="w-full text-left p-3.5 rounded-2xl bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 hover:border-indigo-500/50 transition flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0">
                  APX
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition">
                    Apex Credit Capital Sdn Bhd
                  </div>
                  <div className="text-[11px] text-slate-500">officer@apex.com • Tenant 1</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition" />
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('officer@metro.com', 'password123')}
              className="w-full text-left p-3.5 rounded-2xl bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 hover:border-emerald-500/50 transition flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
                  MM
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition">
                    Metro Micro-Financing Ltd
                  </div>
                  <div className="text-[11px] text-slate-500">officer@metro.com • Tenant 2</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition" />
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-center space-x-4 text-[11px] text-slate-500">
          <span>Row-Level Security (RLS)</span>
          <span>•</span>
          <span>Zero Night Batch</span>
          <span>•</span>
          <span>SaaS Shared DB</span>
        </div>
      </div>
    </div>
  );
}
