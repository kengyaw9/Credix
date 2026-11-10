'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Calculator, ArrowRight, DollarSign, Calendar, Percent, ShieldCheck, Sparkles, TrendingUp, RefreshCw } from 'lucide-react';
import { ScheduleItem, CalculationMethod } from '@/core/financing/types';
import { getCalcMethodLabel } from '@/core/financing/calculator';

export default function CalculatorPage() {
  const router = useRouter();

  const [principalAmount, setPrincipalAmount] = useState<number>(10000);
  const [profitRatePA, setProfitRatePA] = useState<number>(10);
  const [tenorMonths, setTenorMonths] = useState<number>(12);
  const [calcMethod, setCalcMethod] = useState<CalculationMethod>('FLAT_R78');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [processingFee, setProcessingFee] = useState<number>(150);
  const [stampDutyFee, setStampDutyFee] = useState<number>(50);

  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [summary, setSummary] = useState<{
    monthlyInstallment: number;
    totalProfit: number;
    totalPayable: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // Recalculate on any parameter change
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    fetch('/api/v1/financing/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        principalAmount: Number(principalAmount) || 0,
        profitRatePA: Number(profitRatePA) || 0,
        tenorMonths: Number(tenorMonths) || 1,
        startDate: startDate || new Date().toISOString().split('T')[0],
        calcMethod,
      }),
    })
      .then(res => res.json())
      .then(json => {
        if (!isCancelled && json.success) {
          setSchedule(json.data.schedule || []);
          setSummary({
            monthlyInstallment: json.data.monthlyInstallment,
            totalProfit: json.data.totalProfit,
            totalPayable: json.data.totalPayable,
          });
        }
      })
      .catch(err => console.error('Calculation error:', err))
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [principalAmount, profitRatePA, tenorMonths, calcMethod, startDate]);

  const netPayout = Math.max(0, principalAmount - (processingFee || 0) - (stampDutyFee || 0));

  // Quick preset helpers
  const principalPresets = [5000, 10000, 20000, 50000, 100000];
  const tenorPresets = [6, 12, 24, 36, 60];
  const ratePresets = [6, 8, 10, 12, 18];

  const handleProceedToLoan = () => {
    router.push(`/financing/new?principal=${principalAmount}&rate=${profitRatePA}&tenor=${tenorMonths}&method=${calcMethod}&procFee=${processingFee}&stampDuty=${stampDutyFee}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Calculator className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Loan Repayment Simulator</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Interactive financial sandbox to simulate installment amounts, profit totals, and schedule breakdown without creating borrower accounts.
            </p>
          </div>

          <button
            onClick={handleProceedToLoan}
            className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition self-start sm:self-auto cursor-pointer"
          >
            <span>Create Loan from this Simulation</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Simulator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Inputs Section (5 Cols) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider">Simulation Parameters</h2>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                {getCalcMethodLabel(calcMethod)}
              </span>
            </div>

            {/* Method Toggle */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Financing Calculation Model</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setCalcMethod('FLAT_R78')}
                  className={`p-3 text-left rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                    calcMethod === 'FLAT_R78' || (calcMethod as string) === 'FLAT_RATE'
                      ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold">Hire Purchase (R78)</div>
                  <div className="text-[10px] text-slate-500 mt-1">Sum of Digits • HP Act 1967 standard</div>
                </button>

                <button
                  type="button"
                  onClick={() => setCalcMethod('FLAT_STRAIGHT')}
                  className={`p-3 text-left rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                    calcMethod === 'FLAT_STRAIGHT'
                      ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold">Straight Flat Rate</div>
                  <div className="text-[10px] text-slate-500 mt-1">Equal monthly profit &amp; principal</div>
                </button>

                <button
                  type="button"
                  onClick={() => setCalcMethod('REDUCING_MONTHLY')}
                  className={`p-3 text-left rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                    calcMethod === 'REDUCING_MONTHLY' || (calcMethod as string) === 'REDUCING_BALANCE'
                      ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold">Monthly Reducing</div>
                  <div className="text-[10px] text-slate-500 mt-1">Amortized monthly rest balance</div>
                </button>

                <button
                  type="button"
                  onClick={() => setCalcMethod('REDUCING_DAILY')}
                  className={`p-3 text-left rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                    calcMethod === 'REDUCING_DAILY'
                      ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold">Daily Reducing</div>
                  <div className="text-[10px] text-slate-500 mt-1">Exact calendar days rest (365 days)</div>
                </button>
              </div>
            </div>

            {/* Principal Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Principal Amount (RM)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-400">RM</span>
                <input
                  type="number"
                  step="500"
                  min="500"
                  value={principalAmount}
                  onChange={e => setPrincipalAmount(Number(e.target.value))}
                  className="w-full text-base font-extrabold text-slate-900 pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {principalPresets.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPrincipalAmount(preset)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition cursor-pointer ${
                      principalAmount === preset
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    RM {preset.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Rate & Tenor */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Annual Rate (% p.a.)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="50"
                    value={profitRatePA}
                    onChange={e => setProfitRatePA(Number(e.target.value))}
                    className="w-full text-sm font-bold text-slate-900 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-400">%</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {ratePresets.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setProfitRatePA(r)}
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition cursor-pointer ${
                        profitRatePA === r
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {r}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Tenor (Months)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="120"
                  value={tenorMonths}
                  onChange={e => setTenorMonths(Number(e.target.value))}
                  className="w-full text-sm font-bold text-slate-900 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {tenorPresets.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTenorMonths(t)}
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition cursor-pointer ${
                        tenorMonths === t
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {t}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Commencement Date & Deductions */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Commencement / Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Processing Fee (RM)</label>
                  <input
                    type="number"
                    step="10"
                    value={processingFee}
                    onChange={e => setProcessingFee(Number(e.target.value))}
                    className="w-full text-sm p-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stamp Duty (RM)</label>
                  <input
                    type="number"
                    step="10"
                    value={stampDutyFee}
                    onChange={e => setStampDutyFee(Number(e.target.value))}
                    className="w-full text-sm p-2 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Originate CTA Card */}
            <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-indigo-900">Satisfied with the quotation?</div>
                <div className="text-[11px] text-indigo-700">Originate an official facility with these terms.</div>
              </div>
              <button
                type="button"
                onClick={handleProceedToLoan}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
              >
                Proceed &rarr;
              </button>
            </div>
          </div>

          {/* Quotation & Schedule Breakdown (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Live Quotation Summary Card */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-md border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Real-Time Quotation Result</span>
                </span>
                {loading && (
                  <span className="flex items-center text-[10px] text-indigo-300 space-x-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Updating...</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-800/40 p-3.5 rounded-2xl border border-slate-700/60">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Monthly Installment</div>
                  <div className="text-xl font-extrabold text-emerald-400 mt-1">
                    RM {summary ? summary.monthlyInstallment.toFixed(2) : '0.00'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{tenorMonths} monthly payments</div>
                </div>

                <div className="bg-slate-800/40 p-3.5 rounded-2xl border border-slate-700/60">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Total Profit / Interest</div>
                  <div className="text-xl font-extrabold text-indigo-300 mt-1">
                    RM {summary ? summary.totalProfit.toFixed(2) : '0.00'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{profitRatePA}% p.a.</div>
                </div>

                <div className="bg-slate-800/40 p-3.5 rounded-2xl border border-slate-700/60">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Net Borrower Payout</div>
                  <div className="text-xl font-extrabold text-cyan-300 mt-1">
                    RM {netPayout.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">After fees deducted</div>
                </div>

                <div className="bg-slate-800/40 p-3.5 rounded-2xl border border-slate-700/60">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Total Repayable</div>
                  <div className="text-xl font-extrabold text-white mt-1">
                    RM {summary ? summary.totalPayable.toFixed(2) : '0.00'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Principal + Profit</div>
                </div>
              </div>
            </div>

            {/* Schedule Breakdown Table */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Amortization Schedule Breakdown</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Cents rounding absorbed on installment #{tenorMonths}</p>
                </div>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {schedule.length} Installments
                </span>
              </div>

              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider sticky top-0 border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4 text-right">Principal</th>
                      <th className="py-3 px-4 text-right">Profit / Interest</th>
                      <th className="py-3 px-4 text-right">Installment</th>
                      <th className="py-3 px-4 text-right">Ending Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {schedule.map(item => (
                      <tr key={item.installmentNo} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-bold text-slate-900">{item.installmentNo}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">{item.dueDate}</td>
                        <td className="py-2.5 px-4 text-right font-mono">RM {item.principalDue.toFixed(2)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-indigo-600">RM {item.profitDue.toFixed(2)}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">RM {item.totalDue.toFixed(2)}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-500">RM {item.endingBalance.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
