'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  ArrowLeft, User, Phone, Mail, Building2, CreditCard, 
  PlusCircle, AlertTriangle, CheckCircle2, Clock, ChevronRight 
} from 'lucide-react';
import { Customer, FinancingAccount } from '@/core/store/memory-store';
import { RealTimeAccountStatus } from '@/core/financing/types';

interface ExtendedAccount extends FinancingAccount {
  realtimeStatus: RealTimeAccountStatus;
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [accounts, setAccounts] = useState<ExtendedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/customers/${id}`)
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setCustomer(json.data.customer);
          setAccounts(json.data.accounts);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-12 text-center text-slate-500">Loading customer profile...</div>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout>
        <div className="p-12 text-center text-slate-500">Customer profile not found.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link
              href="/customers"
              className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{customer.fullName}</h1>
              <p className="text-xs text-slate-500">CIF Master File • {customer.idType}: {customer.idNumber}</p>
            </div>
          </div>

          <Link
            href={`/financing/new?customerId=${customer.id}`}
            className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Apply New Financing</span>
          </Link>
        </div>

        {/* Customer Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identity Details</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-500 text-xs block">Full Legal Name</span>
                <span className="font-semibold text-slate-900">{customer.fullName}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block">Document Type &amp; ID</span>
                <span className="font-semibold text-slate-900">{customer.idType} - {customer.idNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block">CIF Created Date</span>
                <span className="text-slate-700 text-xs">{new Date(customer.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-900">{customer.phone}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-slate-700 text-xs">{customer.email || 'No email provided'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block">Registered Address</span>
                <span className="text-slate-700 text-xs">{customer.address || 'No address provided'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Disbursement Account</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-500 text-xs block">Bank Name</span>
                <span className="font-semibold text-slate-900">{customer.bankName || 'Not Set'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-xs block">Account Number</span>
                <span className="font-semibold text-slate-900 font-mono">{customer.bankAccountNo || 'Not Set'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financing Accounts for this Customer */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Financing Facilities ({accounts.length})</h2>
              <p className="text-xs text-slate-500">Loan accounts opened by this borrower with your institute</p>
            </div>
            <Link
              href={`/financing/new?customerId=${customer.id}`}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
            >
              <span>+ New Loan</span>
            </Link>
          </div>

          {accounts.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No financing facilities have been opened for this customer yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase border-b border-slate-200">
                    <th className="p-3.5">Account No</th>
                    <th className="p-3.5">Principal</th>
                    <th className="p-3.5">Tenor / Rate</th>
                    <th className="p-3.5">Monthly Installment</th>
                    <th className="p-3.5">Due State (Real-Time)</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accounts.map(acc => {
                    const rt = acc.realtimeStatus;
                    return (
                      <tr key={acc.id} className="hover:bg-slate-50">
                        <td className="p-3.5 font-bold text-slate-900">{acc.accountNo}</td>
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
                          <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
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
