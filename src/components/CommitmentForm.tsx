import React, { useState, useId } from 'react';
import { Commitment, CommitmentWithStats, ReceiptVoucher } from '../types';
import { generateCommitmentNo, computeCommitmentStats } from '../utils/storage';
import { isCurrentUserAdmin } from '../modules/auth';
import {
  FileText,
  Calendar,
  User,
  Home,
  MapPin,
  IndianRupee,
  CheckCircle,
  Clock,
  Search,
  Filter,
  ArrowRight,
  Trash2,
  Download,
  AlertCircle,
  PlusCircle,
  BookOpen,
} from 'lucide-react';

interface CommitmentFormProps {
  commitments: Commitment[];
  receiptVouchers: ReceiptVoucher[];
  activeVolunteerName: string;
  onSaveCommitment: (commitment: Commitment) => void;
  onDeleteCommitment: (id: string) => void;
  onSelectForCollection: (commitment: Commitment) => void;
  onSelectForLedger: (payeeName: string) => void;
  isAdmin?: boolean;
}

export const CommitmentForm: React.FC<CommitmentFormProps> = ({
  commitments,
  receiptVouchers,
  activeVolunteerName,
  onSaveCommitment,
  onDeleteCommitment,
  onSelectForCollection,
  onSelectForLedger,
  isAdmin,
}) => {
  const isUserAdmin = isAdmin ?? isCurrentUserAdmin();
  const todayStr = new Date().toISOString().split('T')[0];

  // Form State
  const [date, setDate] = useState(todayStr);
  const [name, setName] = useState('');
  const [houseName, setHouseName] = useState('');
  const [place, setPlace] = useState('ONAMPILLY');
  const [amountCommitted, setAmountCommitted] = useState('');
  const [autoTransNo, setAutoTransNo] = useState(() => generateCommitmentNo(todayStr));
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState(false);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pending' | 'Partially Paid' | 'Completed'>('all');

  // Delete Confirm State
  const [deletingCommitment, setDeletingCommitment] = useState<Commitment | null>(null);

  // Compute stats for all commitments
  const computedList: CommitmentWithStats[] = commitments.map((c) =>
    computeCommitmentStats(c, receiptVouchers)
  );

  // Handle Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Payee / Donor Full Name is required');
      return;
    }
    if (!houseName.trim()) {
      setErrorMsg('House / Residential Name is required');
      return;
    }
    const parsedAmount = parseFloat(amountCommitted);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Committed Amount must be a positive number greater than 0');
      return;
    }

    const newCommitment: Commitment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      transaction_no: autoTransNo,
      name: name.trim(),
      house_name: houseName.trim(),
      date,
      place: place.trim() || 'ONAMPILLY',
      amount_committed: parsedAmount,
      data_entry_user: activeVolunteerName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSaveCommitment(newCommitment);

    // Reset Form
    setName('');
    setHouseName('');
    setAmountCommitted('');
    setPlace('ONAMPILLY');
    setDate(todayStr);
    setAutoTransNo(generateCommitmentNo(todayStr));
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 3000);
  };

  // Filter List
  const filteredCommitments = computedList.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.house_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.place.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.transaction_no.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Transaction No',
      'Date',
      'Payee Name',
      'House Name',
      'Place',
      'Committed Amount (INR)',
      'Collected Amount (INR)',
      'Balance (INR)',
      'Status',
      'Data Entry User',
      'Receipt Count',
    ];

    const rows = filteredCommitments.map((c) => [
      c.transaction_no,
      c.date,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.house_name.replace(/"/g, '""')}"`,
      `"${c.place.replace(/"/g, '""')}"`,
      c.amount_committed,
      c.total_collected,
      c.balance,
      c.status,
      `"${c.data_entry_user.replace(/"/g, '""')}"`,
      c.receipt_count,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `festival_commitments_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Context Header */}
      <div className="bg-white rounded-2xl p-3 sm:p-5 border border-amber-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-amber-800 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-0.5">
            <FileText className="w-3.5 h-3.5" />
            <span>Tab 1 • Donor Commitment Register</span>
          </div>
          <h2 className="text-sm sm:text-xl md:text-2xl font-black text-stone-900 tracking-tight">
            Pledge & Commitment Entry Form
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 sm:p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] sm:text-xs">
            <span className="text-stone-500 font-medium">Logged-in User: </span>
            <span className="font-extrabold text-amber-950">{activeVolunteerName}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Form on Left, Stats on Right (or top) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Commitment Entry Form Card */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-linear-to-r from-amber-950 via-amber-900 to-stone-900 text-white px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm sm:text-base">
                  New Commitment Entry
                </h3>
              </div>
              <span className="font-mono text-[11px] text-amber-200 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">
                AUTO ID
              </span>
            </div>
            <p className="text-[11px] text-amber-200/80 mt-1">
              Field volunteers: enter devotee pledge details accurately.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successToast && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-bounce-subtle">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Commitment recorded successfully with ID {autoTransNo}!</span>
              </div>
            )}

            {/* 1. Transaction Number (Auto) */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Transaction Number (Auto Generated)
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={autoTransNo}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-100 font-mono font-bold text-stone-700 cursor-not-allowed select-all"
                />
                <button
                  type="button"
                  onClick={() => setAutoTransNo(generateCommitmentNo(date))}
                  className="absolute right-2 top-2 text-[10px] text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                  title="Generate New ID"
                >
                  Regenerate
                </button>
              </div>
            </div>

            {/* 2. Name */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-700" />
                <span>Payee / Donor Full Name *</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., K. Radhakrishnan, Gopalan Nair"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/30 font-medium"
              />
            </div>

            {/* 3. House Name */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-amber-700" />
                <span>House / Residential Name *</span>
              </label>
              <input
                type="text"
                required
                value={houseName}
                onChange={(e) => setHouseName(e.target.value)}
                placeholder="e.g., Thekkedath House, Ambadi"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/30 font-medium"
              />
            </div>

            {/* 4. Date Picker */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-700" />
                <span>Commitment Date *</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setAutoTransNo(generateCommitmentNo(e.target.value));
                }}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/30 font-semibold text-stone-800"
              />
            </div>

            {/* 5. Place (Default: ONAMPILLY, Editable) */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-700" />
                <span>Place / Location (Default: ONAMPILLY)</span>
              </label>
              <input
                type="text"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="ONAMPILLY"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/30 font-medium"
              />
            </div>

            {/* 6. Amount Committed */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-emerald-700" />
                <span>Committed Amount (INR) *</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-stone-500 font-bold">₹</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={amountCommitted}
                  onChange={(e) => setAmountCommitted(e.target.value)}
                  placeholder="e.g., 5000"
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/30 font-mono font-bold text-stone-900 text-base"
                />
              </div>
            </div>

            {/* 7. Data Entry User (Read-Only) */}
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1">
                Data Entry User (Audit Stamp)
              </label>
              <input
                type="text"
                readOnly
                value={activeVolunteerName}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-100/80 font-medium text-stone-600 cursor-not-allowed text-xs"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-linear-to-r from-amber-900 to-amber-800 hover:from-amber-950 hover:to-amber-900 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4 text-amber-300" />
                <span>Save Commitment</span>
              </button>
            </div>
          </form>
        </div>

        {/* Commitments Table & Search Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search, Filter & Export Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Payee Name, House, Place, or CMT-ID..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-600/30 font-medium"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-stone-400 font-bold text-[11px] hidden sm:inline mr-1">
                Status:
              </span>
              {(['all', 'Pending', 'Partially Paid', 'Completed'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                    statusFilter === s
                      ? 'bg-amber-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {s === 'all' ? 'All' : s}
                </button>
              ))}

              <button
                type="button"
                onClick={handleExportCSV}
                className="ml-2 px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100 transition text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                title="Export commitments to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center text-xs">
              <div className="font-extrabold text-stone-900">
                All Pledged Commitments ({filteredCommitments.length})
              </div>
              <div className="text-[11px] text-stone-500">
                Click <span className="font-bold text-amber-800">"Collect"</span> to issue voucher against pledge
              </div>
            </div>

            {filteredCommitments.length === 0 ? (
              <div className="p-12 text-center text-stone-400 space-y-2">
                <FileText className="w-10 h-10 mx-auto text-stone-300" />
                <p className="text-sm font-semibold text-stone-600">No commitments found</p>
                <p className="text-xs text-stone-400">
                  {searchTerm ? 'Try adjusting your search criteria' : 'Use the form on the left to record the first pledge'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-100/80 text-stone-600 font-bold border-b border-stone-200 text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-3">Trans No / Date</th>
                      <th className="py-3 px-3">Payee & House</th>
                      <th className="py-3 px-3">Place</th>
                      <th className="py-3 px-3 text-right">Committed</th>
                      <th className="py-3 px-3 text-right">Paid</th>
                      <th className="py-3 px-3 text-right">Balance</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredCommitments.map((c) => (
                      <tr key={c.id} className="hover:bg-amber-50/30 transition text-stone-800">
                        {/* Trans No & Date */}
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-amber-950 text-xs">
                            {c.transaction_no}
                          </div>
                          <div className="text-[10px] text-stone-400">
                            {c.date}
                          </div>
                        </td>

                        {/* Payee & House */}
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-stone-900 text-xs">
                            {c.name}
                          </div>
                          <div className="text-[11px] text-stone-500">
                            {c.house_name}
                          </div>
                        </td>

                        {/* Place */}
                        <td className="py-3 px-3 text-stone-600">
                          {c.place}
                        </td>

                        {/* Committed */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-stone-900">
                          ₹{c.amount_committed.toLocaleString('en-IN')}
                        </td>

                        {/* Paid */}
                        <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-700">
                          ₹{c.total_collected.toLocaleString('en-IN')}
                          {c.receipt_count > 0 && (
                            <span className="block text-[10px] text-stone-400">
                              ({c.receipt_count} {c.receipt_count === 1 ? 'receipt' : 'receipts'})
                            </span>
                          )}
                        </td>

                        {/* Balance */}
                        <td className="py-3 px-3 text-right font-mono font-extrabold">
                          <span
                            className={c.balance > 0 ? 'text-amber-900' : 'text-emerald-700'}
                          >
                            ₹{c.balance.toLocaleString('en-IN')}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider ${
                              c.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : c.status === 'Partially Paid'
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Collect Payment Button */}
                            <button
                              type="button"
                              onClick={() => onSelectForCollection(c)}
                              className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white font-bold text-[11px] rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer"
                              title="Collect payment / Issue Receipt Voucher"
                            >
                              <span>Collect</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>

                            {/* View Ledger */}
                            <button
                              type="button"
                              onClick={() => onSelectForLedger(c.name)}
                              className="p-1 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer"
                              title="View Payee Ledger Statement"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button (Admin Only) */}
                            {isUserAdmin && (
                              <button
                                type="button"
                                onClick={() => setDeletingCommitment(c)}
                                className="btn-delete p-1 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition cursor-pointer"
                                title="Delete Commitment"
                                data-action="delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingCommitment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-red-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-100 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-stone-900">
                Delete Commitment?
              </h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to permanently delete commitment{' '}
              <span className="font-bold text-stone-900">
                "{deletingCommitment.name}" ({deletingCommitment.transaction_no})
              </span>{' '}
              for ₹{deletingCommitment.amount_committed.toLocaleString('en-IN')}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCommitment(null)}
                className="px-4 py-2 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteCommitment(deletingCommitment.id);
                  setDeletingCommitment(null);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
