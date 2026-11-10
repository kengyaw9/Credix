'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  CreditCard, PlusCircle, AlertTriangle, CheckCircle2, 
  Clock, ChevronRight, Search, ArrowLeft 
} from 'lucide-react';
import { FinancingAccount } from '@/core/store/memory-store';
import { RealTimeAccountStatus } from '@/core/financing/types';

interface ExtendedAccount extends FinancingAccount {
  customerName: string;
  customerIdNumber: string;
  realtimeStatus: RealTimeAccountStatus;
}

export default function FinancingListPage() {
  const [accounts, setAccounts] = useState<ExtendedAccount[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'OVERDUE' | 'DRAFT' | 'SETTLED'>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/financing/accounts')
      .then(res => res.json())
      .then(json => {
        if (json.success) setAccounts(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = accounts.filter(acc => {
    const matchesSearch = 
      acc.accountNo.toLowerCase().includes(search.toLowerCase()) ||
      acc.customerName.toLowerCase().includes(search.toLowerCase()) ||
      acc.customerIdNumber.includes(search);

    if (!matchesSearch) return false;

    if (filter === 'ACTIVE') return acc.status === 'ACTIVE';
    if (filter === 'DRAFT') return acc.status === 'DRAFT';
    if (filter === 'SETTLED') return acc.status === 'SETTLED';
    if (filter === 'OVERDUE') return acc.realtimeStatus?.accountStatus === 'OVERDUE';
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financing Facilities</h1>
            <p className="text-xs text-slate-500 mt-1">
              Loan register, due installments, and repayment waterfall tracking
            </p>
          </div>

          <Link
            href="/customers?selectForLoan=true"
            className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Loan</span>
          </Link>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2 bg-slate-200/60 p-1 rounded-xl text-xs font-semibold">
            {(['ALL', 'ACTIVE', 'OVERDUE', 'DRAFT', 'SETTLED'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                  filter === tab
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search account no or borrower..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>
        </div>

        {/* Facilities Table */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading financing accounts...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <p>No financing accounts match the selected filter.</p>
              <Link
                href="/financing/new"
                className="inline-flex items-center text-xs font-bold text-indigo-600 bg-indigo-50 px-3.5 py-2 rounded-xl"
              >
                Create a new facility now &rarr;
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="p-4">Account / Borrower</th>
                    <th className="p-4">Principal</th>
                    <th className="p-4">Tenor / Rate</th>
                    <th className="p-4">Installment</th>
                    <th className="p-4">Due State (Real-Time)</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(acc => {
                    const rt = acc.realtimeStatus;
                                        return (
                      <tr key={acc.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div>
                              <Link href={`/financing/${acc.id}`} className="font-bold text-slate-900 hover:text-indigo-600 transition block">
                                {acc.accountNo}
                              </Link>
                              <div className="text-xs text-slate-500">{acc.customerName} ({acc.customerIdNumber})</div>
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
                              Fully Settled
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                              Current (On Time)
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
                            <span>Manage Loan</span>
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
