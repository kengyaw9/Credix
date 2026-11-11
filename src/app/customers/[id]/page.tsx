'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  ArrowLeft, User, Phone, Mail, Building2, CreditCard, 
  PlusCircle, AlertTriangle, CheckCircle2, Clock, ChevronRight,
  Briefcase, MapPin, ShieldCheck, HeartHandshake, DollarSign,
  TrendingUp, Percent
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
        <div className="p-16 text-center text-slate-400">Loading customer profile...</div>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout>
        <div className="p-16 text-center text-slate-500">Customer profile not found.</div>
      </DashboardLayout>
    );
  }

  // Calculate age from DOB
  const calculateAge = (dobString: string) => {
    const birthDate = new Date(dobString);
    const ageDiffMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(ageDiffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const age = customer.dob ? calculateAge(customer.dob) : null;
  const netIncome = customer.monthlyNetIncome || 0;
  const commitments = customer.monthlyCommitments || 0;
  const dsrPercent = netIncome > 0 ? Math.round((commitments / netIncome) * 100) : 0;
  const monthlySurplus = Math.max(0, netIncome - commitments);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center space-x-3">
            <Link
              href="/customers"
              className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200/90 rounded-xl transition shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {customer.title ? `${customer.title}. ` : ''}{customer.fullName}
                </h1>
                <span className="text-xs bg-slate-100 text-slate-700 font-mono px-2.5 py-0.5 rounded-full font-bold">
                  {customer.idType}: {customer.idNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                CIF Profile • Registered on {new Date(customer.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <Link
            href={`/financing/new?customerId=${customer.id}`}
            className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Apply New Financing</span>
          </Link>
        </div>

        {/* Financial Underwriting / Affordability Card */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-3xl shadow-md border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                Financial Affordability &amp; DSR Capacity
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-300">Debt Service Ratio (DSR):</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                dsrPercent <= 50
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  : dsrPercent <= 70
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
              }`}>
                {dsrPercent}% ({dsrPercent <= 50 ? 'Strong Capacity' : dsrPercent <= 70 ? 'Moderate' : 'High Commitment'})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Monthly Net Income</div>
              <div className="text-xl font-extrabold text-emerald-400 mt-1">
                RM {netIncome.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Gross: RM {customer.monthlyGrossIncome?.toLocaleString('en-MY')}</div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Existing Commitments</div>
              <div className="text-xl font-extrabold text-rose-400 mt-1">
                RM {commitments.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">External bank &amp; loan debt</div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Estimated Living Expenses</div>
              <div className="text-xl font-extrabold text-white mt-1">
                RM {(customer.monthlyExpenses || 0).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Household &amp; living</div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Monthly Installment Headroom</div>
              <div className="text-xl font-extrabold text-indigo-300 mt-1">
                RM {monthlySurplus.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Available for new repayment</div>
            </div>
          </div>
        </div>

        {/* 4 Detailed Profile Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Identity & Demographics */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center space-x-2 text-indigo-600 border-b border-slate-100 pb-3">
              <User className="w-4 h-4" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                1. Identity &amp; Demographics
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Date of Birth &amp; Age</span>
                <span className="font-bold text-slate-900">{customer.dob} {age ? `(${age} years old)` : ''}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Gender</span>
                <span className="font-bold text-slate-900">{customer.gender}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Marital Status</span>
                <span className="font-bold text-slate-900">{customer.maritalStatus}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Race &amp; Religion</span>
                <span className="font-bold text-slate-900">{customer.race || 'N/A'} • {customer.religion || 'N/A'}</span>
              </div>
              <div className="col-span-2 pt-1 border-t border-slate-50">
                <span className="text-slate-400 block font-medium">Mother&apos;s Maiden Name (Security Verification)</span>
                <span className="font-bold text-indigo-700">{customer.mothersMaidenName || 'Not specified'}</span>
              </div>
            </div>
          </div>

          {/* 2. Contact & Residence */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center space-x-2 text-indigo-600 border-b border-slate-100 pb-3">
              <MapPin className="w-4 h-4" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                2. Contact &amp; Residential Address
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Primary Mobile Phone</span>
                <span className="font-bold text-slate-900">{customer.phone}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Email Address</span>
                <span className="font-bold text-slate-900">{customer.email || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Residence Ownership</span>
                <span className="font-bold text-slate-900">{customer.residenceOwnership} ({customer.lengthOfStayYears || 0} years)</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Home / Office Phone</span>
                <span className="font-bold text-slate-900">{customer.homePhone || customer.officePhone || 'N/A'}</span>
              </div>
              <div className="col-span-2 pt-1 border-t border-slate-50">
                <span className="text-slate-400 block font-medium">Residential Address</span>
                <span className="font-semibold text-slate-900 block mt-0.5">
                  {customer.residentialAddress}
                  {customer.city ? `, ${customer.city}` : ''}
                  {customer.state ? `, ${customer.state}` : ''}
                  {customer.postcode ? ` ${customer.postcode}` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Employment Information */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center space-x-2 text-indigo-600 border-b border-slate-100 pb-3">
              <Briefcase className="w-4 h-4" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                3. Employment &amp; Income Assessment
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Employer / Business Name</span>
                <span className="font-bold text-slate-900">{customer.employerName}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Occupation / Position</span>
                <span className="font-bold text-slate-900">{customer.occupation}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Employment Type</span>
                <span className="font-bold text-slate-900">{customer.employmentType}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Industry Sector</span>
                <span className="font-bold text-slate-900">{customer.employmentSector || 'Commercial'}</span>
              </div>
              <div className="col-span-2 pt-1 border-t border-slate-50">
                <span className="text-slate-400 block font-medium">Date Joined</span>
                <span className="font-semibold text-slate-900">{customer.employmentDate || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* 4. Emergency Contact & Bank Account */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center space-x-2 text-indigo-600 border-b border-slate-100 pb-3">
              <ShieldCheck className="w-4 h-4" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                4. Next of Kin &amp; Disbursement Bank
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2 bg-amber-50/70 p-3 rounded-2xl border border-amber-200/80 space-y-1">
                <span className="text-[10px] text-amber-900 font-bold uppercase tracking-wider block">
                  Emergency Recovery Contact (Next of Kin)
                </span>
                <div className="font-bold text-slate-900 text-sm">
                  {customer.emergencyContactName} ({customer.emergencyContactRelationship})
                </div>
                <div className="text-slate-600 font-semibold">{customer.emergencyContactPhone}</div>
              </div>

              <div className="col-span-2 pt-2">
                <span className="text-slate-400 block font-medium">Disbursement Payout Bank Account</span>
                <div className="font-bold text-slate-900 mt-0.5">
                  {customer.bankName} - <span className="font-mono text-indigo-600 font-bold">{customer.bankAccountNo}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Facilities for this Customer */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Financing Facilities ({accounts.length})</h2>
              <p className="text-xs text-slate-500">Loan facilities opened by this borrower with your institute</p>
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
                  <tr className="bg-slate-50/80 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="p-4">Account No</th>
                    <th className="p-4">Principal</th>
                    <th className="p-4">Tenor / Rate</th>
                    <th className="p-4">Monthly Installment</th>
                    <th className="p-4">Due State (Real-Time)</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accounts.map(acc => {
                    const rt = acc.realtimeStatus;
                    return (
                      <tr key={acc.id} className="hover:bg-slate-50 transition">
                        <td className="p-4 font-bold font-mono text-slate-900">{acc.accountNo}</td>
                        <td className="p-4 font-bold text-slate-800">
                          <span className="text-[11px] text-slate-400 font-normal mr-1">RM</span>
                          {acc.principalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-xs text-slate-600">
                          {acc.tenorMonths} Mos @ {acc.profitRatePA}% p.a.
                        </td>
                        <td className="p-4 font-bold text-slate-800">
                          <span className="text-[11px] text-slate-400 font-normal mr-1">RM</span>
                          {acc.monthlyInstallment.toFixed(2)}
                        </td>
                        <td className="p-4">
                          {rt?.accountStatus === 'OVERDUE' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-500" />
                              OVERDUE ({rt.daysPastDue} DPD)
                            </span>
                          ) : rt?.accountStatus === 'SETTLED' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                              Settled
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                              Current
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700">
                            {acc.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <Link
                            href={`/financing/${acc.id}`}
                            className="inline-flex items-center space-x-1 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-3.5 py-1.5 rounded-xl transition"
                          >
                            <span>Manage</span>
                            <ChevronRight className="w-3.5 h-3.5" />
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
