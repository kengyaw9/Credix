'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  Users, CreditCard, ArrowUpRight, AlertTriangle, 
  PlusCircle, Calculator, ChevronRight, CheckCircle2, Clock
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
        {/* Welcome & Quick Actions Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financing Portfolio Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">
              Real-time portfolio overview, overdue monitoring, and quick operations.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/customers/new"
              className="inline-flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl transition"
            >
              <PlusCircle className="w-4 h-4 text-indigo-600" />
              <span>Register Borrower</span>
            </Link>
            <Link
              href="/financing/new"
              className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition"
            >
              <Calculator className="w-4 h-4" />
              <span>New Loan Calculator</span>
            </Link>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Facilities</span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-3">{activeCount} Accounts</div>
            <div className="text-xs text-slate-500 mt-1">{accounts.length} total facilities registered</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Disbursed</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-3">
              RM {totalDisbursed.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-emerald-600 mt-1">Net capital released to borrowers</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Overdue (Arrears)</span>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-rose-600 mt-3">
              RM {totalArrears.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {overdueCount} accounts behind schedule (Zero-Batch)
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Borrowers</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-3">{customers.length} Profiles</div>
            <div className="text-xs text-slate-500 mt-1">CIF Lite master records</div>
          </div>
        </div>

        {/* Recent Financing Facilities Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
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
            <div className="p-12 text-center text-slate-500">Loading portfolio data...</div>
          ) : accounts.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <p>No financing accounts found in this institute yet.</p>
              <Link
                href="/financing/new"
                className="inline-flex items-center text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg"
              >
                Create your first financing facility &rarr;
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase border-b border-slate-200">
                    <th className="p-3.5">Account / Borrower</th>
                    <th className="p-3.5">Principal</th>
                    <th className="p-3.5">Tenor / Rate</th>
                    <th className="p-3.5">Monthly Installment</th>
                    <th className="p-3.5">Real-Time Due State</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accounts.slice(0, 5).map(acc => {
                    const rt = acc.realtimeStatus;
                    return (
                      <tr key={acc.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5">
                          <Link href={`/financing/${acc.id}`} className="font-semibold text-indigo-600 hover:underline">
                            {acc.accountNo}
                          </Link>
                          <div className="text-xs text-slate-500">{acc.customerName} ({acc.customerIdNumber})</div>
                        </td>
                        <td className="p-3.5 font-medium text-slate-800">
                          RM {acc.principalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3.5 text-xs text-slate-600">
                          {acc.tenorMonths} Mos @ {acc.profitRatePA}% p.a.
                        </td>
                        <td className="p-3.5 font-medium text-slate-800">
                          RM {acc.monthlyInstallment.toFixed(2)}
                        </td>
                        <td className="p-3.5">
                          {rt?.accountStatus === 'OVERDUE' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              OVERDUE ({rt.daysPastDue} DPD)
                            </span>
                          ) : rt?.accountStatus === 'DUE' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3 mr-1" />
                              Due Today
                            </span>
                          ) : rt?.accountStatus === 'SETTLED' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Settled
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                              Current
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                            acc.status === 'ACTIVE'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : acc.status === 'DRAFT'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {acc.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <Link
                            href={`/financing/${acc.id}`}
                            className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition"
                          >
                            <span>Manage</span>
                            <ChevronRight className="w-3 h-3" />
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
