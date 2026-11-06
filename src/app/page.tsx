'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  Users, CreditCard, ArrowUpRight, AlertTriangle, 
  PlusCircle, Calculator, ChevronRight, DollarSign, 
  Sparkles, TrendingUp, ArrowRight, FileText
} from 'lucide-react';
import { Customer, FinancingAccount } from '@/core/store/memory-store';
import { RealTimeAccountStatus } from '@/core/financing/types';

interface ExtendedAccount extends FinancingAccount {
  realtimeStatus: RealTimeAccountStatus;
}

export default function DashboardOverviewPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<ExtendedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/customers').then(res => res.json()),
      fetch('/api/v1/financing/accounts').then(res => res.json()),
    ])
      .then(([custRes, accRes]) => {
        if (custRes.success) setCustomers(custRes.data);
        if (accRes.success) setAccounts(accRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalDisbursed = accounts.reduce((acc, curr) => acc + (curr.disbursedAmount || 0), 0);
  const totalArrears = accounts.reduce((acc, curr) => acc + (curr.realtimeStatus?.totalArrearsDue || 0), 0);
  const activeCount = accounts.filter(a => a.status === 'ACTIVE').length;
  const overdueCount = accounts.filter(a => a.realtimeStatus?.accountStatus === 'OVERDUE').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Hero Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-7 rounded-3xl shadow-lg border border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="inline-flex items-center space-x-2 text-[11px] font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-400/20 px-3 py-1 rounded-full">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Zero-Batch Real-Time Engine Active</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Main Dashboard</h1>
              <p className="text-xs text-slate-300 max-w-xl">
                Continuous dynamic ledger. Select any module below to manage borrowers, facilities, or early settlement.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/customers/new"
                className="inline-flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-white/10 transition shadow-sm"
              >
                <PlusCircle className="w-4 h-4 text-indigo-300" />
                <span>Register Borrower</span>
              </Link>
              <Link
                href="/financing/new"
                className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/30 transition"
              >
                <Calculator className="w-4 h-4" />
                <span>New Facility Calculator</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Facilities</span>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-3">{activeCount} Accounts</div>
            <div className="text-xs text-slate-500 mt-1">{accounts.length} total facilities registered</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Disbursed</span>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-3">
              <span className="text-xs text-slate-400 font-semibold mr-1">RM</span>
              {totalDisbursed.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center text-xs text-emerald-600 font-semibold mt-1">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              <span>Capital in circulation</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Real-Time Arrears</span>
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-rose-600 mt-3">
              <span className="text-xs text-rose-400 font-semibold mr-1">RM</span>
              {totalArrears.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {overdueCount} accounts behind schedule
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Registered Borrowers</span>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-3">{customers.length} Profiles</div>
            <div className="text-xs text-slate-500 mt-1">CIF Lite master records</div>
          </div>
        </div>

        {/* 3 Main Module Cards - One Page at a Time Flow */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            System Modules
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: CIF */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs hover:shadow-md transition flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Borrower Information (CIF)</h2>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    View borrower directory, register new profiles, and manage disbursement bank accounts.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">{customers.length} Registered</span>
                <Link
                  href="/customers"
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl shadow-sm transition"
                >
                  <span>Open CIF Module</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Card 2: Financing Facilities */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs hover:shadow-md transition flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Financing Facilities</h2>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    View loan accounts, monitor real-time due installments, disburse payouts, and record repayments.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">{accounts.length} Facilities</span>
                <Link
                  href="/financing"
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl shadow-sm transition"
                >
                  <span>Open Facilities</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Card 3: Early Settlement */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs hover:shadow-md transition flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Early Settlement &amp; Rebate</h2>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Compute instant payoff quotations with unearned profit rebate (Ibra&apos;) and discharge facilities.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">{activeCount} Eligible</span>
                <Link
                  href="/settlement"
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl shadow-sm transition"
                >
                  <span>Open Settlement</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
