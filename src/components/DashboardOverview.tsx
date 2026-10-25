import React, { useState, useMemo, useEffect } from 'react';
import { Commitment, ReceiptVoucher, CommitmentWithStats, Setting } from '../types';
import { computeCommitmentStats } from '../utils/storage';
import {
  TEMPLE_BACKGROUNDS,
  getStoredBackgroundId,
  setStoredBackgroundId,
} from '../utils/backgrounds';
import {
  TrendingUp,
  CreditCard,
  Banknote,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Search,
  PlusCircle,
  FileText,
  Receipt,
  BookOpen,
  Filter,
  Sparkles,
} from 'lucide-react';

interface DashboardOverviewProps {
  commitments: Commitment[];
  receiptVouchers: ReceiptVoucher[];
  setting: Setting;
  onNavigateTab: (tab: 'commitments' | 'receipts' | 'ledger') => void;
  onSelectForCollection: (commitment: Commitment) => void;
  onSelectForLedger: (payeeName: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  commitments,
  receiptVouchers,
  setting,
  onNavigateTab,
  onSelectForCollection,
  onSelectForLedger,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPendingOnly, setFilterPendingOnly] = useState(true);
  const [activeBgId, setActiveBgId] = useState<string>(() => getStoredBackgroundId());

  useEffect(() => {
    const handleBgChange = (e: any) => {
      if (e.detail) setActiveBgId(e.detail);
    };
    window.addEventListener('kavadi-bg-changed', handleBgChange);
    return () => window.removeEventListener('kavadi-bg-changed', handleBgChange);
  }, []);

  const currentBg =
    TEMPLE_BACKGROUNDS.find((b) => b.id === activeBgId) || TEMPLE_BACKGROUNDS[0];

  const handleSelectBg = (id: string) => {
    setActiveBgId(id);
    setStoredBackgroundId(id);
  };

  // Compute all commitments with stats
  const computedList: CommitmentWithStats[] = useMemo(() => {
    return commitments.map((c) => computeCommitmentStats(c, receiptVouchers));
  }, [commitments, receiptVouchers]);

  // Aggregate Metrics
  const totalCommitted = useMemo(() => {
    return commitments.reduce((sum, c) => sum + (Number(c.amount_committed) || 0), 0);
  }, [commitments]);

  const totalCollected = useMemo(() => {
    return receiptVouchers.reduce((sum, v) => sum + (Number(v.amount_received) || 0), 0);
  }, [receiptVouchers]);

  const cashCollected = useMemo(() => {
    return receiptVouchers
      .filter((v) => v.payment_mode === 'Cash')
      .reduce((sum, v) => sum + (Number(v.amount_received) || 0), 0);
  }, [receiptVouchers]);

  const upiCollected = useMemo(() => {
    return receiptVouchers
      .filter((v) => v.payment_mode === 'UPI')
      .reduce((sum, v) => sum + (Number(v.amount_received) || 0), 0);
  }, [receiptVouchers]);

  const rawBalance = totalCommitted - totalCollected;
  const totalOutstandingBalance = rawBalance < 0 ? 0 : rawBalance;

  const progressPercentage = useMemo(() => {
    if (totalCommitted <= 0) return 0;
    const pct = Math.round((totalCollected / totalCommitted) * 100);
    return pct > 100 ? 100 : pct;
  }, [totalCollected, totalCommitted]);

  // Payees with pending/unpaid balances
  const pendingPayeesList = useMemo(() => {
    let list = computedList;
    if (filterPendingOnly) {
      list = list.filter((c) => c.status === 'Pending' || c.status === 'Partially Paid');
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.house_name.toLowerCase().includes(q) ||
          c.place.toLowerCase().includes(q) ||
          c.transaction_no.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.balance - a.balance);
  }, [computedList, filterPendingOnly, searchTerm]);

  // Recent Collections
  const recentReceipts = useMemo(() => {
    return [...receiptVouchers]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [receiptVouchers]);

  return (
    <div className="space-y-6">
      {/* Top Banner with Translucent Glassmorphism */}
      <div className="relative rounded-3xl overflow-hidden text-white shadow-xl border border-amber-500/40 bg-stone-950/75 backdrop-blur-md">
        <div className="relative z-10 p-3.5 sm:p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Festival Financial Dashboard • {setting.festivalYear}</span>
            </div>
          </div>

          <div className="max-w-2xl">
            <h1 className="text-base sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-amber-50">
              {setting.sangamNameEnglish}
            </h1>

            <div className="flex flex-wrap gap-2.5 sm:gap-3 mt-3 sm:mt-5">
              <button
                type="button"
                onClick={() => onNavigateTab('commitments')}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Record Commitment (Tab 1)</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab('receipts')}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Receipt className="w-4 h-4" />
                <span>Issue Receipt Voucher (Tab 2)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Ambient Vel Watermark */}
        <div className="absolute right-4 bottom-[-20px] text-amber-200/5 select-none pointer-events-none text-9xl">
          🔱
        </div>
      </div>

