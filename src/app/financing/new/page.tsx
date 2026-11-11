'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  ArrowLeft,
  DollarSign,
  ArrowRight,
  Sparkles,
  Lock,
  UserCheck,
  CreditCard,
  Phone,
  Briefcase,
  AlertCircle,
  Search,
  CheckCircle2,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import { Customer } from '@/core/store/memory-store';
import { ScheduleItem, CalculationMethod } from '@/core/financing/types';
import { getCalcMethodLabel } from '@/core/financing/calculator';

function NewFinancingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL Query pre-fills
  const customerId = searchParams.get('customerId') || '';
  const queryPrincipal = searchParams.get('principal');
  const queryRate = searchParams.get('rate');
  const queryTenor = searchParams.get('tenor');
  const queryMethod = searchParams.get('method');
  const queryProcFee = searchParams.get('procFee');
  const queryStampDuty = searchParams.get('stampDuty');

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(true);

  const [form, setForm] = useState({
    principalAmount: queryPrincipal ? Number(queryPrincipal) : 10000,
    profitRatePA: queryRate ? Number(queryRate) : 10,
    tenorMonths: queryTenor ? Number(queryTenor) : 12,
    calcMethod: (['FLAT_R78', 'FLAT_STRAIGHT', 'REDUCING_MONTHLY', 'REDUCING_DAILY'].includes(queryMethod as any)
      ? (queryMethod as CalculationMethod)
      : queryMethod === 'REDUCING_BALANCE'
      ? 'REDUCING_MONTHLY'
      : 'FLAT_R78') as CalculationMethod,
    startDate: new Date().toISOString().split('T')[0],
    processingFee: queryProcFee !== null ? Number(queryProcFee) : 150,
    stampDutyFee: queryStampDuty !== null ? Number(queryStampDuty) : 50,
  });

  const [previewSchedule, setPreviewSchedule] = useState<ScheduleItem[] | null>(null);
  const [previewSummary, setPreviewSummary] = useState<{ totalProfit: number; totalPayable: number; monthlyInstallment: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch the specific customer by ID
  useEffect(() => {
    if (!customerId) {
      setLoadingCustomer(false);
      return;
    }

    fetch(`/api/v1/customers/${customerId}`)
      .then(res => res.json())
      .then(json => {
        if (json.success && (json.data?.customer || json.data)) {
          setCustomer(json.data.customer || json.data);
        } else {
          // If customer not found, redirect to search
          router.push('/customers?selectForLoan=true');
        }
      })
      .catch(() => router.push('/customers?selectForLoan=true'))
      .finally(() => setLoadingCustomer(false));
  }, [customerId, router]);

  // Compute live schedule
  const handlePreview = async () => {
    try {
      const res = await fetch('/api/v1/financing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          principalAmount: Number(form.principalAmount),
          profitRatePA: Number(form.profitRatePA),
          tenorMonths: Number(form.tenorMonths),
          startDate: form.startDate,
          calcMethod: form.calcMethod,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPreviewSchedule(data.data.schedule);
        setPreviewSummary({
          totalProfit: data.data.totalProfit,
          totalPayable: data.data.totalPayable,
          monthlyInstallment: data.data.monthlyInstallment,
        });
      }
    } catch {
      setError('Calculation error occurred');
    }
  };

  // Run initial calculation once
  useEffect(() => {
    handlePreview();
  }, [form.principalAmount, form.profitRatePA, form.tenorMonths, form.calcMethod, form.startDate]);

  // DSR computation
  const proposedInstallment = previewSummary?.monthlyInstallment || 0;
  const netIncome = customer?.monthlyNetIncome || 0;
  const existingCommitments = customer?.monthlyCommitments || 0;
  const totalCommitmentsWithNewLoan = existingCommitments + proposedInstallment;
  const projectedDsr = netIncome > 0 ? Math.round((totalCommitmentsWithNewLoan / netIncome) * 100) : 0;

  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) {
      alert('Please select a customer first');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/financing/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          customerId: customer.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/financing/${data.data.id}`);
      } else {
        setError(data.error || 'Failed to create facility');
      }
    } catch {
      setError('Connection error');
    } finally {
      setSubmitting(false);
    }
  };

  const netDisbursement = Math.max(0, form.principalAmount - (form.processingFee || 0) - (form.stampDutyFee || 0));

  // If no customer ID was passed, prompt user to search customer first
  if (!loadingCustomer && !customer) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
          <Search className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900">Please Select a Borrower First</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            To create a new loan facility, you must first select an active customer profile from the Customer Information File (CIF).
          </p>
        </div>
        <div>
          <Link
            href="/customers?selectForLoan=true"
            className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md shadow-indigo-600/30 transition"
          >
            <Search className="w-4 h-4" />
            <span>Search Borrower Master</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Link
          href="/financing"
          className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200/90 rounded-xl transition shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">New Loan Application</h1>
          <p className="text-xs text-slate-500">Originate financing facility for verified borrower</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Borrower Display (Locked) + Facility Parameters (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* STEP 1: Borrower Profile (DISPLAY ONLY, CANNOT CHANGE) */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center">1</span>
                <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Borrower Profile</h2>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full flex items-center space-x-1">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Locked Profile</span>
              </span>
            </div>

            {loadingCustomer ? (
              <div className="text-center py-6 text-xs text-slate-400">Loading customer profile...</div>
            ) : customer ? (
              /* Display-Only Verified Borrower Card */
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        {customer.title ? `${customer.title}. ` : ''}{customer.fullName}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {customer.idType}: {customer.idNumber}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    Verified CIF
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/70 text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Net Monthly Income</span>
                    <span className="font-bold text-slate-900">
                      RM {customer.monthlyNetIncome?.toLocaleString('en-MY', { minimumFractionDigits: 2 }) || '0.00'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Existing Commitments</span>
                    <span className="font-bold text-slate-900">
                      RM {customer.monthlyCommitments?.toLocaleString('en-MY', { minimumFractionDigits: 2 }) || '0.00'}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-500 pt-1 flex items-center space-x-2">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{customer.bankName} • {customer.bankAccountNo}</span>
                </div>

                {/* Live Underwriting DSR Indicator */}
                <div className="pt-2 border-t border-slate-200/70">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Projected Total DSR:</span>
                    <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                      projectedDsr <= 60
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : projectedDsr <= 75
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {projectedDsr}% ({projectedDsr <= 60 ? 'Healthy' : projectedDsr <= 75 ? 'Moderate' : 'High Debt'})
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    (Existing RM {existingCommitments} + Proposed RM {proposedInstallment.toFixed(0)}) / RM {netIncome}
                  </div>
                </div>

                {/* Change borrower link if needed */}
                <div className="pt-1 text-right">
                  <Link
                    href="/customers?selectForLoan=true"
                    className="text-[11px] text-slate-400 hover:text-indigo-600 transition underline"
                  >
                    Wrong customer? Select another
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          {/* STEP 2: Loan Facility Parameters */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center">2</span>
                <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Facility Terms</h2>
              </div>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                {getCalcMethodLabel(form.calcMethod)}
              </span>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateFacility} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Interest / Profit Calculation Model</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, calcMethod: 'FLAT_R78' })}
                    className={`p-3 text-left rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                      form.calcMethod === 'FLAT_R78' || (form.calcMethod as string) === 'FLAT_RATE'
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">Hire Purchase (R78)</div>
                    <div className="text-[10px] text-slate-500 mt-1">Sum of Digits • HP Act 1967 standard</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, calcMethod: 'FLAT_STRAIGHT' })}
                    className={`p-3 text-left rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                      form.calcMethod === 'FLAT_STRAIGHT'
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">Straight Flat Rate</div>
                    <div className="text-[10px] text-slate-500 mt-1">Equal monthly profit &amp; principal</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, calcMethod: 'REDUCING_MONTHLY' })}
                    className={`p-3 text-left rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                      form.calcMethod === 'REDUCING_MONTHLY' || (form.calcMethod as string) === 'REDUCING_BALANCE'
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">Monthly Reducing</div>
                    <div className="text-[10px] text-slate-500 mt-1">Amortized monthly rest balance</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, calcMethod: 'REDUCING_DAILY' })}
                    className={`p-3 text-left rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                      form.calcMethod === 'REDUCING_DAILY'
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">Daily Reducing</div>
                    <div className="text-[10px] text-slate-500 mt-1">Exact calendar days rest (365 days)</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Principal Facility Amount (RM)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-400">RM</span>
                  <input
                    type="number"
                    required
                    step="500"
                    min="500"
                    value={form.principalAmount}
                    onChange={e => setForm({ ...form, principalAmount: Number(e.target.value) })}
                    className="w-full text-base font-extrabold pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Rate (% p.a.)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={form.profitRatePA}
                    onChange={e => setForm({ ...form, profitRatePA: Number(e.target.value) })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Tenor (Months)</label>
                  <input
                    type="number"
                    required
                    value={form.tenorMonths}
                    onChange={e => setForm({ ...form, tenorMonths: Number(e.target.value) })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Processing Fee (RM)</label>
                  <input
                    type="number"
                    value={form.processingFee}
                    onChange={e => setForm({ ...form, processingFee: Number(e.target.value) })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Stamp Duty (RM)</label>
                  <input
                    type="number"
                    value={form.stampDutyFee}
                    onChange={e => setForm({ ...form, stampDutyFee: Number(e.target.value) })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">Estimated Target Start Date</label>
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                    Indicative For Quotation
                  </span>
                </div>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm({ ...form, startDate: e.target.value })}
                  className="w-full text-sm p-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Repayment follows the monthly <strong>Anniversary Date</strong> (1 month after drawdown). Official schedule will be activated upon disbursement.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting || !customer}
                className="w-full mt-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl shadow-md shadow-indigo-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{submitting ? 'Submitting Application...' : 'Submit Loan Application (For Approval)'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Live Simulation Card & Amortization Schedule (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Executive Calculation Cards */}
          {previewSummary && (
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-md border border-indigo-800/40 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-widest flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Live Quotation Summary</span>
                </span>
                <span className="text-xs bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-2.5 py-0.5 rounded-full font-semibold">
                  Zero Batch Ready
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Monthly Installment</div>
                  <div className="text-xl font-extrabold text-emerald-400 mt-1">
                    RM {previewSummary.monthlyInstallment.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{form.tenorMonths} payments</div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Total Profit</div>
                  <div className="text-xl font-extrabold text-white mt-1">
                    RM {previewSummary.totalProfit.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{form.profitRatePA}% p.a.</div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Net Payout</div>
                  <div className="text-xl font-extrabold text-indigo-300 mt-1">
                    RM {netDisbursement.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">After fees</div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Total Repayable</div>
                  <div className="text-xl font-extrabold text-white mt-1">
                    RM {previewSummary.totalPayable.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Principal + Profit</div>
                </div>
              </div>
            </div>
          )}

          {/* Schedule Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Amortization Schedule Breakdown</h2>
                <p className="text-[10px] text-slate-400">Indicative estimate • Official due dates calculated upon disbursement</p>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {previewSchedule?.length || 0} Installments
              </span>
            </div>

            {previewSchedule ? (
              <div className="overflow-y-auto max-h-[420px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50/90 text-slate-500 uppercase font-bold sticky top-0 border-b border-slate-200/80">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Due Date</th>
                      <th className="p-3">Principal Due</th>
                      <th className="p-3">Profit Due</th>
                      <th className="p-3">Total Installment</th>
                      <th className="p-3">Ending Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewSchedule.map(item => (
                      <tr key={item.installmentNo} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-bold text-slate-400">{item.installmentNo}</td>
                        <td className="p-3 font-semibold text-slate-800">{item.dueDate}</td>
                        <td className="p-3 text-slate-700">RM {item.principalDue.toFixed(2)}</td>
                        <td className="p-3 text-indigo-600 font-semibold">RM {item.profitDue.toFixed(2)}</td>
                        <td className="p-3 font-bold text-slate-900">RM {item.totalDue.toFixed(2)}</td>
                        <td className="p-3 text-slate-500">RM {item.endingBalance.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-16 text-center text-slate-400">Computing schedule...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewFinancingPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="p-12 text-center text-slate-500">Loading form...</div>}>
        <NewFinancingContent />
      </Suspense>
    </DashboardLayout>
  );
}
