'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DollarSign, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { FinancingAccount } from '@/core/store/memory-store';
import { SettlementQuotation } from '@/core/financing/types';

interface ExtendedAccount extends FinancingAccount {
  customerName: string;
}

export default function SettlementPage() {
  const [accounts, setAccounts] = useState<ExtendedAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [settleDate, setSettleDate] = useState(new Date().toISOString().split('T')[0]);
  const [quote, setQuote] = useState<SettlementQuotation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/v1/financing/accounts')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          const activeAccounts = json.data.filter((a: ExtendedAccount) => a.status === 'ACTIVE');
          setAccounts(activeAccounts);
          if (activeAccounts.length > 0) {
            setSelectedAccountId(activeAccounts[0].id);
          }
        }
      });
  }, []);

  const handleComputeQuote = async () => {
    if (!selectedAccountId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/financing/accounts/${selectedAccountId}/settlement?asOfDate=${settleDate}`);
      const data = await res.json();
      if (data.success) {
        setQuote(data.data.quotation);
      } else {
        alert(data.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteSettlement = async () => {
    if (!selectedAccountId || !quote) return;
    if (!confirm(`Confirm early settlement of RM ${quote.netSettlementAmount.toFixed(2)}?`)) return;

    try {
      const res = await fetch(`/api/v1/financing/accounts/${selectedAccountId}/settlement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settlementDate: settleDate }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Loan facility fully settled and closed!');
        setQuote(null);
        // Refresh accounts
        fetch('/api/v1/financing/accounts')
          .then(res => res.json())
          .then(json => {
            if (json.success) {
              const active = json.data.filter((a: ExtendedAccount) => a.status === 'ACTIVE');
              setAccounts(active);
              setSelectedAccountId(active.length > 0 ? active[0].id : '');
            }
          });
      } else {
        alert(data.error);
      }
    } catch {
      alert('Settlement failed');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center space-x-2 text-indigo-600">
            <DollarSign className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Loan Servicing</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Early Settlement &amp; Rebate (Ibra&apos;)</h1>
          <p className="text-xs text-slate-500">
            Real-time unearned profit discount and final payoff quotation
          </p>
        </div>

        {/* Calculation Box */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-6 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Active Financing Facility</label>
              {accounts.length === 0 ? (
                <div className="text-xs text-slate-400 p-3 bg-slate-50 rounded-xl">
                  No active financing facilities currently open for early settlement.
                </div>
              ) : (
                <select
                  value={selectedAccountId}
                  onChange={e => {
                    setSelectedAccountId(e.target.value);
                    setQuote(null);
                  }}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.accountNo} - {a.customerName} (Principal: RM {a.principalAmount.toLocaleString('en-MY')})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Settlement Payoff Date</label>
              <input
                type="date"
                value={settleDate}
                onChange={e => {
                  setSettleDate(e.target.value);
                  setQuote(null);
                }}
                className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="button"
              disabled={loading || accounts.length === 0}
              onClick={handleComputeQuote}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Computing Rebate...' : 'Generate Real-Time Settlement Quotation'}
            </button>
          </div>

          {/* Quotation Card */}
          {quote && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4 mt-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h2 className="text-sm font-bold text-slate-900">Official Settlement Payoff Breakdown</h2>
                <span className="text-xs text-slate-500">As of {quote.asOfDate}</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Gross Principal Outstanding:</span>
                  <span className="font-semibold text-slate-900">
                    RM {quote.principalOutstanding.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-emerald-700">
                  <span>Less: Unearned Profit Rebate (Ibra&apos;):</span>
                  <span className="font-semibold">
                    - RM {quote.unearnedProfitRebate.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-rose-600">
                  <span>Add: Unpaid Accrued Late Charges:</span>
                  <span className="font-semibold">
                    + RM {quote.unpaidLateFees.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-900">Net Full Settlement Amount:</span>
                  <span className="font-bold text-indigo-700 text-xl">
                    RM {quote.netSettlementAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleExecuteSettlement}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl shadow-sm transition cursor-pointer"
                >
                  Accept Payment &amp; Discharge Facility
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