      {/* 4 Core Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Target Committed */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs dashboard-tile-zoom cursor-pointer flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Total Target Committed
              </span>
              <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="font-mono font-black text-2xl sm:text-3xl text-stone-900 mt-3">
              ₹{totalCommitted.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="text-[11px] text-stone-500 mt-3 flex items-center justify-between pt-2 border-t border-stone-100">
            <span>Registered Pledges:</span>
            <span className="font-bold text-stone-800 font-mono">{commitments.length}</span>
          </div>
        </div>

        {/* Card 2: Total Amount Collected (Split Cash vs UPI) */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-200/80 shadow-xs dashboard-tile-zoom cursor-pointer flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-xs font-bold uppercase tracking-wider">
                Total Amount Collected
              </span>
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="font-mono font-black text-2xl sm:text-3xl text-emerald-800 mt-3">
              ₹{totalCollected.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-emerald-100 flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1 font-bold text-amber-800">
              <Banknote className="w-3 h-3 text-amber-600" /> Cash: ₹{cashCollected.toLocaleString('en-IN')}
            </span>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-800">
              <CreditCard className="w-3 h-3 text-emerald-600" /> UPI: ₹{upiCollected.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Card 3: Total Outstanding Balance */}
        <div className="bg-white rounded-2xl p-5 border border-amber-200/80 shadow-xs dashboard-tile-zoom cursor-pointer flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-amber-900">
              <span className="text-xs font-bold uppercase tracking-wider">
                Total Outstanding Balance
              </span>
              <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="font-mono font-black text-2xl sm:text-3xl text-amber-900 mt-3">
              ₹{totalOutstandingBalance.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="text-[11px] text-stone-500 mt-3 flex items-center justify-between pt-2 border-t border-stone-100">
            <span>Remaining to Collect</span>
            <span className="font-bold text-amber-900">
              {totalCommitted > 0 ? `${100 - progressPercentage}% Pending` : 'No Pledges'}
            </span>
          </div>
        </div>

        {/* Card 4: Collection Progress (%) */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs dashboard-tile-zoom cursor-pointer flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
                Collection Progress
              </span>
              <div className="p-2 bg-stone-100 text-stone-800 rounded-xl font-mono font-extrabold text-xs">
                {progressPercentage}%
              </div>
            </div>
            <div className="font-mono font-black text-2xl sm:text-3xl text-stone-900 mt-3">
              {progressPercentage}%
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-stone-100 space-y-1">
            <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-linear-to-r from-emerald-600 to-emerald-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-stone-400">
              <span>Goal: ₹{totalCommitted.toLocaleString('en-IN')}</span>
              <span>{receiptVouchers.length} Vouchers</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Filter List of Payees with Pending/Unpaid Balances */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-base text-stone-900 flex items-center gap-2">
              <span>Pending & Outstanding Payee List</span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono text-xs font-extrabold border border-amber-300">
                {pendingPayeesList.length}
              </span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Payees with remaining unpaid balance. Click "Collect Payment" to open receipt entry pre-filled.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search payee or house..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-600/30"
              />
            </div>

            {/* Toggle Pending only vs All */}
            <button
              type="button"
              onClick={() => setFilterPendingOnly(!filterPendingOnly)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                filterPendingOnly
                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                  : 'bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {filterPendingOnly ? 'Showing: Pending Only' : 'Showing: All Payees'}
            </button>
          </div>
        </div>

        {pendingPayeesList.length === 0 ? (
          <div className="p-12 text-center text-stone-400 space-y-2">
            <CheckCircle className="w-10 h-10 mx-auto text-emerald-500" />
            <p className="text-sm font-semibold text-stone-700">
              {filterPendingOnly ? 'All pledges are fully collected! No pending balances.' : 'No payees found.'}
            </p>
            <p className="text-xs text-stone-400">
              Great job! All recorded festival commitments are settled.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100 text-stone-600 font-bold border-b border-stone-200 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Payee & Residence</th>
                  <th className="py-3 px-4">Place</th>
                  <th className="py-3 px-4">Trans No</th>
                  <th className="py-3 px-4 text-right">Committed</th>
                  <th className="py-3 px-4 text-right">Paid So Far</th>
                  <th className="py-3 px-4 text-right">Outstanding Balance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {pendingPayeesList.map((c) => (
                  <tr key={c.id} className="hover:bg-amber-50/30 transition text-stone-800">
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-stone-900 text-xs">
                        {c.name}
                      </div>
                      <div className="text-[11px] text-stone-500">
                        {c.house_name}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-stone-600">
                      {c.place}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-amber-950 text-xs">
                      {c.transaction_no}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                      ₹{c.amount_committed.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                      ₹{c.total_collected.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-black text-amber-900 text-sm">
                      ₹{c.balance.toLocaleString('en-IN')}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          c.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'Partially Paid'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Collect Payment Direct Action */}
                        <button
                          type="button"
                          onClick={() => onSelectForCollection(c)}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-[11px] rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer"
                          title="Collect payment / Issue Receipt Voucher"
                        >
                          <span>Collect Payment</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        {/* Statement */}
                        <button
                          type="button"
                          onClick={() => onSelectForLedger(c.name)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition cursor-pointer"
                          title="View Ledger Statement"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Collections Stream */}
      {recentReceipts.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <h4 className="font-extrabold text-stone-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-700" />
              <span>Recent Collections Activity</span>
            </h4>
            <button
              type="button"
              onClick={() => onNavigateTab('receipts')}
              className="text-emerald-700 hover:text-emerald-900 font-bold hover:underline cursor-pointer"
            >
              View All Vouchers →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {recentReceipts.map((r) => (
              <div
                key={r.id}
                className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex flex-col justify-between space-y-1"
              >
                <div className="flex justify-between items-center text-[10px] text-stone-500">
                  <span className="font-mono font-bold text-stone-700">#{r.receipt_no}</span>
                  <span>{r.date}</span>
                </div>
                <div className="font-extrabold text-stone-900 text-xs truncate">
                  {r.name}
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-stone-200/50">
                  <span className="font-mono font-black text-emerald-800 text-xs">
                    ₹{r.amount_received.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] font-bold text-stone-600 bg-white px-1.5 py-0.5 rounded border border-stone-200">
                    {r.payment_mode}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
