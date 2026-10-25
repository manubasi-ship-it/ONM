import React, { useState, useMemo, useEffect } from 'react';
import {
  CommitteeMember,
  AdvancePayment,
  AdvancePaymentMode,
  DirectExpense,
} from '../types';
import {
  formatINR,
  generateAdvanceVoucherNo,
  calculateMemberSummary,
} from '../utils/advanceExpense';
import {
  Coins,
  Calendar,
  User,
  CreditCard,
  IndianRupee,
  FileText,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  PlusCircle,
  Search,
  Download,
  Trash2,
  Clock,
  BookOpen,
  Lock,
  Shield,
} from 'lucide-react';
import { getActiveSession } from '../modules/auth';
import { validateMemberExistsInCommittee } from '../utils/memberValidation';
import { MemberValidationBadge } from './MemberValidationBadge';

interface AdvanceDisbursementFormProps {
  committeeMembers: CommitteeMember[];
  advances: AdvancePayment[];
  expenses: DirectExpense[];
  activeVolunteerName: string;
  onSaveAdvance: (advance: AdvancePayment) => void;
  onDeleteAdvance: (id: string) => void;
  onViewMemberLedger: (member: CommitteeMember) => void;
  isAdmin?: boolean;
}

export const AdvanceDisbursementForm: React.FC<AdvanceDisbursementFormProps> = ({
  committeeMembers,
  advances,
  expenses,
  activeVolunteerName,
  onSaveAdvance,
  onDeleteAdvance,
  onViewMemberLedger,
  isAdmin: isAdminProp,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Active members only
  const activeMembers = useMemo(() => {
    return committeeMembers.filter((m) => m.active);
  }, [committeeMembers]);

  const session = useMemo(() => getActiveSession(), []);
  const isAdmin = isAdminProp ?? (session?.role === 'ADMIN');
  const isUserAdmin = isAdmin;

  // Find matching member profile for active session
  const currentMember = useMemo(() => {
    if (!session) return null;
    return (
      committeeMembers.find(
        (m) =>
          m.id === session.memberId ||
          (m.userId && session.userId && m.userId.toLowerCase() === session.userId.toLowerCase()) ||
          (m.phone && session.phone && m.phone === session.phone) ||
          m.name.toLowerCase() === session.name.toLowerCase()
      ) || null
    );
  }, [committeeMembers, session]);

  // Form State
  const [date, setDate] = useState(todayStr);
  const [voucherNo, setVoucherNo] = useState(() => generateAdvanceVoucherNo(todayStr));
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<AdvancePaymentMode>('Cash');
  const [purpose, setPurpose] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState(false);

  // Table Search and Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMember, setFilterMember] = useState<string>('all');

  // Currently selected member object
  const selectedMember = useMemo(() => {
    return activeMembers.find((m) => m.id === selectedMemberId) || null;
  }, [activeMembers, selectedMemberId]);

  // Member current balance summary
  const memberSummary = useMemo(() => {
    if (!selectedMember) return null;
    return calculateMemberSummary(selectedMember, advances, expenses);
  }, [selectedMember, advances, expenses]);

  // Projected balance after this advance
  const enteredAmountNum = parseFloat(amount) || 0;
  const projectedBalance = memberSummary
    ? memberSummary.balance_in_hand + enteredAmountNum
    : enteredAmountNum;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedMember) {
      setErrorMsg('Please select a committee member');
      return;
    }

    // Verify member exists in committee_members Master Data collection
    const memberValidation = validateMemberExistsInCommittee(
      selectedMember.id,
      selectedMember.name,
      committeeMembers
    );
    if (!memberValidation.isValid) {
      setErrorMsg(`Invalid Member Reference: "${selectedMember.name}" does not exist in the 'committee_members' Master Data collection. Please select a registered committee member.`);
      return;
    }

    if (!isAdmin && currentMember && selectedMember.id !== currentMember.id) {
      setErrorMsg('Permission Denied: Standard members can only disburse/receive advances under their own account.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Advance amount must be a positive number greater than 0');
      return;
    }

    if (!purpose.trim()) {
      setErrorMsg('Purpose of advance is required (e.g. stage setup, sound booking)');
      return;
    }

    const newAdvance: AdvancePayment = {
      id: `adv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      voucher_no: voucherNo.trim() || generateAdvanceVoucherNo(date),
      date,
      member_id: selectedMember.id,
      member_name: selectedMember.name,
      payment_mode: paymentMode,
      amount: parsedAmount,
      purpose: purpose.trim(),
      remarks: remarks.trim(),
      paid_by_user: activeVolunteerName || 'Admin Volunteer',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSaveAdvance(newAdvance);

    // Reset Form
    setAmount('');
    setPurpose('');
    setRemarks('');
    setVoucherNo(generateAdvanceVoucherNo(date));
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 3000);
  };

  // Filtered Advances list
  const filteredAdvances = useMemo(() => {
    return advances
      .filter((a) => {
        const matchesMember = filterMember === 'all' || a.member_id === filterMember;
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          !q ||
          a.member_name.toLowerCase().includes(q) ||
          a.voucher_no.toLowerCase().includes(q) ||
          a.purpose.toLowerCase().includes(q) ||
          (a.remarks && a.remarks.toLowerCase().includes(q));
        return matchesMember && matchesSearch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [advances, filterMember, searchTerm]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Voucher No',
      'Date',
      'Committee Member',
      'Amount (INR)',
      'Payment Mode',
      'Purpose of Advance',
      'Remarks',
      'Paid By User',
    ];
    const rows = filteredAdvances.map((a) => [
      a.voucher_no,
      a.date,
      `"${a.member_name.replace(/"/g, '""')}"`,
      a.amount,
      a.payment_mode,
      `"${a.purpose.replace(/"/g, '""')}"`,
      `"${(a.remarks || '').replace(/"/g, '""')}"`,
      `"${a.paid_by_user.replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['"Advance Payments Register"', headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Advance_Disbursements_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce text-xs font-extrabold">
          <CheckCircle className="w-4 h-4" />
          <span>Advance disbursement voucher saved successfully! Member balance updated.</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-6 border border-stone-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-900 flex items-center justify-center shrink-0">
            <Coins className="w-4 h-4 sm:w-6 sm:h-6 text-amber-700" />
          </div>
          <div>
            <div className="text-[9px] sm:text-[11px] font-extrabold uppercase tracking-wider text-amber-700">
              Module 2 • Advance Float Disbursement
            </div>
            <h1 className="text-sm sm:text-xl md:text-2xl font-black text-stone-900 tracking-tight">
              Pay Advance to Committee Member
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] sm:text-xs text-stone-600 font-medium bg-stone-100 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-stone-200">
            Disbursed By: <strong className="text-stone-900">{activeVolunteerName}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Advance Entry Form */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-sm">
            <div className="flex items-center justify-between mb-5 border-b border-stone-100 pb-4">
              <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-amber-600" />
                <span>New Advance Payment Voucher</span>
              </h2>
              <span className="text-[11px] font-mono text-stone-400 font-bold">
                {voucherNo}
              </span>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
              {/* Row 1: Voucher Number & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Voucher Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={voucherNo}
                      onChange={(e) => setVoucherNo(e.target.value)}
                      placeholder="ADV-2026-0001"
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 font-mono text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        setVoucherNo(generateAdvanceVoucherNo(e.target.value));
                      }}
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Committee Member Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-stone-700">
                    Committee Member Name <span className="text-red-500">*</span>
                    <span className="text-[10px] text-stone-400 font-normal ml-1">
                      (Active members only)
                    </span>
                  </label>
                </div>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    required
                    className="member-selector w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 bg-white text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
                  >
                    <option value="">-- Select Active Committee Member --</option>
                    {activeMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.designation}) — +91 {m.phone}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Advance Amount & Payment Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Advance Amount (INR) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="font-bold text-stone-500 absolute left-3.5 top-2.5">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 15000"
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-sm font-black text-stone-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                    />
                  </div>
                  {amount && parseFloat(amount) > 0 && (
                    <div className="text-[11px] font-bold text-emerald-700 mt-1">
                      {formatINR(parseFloat(amount))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Payment Mode <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as AdvancePaymentMode)}
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition cursor-pointer bg-white"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI / GPay">UPI / GPay</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 4: Purpose of Advance */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Purpose of Advance <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g., Initial advance for stage setup, Sound system booking"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                />
              </div>

              {/* Row 5: Remarks & Paid by User */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g., Handed over at temple office"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Paid By User (Audit)
                  </label>
                  <input
                    type="text"
                    value={activeVolunteerName}
                    readOnly
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-100 text-stone-600 text-xs font-semibold select-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Coins className="w-4 h-4" />
                  <span>Submit & Record Advance Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Dynamic Member Preview & Balance Impact */}
        <div className="lg:col-span-5 space-y-4">
          {selectedMember && memberSummary ? (
            <div className="bg-amber-50/60 rounded-3xl p-5 sm:p-6 border border-amber-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-amber-200/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-xs">
                    👤
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-stone-900">
                      {selectedMember.name}
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      {selectedMember.designation}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onViewMemberLedger(selectedMember)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-950 font-bold text-[11px] hover:bg-amber-100 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <BookOpen className="w-3 h-3 text-amber-700" />
                  <span>View Statement</span>
                </button>
              </div>

              {/* Current Balances */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-dashed border-amber-200">
                  <span className="text-stone-600">Total Advances Received So Far:</span>
                  <span className="font-bold text-stone-900">
                    {formatINR(memberSummary.total_advances)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-dashed border-amber-200">
                  <span className="text-stone-600">Total Expenses Claimed So Far:</span>
                  <span className="font-bold text-stone-900">
                    {formatINR(memberSummary.total_expenses)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5">
                  <span className="font-bold text-stone-800">Current Balance in Hand:</span>
                  <span
                    className={`font-black ${
                      memberSummary.balance_in_hand > 0
                        ? 'text-emerald-700'
                        : memberSummary.balance_in_hand < 0
                        ? 'text-red-700'
                        : 'text-stone-700'
                    }`}
                  >
                    {formatINR(memberSummary.balance_in_hand)}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="p-3 bg-white rounded-2xl border border-amber-200/90 flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-600">Current Status:</span>
                {memberSummary.status === 'due_from_member' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Due from Member / Cash in Hand
                  </span>
                )}
                {memberSummary.status === 'settled' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-stone-100 text-stone-700 border border-stone-300">
                    Settled (₹0.00)
                  </span>
                )}
                {memberSummary.status === 'reimbursement_due' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800 border border-red-300">
                    Reimbursement Due to Member
                  </span>
                )}
              </div>

              {/* Projected Balance After Saving */}
              {enteredAmountNum > 0 && (
                <div className="p-3.5 bg-linear-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-emerald-900">
                      Projected Balance in Hand:
                    </span>
                    <span className="font-black text-emerald-950 text-sm">
                      {formatINR(projectedBalance)}
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-700 font-medium">
                    (Current Balance {formatINR(memberSummary.balance_in_hand)} + New Advance {formatINR(enteredAmountNum)})
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Advance Payments History Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-stone-900">
              Disbursed Advances Register
            </h3>
            <p className="text-xs text-stone-500">
              Showing {filteredAdvances.length} recorded advance payments
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search member, voucher..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            {/* Member Filter */}
            <select
              value={filterMember}
              onChange={(e) => setFilterMember(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-medium bg-white"
            >
              <option value="all">All Members</option>
              {committeeMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-stone-300"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {filteredAdvances.length === 0 ? (
          <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-300">
            <p className="text-xs text-stone-500">No advance disbursements found matching the filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-stone-200">
            <table className="w-full text-left text-xs text-stone-800">
              <thead className="bg-stone-100/90 text-stone-700 uppercase text-[10px] font-black tracking-wider border-b border-stone-200">
                <tr>
                  <th className="py-3 px-3">Voucher No</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Committee Member</th>
                  <th className="py-3 px-3">Purpose & Remarks</th>
                  <th className="py-3 px-3">Payment Mode</th>
                  <th className="py-3 px-3 text-right">Advance Amount</th>
                  <th className="py-3 px-3">Paid By</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredAdvances.map((adv) => {
                  const m = committeeMembers.find((item) => item.id === adv.member_id || item.name === adv.member_name);
                  const isMemberInvalid = !m;
                  return (
                    <tr
                      key={adv.id}
                      className={
                        isMemberInvalid
                          ? 'bg-rose-50/50 hover:bg-rose-50/80 transition border-l-4 border-l-rose-500'
                          : 'hover:bg-amber-50/30 transition'
                      }
                    >
                      <td className="py-3 px-3 font-mono font-bold text-amber-900 whitespace-nowrap">
                        {adv.voucher_no}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-stone-600 font-medium">
                        {adv.date}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-stone-900">{adv.member_name}</span>
                          <MemberValidationBadge
                            memberId={adv.member_id}
                            memberName={adv.member_name}
                            committeeMembers={committeeMembers}
                          />
                        </div>
                        {m && <div className="text-[10px] text-stone-500">{m.designation}</div>}
                      </td>
                      <td className="py-3 px-3 text-stone-800 max-w-xs">
                        <div className="font-medium">{adv.purpose}</div>
                        {adv.remarks && (
                          <div className="text-[11px] text-stone-500 italic mt-0.5">
                            {adv.remarks}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-stone-100 text-stone-700 border border-stone-200">
                          {adv.payment_mode}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-800 text-sm whitespace-nowrap">
                        {formatINR(adv.amount)}
                      </td>
                      <td className="py-3 px-3 text-stone-600 text-[11px] whitespace-nowrap">
                        {adv.paid_by_user}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {m && (
                            <button
                              type="button"
                              onClick={() => onViewMemberLedger(m)}
                              className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-100 transition cursor-pointer"
                              title="View Member Statement"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isUserAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Delete advance voucher ${adv.voucher_no} of ${formatINR(adv.amount)}?`)) {
                                  onDeleteAdvance(adv.id);
                                }
                              }}
                              className="btn-delete p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition cursor-pointer"
                              title="Delete Advance"
                              data-action="delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
    </div>
  );
};
