'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Sparkles,
  User,
  UserCheck,
  Building2,
  CreditCard,
  Phone,
  AlertTriangle,
  RotateCcw,
  UserPlus
} from 'lucide-react';
import { Customer } from '@/core/store/memory-store';
import { ScheduleItem } from '@/core/financing/types';

function NewFinancingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL Query pre-fills (from Simulator or Customer Profile)
  const queryCustomerId = searchParams.get('customerId') || '';
  const queryPrincipal = searchParams.get('principal');
  const queryRate = searchParams.get('rate');
  const queryTenor = searchParams.get('tenor');
  const queryMethod = searchParams.get('method');
  const queryProcFee = searchParams.get('procFee');
  const queryStampDuty = searchParams.get('stampDuty');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(queryCustomerId);

  const [form, setForm] = useState({
    principalAmount: queryPrincipal ? Number(queryPrincipal) : 10000,
    profitRatePA: queryRate ? Number(queryRate) : 10,
    tenorMonths: queryTenor ? Number(queryTenor) : 12,
    calcMethod: (queryMethod === 'REDUCING_BALANCE' ? 'REDUCING_BALANCE' : 'FLAT_RATE') as 'FLAT_RATE' | 'REDUCING_BALANCE',
    startDate: new Date().toISOString().split('T')[0],
    processingFee: queryProcFee !== null ? Number(queryProcFee) : 150,
    stampDutyFee: queryStampDuty !== null ? Number(queryStampDuty) : 50,
  });

  const [previewSchedule, setPreviewSchedule] = useState<ScheduleItem[] | null>(null);
  const [previewSummary, setPreviewSummary] = useState<{ totalProfit: number; totalPayable: number; monthlyInstallment: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all institute customers
  useEffect(() => {
    fetch('/api/v1/customers')
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          setCustomers(json.data);
          // If query param matches an existing customer, select it
          if (queryCustomerId && json.data.some((c: Customer) => c.id === queryCustomerId)) {
            setSelectedCustomerId(queryCustomerId);
          }
        }
      })
      .finally(() => setLoadingCustomers(false));
  }, [queryCustomerId]);

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Filtered customers for search picker (searches name, NRIC, phone, employer)
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 5); // default show first 5
    const q = customerSearch.toLowerCase().trim();
    return customers.filter(c =>
      c.fullName.toLowerCase().includes(q) ||
      c.idNumber.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.employerName && c.employerName.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [customers, customerSearch]);

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
  const netIncome = selectedCustomer?.monthlyNetIncome || 0;
  const existingCommitments = selectedCustomer?.monthlyCommitments || 0;
  const totalCommitmentsWithNewLoan = existingCommitments + proposedInstallment;
  const projectedDsr = netIncome > 0 ? Math.round((totalCommitmentsWithNewLoan / netIncome) * 100) : 0;

  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert('Please search and select a borrower first');
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
          customerId: selectedCustomerId,
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
          <p className="text-xs text-slate-500">Originate an active financing facility tied to a borrower CIF master file</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Borrower Search + Facility Parameters (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* STEP 1: Searchable Borrower Picker */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center">1</span>
                <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Borrower Profile</h2>
              </div>
              {selectedCustomer && (
                <button
                  type="button"
                  onClick={() => setSelectedCustomerId('')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Change Borrower</span>
                </button>
              )}
            </div>

            {selectedCustomer ? (
              /* Selected Borrower Details Card */
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        {selectedCustomer.title ? `${selectedCustomer.title}. ` : ''}{selectedCustomer.fullName}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        {selectedCustomer.idType}: {selectedCustomer.idNumber}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    Selected
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/70 text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Net Monthly Income</span>
                    <span className="font-bold text-slate-900">
                      RM {selectedCustomer.monthlyNetIncome?.toLocaleString('en-MY') || '0.00'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Current Commitments</span>
                    <span className="font-bold text-slate-900">
                      RM {selectedCustomer.monthlyCommitments?.toLocaleString('en-MY') || '0.00'}
                    </span>
                  </div>
                </div>

                {/* Live Underwriting DSR Warning */}
                <div className="pt-2 border-t border-slate-200/70">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">New Projected DSR:</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
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
              </div>
            ) : (
              /* Searchable Customer Picker */
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search by name, IC / Passport, phone..."
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                {loadingCustomers ? (
                  <div className="text-center py-6 text-xs text-slate-400">Loading customer database...</div>
                ) : filteredCustomers.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {filteredCustomers.map(c => (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">
                            {c.title ? `${c.title}. ` : ''}{c.fullName}
                          </div>
                          <div className="text-slate-500 font-mono text-[11px]">
                            {c.idType}: {c.idNumber} • {c.phone}
                          </div>
                          <div className="text-slate-600 text-[10px] mt-0.5">
                            Net: RM {c.monthlyNetIncome?.toLocaleString('en-MY') || '0'} • Commitments: RM {c.monthlyCommitments?.toLocaleString('en-MY') || '0'}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedCustomerId(c.id)}
                          className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg shadow-2xs transition cursor-pointer"
                        >
                          Select Borrower
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <p className="text-xs text-slate-500">No registered borrower found matching "{customerSearch}".</p>
                    <Link
                      href="/customers/new"
                      className="inline-flex items-center space-x-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Register New Borrower Profile</span>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 2: Loan Facility Parameters */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center">2</span>
                <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Facility Terms</h2>
              </div>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                {form.calcMethod.replace('_', ' ')}
              </span>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateFacility} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Interest / Profit Model</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, calcMethod: 'FLAT_RATE' })}
                    className={`py-2.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      form.calcMethod === 'FLAT_RATE'
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Flat Rate (Hire Purchase)
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, calcMethod: 'REDUCING_BALANCE' })}
                    className={`py-2.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      form.calcMethod === 'REDUCING_BALANCE'
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Reducing Balance
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Disbursement / Start Date</label>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={e => setForm({ ...form, startDate: e.target.value })}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedCustomerId}
                className="w-full mt-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl shadow-md shadow-indigo-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                <span>
                  {submitting
                    ? 'Creating Loan Facility...'
                    : !selectedCustomerId
                    ? 'Select a Borrower Above to Proceed'
                    : 'Submit Loan Application'}
                </span>
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
              <h2 className="font-bold text-slate-900 text-sm">Amortization Schedule Breakdown</h2>
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
