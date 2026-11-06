'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  ArrowLeft, User, MapPin, Briefcase, ShieldCheck, 
  CreditCard, Check, ArrowRight, UserCheck
} from 'lucide-react';

export default function NewCustomerPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'personal' | 'address' | 'employment' | 'emergency'>('personal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    // 1. Personal & Identity
    title: 'Mr',
    idType: 'NRIC' as 'NRIC' | 'PASSPORT' | 'POLICE_ARMY' | 'BRN',
    idNumber: '',
    fullName: '',
    dob: '1990-01-01',
    gender: 'MALE' as 'MALE' | 'FEMALE',
    maritalStatus: 'SINGLE' as 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED',
    race: 'Malay',
    religion: 'Islam',
    mothersMaidenName: '',

    // 2. Contact & Address
    phone: '',
    homePhone: '',
    officePhone: '',
    email: '',
    residentialAddress: '',
    postcode: '',
    city: '',
    state: 'Selangor',
    residenceOwnership: 'RENTED' as 'OWN' | 'RENTED' | 'FAMILY' | 'MORTGAGED',
    lengthOfStayYears: 2,
    correspondenceAddress: '',

    // 3. Employment & Income Assessment (Underwriting)
    employerName: '',
    occupation: '',
    employmentType: 'PERMANENT' as 'PERMANENT' | 'CONTRACT' | 'SELF_EMPLOYED' | 'GOVERNMENT',
    employmentSector: 'Private Commercial',
    employmentDate: '2020-01-01',
    monthlyGrossIncome: 5000,
    monthlyNetIncome: 4200,
    monthlyCommitments: 1200, // Existing car loan, credit cards
    monthlyExpenses: 1500,

    // 4. Emergency Contact & Bank Account
    emergencyContactName: '',
    emergencyContactRelationship: 'Spouse',
    emergencyContactPhone: '',
    bankName: 'Maybank',
    bankAccountNo: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/customers/${data.data.id}`);
      } else {
        setError(data.error || 'Failed to create customer profile');
      }
    } catch {
      setError('Connection error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <Link
            href="/customers"
            className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200/90 rounded-xl transition shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Register Borrower (CIF Profile)</h1>
            <p className="text-xs text-slate-500">M30 Customer Information File creation for credit underwriting</p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Tab Buttons */}
        <div className="flex bg-slate-200/60 p-1.5 rounded-2xl gap-1 text-xs font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`flex-1 py-2.5 px-3 rounded-xl transition flex items-center justify-center space-x-2 shrink-0 cursor-pointer ${
              activeTab === 'personal'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>1. Identity &amp; Demographics</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('address')}
            className={`flex-1 py-2.5 px-3 rounded-xl transition flex items-center justify-center space-x-2 shrink-0 cursor-pointer ${
              activeTab === 'address'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>2. Address &amp; Contact</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('employment')}
            className={`flex-1 py-2.5 px-3 rounded-xl transition flex items-center justify-center space-x-2 shrink-0 cursor-pointer ${
              activeTab === 'employment'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>3. Employment &amp; Income</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('emergency')}
            className={`flex-1 py-2.5 px-3 rounded-xl transition flex items-center justify-center space-x-2 shrink-0 cursor-pointer ${
              activeTab === 'emergency'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>4. Next of Kin &amp; Bank</span>
          </button>
        </div>

        {/* Main Form Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-7 space-y-6">
          {/* TAB 1: Personal & Identity */}
          {activeTab === 'personal' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h2 className="text-base font-bold text-slate-900">Personal &amp; Identity Details (M30 Tab 1)</h2>
                <p className="text-xs text-slate-500">Legal name, identification document, and demographic verification</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Title</label>
                  <select
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Mr">Mr.</option>
                    <option value="Ms">Ms.</option>
                    <option value="Mrs">Mrs.</option>
                    <option value="Dato">Dato&apos;</option>
                    <option value="Dr">Dr.</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Legal Full Name (as per IC)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mohd Daniel bin Abdullah"
                    value={form.fullName}
                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">ID Document Type</label>
                  <select
                    value={form.idType}
                    onChange={e => setForm({ ...form, idType: e.target.value as any })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="NRIC">New IC (MyKad)</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="POLICE_ARMY">Police / Army ID</option>
                    <option value="BRN">Business Registration (BRN)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">ID / Registration Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 920512-14-5555"
                    value={form.idNumber}
                    onChange={e => setForm({ ...form, idNumber: e.target.value })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={form.dob}
                    onChange={e => setForm({ ...form, dob: e.target.value })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Gender</label>
                  <select
                    value={form.gender}
                    onChange={e => setForm({ ...form, gender: e.target.value as any })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Marital Status</label>
                  <select
                    value={form.maritalStatus}
                    onChange={e => setForm({ ...form, maritalStatus: e.target.value as any })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="SINGLE">Single</option>
                    <option value="MARRIED">Married</option>
                    <option value="DIVORCED">Divorced</option>
                    <option value="WIDOWED">Widowed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Race / Ethnicity</label>
                  <input
                    type="text"
                    placeholder="e.g. Malay, Chinese, Indian"
                    value={form.race}
                    onChange={e => setForm({ ...form, race: e.target.value })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Religion</label>
                  <input
                    type="text"
                    placeholder="e.g. Islam, Buddha, Christian"
                    value={form.religion}
                    onChange={e => setForm({ ...form, religion: e.target.value })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Mother&apos;s Maiden Name</label>
                  <input
                    type="text"
                    placeholder="Security check name"
                    value={form.mothersMaidenName}
                    onChange={e => setForm({ ...form, mothersMaidenName: e.target.value })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('address')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-1.5"
                >
                  <span>Next: Address &amp; Contact</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Address & Contact */}
          {activeTab === 'address' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h2 className="text-base font-bold text-slate-900">Contact &amp; Residential Information (M30 Tab 2)</h2>
                <p className="text-xs text-slate-500">Physical address, residence ownership type, and contact channels</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Mobile Phone (Primary)</label>
                  <input
                    type="tel"
                    required
                    placeholder="+601X-XXXXXXX"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Home Telephone</label>
                  <input
                    type="tel"
                    placeholder="+603-XXXXXXX"
                    value={form.homePhone}
                    onChange={e => setForm({ ...form, homePhone: e.target.value })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Residential Street Address</label>
                <textarea
                  rows={2}
                  required
                  placeholder="House / Unit No., Street, Building Name"
                  value={form.residentialAddress}
                  onChange={e => setForm({ ...form, residentialAddress: e.target.value })}
                  className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Postcode</label>
                  <input
                    type="text"
                    placeholder="e.g. 50480"
                    value={form.postcode}
                    onChange={e => setForm({ ...form, postcode: e.target.value })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">City / Town</label>
                  <input
                    type="text"
                    placeholder="e.g. Petaling Jaya"
                    value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">State</label>
                  <input
                    type="text"
                    placeholder="e.g. Selangor"
                    value={form.state}
                    onChange={e => setForm({ ...form, state: e.target.value })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Residence Ownership</label>
                  <select
                    value={form.residenceOwnership}
                    onChange={e => setForm({ ...form, residenceOwnership: e.target.value as any })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="OWN">Owned (Fully Paid)</option>
                    <option value="MORTGAGED">Mortgaged (Housing Loan)</option>
                    <option value="RENTED">Rented</option>
                    <option value="FAMILY">Living with Family / Parents</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Length of Stay (Years)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.lengthOfStayYears}
                    onChange={e => setForm({ ...form, lengthOfStayYears: Number(e.target.value) })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('personal')}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('employment')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-1.5"
                >
                  <span>Next: Employment &amp; Income</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Employment & Income (Underwriting) */}
          {activeTab === 'employment' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h2 className="text-base font-bold text-slate-900">Employment &amp; Income Assessment (M30 Tab 3 &amp; 4)</h2>
                <p className="text-xs text-slate-500">Required by financiers to compute Debt Service Ratio (DSR) &amp; repayment capacity</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Employer Name / Business Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Petronas, ABC Logistics Sdn Bhd"
                    value={form.employerName}
                    onChange={e => setForm({ ...form, employerName: e.target.value })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Occupation / Job Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Production Executive, Manager, Driver"
                    value={form.occupation}
                    onChange={e => setForm({ ...form, occupation: e.target.value })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Employment Type</label>
                  <select
                    value={form.employmentType}
                    onChange={e => setForm({ ...form, employmentType: e.target.value as any })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="PERMANENT">Permanent Staff</option>
                    <option value="CONTRACT">Contract Staff</option>
                    <option value="GOVERNMENT">Government Servant</option>
                    <option value="SELF_EMPLOYED">Self-Employed / Business Owner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Industry Sector</label>
                  <input
                    type="text"
                    placeholder="e.g. Manufacturing, Logistics, Tech"
                    value={form.employmentSector}
                    onChange={e => setForm({ ...form, employmentSector: e.target.value })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Date Joined / Business Start</label>
                  <input
                    type="date"
                    value={form.employmentDate}
                    onChange={e => setForm({ ...form, employmentDate: e.target.value })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Financial Numbers Card */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Monthly Cash Flow Assessment (For Approval DSR)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Monthly Gross Income (RM)</label>
                    <input
                      type="number"
                      required
                      step="100"
                      value={form.monthlyGrossIncome}
                      onChange={e => setForm({ ...form, monthlyGrossIncome: Number(e.target.value) })}
                      className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Monthly Net Income / Take-Home Pay (RM)</label>
                    <input
                      type="number"
                      required
                      step="100"
                      value={form.monthlyNetIncome}
                      onChange={e => setForm({ ...form, monthlyNetIncome: Number(e.target.value) })}
                      className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Existing Monthly Commitments (RM)</label>
                    <input
                      type="number"
                      step="50"
                      placeholder="Car loan, housing loan, credit cards"
                      value={form.monthlyCommitments}
                      onChange={e => setForm({ ...form, monthlyCommitments: Number(e.target.value) })}
                      className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">External ongoing repayments</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Living Expenses (RM)</label>
                    <input
                      type="number"
                      step="50"
                      value={form.monthlyExpenses}
                      onChange={e => setForm({ ...form, monthlyExpenses: Number(e.target.value) })}
                      className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Instant Surplus Indicator */}
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Estimated Monthly Uncommitted Surplus:</span>
                  <span className="font-extrabold text-indigo-700 text-sm">
                    RM {Math.max(0, form.monthlyNetIncome - form.monthlyCommitments).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('address')}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('emergency')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-1.5"
                >
                  <span>Next: Next of Kin &amp; Bank</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Next of Kin & Bank Account */}
          {activeTab === 'emergency' && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h2 className="text-base font-bold text-slate-900">Next of Kin &amp; Disbursement Bank Account</h2>
                <p className="text-xs text-slate-500">Crucial for micro-financing loan recovery and drawdown payout</p>
              </div>

              <div className="bg-amber-50/70 border border-amber-200/80 p-4 rounded-2xl space-y-3">
                <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Emergency Contact / Next of Kin (Recovery Contact)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name of Contact Person</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Nurul Huda binti Ismail"
                      value={form.emergencyContactName}
                      onChange={e => setForm({ ...form, emergencyContactName: e.target.value })}
                      className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Relationship</label>
                    <select
                      value={form.emergencyContactRelationship}
                      onChange={e => setForm({ ...form, emergencyContactRelationship: e.target.value })}
                      className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                    >
                      <option value="Spouse">Spouse (Husband/Wife)</option>
                      <option value="Parent">Parent (Father/Mother)</option>
                      <option value="Sibling">Sibling (Brother/Sister)</option>
                      <option value="Child">Child (Adult)</option>
                      <option value="Friend">Close Friend / Colleague</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Emergency Contact Mobile Phone</label>
                  <input
                    type="tel"
                    required
                    placeholder="+601X-XXXXXXX"
                    value={form.emergencyContactPhone}
                    onChange={e => setForm({ ...form, emergencyContactPhone: e.target.value })}
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                  />
                </div>
              </div>

              <div className="pt-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                  Disbursement Bank Account
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Bank Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maybank, CIMB, Public Bank, RHB"
                      value={form.bankName}
                      onChange={e => setForm({ ...form, bankName: e.target.value })}
                      className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Bank Account Number</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 514012345678"
                      value={form.bankAccountNo}
                      onChange={e => setForm({ ...form, bankAccountNo: e.target.value })}
                      className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('employment')}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  &larr; Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-md shadow-indigo-600/30 transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{loading ? 'Creating CIF Profile...' : 'Complete & Save Borrower Profile'}</span>
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </DashboardLayout>
  );
}
