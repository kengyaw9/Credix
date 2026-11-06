'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  ArrowLeft, CreditCard, User, AlertTriangle, CheckCircle2, 
  Clock, DollarSign, Calendar, ArrowUpRight, Receipt, FileText,
  ShieldCheck, Banknote, Percent, TrendingUp, History, ListOrdered, Tag, ArrowDownRight, Layers
} from 'lucide-react';
import { Customer, FinancingAccount, FinancingTransaction } from '@/core/store/memory-store';
import { RealTimeAccountStatus, ScheduleItem, SettlementQuotation } from '@/core/financing/types';

interface AccountDetail extends FinancingAccount {
  customer: Customer;
  transactions: FinancingTransaction[];
  realtimeStatus: RealTimeAccountStatus;
}

export default function FinancingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Payment Modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMsg, setPaymentMsg] = useState<string | null>(null);

  // Tab & Filter States
  const [activeTab, setActiveTab] = useState<'SCHEDULE' | 'HISTORY'>('SCHEDULE');
  const [txFilter, setTxFilter] = useState<'ALL' | 'DISBURSEMENT' | 'REPAYMENT' | 'FEE_CHARGE'>('ALL');

  // Settlement Modal
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [settleDate, setSettleDate] = useState(new Date().toISOString().split('T')[0]);
  const [settleQuote, setSettleQuote] = useState<SettlementQuotation | null>(null);

  const loadAccount = async () => {
    try {
      const res = await fetch(`/api/v1/financing/accounts/${id}`);
      const json = await res.json();
      if (json.success) {
        setAccount(json.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccount();
  }, [id]);

  // Disburse Handler
  const handleDisburse = async () => {
    if (!account) return;
    const net = account.principalAmount - (account.processingFee || 0) - (account.stampDutyFee || 0);
    if (!confirm(`Confirm disbursement of Net RM ${net.toFixed(2)} to ${account.customer?.fullName}?`)) return;

    try {
      const res = await fetch(`/api/v1/financing/accounts/${id}/disburse`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Disbursement completed successfully!');
        loadAccount();
      } else {
        alert(data.error);
      }
    } catch {
      alert('Failed to disburse');
    }
  };

  // Payment Handler
  const handleProcessPayment = async () => {
    if (!account || !paymentAmount) return;
    try {
      const res = await fetch(`/api/v1/financing/accounts/${id}/repay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(paymentAmount),
          paymentDate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const wf = data.data.waterfallResult;
        const fee = (wf?.allocatedToLateFee ?? 0).toFixed(2);
        const profit = (wf?.allocatedToProfit ?? 0).toFixed(2);
        const principal = (wf?.allocatedToPrincipal ?? 0).toFixed(2);
        const count = wf?.settledInstallmentsCount ?? 0;
        setPaymentMsg(
          `Payment of RM ${Number(paymentAmount).toFixed(2)} allocated!\n• Late Fees Paid: RM ${fee}\n• Profit Paid: RM ${profit}\n• Principal Paid: RM ${principal}\n• Installments Settled: ${count}`
        );
        loadAccount();
        setTimeout(() => {
          setIsPaymentOpen(false);
          setPaymentMsg(null);
          setPaymentAmount('');
        }, 3000);
      } else {
        alert(data.error);
      }
    } catch {
      alert('Payment processing failed');
    }
  };

  // Get Settlement Quote
  const handleGetSettleQuote = async () => {
    try {
      const res = await fetch(`/api/v1/financing/accounts/${id}/settlement?asOfDate=${settleDate}`);
      const data = await res.json();
      if (data.success) {
        setSettleQuote(data.data.quotation);
      }
    } catch {
      alert('Failed to compute settlement quote');
    }
  };

  // Execute Settlement
  const handleExecuteSettlement = async () => {
    if (!settleQuote) return;
    if (!confirm(`Confirm full early settlement of RM ${settleQuote.netSettlementAmount.toFixed(2)}?`)) return;

    try {
      const res = await fetch(`/api/v1/financing/accounts/${id}/settlement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settlementDate: settleDate }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Account fully settled and closed!');
        setIsSettleOpen(false);
        setSettleQuote(null);
        loadAccount();
      } else {
        alert(data.error);
      }
    } catch {
      alert('Settlement failed');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-16 text-center text-slate-400">Loading facility details...</div>
      </DashboardLayout>
    );
  }

  if (!account) {
    return (
      <DashboardLayout>
        <div className="p-16 text-center text-slate-500">Account not found.</div>
      </DashboardLayout>
    );
  }

  const rt = account.realtimeStatus;
  const paidCount = account.schedule.filter(s => s.status === 'PAID').length;
  const progressPercent = Math.round((paidCount / account.schedule.length) * 100);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header & Main Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center space-x-3">
            <Link
              href="/financing"
              className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200/90 rounded-xl transition shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{account.accountNo}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  account.status === 'ACTIVE'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : account.status === 'DRAFT'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {account.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Borrower: <Link href={`/customers/${account.customerId}`} className="text-indigo-600 font-bold hover:underline">{account.customer?.fullName}</Link> ({account.customer?.idNumber})
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {account.status === 'DRAFT' && (
              <button
                onClick={handleDisburse}
                className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/25 transition cursor-pointer"
              >
                Disburse Payout
              </button>
            )}

            {account.status === 'ACTIVE' && (
              <>
                <button
                  onClick={() => {
                    setPaymentAmount(account.monthlyInstallment.toString());
                    setIsPaymentOpen(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/25 transition cursor-pointer"
                >
                  Record Repayment
                </button>
                <button
                  onClick={() => {
                    setIsSettleOpen(true);
                    handleGetSettleQuote();
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition cursor-pointer"
                >
                  Early Settlement Quote
                </button>
              </>
            )}
          </div>
        </div>

        {/* Progress & Lifecycle Card */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-3xl shadow-md border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">Repayment Progress</span>
              <div className="text-xl font-extrabold mt-0.5">
                {progressPercent}% Completed ({paidCount} of {account.schedule.length} Installments Paid)
              </div>
            </div>
            <div className="text-xs text-slate-300">
              Outstanding Principal: <span className="font-bold text-white">RM {rt?.totalOutstandingBalance.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
            <div
              className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Facility Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Facility Principal</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-2">
              <span className="text-xs text-slate-400 font-semibold mr-1">RM</span>
              {account.principalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">{account.tenorMonths} Mos @ {account.profitRatePA}% p.a.</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Balance</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-2">
              <span className="text-xs text-slate-400 font-semibold mr-1">RM</span>
              {rt?.totalOutstandingBalance.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">Remaining principal balance</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Monthly Installment</span>
            <div className="text-2xl font-extrabold text-indigo-600 mt-2">
              <span className="text-xs text-indigo-400 font-semibold mr-1">RM</span>
              {account.monthlyInstallment.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Total profit: RM {account.totalProfit.toFixed(2)}</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Due State (Real-Time)</span>
            <div className="mt-2">
              {rt?.accountStatus === 'OVERDUE' ? (
                <div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-500" />
                    OVERDUE ({rt.daysPastDue} DPD)
                  </span>
                  <div className="text-xs text-rose-600 font-semibold mt-1">
                    Arrears: RM {rt.totalArrearsDue.toFixed(2)} (+RM {rt.accruedLateFee.toFixed(2)} late fee)
                  </div>
                </div>
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
            </div>
          </div>
        </div>

        {/* Tab Switcher: Repayment Schedule vs. Financial History & Ledger */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('SCHEDULE')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'SCHEDULE'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ListOrdered className="w-4 h-4" />
              <span>Repayment Schedule</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'SCHEDULE' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {paidCount}/{account.schedule.length} Paid
              </span>
            </button>

            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'HISTORY'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Financial Ledger &amp; History</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                activeTab === 'HISTORY' ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {account.transactions.length} Records
              </span>
            </button>
          </div>

          {activeTab === 'HISTORY' && (
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-[11px] font-bold text-slate-400 mr-1 uppercase">Filter:</span>
              {(['ALL', 'DISBURSEMENT', 'REPAYMENT', 'FEE_CHARGE'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setTxFilter(f)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                    txFilter === f
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {f === 'ALL' ? 'All Events' : f === 'FEE_CHARGE' ? 'Fees & Charges' : f.charAt(0) + f.slice(1).toLowerCase() + 's'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* TAB 1: Repayment Schedule */}
        {activeTab === 'SCHEDULE' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="font-bold text-slate-900 text-base">Amortization Schedule</h2>
                <p className="text-xs text-slate-500">Month-by-month installment breakdown and payment allocation</p>
              </div>
              <span className="text-xs text-slate-500 font-mono font-bold">
                {paidCount} / {account.schedule.length} Paid
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-100">
                  <tr>
                    <th className="p-3.5">#</th>
                    <th className="p-3.5">Due Date</th>
                    <th className="p-3.5">Principal Due</th>
                    <th className="p-3.5">Profit Due</th>
                    <th className="p-3.5">Total Installment</th>
                    <th className="p-3.5">Principal Paid</th>
                    <th className="p-3.5">Profit Paid</th>
                    <th className="p-3.5">Ending Balance</th>
                    <th className="p-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {account.schedule.map(item => (
                    <tr key={item.installmentNo} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5 font-bold text-slate-400">{item.installmentNo}</td>
                      <td className="p-3.5 font-semibold text-slate-800 font-mono">{item.dueDate}</td>
                      <td className="p-3.5 text-slate-700 font-mono">RM {item.principalDue.toFixed(2)}</td>
                      <td className="p-3.5 text-indigo-600 font-semibold font-mono">RM {item.profitDue.toFixed(2)}</td>
                      <td className="p-3.5 font-bold text-slate-900 font-mono">RM {item.totalDue.toFixed(2)}</td>
                      <td className="p-3.5 text-emerald-700 font-semibold font-mono">RM {item.principalPaid.toFixed(2)}</td>
                      <td className="p-3.5 text-emerald-700 font-semibold font-mono">RM {item.profitPaid.toFixed(2)}</td>
                      <td className="p-3.5 text-slate-500 font-mono">RM {item.endingBalance.toFixed(2)}</td>
                      <td className="p-3.5 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'PARTIAL'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Financial Ledger & Transaction History */}
        {activeTab === 'HISTORY' && (
          <div className="space-y-4">
            {/* Quick Financial Position Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Disbursed Payout</span>
                <div className="text-lg font-extrabold text-indigo-600 mt-1">
                  RM {(account.disbursedAmount || account.principalAmount - account.processingFee - account.stampDutyFee).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">Net capital released</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Repaid</span>
                <div className="text-lg font-extrabold text-emerald-600 mt-1">
                  RM {account.transactions.filter(t => t.txType === 'REPAYMENT').reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">Collections received</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fees &amp; Charges</span>
                <div className="text-lg font-extrabold text-amber-600 mt-1">
                  RM {((account.processingFee || 0) + (account.stampDutyFee || 0)).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">Proc Fee &amp; Stamp Duty</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Remaining Principal</span>
                <div className="text-lg font-extrabold text-slate-900 mt-1">
                  RM {(rt?.totalOutstandingBalance ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">Active ledger balance</span>
              </div>
            </div>

            {/* Detailed Transaction Ledger Table */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="font-bold text-slate-900 text-base">Account Transaction Ledger</h2>
                  <p className="text-xs text-slate-500">Auditable statement of money disbursement, fee deductions, and collection waterfalls</p>
                </div>
                <span className="text-xs text-slate-500 font-mono font-bold">
                  {account.transactions.length} Total Events
                </span>
              </div>

              {account.transactions.length === 0 ? (
                <div className="p-16 text-center text-slate-400 text-xs">No transactions recorded for this account.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {account.transactions
                    .filter(tx => {
                      if (txFilter === 'ALL') return true;
                      if (txFilter === 'DISBURSEMENT') return tx.txType === 'DISBURSEMENT';
                      if (txFilter === 'REPAYMENT') return tx.txType === 'REPAYMENT';
                      if (txFilter === 'FEE_CHARGE') return tx.txType === 'FEE_CHARGE';
                      return true;
                    })
                    .map(tx => {
                      const isRepayment = tx.txType === 'REPAYMENT';
                      const isDisbursement = tx.txType === 'DISBURSEMENT';
                      const isFee = tx.txType === 'FEE_CHARGE';
                      const isSettlement = tx.txType === 'SETTLEMENT';
                      const isLate = tx.txType === 'LATE_FEE';

                      return (
                        <div key={tx.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition">
                          <div className="space-y-1.5 min-w-0">
                            {/* Badges line */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isRepayment
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : isDisbursement
                                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                  : isFee
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : isSettlement
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}>
                                {isRepayment && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                {isDisbursement && <ArrowUpRight className="w-3 h-3 mr-1" />}
                                {isFee && <Tag className="w-3 h-3 mr-1" />}
                                {isSettlement && <Receipt className="w-3 h-3 mr-1" />}
                                {isLate && <AlertTriangle className="w-3 h-3 mr-1" />}
                                {tx.txType.replace('_', ' ')}
                              </span>

                              <span className="text-xs text-slate-500 font-mono font-semibold">
                                Ref: {tx.referenceNo}
                              </span>

                              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-mono">
                                {tx.paymentMethod}
                              </span>

                              <span className="text-[11px] text-slate-400 font-medium">
                                {new Date(tx.transactedAt).toLocaleString()}
                              </span>
                            </div>

                            {/* Particulars */}
                            <div className="text-xs font-semibold text-slate-800">
                              {tx.remarks || 'Financial transaction executed'}
                            </div>

                            {/* Waterfall Breakdown for Repayments */}
                            {isRepayment && (
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] pt-1">
                                <span className="text-slate-500">
                                  Principal Allocated: <strong className="text-slate-900 font-mono">RM {tx.allocatedPrincipal.toFixed(2)}</strong>
                                </span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-500">
                                  Profit Allocated: <strong className="text-indigo-600 font-mono">RM {tx.allocatedProfit.toFixed(2)}</strong>
                                </span>
                                {tx.allocatedLateFee > 0 && (
                                  <>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-rose-600 font-bold">
                                      Late Penalty Paid: <strong className="font-mono">RM {tx.allocatedLateFee.toFixed(2)}</strong>
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Right Amount display */}
                          <div className="text-right shrink-0">
                            <div className={`text-base font-black font-mono ${
                              isRepayment
                                ? 'text-emerald-600'
                                : isDisbursement
                                ? 'text-indigo-600'
                                : isFee
                                ? 'text-amber-600'
                                : 'text-slate-900'
                            }`}>
                              {isRepayment ? '+' : ''}RM {tx.amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium block">
                              {isRepayment ? 'Credit (Repayment)' : isDisbursement ? 'Capital Payout' : 'Upfront Fee'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Repayment Modal */}
      {isPaymentOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Record Repayment</h3>
                <p className="text-xs text-slate-500 mt-0.5">{account.accountNo} • {account.customer?.fullName}</p>
              </div>
              <button onClick={() => setIsPaymentOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">&times;</button>
            </div>

            {rt?.totalArrearsDue > 0 && (
              <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl text-xs text-rose-800 space-y-1">
                <div className="font-bold">Overdue Arrears Detected:</div>
                <div>Arrears: RM {rt.totalArrearsDue.toFixed(2)}</div>
                <div>Late Charges: RM {rt.accruedLateFee.toFixed(2)}</div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Repayment Amount (RM)</label>
              <input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                className="w-full text-base font-extrabold p-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {paymentMsg && (
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-xs text-emerald-800 whitespace-pre-line font-semibold">
                {paymentMsg}
              </div>
            )}

            <div className="pt-2 flex space-x-2">
              <button
                type="button"
                onClick={() => setIsPaymentOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-3 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessPayment}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 rounded-xl shadow-md shadow-indigo-600/25 transition cursor-pointer"
              >
                Apply Waterfall Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Early Settlement Modal */}
      {isSettleOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Early Settlement &amp; Rebate Quotation</h3>
                <p className="text-xs text-slate-500 mt-0.5">{account.accountNo} • {account.customer?.fullName}</p>
              </div>
              <button onClick={() => setIsSettleOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">&times;</button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Settlement Payoff Date</label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={settleDate}
                  onChange={e => setSettleDate(e.target.value)}
                  className="flex-1 text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleGetSettleQuote}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 rounded-xl transition cursor-pointer"
                >
                  Recalculate
                </button>
              </div>
            </div>

            {settleQuote && (
              <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Outstanding Principal:</span>
                  <span className="font-bold text-slate-900">RM {settleQuote.principalOutstanding.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Unearned Profit Rebate (Ibra&apos;):</span>
                  <span className="font-bold">- RM {settleQuote.unearnedProfitRebate.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Unpaid Late Charges:</span>
                  <span className="font-bold">+ RM {settleQuote.unpaidLateFees.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-900">Net Settlement Payoff:</span>
                  <span className="font-extrabold text-indigo-700 text-lg">RM {settleQuote.netSettlementAmount.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="pt-2 flex space-x-2">
              <button
                type="button"
                onClick={() => setIsSettleOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-3 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
              {settleQuote && (
                <button
                  type="button"
                  onClick={handleExecuteSettlement}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3 rounded-xl shadow-md shadow-emerald-600/25 transition cursor-pointer"
                >
                  Execute Settlement
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
