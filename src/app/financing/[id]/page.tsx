'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  ArrowLeft, CreditCard, User, AlertTriangle, CheckCircle2, 
  Clock, DollarSign, Calendar, ArrowUpRight, Receipt, FileText
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
        <div className="p-12 text-center text-slate-500">Loading facility details...</div>
      </DashboardLayout>
    );
  }

  if (!account) {
    return (
      <DashboardLayout>
        <div className="p-12 text-center text-slate-500">Account not found.</div>
      </DashboardLayout>
    );
  }

  const rt = account.realtimeStatus;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header & Main Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-3">
            <Link
              href="/financing"
              className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-xl transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{account.accountNo}</h1>
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
              <p className="text-xs text-slate-500 mt-0.5">
                Borrower: <Link href={`/customers/${account.customerId}`} className="text-indigo-600 font-semibold hover:underline">{account.customer?.fullName}</Link> ({account.customer?.idNumber})
              </p>
            </div>
          </div>

          {/* Action Buttons based on status */}
          <div className="flex items-center space-x-2">
            {account.status === 'DRAFT' && (
              <button
                onClick={handleDisburse}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition"
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
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition"
                >
                  Record Repayment
                </button>
                <button
                  onClick={() => {
                    setIsSettleOpen(true);
                    handleGetSettleQuote();
                  }}
                  className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition"
                >
                  Early Settlement Quote
                </button>
              </>
            )}
          </div>
        </div>

        {/* Facility Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Facility Principal</span>
            <div className="text-xl font-bold text-slate-900 mt-2">
              RM {account.principalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">{account.tenorMonths} Mos @ {account.profitRatePA}% p.a.</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding Balance</span>
            <div className="text-xl font-bold text-slate-900 mt-2">
              RM {rt?.totalOutstandingBalance.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">Remaining principal</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Installment</span>
            <div className="text-xl font-bold text-indigo-600 mt-2">
              RM {account.monthlyInstallment.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Total profit: RM {account.totalProfit.toFixed(2)}</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Delinquency State (Real-Time)</span>
            <div className="mt-2">
              {rt?.accountStatus === 'OVERDUE' ? (
                <div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                    OVERDUE ({rt.daysPastDue} DPD)
                  </span>
                  <div className="text-xs text-rose-600 font-semibold mt-1">
                    Arrears: RM {rt.totalArrearsDue.toFixed(2)} (+RM {rt.accruedLateFee.toFixed(2)} late fee)
                  </div>
                </div>
              ) : rt?.accountStatus === 'SETTLED' ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Fully Paid
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">
                  Current (On Time)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Amortization Schedule Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Amortization &amp; Repayment Schedule</h2>
              <p className="text-xs text-slate-500">Month-by-month installment breakdown and payment allocation</p>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              {account.schedule.filter(s => s.status === 'PAID').length} / {account.schedule.length} Paid
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3">Principal Due</th>
                  <th className="p-3">Profit Due</th>
                  <th className="p-3">Total Installment</th>
                  <th className="p-3">Principal Paid</th>
                  <th className="p-3">Profit Paid</th>
                  <th className="p-3">Ending Balance</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {account.schedule.map(item => (
                  <tr key={item.installmentNo} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-bold text-slate-500">{item.installmentNo}</td>
                    <td className="p-3 font-medium text-slate-800">{item.dueDate}</td>
                    <td className="p-3 text-slate-700">RM {item.principalDue.toFixed(2)}</td>
                    <td className="p-3 text-indigo-600">RM {item.profitDue.toFixed(2)}</td>
                    <td className="p-3 font-bold text-slate-900">RM {item.totalDue.toFixed(2)}</td>
                    <td className="p-3 text-emerald-700 font-medium">RM {item.principalPaid.toFixed(2)}</td>
                    <td className="p-3 text-emerald-700 font-medium">RM {item.profitPaid.toFixed(2)}</td>
                    <td className="p-3 text-slate-500">RM {item.endingBalance.toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'PARTIAL'
                          ? 'bg-amber-100 text-amber-800'
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

        {/* Transaction History Audit Trail */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50">
            <h2 className="font-bold text-slate-900 text-base">Transaction Audit Trail</h2>
            <p className="text-xs text-slate-500">Chronological history of disbursements, repayments, and settlements</p>
          </div>

          {account.transactions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No transactions recorded yet.</div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {account.transactions.map(tx => (
                <div key={tx.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">{tx.txType}</span>
                      <span className="text-slate-400 font-mono">Ref: {tx.referenceNo}</span>
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.2 rounded font-mono">{tx.paymentMethod}</span>
                    </div>
                    <div className="text-slate-500">{tx.remarks}</div>
                    <div className="text-slate-400 text-[11px]">{new Date(tx.transactedAt).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-900">
                      RM {tx.amount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Repayment Modal */}
      {isPaymentOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Record Repayment</h3>
                <p className="text-xs text-slate-500 mt-0.5">{account.accountNo} • {account.customer?.fullName}</p>
              </div>
              <button onClick={() => setIsPaymentOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">&times;</button>
            </div>

            {rt?.totalArrearsDue > 0 && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs text-rose-800 space-y-1">
                <div className="font-bold">Overdue Arrears Detected:</div>
                <div>Arrears: RM {rt.totalArrearsDue.toFixed(2)}</div>
                <div>Late Charges: RM {rt.accruedLateFee.toFixed(2)}</div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Repayment Amount (RM)</label>
              <input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                className="w-full text-base font-bold p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {paymentMsg && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-800 whitespace-pre-line font-medium">
                {paymentMsg}
              </div>
            )}

            <div className="pt-2 flex space-x-2">
              <button
                type="button"
                onClick={() => setIsPaymentOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessPayment}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl"
              >
                Apply Waterfall Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Early Settlement Modal */}
      {isSettleOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Early Settlement &amp; Rebate Quotation</h3>
                <p className="text-xs text-slate-500 mt-0.5">{account.accountNo} • {account.customer?.fullName}</p>
              </div>
              <button onClick={() => setIsSettleOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">&times;</button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Settlement Date</label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={settleDate}
                  onChange={e => setSettleDate(e.target.value)}
                  className="flex-1 text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleGetSettleQuote}
                  className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 rounded-xl"
                >
                  Recalculate
                </button>
              </div>
            </div>

            {settleQuote && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Outstanding Principal:</span>
                  <span className="font-semibold text-slate-900">RM {settleQuote.principalOutstanding.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Unearned Profit Rebate (Ibra&apos;):</span>
                  <span className="font-semibold">- RM {settleQuote.unearnedProfitRebate.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Unpaid Late Charges:</span>
                  <span className="font-semibold">+ RM {settleQuote.unpaidLateFees.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-900">Net Settlement Payoff:</span>
                  <span className="font-bold text-indigo-700 text-base">RM {settleQuote.netSettlementAmount.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="pt-2 flex space-x-2">
              <button
                type="button"
                onClick={() => setIsSettleOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl"
              >
                Close
              </button>
              {settleQuote && (
                <button
                  type="button"
                  onClick={handleExecuteSettlement}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-sm"
                >
                  Execute Early Settlement
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
