'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { 
  Building2, Users, CreditCard, Calculator, ShieldCheck, 
  ArrowUpRight, Clock, CheckCircle2, AlertTriangle, 
  RefreshCw, FileText, ChevronRight, DollarSign, Wallet
} from 'lucide-react';
import { Tenant, Customer, FinancingAccount } from '@/core/store/memory-store';
import { RealTimeAccountStatus, ScheduleItem, SettlementQuotation } from '@/core/financing/types';

interface ExtendedAccount extends FinancingAccount {
  customerName: string;
  customerIdNumber: string;
  realtimeStatus: RealTimeAccountStatus;
}

export default function DashboardPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string>('11111111-1111-1111-1111-111111111111');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<ExtendedAccount[]>([]);
  const [activeTab, setActiveTab] = useState<'accounts' | 'apply' | 'customers' | 'settlement'>('accounts');
  const [loading, setLoading] = useState<boolean>(true);
  const [, startTransition] = useTransition();

  // Modals state
  const [selectedAccount, setSelectedAccount] = useState<ExtendedAccount | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  // New Loan Form state
  const [calcForm, setCalcForm] = useState({
    customerId: '',
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

  // New Customer Form state
  const [custForm, setCustForm] = useState({
    fullName: '',
    idNumber: '',
    phone: '',
    email: '',
    bankName: 'Maybank',
    bankAccountNo: '',
  });

  // Settlement Form state
  const [settleAccountId, setSettleAccountId] = useState<string>('');
  const [settleDate, setSettleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [settleQuote, setSettleQuote] = useState<SettlementQuotation | null>(null);

  // Load tenants once
  useEffect(() => {
    fetch('/api/v1/tenants')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data.length > 0) {
          setTenants(json.data);
          setActiveTenantId(json.data[0].id);
        }
      });
  }, []);

  // Reload tenant data whenever activeTenantId changes
  const loadTenantData = async (tenantId: string) => {
    setLoading(true);
    try {
      const [custRes, accRes] = await Promise.all([
        fetch('/api/v1/customers', { headers: { 'x-tenant-id': tenantId } }),
        fetch('/api/v1/financing/accounts', { headers: { 'x-tenant-id': tenantId } }),
      ]);
      const custData = await custRes.json();
      const accData = await accRes.json();

      if (custData.success) {
        setCustomers(custData.data);
        if (custData.data.length > 0 && !calcForm.customerId) {
          setCalcForm(prev => ({ ...prev, customerId: custData.data[0].id }));
        }
      }
      if (accData.success) {
        setAccounts(accData.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTenantId) {
      loadTenantData(activeTenantId);
    }
  }, [activeTenantId]);

  const activeTenant = tenants.find(t => t.id === activeTenantId);

  // Calculate live preview
  const handleCalculatePreview = async () => {
    try {
      const res = await fetch('/api/v1/financing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          principalAmount: Number(calcForm.principalAmount),
          profitRatePA: Number(calcForm.profitRatePA),
          tenorMonths: Number(calcForm.tenorMonths),
          startDate: calcForm.startDate,
          calcMethod: calcForm.calcMethod,
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
    } catch (err) {
      console.error(err);
    }
  };

  // Submit new loan facility
  const handleCreateLoan = async () => {
    if (!calcForm.customerId) {
      alert('Please select or create a borrower first!');
      return;
    }
    try {
      const res = await fetch('/api/v1/financing/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': activeTenantId,
        },
        body: JSON.stringify(calcForm),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Loan facility created successfully: ${data.data.accountNo}`);
        setPreviewSchedule(null);
        setPreviewSummary(null);
        setActiveTab('accounts');
        loadTenantData(activeTenantId);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Disburse loan
  const handleDisburse = async (account: ExtendedAccount) => {
    if (!confirm(`Confirm disbursement for account ${account.accountNo}? Net payout will be released.`)) return;
    try {
      const res = await fetch(`/api/v1/financing/accounts/${account.id}/disburse`, {
        method: 'POST',
        headers: { 'x-tenant-id': activeTenantId },
      });
      const data = await res.json();
      if (data.success) {
        alert(`Account ${account.accountNo} successfully disbursed!`);
        loadTenantData(activeTenantId);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Record Repayment
  const handleProcessPayment = async () => {
    if (!selectedAccount || !paymentAmount) return;
    try {
      const res = await fetch(`/api/v1/financing/accounts/${selectedAccount.id}/repay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': activeTenantId,
        },
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
        setPaymentMessage(
          `Payment of RM ${Number(paymentAmount).toFixed(2)} applied!\n• Late Fee: RM ${fee}\n• Profit: RM ${profit}\n• Principal: RM ${principal}\n• Settled Installments: ${count}`
        );
        loadTenantData(activeTenantId);
        setTimeout(() => {
          setIsPaymentOpen(false);
          setPaymentMessage(null);
          setPaymentAmount('');
        }, 3000);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Register Customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': activeTenantId,
        },
        body: JSON.stringify(custForm),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Customer ${data.data.fullName} registered under this institute!`);
        setCustForm({
          fullName: '',
          idNumber: '',
          phone: '',
          email: '',
          bankName: 'Maybank',
          bankAccountNo: '',
        });
        loadTenantData(activeTenantId);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Settlement Quote
  const handleGetSettlementQuote = async () => {
    if (!settleAccountId) return;
    try {
      const res = await fetch(`/api/v1/financing/accounts/${settleAccountId}/settlement?asOfDate=${settleDate}`, {
        headers: { 'x-tenant-id': activeTenantId },
      });
      const data = await res.json();
      if (data.success) {
        setSettleQuote(data.data.quotation);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Execute Early Settlement
  const handleExecuteSettlement = async () => {
    if (!settleAccountId || !settleQuote) return;
    if (!confirm(`Confirm early settlement of RM ${settleQuote.netSettlementAmount.toFixed(2)}? This will close the account.`)) return;
    try {
      const res = await fetch(`/api/v1/financing/accounts/${settleAccountId}/settlement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': activeTenantId,
        },
        body: JSON.stringify({ settlementDate: settleDate }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Loan facility fully settled and closed!');
        setSettleQuote(null);
        setSettleAccountId('');
        loadTenantData(activeTenantId);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Top metric calculations
  const totalDisbursed = accounts.reduce((acc, curr) => acc + (curr.disbursedAmount || 0), 0);
  const totalArrears = accounts.reduce((acc, curr) => acc + (curr.realtimeStatus?.totalArrearsDue || 0), 0);
  const activeCount = accounts.filter(a => a.status === 'ACTIVE').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 text-white p-2 rounded-lg font-bold flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">FlexiFinancing</h1>
              <p className="text-xs text-slate-500">Multi-Tenant Cloud Lending Platform • Zero-Batch Engine</p>
            </div>
          </div>

          {/* Tenant Switcher with Security Indicator */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Row-Level Security Active
            </div>
            <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <Building2 className="w-4 h-4 text-slate-500 ml-2" />
              <select
                aria-label="Select Financial Institution"
                value={activeTenantId}
                onChange={(e) => {
                  const val = e.target.value;
                  startTransition(() => {
                    setActiveTenantId(val);
                  });
                }}
                className="bg-transparent text-sm font-semibold text-slate-800 pr-3 py-1 focus:outline-none cursor-pointer"
              >
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Tenant Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Tenant ID: {activeTenant?.code}
              </span>
              <span className="text-xs text-slate-400">Strict Data Segregation Enforced</span>
            </div>
            <h2 className="text-2xl font-bold mt-1">{activeTenant?.name}</h2>
            <p className="text-sm text-slate-300 mt-0.5">
              Real-time due tracking, collection allocation, and settlement rebate engine.
            </p>
          </div>
          <button
            onClick={() => loadTenantData(activeTenantId)}
            className="flex items-center justify-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Live State</span>
          </button>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Financing</p>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{activeCount} Accounts</p>
            <p className="text-xs text-slate-500 mt-1">{accounts.length} total facilities</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Disbursed</p>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">RM {totalDisbursed.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-emerald-600 mt-1">Capital in circulation</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Overdue (Arrears)</p>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-rose-600 mt-2">RM {totalArrears.toLocaleString('en-MY', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-slate-500 mt-1">Dynamic on-demand aging (No batch)</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Institute Borrowers</p>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{customers.length} Profiles</p>
            <p className="text-xs text-slate-500 mt-1">CIF Lite master records</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-4 rounded-xl shadow-sm">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`py-4 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'accounts'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Accounts & Due Tracker</span>
          </button>
          <button
            onClick={() => setActiveTab('apply')}
            className={`py-4 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'apply'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>New Facility & Calculator</span>
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`py-4 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'customers'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Borrower Directory (CIF)</span>
          </button>
          <button
            onClick={() => setActiveTab('settlement')}
            className={`py-4 px-4 text-sm font-semibold border-b-2 flex items-center space-x-2 transition ${
              activeTab === 'settlement'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Early Settlement & Rebate</span>
          </button>
        </div>

        {/* Tab 1: Accounts & Due Tracker */}
        {activeTab === 'accounts' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-900">Financing Facility Accounts</h3>
                <p className="text-xs text-slate-500">Real-time status calculated on evaluation without overnight batch locks</p>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-500">Loading tenant data...</div>
            ) : accounts.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No financing accounts created under {activeTenant?.name} yet.
                <div className="mt-3">
                  <button
                    onClick={() => setActiveTab('apply')}
                    className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg"
                  >
                    Create a new facility now &rarr;
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase border-b border-slate-200">
                      <th className="p-3.5">Account / Borrower</th>
                      <th className="p-3.5">Principal</th>
                      <th className="p-3.5">Tenor / Rate</th>
                      <th className="p-3.5">Installment</th>
                      <th className="p-3.5">Due State (Real-Time)</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accounts.map(acc => {
                      const rt = acc.realtimeStatus;
                      return (
                        <tr key={acc.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3.5">
                            <div className="font-semibold text-slate-900">{acc.accountNo}</div>
                            <div className="text-xs text-slate-500">{acc.customerName} ({acc.customerIdNumber})</div>
                          </td>
                          <td className="p-3.5 font-medium text-slate-800">
                            RM {acc.principalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3.5 text-xs text-slate-600">
                            <div>{acc.tenorMonths} Mos @ {acc.profitRatePA}% p.a.</div>
                            <div className="text-slate-400 capitalize">{acc.calcMethod.toLowerCase().replace('_', ' ')}</div>
                          </td>
                          <td className="p-3.5 font-medium text-slate-800">
                            RM {acc.monthlyInstallment.toFixed(2)}
                          </td>
                          <td className="p-3.5">
                            {rt?.accountStatus === 'OVERDUE' ? (
                              <div className="inline-flex flex-col">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 w-max">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  OVERDUE ({rt.daysPastDue} DPD)
                                </span>
                                <span className="text-xs text-rose-600 font-medium mt-0.5">
                                  Arrears: RM {rt.totalArrearsDue.toFixed(2)}
                                </span>
                              </div>
                            ) : rt?.accountStatus === 'DUE' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                                <Clock className="w-3 h-3 mr-1" />
                                Due Today
                              </span>
                            ) : rt?.accountStatus === 'SETTLED' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Fully Settled
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                                Current (On Time)
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
                          <td className="p-3.5 text-right space-x-2">
                            {acc.status === 'DRAFT' && (
                              <button
                                onClick={() => handleDisburse(acc)}
                                className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition"
                              >
                                Disburse
                              </button>
                            )}
                            {acc.status === 'ACTIVE' && (
                              <button
                                onClick={() => {
                                  setSelectedAccount(acc);
                                  setPaymentAmount(acc.monthlyInstallment.toString());
                                  setIsPaymentOpen(true);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition"
                              >
                                Record Payment
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedAccount(acc);
                                setIsScheduleOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                            >
                              Schedule
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: New Financing Facility & Calculator */}
        {activeTab === 'apply' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-base">Facility Parameters</h3>
              <p className="text-xs text-slate-500">Configure loan amount, tenor, and profit rates.</p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Borrower (CIF Profile)</label>
                <select
                  aria-label="Select Borrower"
                  value={calcForm.customerId}
                  onChange={e => setCalcForm({ ...calcForm, customerId: e.target.value })}
                  className="w-full text-sm p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Select Registered Borrower --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.idNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Calculation Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCalcForm({ ...calcForm, calcMethod: 'FLAT_RATE' })}
                    className={`py-2 text-xs font-semibold rounded-lg border ${
                      calcForm.calcMethod === 'FLAT_RATE'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Flat Rate
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcForm({ ...calcForm, calcMethod: 'REDUCING_BALANCE' })}
                    className={`py-2 text-xs font-semibold rounded-lg border ${
                      calcForm.calcMethod === 'REDUCING_BALANCE'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Reducing Balance
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Principal Amount (RM)</label>
                <input
                  type="number"
                  value={calcForm.principalAmount}
                  onChange={e => setCalcForm({ ...calcForm, principalAmount: Number(e.target.value) })}
                  className="w-full text-sm p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rate (% p.a.)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={calcForm.profitRatePA}
                    onChange={e => setCalcForm({ ...calcForm, profitRatePA: Number(e.target.value) })}
                    className="w-full text-sm p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tenor (Months)</label>
                  <input
                    type="number"
                    value={calcForm.tenorMonths}
                    onChange={e => setCalcForm({ ...calcForm, tenorMonths: Number(e.target.value) })}
                    className="w-full text-sm p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Processing Fee</label>
                  <input
                    type="number"
                    value={calcForm.processingFee}
                    onChange={e => setCalcForm({ ...calcForm, processingFee: Number(e.target.value) })}
                    className="w-full text-sm p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stamp Duty</label>
                  <input
                    type="number"
                    value={calcForm.stampDutyFee}
                    onChange={e => setCalcForm({ ...calcForm, stampDutyFee: Number(e.target.value) })}
                    className="w-full text-sm p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={calcForm.startDate}
                  onChange={e => setCalcForm({ ...calcForm, startDate: e.target.value })}
                  className="w-full text-sm p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={handleCalculatePreview}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 rounded-lg transition"
                >
                  Preview Schedule
                </button>
                <button
                  type="button"
                  onClick={handleCreateLoan}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-lg transition"
                >
                  Create Facility
                </button>
              </div>
            </div>

            {/* Schedule Preview Column */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-base">Amortization Schedule Preview</h3>
                {previewSummary && (
                  <span className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-semibold border border-indigo-200">
                    Monthly Installment: RM {previewSummary.monthlyInstallment.toFixed(2)}
                  </span>
                )}
              </div>

              {previewSummary && (
                <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                  <div>
                    <div className="text-xs text-slate-500">Principal</div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">RM {calcForm.principalAmount.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Total Profit</div>
                    <div className="font-bold text-indigo-600 text-sm mt-0.5">RM {previewSummary.totalProfit.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">Total Payable</div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">RM {previewSummary.totalPayable.toFixed(2)}</div>
                  </div>
                </div>
              )}

              {previewSchedule ? (
                <div className="overflow-y-auto max-h-96 border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Due Date</th>
                        <th className="p-2.5">Principal Due</th>
                        <th className="p-2.5">Profit Due</th>
                        <th className="p-2.5">Total Installment</th>
                        <th className="p-2.5">Ending Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewSchedule.map(item => (
                        <tr key={item.installmentNo} className="hover:bg-slate-50">
                          <td className="p-2.5 font-medium text-slate-500">{item.installmentNo}</td>
                          <td className="p-2.5 text-slate-800">{item.dueDate}</td>
                          <td className="p-2.5 text-slate-800">RM {item.principalDue.toFixed(2)}</td>
                          <td className="p-2.5 text-indigo-600">RM {item.profitDue.toFixed(2)}</td>
                          <td className="p-2.5 font-bold text-slate-900">RM {item.totalDue.toFixed(2)}</td>
                          <td className="p-2.5 text-slate-500">RM {item.endingBalance.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
                  Click &quot;Preview Schedule&quot; to inspect the generated installments.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Borrower Directory (CIF Lite) */}
        {activeTab === 'customers' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-base">Register New Borrower</h3>
              <p className="text-xs text-slate-500">CIF Lite master file strictly isolated to {activeTenant?.name}.</p>

              <form onSubmit={handleCreateCustomer} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={custForm.fullName}
                    onChange={e => setCustForm({ ...custForm, fullName: e.target.value })}
                    className="w-full text-sm p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. Siti Nurhaliza"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">NRIC / Passport No</label>
                  <input
                    type="text"
                    required
                    value={custForm.idNumber}
                    onChange={e => setCustForm({ ...custForm, idNumber: e.target.value })}
                    className="w-full text-sm p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. 950812-14-6789"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={custForm.phone}
                    onChange={e => setCustForm({ ...custForm, phone: e.target.value })}
                    className="w-full text-sm p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="+601X-XXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={custForm.email}
                    onChange={e => setCustForm({ ...custForm, email: e.target.value })}
                    className="w-full text-sm p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="email@example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={custForm.bankName}
                      onChange={e => setCustForm({ ...custForm, bankName: e.target.value })}
                      className="w-full text-sm p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Account No</label>
                    <input
                      type="text"
                      value={custForm.bankAccountNo}
                      onChange={e => setCustForm({ ...custForm, bankAccountNo: e.target.value })}
                      className="w-full text-sm p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-lg transition"
                >
                  Save Borrower Profile
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-base">Institute Borrowers ({customers.length})</h3>
              <p className="text-xs text-slate-500">Only officers of {activeTenant?.name} can view these profiles.</p>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {customers.map(c => (
                  <div key={c.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{c.fullName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">IC: {c.idNumber} • Phone: {c.phone}</div>
                      <div className="text-xs text-slate-400 mt-0.5">Bank: {c.bankName || 'N/A'} ({c.bankAccountNo || 'N/A'})</div>
                    </div>
                    <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                      Active CIF
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Early Settlement & Rebate */}
        {activeTab === 'settlement' && (
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Early Settlement &amp; Rebate (Ibra&apos;) Engine</h3>
              <p className="text-xs text-slate-500">
                Calculates real-time unearned profit discounts and final payoff balances instantly.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Active Account</label>
                <select
                  aria-label="Select Active Account for Settlement"
                  value={settleAccountId}
                  onChange={e => {
                    setSettleAccountId(e.target.value);
                    setSettleQuote(null);
                  }}
                  className="w-full text-sm p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Choose Account to Settle --</option>
                  {accounts.filter(a => a.status === 'ACTIVE').map(a => (
                    <option key={a.id} value={a.id}>
                      {a.accountNo} - {a.customerName} (Principal: RM {a.principalAmount})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Settlement Date</label>
                <input
                  type="date"
                  value={settleDate}
                  onChange={e => {
                    setSettleDate(e.target.value);
                    setSettleQuote(null);
                  }}
                  className="w-full text-sm p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleGetSettlementQuote}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold py-2.5 rounded-lg transition"
              >
                Compute Real-Time Settlement Quotation
              </button>

              {settleQuote && (
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3 mt-4">
                  <h4 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2">
                    Settlement Quotation Breakdown
                  </h4>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Principal Outstanding:</span>
                    <span className="font-semibold text-slate-900">RM {settleQuote.principalOutstanding.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-emerald-700">
                    <span>Unearned Profit Rebate (Ibra&apos;):</span>
                    <span className="font-semibold">- RM {settleQuote.unearnedProfitRebate.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-rose-600">
                    <span>Unpaid Late Charges:</span>
                    <span className="font-semibold">+ RM {settleQuote.unpaidLateFees.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-900">Net Payoff Amount:</span>
                    <span className="text-lg font-bold text-indigo-700">
                      RM {settleQuote.netSettlementAmount.toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteSettlement}
                    className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-lg shadow-sm transition"
                  >
                    Execute Early Full Settlement &amp; Close Loan
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Repayment Modal */}
      {isPaymentOpen && selectedAccount && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Record Repayment Collection</h3>
                <p className="text-xs text-slate-500 mt-0.5">Account: {selectedAccount.accountNo} • {selectedAccount.customerName}</p>
              </div>
              <button
                onClick={() => setIsPaymentOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                &times;
              </button>
            </div>

            {selectedAccount.realtimeStatus && selectedAccount.realtimeStatus.totalArrearsDue > 0 && (
              <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-xs text-rose-800">
                <div className="font-bold">Overdue Installments Detected:</div>
                <div>Arrears Due: RM {selectedAccount.realtimeStatus.totalArrearsDue.toFixed(2)}</div>
                <div>Accrued Late Fee: RM {selectedAccount.realtimeStatus.accruedLateFee.toFixed(2)}</div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Amount (RM)</label>
              <input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                className="w-full text-base font-bold p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="w-full text-sm p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {paymentMessage && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-xs text-emerald-800 whitespace-pre-line font-medium">
                {paymentMessage}
              </div>
            )}

            <div className="pt-2 flex space-x-2">
              <button
                type="button"
                onClick={() => setIsPaymentOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessPayment}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-lg"
              >
                Apply Waterfall Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Detail Modal */}
      {isScheduleOpen && selectedAccount && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-3xl w-full rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Installment Schedule &amp; Payment History</h3>
                <p className="text-xs text-slate-500">{selectedAccount.accountNo} • {selectedAccount.customerName}</p>
              </div>
              <button
                onClick={() => setIsScheduleOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                &times;
              </button>
            </div>

            <div className="overflow-y-auto flex-1 border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">Due Date</th>
                    <th className="p-2.5">Principal Due</th>
                    <th className="p-2.5">Profit Due</th>
                    <th className="p-2.5">Total Due</th>
                    <th className="p-2.5">Paid So Far</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedAccount.schedule.map(item => (
                    <tr key={item.installmentNo} className="hover:bg-slate-50">
                      <td className="p-2.5 font-medium">{item.installmentNo}</td>
                      <td className="p-2.5">{item.dueDate}</td>
                      <td className="p-2.5">RM {item.principalDue.toFixed(2)}</td>
                      <td className="p-2.5">RM {item.profitDue.toFixed(2)}</td>
                      <td className="p-2.5 font-bold">RM {item.totalDue.toFixed(2)}</td>
                      <td className="p-2.5 text-emerald-600 font-medium">
                        RM {(item.principalPaid + item.profitPaid).toFixed(2)}
                      </td>
                      <td className="p-2.5">
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

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsScheduleOpen(false)}
                className="bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        FlexiFinancing Core • Designed for Micro-Lending SaaS • Cloud Multi-Tenant Architecture
      </footer>
    </div>
  );
}
