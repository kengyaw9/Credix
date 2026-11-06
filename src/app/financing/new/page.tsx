'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { ArrowLeft, Calculator, CheckCircle2 } from 'lucide-react';
import { Customer } from '@/core/store/memory-store';
import { ScheduleItem } from '@/core/financing/types';

function NewFinancingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCustomerId = searchParams.get('customerId') || '';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  const [form, setForm] = useState({
    customerId: initialCustomerId,
    principalAmount: 10000,
    profitRatePA: 10,
    tenorMonths: 12,
    calcMethod: 'FLAT_RATE' as 'FLAT_RATE' | 'REDUCING_BALANCE',
    startDate: new Date().toISOString().split('T')[0],
    processingFee: 150,
    stampDutyFee: 50,
  });

  const [previewSchedule, setPreviewSchedule] = useState<ScheduleItem[] | null>(null);
  const [previewSummary, setPreviewSummary] = useState<{ totalProfit: number; totalPayable: number; monthlyInstallment: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/customers')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data.length > 0) {
          setCustomers(json.data);
          if (!initialCustomerId) {
            setForm(prev => ({ ...prev, customerId: json.data[0].id }));
          }
        }
      })
      .finally(() => setLoadingCustomers(false));
  }, [initialCustomerId]);

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
      setError('Calculation error');
    }
  };

  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId) {
      alert('Please select or create a borrower profile first');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/financing/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <Link
          href="/financing"
          className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">New Financing Facility</h1>
          <p className="text-xs text-slate-500">Configure parameters, preview schedule, and generate loan facility</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 text-base">Facility Setup</h2>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateFacility} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Borrower Profile (CIF)</label>
              {loadingCustomers ? (
                <div className="text-xs text-slate-400">Loading borrowers...</div>
              ) : (
                <select
                  value={form.customerId}
                  onChange={e => setForm({ ...form, customerId: e.target.value })}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Registered Borrower --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.idNumber})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Financing Calculation Method</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, calcMethod: 'FLAT_RATE' })}
                  className={`py-2 text-xs font-semibold rounded-xl border transition ${
                    form.calcMethod === 'FLAT_RATE'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Flat Rate
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, calcMethod: 'REDUCING_BALANCE' })}
                  className={`py-2 text-xs font-semibold rounded-xl border transition ${
                    form.calcMethod === 'REDUCING_BALANCE'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Reducing Balance
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Facility Principal Amount (RM)</label>
              <input
                type="number"
                required
                step="100"
                value={form.principalAmount}
                onChange={e => setForm({ ...form, principalAmount: Number(e.target.value) })}
                className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Profit Rate (% p.a.)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={form.profitRatePA}
                  onChange={e => setForm({ ...form, profitRatePA: Number(e.target.value) })}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tenor (Months)</label>
                <input
                  type="number"
                  required
                  value={form.tenorMonths}
                  onChange={e => setForm({ ...form, tenorMonths: Number(e.target.value) })}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Processing Fee (RM)</label>
                <input
                  type="number"
                  value={form.processingFee}
                  onChange={e => setForm({ ...form, processingFee: Number(e.target.value) })}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Stamp Duty (RM)</label>
                <input
                  type="number"
                  value={form.stampDutyFee}
                  onChange={e => setForm({ ...form, stampDutyFee: Number(e.target.value) })}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Facility Start Date</label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
                className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handlePreview}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 rounded-xl transition"
              >
                Compute Schedule
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Facility'}
              </button>
            </div>
          </form>
        </div>

        {/* Schedule Preview Column */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-slate-900 text-base">Amortization Schedule Preview</h2>
            {previewSummary && (
              <span className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-bold border border-indigo-200">
                Monthly: RM {previewSummary.monthlyInstallment.toFixed(2)}
              </span>
            )}
          </div>

          {previewSummary && (
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
              <div>
                <div className="text-xs text-slate-500">Principal</div>
                <div className="font-bold text-slate-900 text-sm mt-0.5">
                  RM {form.principalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Total Profit</div>
                <div className="font-bold text-indigo-600 text-sm mt-0.5">
                  RM {previewSummary.totalProfit.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Total Repayable</div>
                <div className="font-bold text-slate-900 text-sm mt-0.5">
                  RM {previewSummary.totalPayable.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )}

          {previewSchedule ? (
            <div className="overflow-y-auto max-h-[500px] border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Principal Due</th>
                    <th className="p-3">Profit Due</th>
                    <th className="p-3">Total Due</th>
                    <th className="p-3">Remaining Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewSchedule.map(item => (
                    <tr key={item.installmentNo} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-500">{item.installmentNo}</td>
                      <td className="p-3 text-slate-800">{item.dueDate}</td>
                      <td className="p-3 text-slate-800">RM {item.principalDue.toFixed(2)}</td>
                      <td className="p-3 text-indigo-600">RM {item.profitDue.toFixed(2)}</td>
                      <td className="p-3 font-bold text-slate-900">RM {item.totalDue.toFixed(2)}</td>
                      <td className="p-3 text-slate-500">RM {item.endingBalance.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-16 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Click &quot;Compute Schedule&quot; to preview the full month-by-month repayment schedule.
            </div>
          )}
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
