'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { 
  Users, PlusCircle, Search, ChevronRight, Phone, 
  CreditCard, Briefcase, DollarSign, UserCheck, ArrowRight,
  Sparkles, CheckCircle2
} from 'lucide-react';
import { Customer } from '@/core/store/memory-store';

function CustomersListContent() {
  const searchParams = useSearchParams();
  const isSelectForLoan = searchParams.get('selectForLoan') === 'true';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/customers')
      .then(res => res.json())
      .then(json => {
        if (json.success) setCustomers(json.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter(c => 
    c.fullName.toLowerCase().includes(search.toLowerCase()) ||
    c.idNumber.includes(search) ||
    c.phone.includes(search) ||
    (c.employerName && c.employerName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Step Banner if originating a new loan */}
      {isSelectForLoan && (
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-5 rounded-3xl shadow-md border border-indigo-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-white font-black flex items-center justify-center text-sm shadow-sm shrink-0">
              1
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight">Step 1 of 2: Search &amp; Select Borrower</div>
              <div className="text-xs text-indigo-300 mt-0.5">
                Search the borrower master record below, then click &ldquo;Create Loan for this Customer&rdquo; to originate their financing.
              </div>
            </div>
          </div>
          <Link
            href="/customers/new"
            className="inline-flex items-center space-x-1.5 bg-indigo-500/30 hover:bg-indigo-500/50 border border-indigo-400/30 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition self-start sm:self-auto shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Borrower not registered? Add New</span>
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {isSelectForLoan ? 'Search Borrower for New Loan' : 'Borrower Directory (CIF)'}
            </h1>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
              {customers.length} Profiles
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isSelectForLoan 
              ? 'Locate borrower to originate new loan facility'
              : 'Customer Information File (CIF) master profiles with employment & affordability data'}
          </p>
        </div>

        <Link
          href="/customers/new"
          className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Register New Borrower</span>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          autoFocus={isSelectForLoan}
          placeholder="Search borrower by name, NRIC / Passport, phone, or employer..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
        />
      </div>

      {/* Customers List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading borrowers...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-slate-500 text-sm">No borrowers found matching &ldquo;{search}&rdquo;</p>
            <Link
              href="/customers/new"
              className="inline-flex items-center space-x-2 bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm hover:bg-indigo-700 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register New Borrower</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(c => {
              const initials = c.fullName
                .split(' ')
                .map(n => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return (
                <div
                  key={c.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 font-bold text-sm flex items-center justify-center border border-indigo-150 shrink-0 mt-0.5">
                      {initials}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Link href={`/customers/${c.id}`} className="font-bold text-slate-900 text-base hover:text-indigo-600 transition">
                          {c.title ? `${c.title}. ` : ''}{c.fullName}
                        </Link>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded font-mono">
                          {c.idType}: {c.idNumber}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-0.5">
                        <span className="flex items-center">
                          <Phone className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {c.phone}
                        </span>
                        {c.employerName && (
                          <span className="flex items-center">
                            <Briefcase className="w-3.5 h-3.5 mr-1 text-slate-400" />
                            {c.employerName} ({c.occupation})
                          </span>
                        )}
                        <span className="flex items-center text-emerald-700 font-semibold">
                          <DollarSign className="w-3.5 h-3.5 mr-0.5 text-emerald-600" />
                          Net Salary: RM {c.monthlyNetIncome?.toLocaleString('en-MY') || '0'}
                        </span>
                        <span className="flex items-center">
                          <CreditCard className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {c.bankName} ({c.bankAccountNo})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                    <Link
                      href={`/financing/new?customerId=${c.id}`}
                      className="inline-flex items-center space-x-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl shadow-xs transition"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Create Loan for this Customer</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                    </Link>

                    <Link
                      href={`/customers/${c.id}`}
                      className="inline-flex items-center space-x-1 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 px-3 py-2.5 rounded-xl transition"
                    >
                      <span>Profile</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomersListPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="p-12 text-center text-slate-500">Loading directory...</div>}>
        <CustomersListContent />
      </Suspense>
    </DashboardLayout>
  );
}
