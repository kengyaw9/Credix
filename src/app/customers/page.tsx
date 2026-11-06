'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Users, PlusCircle, Search, ChevronRight, Phone, Mail, CreditCard, ArrowLeft } from 'lucide-react';
import { Customer } from '@/core/store/memory-store';

export default function CustomersListPage() {
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
    c.phone.includes(search)
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back to Dashboard Button & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Borrower Directory (CIF)</h1>
              <p className="text-xs text-slate-500">Customer Information File (CIF Lite) master profiles</p>
            </div>
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
            placeholder="Search borrower by name, NRIC / Passport, or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading borrowers...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <p>No borrower profiles found.</p>
              <Link
                href="/customers/new"
                className="inline-flex items-center text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg"
              >
                Register first borrower profile &rarr;
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(c => (
                <div
                  key={c.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Link href={`/customers/${c.id}`} className="font-bold text-slate-900 text-base hover:text-indigo-600 transition">
                        {c.fullName}
                      </Link>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                        {c.idType}: {c.idNumber}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                      <span className="flex items-center">
                        <Phone className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        {c.phone}
                      </span>
                      {c.email && (
                        <span className="flex items-center">
                          <Mail className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {c.email}
                        </span>
                      )}
                      <span className="flex items-center">
                        <CreditCard className="w-3.5 h-3.5 mr-1 text-slate-400" />
                        {c.bankName} ({c.bankAccountNo || 'No Account'})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <Link
                      href={`/customers/${c.id}`}
                      className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition"
                    >
                      <span>View Profile &amp; Facilities</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
