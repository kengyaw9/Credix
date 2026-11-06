'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  Users, CreditCard, ArrowUpRight, AlertTriangle, 
  PlusCircle, Calculator, ChevronRight, CheckCircle2, Clock,
  DollarSign, Sparkles, TrendingUp
} from 'lucide-react';
import { Customer, FinancingAccount } from '@/core/store/memory-store';
import { RealTimeAccountStatus } from '@/core/financing/types';

interface ExtendedAccount extends FinancingAccount {
  customerName: string;
  customerIdNumber: string;
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
        {/* Welcome & Quick Actions Hero */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-7 rounded-3xl shadow-lg border border-slate-800">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="inline-flex items-center space-x-2 text-[11px] font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-400/20 px-3 py-1 rounded-full">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Zero-Batch Real-Time Engine Active</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Financing Portfolio</h1>
              <p className="text-xs text-slate-300 max-w-xl">
                Continuous dynamic ledger. Interest accrual, arrears aging, and settlement rebate calculated on-demand with zero overnight batch locks.
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
            <div className="flex items-center text-xs text-slate-500 mt-1">
              <span>{accounts.length} total facilities</span>
            </div>
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
              <span>Capital circulating</span>
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
              {overdueCount} accounts overdue (On-demand)
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Registered CIF</span>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 mt-3">{customers.length} Profiles</div>
            <div className="text-xs text-slate-500 mt-1">Isolated to this institute</div>
          </div>
        </div>

        {/* Facilities Table */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Financing Facilities</h2>
              <p className="text-xs text-slate-500">Live dynamic status and payment aging</p>
            </div>
            <Link
              href="/financing"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
            >
              <span>View All Facilities</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-400 text-xs">Loading facilities...</div>
          ) : accounts.length === 0 ? (
            <div className="p-16 text-center text-slate-500 space-y-3">
              <p className="text-sm">No financing facilities found.</p>
              <Link
                href="/financing/new"
                className="inline-flex items-center text-xs font-bold text-indigo-600 bg-indigo-50 px-3.5 py-2 rounded-xl hover:bg-indigo-100 transition"
              >
                Create your first loan facility &rarr;
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="p-4">Borrower &amp; Facility</th>
                    <th className="p-4">Principal</th>
                    <th className="p-4">Tenor &amp; Rate</th>
                    <th className="p-4">Installment</th>
                    <th className="p-4">Due State (Real-Time)</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accounts.slice(0, 6).map(acc => {
                    const rt = acc.realtimeStatus;
                    const initials = acc.customerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                    return (
                      <tr key={acc.id} className="hover:bg-slate-50/60 transition group">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-150 shrink-0">
                              {initials}
                            </div>
                            <div>
                              <Link href={`/financing/${acc.id}`} className="font-bold text-slate-900 hover:text-indigo-600 transition block">
                                {acc.accountNo}
                              </Link>
                              <div className="text-xs text-slate-500">{acc.customerName} • {acc.customerIdNumber}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-bold text-slate-800">
                          <span className="text-[11px] text-slate-400 font-normal mr-1">RM</span>
                          {acc.principalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-xs text-slate-600">
                          <div className="font-semibold text-slate-800">{acc.tenorMonths} Mos @ {acc.profitRatePA}% p.a.</div>
                          <div className="text-slate-400 capitalize">{acc.calcMethod.toLowerCase().replace('_', ' ')}</div>
                        </td>
                        <td className="p-4 font-bold text-slate-800">
                          <span className="text-[11px] text-slate-400 font-normal mr-1">RM</span>
                          {acc.monthlyInstallment.toFixed(2)}
                        </td>
                        <td className="p-4">
                          {rt?.accountStatus === 'OVERDUE' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-500" />
                              OVERDUE ({rt.daysPastDue} DPD)
                            </span>
                          ) : rt?.accountStatus === 'DUE' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3.5 h-3.5 mr-1 text-amber-500" />
                              Due Today
                            </span>
                          ) : rt?.accountStatus === 'SETTLED' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                              Settled
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                              Current
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full ${
                            acc.status === 'ACTIVE'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : acc.status === 'DRAFT'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {acc.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <Link
                            href={`/financing/${acc.id}`}
                            className="inline-flex items-center space-x-1 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-3.5 py-1.5 rounded-xl transition"
                          >
                            <span>Manage</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
