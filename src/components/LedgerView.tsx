import React, { useState, useMemo } from 'react';
import { Transaction, Setting, UserProfile } from '../types';
import { generateWhatsAppLink } from '../utils/whatsapp';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Search,
  Filter,
  Download,
  Share2,
  Eye,
  Trash2,
  Calendar,
  CreditCard,
  UserCheck,
} from 'lucide-react';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface LedgerViewProps {
  transactions: Transaction[];
  setting: Setting;
  currentUser: UserProfile;
  onSelectReceipt: (tx: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
  onClearAllTransactions?: () => void;
}

export const LedgerView: React.FC<LedgerViewProps> = ({
  transactions,
  setting,
  currentUser,
  onSelectReceipt,
  onDeleteTransaction,
  onClearAllTransactions,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'recent'>('all');
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  // Real-time Calculations
  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let upiTotal = 0;
    let cashTotal = 0;
    let todayTotal = 0;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    transactions.forEach((tx) => {
      if (tx.status === 'cancelled') return;
      const isToday = new Date(tx.createdAt) >= startOfToday;

      if (tx.type === 'income') {
        totalIncome += tx.amount;
        if (isToday) todayTotal += tx.amount;
      } else {
        totalExpense += tx.amount;
      }

      if (tx.paymentMode === 'upi') upiTotal += tx.amount;
      if (tx.paymentMode === 'cash') cashTotal += tx.amount;
    });

    const netBalance = totalIncome - totalExpense;

    return {
      totalIncome,
      totalExpense,
      netBalance,
      upiTotal,
      cashTotal,
      todayTotal,
      totalCount: transactions.length,
    };
  }, [transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Type filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

      // Payment filter
      if (paymentFilter !== 'all' && tx.paymentMode !== paymentFilter) return false;

      // Date filter
      if (dateFilter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(tx.createdAt) < today) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchName = tx.donorOrPayee.toLowerCase().includes(query);
        const matchReceipt = tx.receiptNo.toLowerCase().includes(query);
        const matchPhone = (tx.phone || '').includes(query);
        const matchCategory = tx.category.toLowerCase().includes(query);
        const matchCollector = tx.collectedBy.toLowerCase().includes(query);
        if (!matchName && !matchReceipt && !matchPhone && !matchCategory && !matchCollector) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, typeFilter, paymentFilter, dateFilter, searchTerm]);

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Receipt No',
      'Type',
      'Category',
      'Devotee / Payee',
      'Amount (INR)',
      'Payment Mode',
      'Phone',
      'Location',
      'Collected By',
      'Date & Time',
      'Notes',
    ];

    const rows = filteredTransactions.map((t) => [
      t.receiptNo,
      t.type.toUpperCase(),
      `"${t.category}"`,
      `"${t.donorOrPayee}"`,
      t.amount,
      t.paymentMode.toUpperCase(),
      t.phone || '',
      `"${t.location || ''}"`,
      `"${t.collectedBy}"`,
      new Date(t.createdAt).toLocaleString('en-IN'),
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `OKS_Ledger_${setting.festivalYear}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Financial Health Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Balance Card */}
        <div className="bg-linear-to-br from-amber-900 to-amber-950 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-amber-700/50 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Net Balance
            </span>
            <div className="p-2 bg-amber-800/80 rounded-xl">
              <Scale className="w-5 h-5 text-amber-300" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-amber-100">
              ₹{stats.netBalance.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-amber-300/80 mt-1">
              Active Festival Treasury
            </div>
          </div>
        </div>

        {/* Total Income Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-emerald-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Total Income
            </span>
            <div className="p-2 bg-emerald-50 rounded-xl">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-emerald-700">
              ₹{stats.totalIncome.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-600/80 mt-1">
              Today: ₹{stats.todayTotal.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Total Expenses Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-red-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-800">
              Total Expenses
            </span>
            <div className="p-2 bg-red-50 rounded-xl">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-red-700">
              ₹{stats.totalExpense.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-red-600/80 mt-1">
              Pooja, Melam, Food & Sound
            </div>
          </div>
        </div>

        {/* Payment Channels Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-stone-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
              UPI & Cash Breakdown
            </span>
            <div className="p-2 bg-stone-100 rounded-xl">
              <CreditCard className="w-5 h-5 text-stone-600" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-stone-500 font-medium">UPI Digital:</span>
              <span className="font-bold font-mono text-amber-900">
                ₹{stats.upiTotal.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-stone-500 font-medium">Cash:</span>
              <span className="font-bold font-mono text-emerald-800">
                ₹{stats.cashTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search, Filter & Export Toolbar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100/70 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search donor, receipt, phone, category..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/30 text-xs"
            />
          </div>

          {/* Action Export & Admin Clear Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {currentUser.role === 'admin' && transactions.length > 0 && onClearAllTransactions && (
              <button
                type="button"
                onClick={() => setShowClearAllModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition cursor-pointer"
                title="Clear all records from database (Admin action)"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                <span>Clear All Records ({transactions.length})</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 items-center text-xs pt-1 border-t border-stone-100">
          <span className="text-stone-400 font-medium flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" /> Filters:
          </span>

          {/* Type filters */}
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-amber-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All Entries
          </button>
          <button
            onClick={() => setTypeFilter('income')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
              typeFilter === 'income'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Income
          </button>
          <button
            onClick={() => setTypeFilter('expense')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
              typeFilter === 'expense'
                ? 'bg-red-700 text-white'
                : 'bg-red-50 text-red-800 hover:bg-red-100'
            }`}
          >
            Expenses
          </button>

          {/* Payment Mode filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 font-semibold border-none cursor-pointer"
          >
            <option value="all">All Modes</option>
            <option value="upi">UPI Only</option>
            <option value="cash">Cash Only</option>
            <option value="bank_transfer">Bank Transfer</option>
          </select>

          {/* Date filter */}
          <button
            onClick={() => setDateFilter(dateFilter === 'today' ? 'all' : 'today')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
              dateFilter === 'today'
                ? 'bg-amber-800 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>Today Only</span>
          </button>
        </div>
      </div>

      {/* Transactions Table / List */}
      <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-200 flex justify-between items-center bg-stone-50/70">
          <h3 className="font-bold text-xs sm:text-sm text-stone-800">
            Detailed Financial Ledger ({filteredTransactions.length} records)
          </h3>
          <span className="text-[11px] text-stone-500 font-mono">
            {setting.sangamNameEnglish}
          </span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-stone-400 space-y-2">
            <span className="text-3xl">📭</span>
            <p className="text-xs">No matching transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100/70 text-stone-600 font-bold border-b border-stone-200 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Receipt No</th>
                  <th className="py-3 px-4">Devotee / Payee</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Collector</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredTransactions.map((tx) => {
                  const isIncome = tx.type === 'income';
                  const waLink = generateWhatsAppLink(tx, setting);

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-amber-50/40 transition group text-stone-800"
                    >
                      {/* Receipt No & Date */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-amber-950">
                          {tx.receiptNo}
                        </div>
                        <div className="text-[10px] text-stone-400">
                          {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Donor / Payee */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900">
                          {tx.donorOrPayee}
                        </div>
                        <div className="text-[10px] text-stone-500 flex gap-2">
                          {tx.phone && <span>📞 +91 {tx.phone}</span>}
                          {tx.location && <span>📍 {tx.location}</span>}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            isIncome
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-red-50 text-red-800 border border-red-200'
                          }`}
                        >
                          {tx.category}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span
                          className={`font-mono font-extrabold text-sm ${
                            isIncome ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {isIncome ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Payment Mode */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="capitalize text-[11px] font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                          {tx.paymentMode}
                        </span>
                      </td>

                      {/* Collector */}
                      <td className="py-3 px-4 whitespace-nowrap text-[11px] text-stone-600">
                        <div className="flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-stone-400" />
                          <span>{tx.collectedBy}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onSelectReceipt(tx)}
                            title="View Bilingual Receipt"
                            className="p-1.5 rounded-lg text-amber-900 bg-amber-50 hover:bg-amber-100 transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Share on WhatsApp"
                            className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition cursor-pointer"
                          >
                            <Share2 className="w-4 h-4" />
                          </a>

                          {currentUser.role === 'admin' && onDeleteTransaction && (
                            <button
                              onClick={() => setTxToDelete(tx)}
                              title="Delete record (Admin privilege)"
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Record Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!txToDelete}
        title="Delete Transaction Record"
        itemName={
          txToDelete
            ? `${txToDelete.receiptNo} - ${txToDelete.donorOrPayee} (₹${txToDelete.amount.toLocaleString('en-IN')})`
            : undefined
        }
        description="Are you sure you want to permanently delete this collection or expenditure record? This action cannot be undone and will immediately update the financial ledger in Cloud Firestore."
        confirmLabel="Permanently Delete Transaction"
        onConfirm={() => {
          if (txToDelete && onDeleteTransaction) {
            onDeleteTransaction(txToDelete.id);
            setTxToDelete(null);
          }
        }}
        onClose={() => setTxToDelete(null)}
      />

      {/* Clear All Records Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showClearAllModal}
        title="Clear All Ledger Records"
        itemName={`Total ${transactions.length} transactions in active ledger`}
        description="Are you sure you want to permanently delete all collection and expense records? This will clear all transactions from Cloud Firestore and reset the ledger. This action cannot be undone."
        confirmLabel="Permanently Clear All Records"
        onConfirm={() => {
          if (onClearAllTransactions) {
            onClearAllTransactions();
          }
          setShowClearAllModal(false);
        }}
        onClose={() => setShowClearAllModal(false)}
      />
    </div>
  );
};
