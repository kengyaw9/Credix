'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  ArrowLeft, CreditCard, User, AlertTriangle, CheckCircle2, 
  Clock, DollarSign, Calendar, ArrowUpRight, Receipt, FileText,
  ShieldCheck, Banknote, Percent, TrendingUp, History, ListOrdered, Tag, ArrowDownRight, Layers,
  XCircle, CheckCircle, Send, ArrowRight
} from 'lucide-react';
import { Customer, FinancingAccount, FinancingTransaction } from '@/core/store/memory-store';
import { RealTimeAccountStatus, ScheduleItem, SettlementQuotation, FinancingStatus } from '@/core/financing/types';
import { getCalcMethodLabel } from '@/core/financing/calculator';
import { applyPaymentWaterfall, PaymentAllocationMode } from '@/core/financing/waterfall';

interface AccountDetail extends FinancingAccount {
  customer: Customer;
  transactions: FinancingTransaction[];
  realtimeStatus: RealTimeAccountStatus;
}

export default function FinancingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Workflow Modals
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [approverName, setApproverName] = useState('Credit Committee');
  const [approvalNotes, setApprovalNotes] = useState('');

  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const [isAcceptOpen, setIsAcceptOpen] = useState(false);
  const [acceptanceDate, setAcceptanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [acceptanceNotes, setAcceptanceNotes] = useState('Letter of Offer signed by borrower');

  const [isDisburseOpen, setIsDisburseOpen] = useState(false);
  const [disbursementDate, setDisbursementDate] = useState(new Date().toISOString().split('T')[0]);
  const [payoutRef, setPayoutRef] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('BANK_TRANSFER');

  // Repayment Modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [allocationMode, setAllocationMode] = useState<PaymentAllocationMode>('WATERFALL');
  const [paymentMsg, setPaymentMsg] = useState<string | null>(null);

  // Early Settlement Modal
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [settleDate, setSettleDate] = useState(new Date().toISOString().split('T')[0]);
  const [settleQuote, setSettleQuote] = useState<SettlementQuotation | null>(null);

  // Tab & Filter States
  const [activeTab, setActiveTab] = useState<'SCHEDULE' | 'HISTORY'>('SCHEDULE');
  const [txFilter, setTxFilter] = useState<'ALL' | 'DISBURSEMENT' | 'REPAYMENT' | 'FEE_CHARGE'>('ALL');
  const [actionLoading, setActionLoading] = useState(false);

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

  // Workflow Action Handlers
  const handleWorkflowAction = async (action: string, payload: any = {}) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/financing/accounts/${id}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (data.success) {
        setIsApproveOpen(false);
        setIsRejectOpen(false);
        setIsAcceptOpen(false);
        await loadAccount();
      } else {
        alert(data.error || 'Workflow action failed');
      }
    } catch {
      alert('Error updating workflow status');
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Actual Disbursement
  const handleExecuteDisbursement = async () => {
    if (!account) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/financing/accounts/${id}/disburse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disbursedAt: disbursementDate,
          payoutRef: payoutRef || `TRF-MBB-${Date.now().toString().slice(-6)}`,
          paymentMethod: payoutMethod,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsDisburseOpen(false);
        await loadAccount();
        alert('Funds successfully disbursed! Repayment schedule officially activated from disbursement date.');
      } else {
        alert(data.error || 'Disbursement failed');
      }
    } catch {
      alert('Failed to execute disbursement');
    } finally {
      setActionLoading(false);
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
          allocationMode,
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
          setAllocationMode('WATERFALL');
        }, 3000);
      } else {
        alert(data.error);
      }
    } catch {
      alert('Payment processing failed');
    }
  };

  // Settlement Quote & Execution
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
  const paidCount = account.schedule?.filter(s => s.status === 'PAID').length || 0;
  const progressPercent = account.schedule?.length ? Math.round((paidCount / account.schedule.length) * 100) : 0;
  const netDisbursement = account.principalAmount - (account.processingFee || 0) - (account.stampDutyFee || 0);

  // Workflow Steps Calculation
  const isPending = account.status === 'PENDING_APPROVAL' || account.status === 'DRAFT';
  const isApproved = account.status === 'APPROVED';
  const isAccepted = account.status === 'ACCEPTED';
  const isReady = account.status === 'READY_TO_DISBURSE';
  const isActive = account.status === 'ACTIVE' || account.status === 'SETTLED';
  const isRejected = account.status === 'REJECTED';

  const steps = [
    { id: 1, label: '1. Application', state: 'COMPLETED' },
    {
      id: 2,
      label: '2. Underwriting Approval',
      state: isRejected ? 'REJECTED' : isPending ? 'CURRENT' : 'COMPLETED',
    },
    {
      id: 3,
      label: '3. Customer Acceptance',
      state: isRejected ? 'SKIPPED' : isPending ? 'UPCOMING' : isApproved ? 'CURRENT' : 'COMPLETED',
    },
    {
      id: 4,
      label: '4. Ready to Disburse',
      state: isRejected ? 'SKIPPED' : isPending || isApproved ? 'UPCOMING' : isAccepted ? 'CURRENT' : 'COMPLETED',
    },
    {
      id: 5,
      label: '5. Disbursed & Active',
      state: isActive ? 'COMPLETED' : isReady ? 'CURRENT' : 'UPCOMING',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header & Main Info */}
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
                <h1 className="text-2xl font-extrabold font-mono tracking-tight text-slate-900">{account.accountNo}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : isRejected
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : isPending
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}>
                  {account.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Borrower: <Link href={`/customers/${account.customerId}`} className="text-indigo-600 font-bold hover:underline">{account.customer?.fullName}</Link> ({account.customer?.idNumber})
              </p>
            </div>
          </div>

          {/* Workflow Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {isPending && (
              <>
                <button
                  onClick={() => setIsRejectOpen(true)}
                  className="bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Reject Application
                </button>
                <button
                  onClick={() => setIsApproveOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/25 transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Approve Application</span>
                </button>
              </>
            )}

            {isApproved && (
              <button
                onClick={() => setIsAcceptOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/25 transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Record Customer Acceptance</span>
              </button>
            )}

            {isAccepted && (
              <button
                onClick={() => handleWorkflowAction('READY_TO_DISBURSE')}
                disabled={actionLoading}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-amber-600/25 transition flex items-center space-x-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Confirm Ready to Disburse</span>
              </button>
            )}

            {isReady && (
              <button
                onClick={() => setIsDisburseOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-emerald-600/25 transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Banknote className="w-4 h-4" />
                <span>Execute Fund Disbursement</span>
              </button>
            )}

            {isActive && (
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

        {/* 5-Step Origination Lifecycle Visual Stepper */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
            <span>Loan Origination Process Pipeline</span>
            {account.disbursedAt && (
              <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg font-mono">
                Disbursed: {account.disbursedAt.split('T')[0]} ({account.payoutRef})
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {steps.map(step => {
              const isComp = step.state === 'COMPLETED';
              const isCurr = step.state === 'CURRENT';
              const isRej = step.state === 'REJECTED';

              return (
                <div
                  key={step.id}
                  className={`p-3 rounded-2xl border text-center transition ${
                    isRej
                      ? 'bg-rose-50 border-rose-300 text-rose-800'
                      : isComp
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                      : isCurr
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-900 ring-2 ring-indigo-500/20'
                      : 'bg-slate-50/60 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-1.5 mb-1">
                    {isRej ? (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    ) : isComp ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : isCurr ? (
                      <Clock className="w-4 h-4 text-indigo-600 animate-pulse" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                    )}
                    <span className="text-xs font-bold">{step.label}</span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider block">
                    {isRej ? 'Rejected' : isComp ? 'Completed' : isCurr ? 'Action Required' : 'Upcoming'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Banner message describing current action */}
          {isPending && (
            <div className="mt-4 p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-2xl text-xs text-amber-900 flex items-center justify-between">
              <div>
                <strong>Awaiting Credit Underwriting:</strong> Review applicant affordability (DSR), employment details, and approve loan terms.
              </div>
              <button
                onClick={() => setIsApproveOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition shrink-0 ml-3"
              >
                Review &amp; Approve
              </button>
            </div>
          )}

          {isApproved && (
            <div className="mt-4 p-3.5 bg-indigo-50/90 border border-indigo-200/90 rounded-2xl text-xs text-indigo-900 flex items-center justify-between">
              <div>
                <strong>Facility Approved:</strong> Approved by <strong>{account.approvedBy || 'Credit Committee'}</strong>. Awaiting borrower signature on the Letter of Offer.
              </div>
              <button
                onClick={() => setIsAcceptOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition shrink-0 ml-3"
              >
                Record Acceptance
              </button>
            </div>
          )}

          {isAccepted && (
            <div className="mt-4 p-3.5 bg-sky-50/90 border border-sky-200/90 rounded-2xl text-xs text-sky-900 flex items-center justify-between">
              <div>
                <strong>Borrower Accepted Offer:</strong> Customer signed facility contract. Ready for pre-disbursement verification.
              </div>
              <button
                onClick={() => handleWorkflowAction('READY_TO_DISBURSE')}
                disabled={actionLoading}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition shrink-0 ml-3"
              >
                Mark Ready to Disburse
              </button>
            </div>
          )}

          {isReady && (
            <div className="mt-4 p-3.5 bg-emerald-50/90 border border-emerald-200/90 rounded-2xl text-xs text-emerald-900 flex items-center justify-between">
              <div>
                <strong>Ready for Fund Release:</strong> Pre-disbursement KYC and payout bank account verified ({account.customer?.bankName} - {account.customer?.bankAccountNo}).
              </div>
              <button
                onClick={() => setIsDisburseOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition shrink-0 ml-3"
              >
                Disburse Payout Now
              </button>
            </div>
          )}

          {isRejected && (
            <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-1">
              <div className="font-bold flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1.5 text-rose-600" />
                Application Rejected by Underwriting
              </div>
              <div className="text-slate-700">Reason: {account.rejectionReason || 'Affordability criteria not met.'}</div>
            </div>
          )}
        </div>

        {/* Progress & Lifecycle Card (Only when active) */}
        {isActive && (
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

            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
              <div
                className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Facility Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Facility Principal</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-2">
              <span className="text-xs text-slate-400 font-semibold mr-1">RM</span>
              {account.principalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">{account.tenorMonths} Mos @ {account.profitRatePA}% p.a. • <span className="font-semibold text-slate-700">{getCalcMethodLabel(account.calcMethod)}</span></div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Net Payout to Borrower</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-2">
              <span className="text-xs text-slate-400 font-semibold mr-1">RM</span>
              {netDisbursement.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              After fees: Proc RM {account.processingFee || 0} + Stamp RM {account.stampDutyFee || 0}
            </div>
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
                  <div className="text-[10px] text-slate-400 mt-0.5" title="Formula: Sum(Unpaid Installment × Late Rate% × Days Overdue / 365)">
                    Late charge @ {account.lateFeeRatePA || 1}% p.a. daily on unpaid installments
                  </div>
                </div>
              ) : rt?.accountStatus === 'SETTLED' ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                  Fully Settled
                </span>
              ) : isActive ? (
                <div>
                  {rt?.accountStatus === 'DUE' ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock className="w-3.5 h-3.5 mr-1 text-amber-500" />
                      Payment Due
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Active (On Time)
                    </span>
                  )}
                  {(rt?.accruedLateFee || 0) > 0 && (
                    <div className="text-xs text-rose-600 font-semibold mt-1">
                      Unpaid Late Fee: RM {rt.accruedLateFee.toFixed(2)}
                    </div>
                  )}
                </div>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                  Pending Payout
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
              className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                activeTab === 'SCHEDULE'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Amortization Schedule ({account.schedule?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                activeTab === 'HISTORY'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Ledger &amp; Transactions ({account.transactions?.length || 0})</span>
            </button>
          </div>
        </div>

        {/* TAB 1: Amortization Schedule */}
        {activeTab === 'SCHEDULE' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {!isActive && (
              <div className="p-4 bg-amber-50/80 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                <span className="font-semibold flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-amber-600 shrink-0" />
                  Indicative Amortization Schedule — Repayment due dates shown below are estimates. Official schedule commences upon actual disbursement.
                </span>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50/90 text-slate-500 uppercase font-bold border-b border-slate-200/80">
                  <tr>
                    <th className="p-4">#</th>
                    <th className="p-4">Due Date &amp; Timing</th>
                    <th className="p-4">Principal Due</th>
                    <th className="p-4">Profit Due</th>
                    <th className="p-4">Total Billed</th>
                    <th className="p-4">Paid to Date</th>
                    <th className="p-4">Remaining Due</th>
                    <th className="p-4">Ending Principal</th>
                    <th className="p-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {account.schedule?.map(item => {
                    const isPaid = item.status === 'PAID';
                    const isPartial = item.status === 'PARTIAL';

                    const principalPaid = Number(item.principalPaid || 0);
                    const profitPaid = Number(item.profitPaid || 0);
                    const totalPaid = principalPaid + profitPaid;
                    const remainingDue = Math.max(0, item.totalDue - totalPaid);

                    // Today vs Due Date calculation
                    const todayStr = new Date().toISOString().split('T')[0];
                    const isPastDue = item.dueDate < todayStr;
                    const isDueToday = item.dueDate === todayStr;

                    const d1 = new Date(item.dueDate + 'T00:00:00Z').getTime();
                    const d2 = new Date(todayStr + 'T00:00:00Z').getTime();
                    const diffDays = Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));

                    return (
                      <tr 
                        key={item.installmentNo} 
                        className={`transition ${
                          isPaid 
                            ? 'bg-slate-50/40 text-slate-400' 
                            : isPastDue 
                            ? 'bg-rose-50/30 hover:bg-rose-50/60' 
                            : isDueToday 
                            ? 'bg-amber-50/30 hover:bg-amber-50/60'
                            : 'hover:bg-slate-50/60'
                        }`}
                      >
                        <td className="p-4 font-bold text-slate-700">#{item.installmentNo}</td>
                        <td className="p-4">
                          <div className="font-mono font-bold text-slate-900">{item.dueDate}</div>
                          <div className="mt-0.5">
                            {isPaid ? (
                              <span className="inline-flex items-center text-[10px] text-emerald-600 font-semibold">
                                ✓ Settled
                              </span>
                            ) : isDueToday ? (
                              <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-100/90 px-1.5 py-0.5 rounded animate-pulse">
                                ⚡ Due Today
                              </span>
                            ) : isPastDue ? (
                              <span className="inline-flex items-center text-[10px] font-bold text-rose-700 bg-rose-100/90 px-1.5 py-0.5 rounded">
                                ⚠️ Overdue ({diffDays} DPD)
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] text-slate-500 font-medium">
                                In {diffDays} days
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-medium">RM {item.principalDue.toFixed(2)}</td>
                        <td className="p-4 text-indigo-600 font-medium">RM {item.profitDue.toFixed(2)}</td>
                        <td className="p-4 font-extrabold text-slate-900">RM {item.totalDue.toFixed(2)}</td>
                        
                        {/* Paid to Date Column */}
                        <td className="p-4">
                          {totalPaid > 0 ? (
                            <div>
                              <span className="font-mono font-bold text-emerald-700">
                                RM {totalPaid.toFixed(2)}
                              </span>
                              <div className="text-[10px] text-slate-400">
                                Prin: RM {principalPaid.toFixed(2)} • Prof: RM {profitPaid.toFixed(2)}
                              </div>
                            </div>
                          ) : (
                            <span className="font-mono text-slate-300">RM 0.00</span>
                          )}
                        </td>

                        {/* Remaining Due Column */}
                        <td className="p-4">
                          {remainingDue > 0 ? (
                            <div>
                              <span className={`font-mono font-extrabold ${
                                isPastDue ? 'text-rose-600' : isPartial ? 'text-amber-700' : 'text-slate-900'
                              }`}>
                                RM {remainingDue.toFixed(2)}
                              </span>
                              {isPartial && (
                                <div className="text-[10px] text-amber-600 font-semibold">Partially settled</div>
                              )}
                            </div>
                          ) : (
                            <span className="font-mono text-emerald-600 font-bold">RM 0.00</span>
                          )}
                        </td>

                        <td className="p-4 text-slate-500 font-mono">RM {item.endingBalance.toFixed(2)}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isPartial
                              ? 'bg-amber-50 text-amber-800 border border-amber-300 font-extrabold'
                              : isPastDue
                              ? 'bg-rose-50 text-rose-700 border border-rose-200 font-extrabold'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {isPaid ? 'PAID' : isPartial ? 'PARTIAL' : isPastDue ? 'OVERDUE' : 'UNPAID'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Financial History & Ledger */}
        {activeTab === 'HISTORY' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Account Ledger Entries</span>
              <div className="flex space-x-1">
                {(['ALL', 'DISBURSEMENT', 'REPAYMENT', 'FEE_CHARGE'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setTxFilter(f)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      txFilter === f ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {account.transactions?.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">No transactions recorded yet.</div>
              ) : (
                account.transactions
                  ?.filter(tx => txFilter === 'ALL' || tx.txType === txFilter)
                  .map(tx => (
                    <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs text-slate-900">{tx.txType.replace('_', ' ')}</span>
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{tx.referenceNo}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{tx.remarks || tx.paymentMethod}</p>
                        <span className="text-[10px] text-slate-400">{new Date(tx.transactedAt).toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono font-bold text-sm ${
                          tx.txType === 'REPAYMENT' ? 'text-emerald-600' : tx.txType === 'DISBURSEMENT' ? 'text-indigo-600' : 'text-amber-600'
                        }`}>
                          {tx.txType === 'REPAYMENT' ? '+' : ''}RM {tx.amount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Approve Application */}
      {isApproveOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Approve Loan Application</h3>
                <p className="text-xs text-slate-500 mt-0.5">{account.accountNo} • {account.customer?.fullName}</p>
              </div>
              <button onClick={() => setIsApproveOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">&times;</button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Facility Amount:</span>
                <span className="font-bold text-slate-900">RM {account.principalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tenor &amp; Rate:</span>
                <span className="font-bold text-slate-900">{account.tenorMonths} Mos @ {account.profitRatePA}% p.a.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Monthly Installment:</span>
                <span className="font-bold text-indigo-700">RM {account.monthlyInstallment.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Approved By</label>
              <input
                type="text"
                value={approverName}
                onChange={e => setApproverName(e.target.value)}
                placeholder="e.g. Credit Committee / Underwriter Name"
                className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Approval Remarks (Optional)</label>
              <textarea
                value={approvalNotes}
                onChange={e => setApprovalNotes(e.target.value)}
                placeholder="e.g. Underwriting passed, healthy DSR, approved based on payslip verification."
                rows={2}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-2 flex space-x-2">
              <button
                type="button"
                onClick={() => setIsApproveOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-3 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleWorkflowAction('APPROVE', { approvedBy: approverName, notes: approvalNotes })}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 rounded-xl shadow-md shadow-indigo-600/25 transition cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Reject Application */}
      {isRejectOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Reject Application</h3>
                <p className="text-xs text-slate-500 mt-0.5">{account.accountNo} • {account.customer?.fullName}</p>
              </div>
              <button onClick={() => setIsRejectOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">&times;</button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Rejection Reason</label>
              <textarea
                required
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="e.g. Debt Service Ratio (DSR) exceeds maximum policy limit; adverse credit bureau records."
                rows={3}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="pt-2 flex space-x-2">
              <button
                type="button"
                onClick={() => setIsRejectOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-3 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || !rejectionReason.trim()}
                onClick={() => handleWorkflowAction('REJECT', { rejectionReason })}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-3 rounded-xl shadow-md shadow-rose-600/25 transition cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Customer Acceptance */}
      {isAcceptOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Record Customer Acceptance</h3>
                <p className="text-xs text-slate-500 mt-0.5">{account.accountNo} • {account.customer?.fullName}</p>
              </div>
              <button onClick={() => setIsAcceptOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">&times;</button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Date of Acceptance</label>
              <input
                type="date"
                value={acceptanceDate}
                onChange={e => setAcceptanceDate(e.target.value)}
                className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Acceptance Method / Reference</label>
              <input
                type="text"
                value={acceptanceNotes}
                onChange={e => setAcceptanceNotes(e.target.value)}
                placeholder="e.g. Signed Letter of Offer in branch / Digital E-Sign"
                className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-2 flex space-x-2">
              <button
                type="button"
                onClick={() => setIsAcceptOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-3 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleWorkflowAction('ACCEPT', { acceptedAt: acceptanceDate, notes: acceptanceNotes })}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 rounded-xl shadow-md shadow-indigo-600/25 transition cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Record Acceptance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Execute Fund Disbursement */}
      {isDisburseOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Execute Fund Disbursement</h3>
                <p className="text-xs text-slate-500 mt-0.5">{account.accountNo} • {account.customer?.fullName}</p>
              </div>
              <button onClick={() => setIsDisburseOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">&times;</button>
            </div>

            {/* Payout Bank Card */}
            <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200/80 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                Destination Payout Bank Account
              </span>
              <div className="font-bold text-slate-900 text-sm">
                {account.customer?.bankName} — <span className="font-mono text-indigo-700 font-extrabold">{account.customer?.bankAccountNo}</span>
              </div>
              <div className="text-xs text-slate-600">Beneficiary: {account.customer?.fullName}</div>
            </div>

            {/* Deductions Breakdown */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Facility Principal:</span>
                <span className="font-bold text-slate-900">RM {account.principalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Less Processing Fee:</span>
                <span>- RM {Number(account.processingFee || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Less Stamp Duty:</span>
                <span>- RM {Number(account.stampDutyFee || 0).toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm font-extrabold text-emerald-700">
                <span>Net Fund Release:</span>
                <span className="text-base font-black">RM {netDisbursement.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Actual Disbursement Date</label>
              <input
                type="date"
                required
                value={disbursementDate}
                onChange={e => setDisbursementDate(e.target.value)}
                className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Official repayment schedule follows monthly <strong>Anniversary Date</strong> (installments due on the same day each month, starting 1 month after disbursement).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Payment Method</label>
                <select
                  value={payoutMethod}
                  onChange={e => setPayoutMethod(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="BANK_TRANSFER">Bank Transfer (IBG / Rentas)</option>
                  <option value="DUITNOW">DuitNow Transfer</option>
                  <option value="CHEQUE">Banker&apos;s Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Bank Payout Ref / Txn No</label>
                <input
                  type="text"
                  value={payoutRef}
                  onChange={e => setPayoutRef(e.target.value)}
                  placeholder="e.g. MBB-TRF-98214"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 flex space-x-2">
              <button
                type="button"
                onClick={() => setIsDisburseOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-3 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleExecuteDisbursement}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3 rounded-xl shadow-md shadow-emerald-600/25 transition cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Releasing Funds...' : 'Confirm & Disburse Funds'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repayment Modal */}
      {isPaymentOpen && (() => {
        const parsedAmount = Number(paymentAmount) || 0;
        const preview = parsedAmount > 0
          ? applyPaymentWaterfall(
              account.schedule,
              parsedAmount,
              rt?.accruedLateFee || 0,
              paymentDate,
              allocationMode
            )
          : null;
        const exceedsLateFee = allocationMode === 'LATE_FEE_ONLY' && parsedAmount > ((rt?.accruedLateFee || 0) + 0.001);

        return (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[92vh] overflow-y-auto">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Record Repayment</h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">{account.accountNo} • {account.customer?.fullName}</p>
                </div>
                <button onClick={() => setIsPaymentOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">&times;</button>
              </div>

              {(rt?.totalArrearsDue > 0 || rt?.accruedLateFee > 0) && (
                <div className="bg-rose-50/80 border border-rose-200 p-3.5 rounded-2xl text-xs text-rose-900 space-y-1.5">
                  <div className="font-bold flex items-center justify-between">
                    <span>Current Overdue Summary ({rt.daysPastDue} DPD)</span>
                    <span className="font-mono text-rose-700">Total: RM {(rt.totalArrearsDue + rt.accruedLateFee).toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-rose-800">
                    <div className="bg-white/70 px-2.5 py-1.5 rounded-xl border border-rose-100">
                      <span className="text-rose-500 block">Installment Arrears</span>
                      <span className="font-bold">RM {rt.totalArrearsDue.toFixed(2)}</span>
                    </div>
                    <div className="bg-white/70 px-2.5 py-1.5 rounded-xl border border-rose-100">
                      <span className="text-rose-500 block">Late Fee ({account.lateFeeRatePA || 1}% p.a.)</span>
                      <span className="font-bold">RM {rt.accruedLateFee.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Allocation Target Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Payment Allocation Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAllocationMode('WATERFALL')}
                    className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                      allocationMode === 'WATERFALL'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-1 ring-indigo-500'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-[11px] font-bold">Standard Waterfall</div>
                    <div className="text-[10px] opacity-75 mt-0.5 leading-tight">Late Fee &rarr; Profit &rarr; Prin</div>
                  </button>

                  <button
                    type="button"
                    disabled={(rt?.accruedLateFee || 0) <= 0}
                    onClick={() => {
                      setAllocationMode('LATE_FEE_ONLY');
                      if (rt?.accruedLateFee > 0) {
                        setPaymentAmount(rt.accruedLateFee.toFixed(2));
                      }
                    }}
                    className={`p-2 rounded-xl border text-left transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      allocationMode === 'LATE_FEE_ONLY'
                        ? 'bg-rose-50 border-rose-500 text-rose-900 ring-1 ring-rose-500'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-[11px] font-bold">Late Fee Only</div>
                    <div className="text-[10px] opacity-75 mt-0.5 leading-tight">Pay Ta&apos;widh / LPC only</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAllocationMode('INSTALLMENT_ONLY')}
                    className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                      allocationMode === 'INSTALLMENT_ONLY'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-[11px] font-bold">Installment Only</div>
                    <div className="text-[10px] opacity-75 mt-0.5 leading-tight">Skip Late Fee (Prin/Prof)</div>
                  </button>
                </div>
              </div>

              {/* Quick Fill Chips */}
              <div className="flex flex-wrap gap-1.5">
                {rt?.accruedLateFee > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setAllocationMode('LATE_FEE_ONLY');
                      setPaymentAmount(rt.accruedLateFee.toFixed(2));
                    }}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                  >
                    Pay Late Fee: RM {rt.accruedLateFee.toFixed(2)}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setAllocationMode('WATERFALL');
                    setPaymentAmount(account.monthlyInstallment.toFixed(2));
                  }}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition cursor-pointer"
                >
                  1 Installment: RM {account.monthlyInstallment.toFixed(2)}
                </button>
                {(rt?.totalArrearsDue + rt?.accruedLateFee) > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setAllocationMode('WATERFALL');
                      setPaymentAmount((rt.totalArrearsDue + rt.accruedLateFee).toFixed(2));
                    }}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition cursor-pointer"
                  >
                    Clear Total Due: RM {(rt.totalArrearsDue + rt.accruedLateFee).toFixed(2)}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Repayment Amount (RM)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-base font-extrabold p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              </div>

              {/* Live Allocation Breakdown Preview */}
              {preview && (
                <div className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                  exceedsLateFee
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <div className="font-bold text-[11px] uppercase tracking-wider text-slate-500">
                    Real-Time Allocation Preview
                  </div>
                  <div className="flex justify-between">
                    <span>Applied to Late Fee / Ta&apos;widh:</span>
                    <span className={`font-bold ${preview.allocatedToLateFee > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      RM {preview.allocatedToLateFee.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Applied to Profit / Interest:</span>
                    <span className={`font-bold ${preview.allocatedToProfit > 0 ? 'text-indigo-700' : 'text-slate-400'}`}>
                      RM {preview.allocatedToProfit.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Applied to Principal:</span>
                    <span className={`font-bold ${preview.allocatedToPrincipal > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                      RM {preview.allocatedToPrincipal.toFixed(2)}
                    </span>
                  </div>
                  {preview.excessAmount > 0 && (
                    <div className="flex justify-between pt-1 border-t border-slate-200 text-amber-700 font-bold">
                      <span>Unallocated Surplus:</span>
                      <span>RM {preview.excessAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {exceedsLateFee && (
                    <div className="text-[11px] text-amber-800 pt-1 font-medium">
                      ⚠️ Amount exceeds unpaid late charges (RM {rt.accruedLateFee.toFixed(2)}). Switch to &quot;Standard Waterfall&quot; to apply the rest to installments.
                    </div>
                  )}
                </div>
              )}

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
                  disabled={!paymentAmount || parsedAmount <= 0 || exceedsLateFee}
                  onClick={handleProcessPayment}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold py-3 rounded-xl shadow-md shadow-indigo-600/25 transition cursor-pointer"
                >
                  Confirm &amp; Record Payment
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
