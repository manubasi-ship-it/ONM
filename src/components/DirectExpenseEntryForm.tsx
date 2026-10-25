import React, { useState, useMemo, useEffect } from 'react';
import {
  CommitteeMember,
  ExpenseType,
  DirectExpense,
  AdvancePayment,
} from '../types';
import {
  formatINR,
  generateExpenseVoucherNo,
  calculateMemberSummary,
} from '../utils/advanceExpense';
import {
  Receipt,
  Calendar,
  User,
  Tag,
  FileText,
  IndianRupee,
  CheckCircle,
  AlertCircle,
  PlusCircle,
  Search,
  Download,
  Trash2,
  BookOpen,
  Scale,
  Sparkles,
  ArrowRight,
  Lock,
  Shield,
} from 'lucide-react';
import { getActiveSession } from '../modules/auth';
import { validateMemberExistsInCommittee } from '../utils/memberValidation';
import { MemberValidationBadge } from './MemberValidationBadge';

interface DirectExpenseEntryFormProps {
  committeeMembers: CommitteeMember[];
  expenseTypes: ExpenseType[];
  expenses: DirectExpense[];
  advances: AdvancePayment[];
  activeVolunteerName: string;
  onSaveExpense: (expense: DirectExpense) => void;
  onDeleteExpense: (id: string) => void;
  onViewMemberLedger: (member: CommitteeMember) => void;
  isAdmin?: boolean;
}

export const DirectExpenseEntryForm: React.FC<DirectExpenseEntryFormProps> = ({
  committeeMembers,
  expenseTypes,
  expenses,
  advances,
  activeVolunteerName,
  onSaveExpense,
  onDeleteExpense,
  onViewMemberLedger,
  isAdmin: isAdminProp,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Active committee members only
  const activeMembers = useMemo(() => {
    return committeeMembers.filter((m) => m.active);
  }, [committeeMembers]);

  // Active expense types only
  const activeExpenseTypes = useMemo(() => {
    return expenseTypes.filter((t) => t.active);
  }, [expenseTypes]);

  const session = useMemo(() => getActiveSession(), []);
  const isAdmin = isAdminProp ?? (session?.role === 'ADMIN');
  const isUserAdmin = isAdmin;

  // Form State
  const [date, setDate] = useState(todayStr);
  const [voucherNo, setVoucherNo] = useState(() => generateExpenseVoucherNo(todayStr));
  const [selectedExpenseTypeId, setSelectedExpenseTypeId] = useState('');
  const [expenseName, setExpenseName] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [billReference, setBillReference] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState(false);

  // Table Search and Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMember, setFilterMember] = useState<string>('all');

  // Currently selected member object
  const selectedMember = useMemo(() => {
    return activeMembers.find((m) => m.id === selectedMemberId) || null;
  }, [activeMembers, selectedMemberId]);

  // Currently selected expense type object
  const selectedExpenseType = useMemo(() => {
    return activeExpenseTypes.find((t) => t.id === selectedExpenseTypeId) || null;
  }, [activeExpenseTypes, selectedExpenseTypeId]);

  // Member current balance summary
  const memberSummary = useMemo(() => {
    if (!selectedMember) return null;
    return calculateMemberSummary(selectedMember, advances, expenses);
  }, [selectedMember, advances, expenses]);

  // Projected Balance (Current Balance minus current form's entered expense amount)
  const enteredAmountNum = parseFloat(amount) || 0;
  const projectedBalance = memberSummary
    ? memberSummary.balance_in_hand - enteredAmountNum
    : -enteredAmountNum;

  // Determine projected status
  let projectedStatus: 'due_from_member' | 'settled' | 'reimbursement_due' = 'settled';
  if (projectedBalance > 0.001) {
    projectedStatus = 'due_from_member';
  } else if (projectedBalance < -0.001) {
    projectedStatus = 'reimbursement_due';
  } else {
    projectedStatus = 'settled';
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedExpenseType) {
      setErrorMsg('Please select an Expense Type category');
      return;
    }
    if (!expenseName.trim()) {
      setErrorMsg('Expense Name / Title is required (e.g., Sound System Rental)');
      return;
    }
    if (!selectedMember) {
      setErrorMsg('Please select the Committee Member who claimed/spent this expense');
      return;
    }

    // Verify member exists in committee_members Master Data collection
    const memberValidation = validateMemberExistsInCommittee(
      selectedMember.id,
      selectedMember.name,
      committeeMembers
    );
    if (!memberValidation.isValid) {
      setErrorMsg(`Invalid Member Reference: "${selectedMember.name}" does not exist in the 'committee_members' Master Data collection. Cannot record expense.`);
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Expense amount must be a positive number greater than 0');
      return;
    }
    if (!billReference.trim()) {
      setErrorMsg('Supporting Receipt/Bill reference is required (e.g., Invoice #, Voucher No.)');
      return;
    }

    const newExpense: DirectExpense = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      voucher_no: voucherNo.trim() || generateExpenseVoucherNo(date),
      date,
      expense_type_id: selectedExpenseType.id,
      expense_type_name: selectedExpenseType.nameEnglish,
      expense_name: expenseName.trim(),
      member_id: selectedMember.id,
      claimed_by: selectedMember.name,
      amount: parsedAmount,
      bill_reference: billReference.trim(),
      remarks: remarks.trim(),
      recorded_by: activeVolunteerName || 'Admin Volunteer',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSaveExpense(newExpense);

    // Reset Form
    setExpenseName('');
    setAmount('');
    setBillReference('');
    setRemarks('');
    setVoucherNo(generateExpenseVoucherNo(date));
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 3000);
  };

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((e) => {
        const matchesCategory =
          filterCategory === 'all' || e.expense_type_id === filterCategory;
        const matchesMember = filterMember === 'all' || e.member_id === filterMember;
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          !q ||
          e.expense_name.toLowerCase().includes(q) ||
          e.claimed_by.toLowerCase().includes(q) ||
          e.expense_type_name.toLowerCase().includes(q) ||
          e.voucher_no.toLowerCase().includes(q) ||
          e.bill_reference.toLowerCase().includes(q);
        return matchesCategory && matchesMember && matchesSearch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, filterCategory, filterMember, searchTerm]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Voucher No',
      'Date',
      'Category',
      'Expense Title',
      'Claimed By',
      'Amount (INR)',
      'Supporting Receipt/Bill',
      'Remarks',
      'Recorded By',
    ];
    const rows = filteredExpenses.map((e) => [
      e.voucher_no,
      e.date,
      `"${e.expense_type_name.replace(/"/g, '""')}"`,
      `"${e.expense_name.replace(/"/g, '""')}"`,
      `"${e.claimed_by.replace(/"/g, '""')}"`,
      e.amount,
      `"${e.bill_reference.replace(/"/g, '""')}"`,
      `"${(e.remarks || '').replace(/"/g, '""')}"`,
      `"${e.recorded_by.replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['"Direct Expenses Register"', headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Direct_Expenses_${todayStr}.csv`);
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
          <span>Expense voucher saved successfully! Member advance balance settled.</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-6 border border-stone-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-900 flex items-center justify-center shrink-0">
            <Receipt className="w-4 h-4 sm:w-6 sm:h-6 text-amber-700" />
          </div>
          <div>
            <div className="text-[9px] sm:text-[11px] font-extrabold uppercase tracking-wider text-amber-700">
              Module 3 • Direct Expense Voucher Entry
            </div>
            <h1 className="text-sm sm:text-xl md:text-2xl font-black text-stone-900 tracking-tight">
              Record Direct Spent Expense Voucher
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] sm:text-xs text-stone-600 font-medium bg-stone-100 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-stone-200">
            Recorded By: <strong className="text-stone-900">{activeVolunteerName}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Direct Expense Entry Form */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-sm">
            <div className="flex items-center justify-between mb-5 border-b border-stone-100 pb-4">
              <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-amber-600" />
                <span>New Expense Voucher</span>
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
              {/* Row 1: Date & Voucher No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        setVoucherNo(generateExpenseVoucherNo(e.target.value));
                      }}
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    System Voucher No
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      value={voucherNo}
                      onChange={(e) => setVoucherNo(e.target.value)}
                      placeholder="EXP-2026-0001"
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 font-mono text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Expense Type & Expense Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Expense Type Category <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Tag className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                    <select
                      value={selectedExpenseTypeId}
                      onChange={(e) => setSelectedExpenseTypeId(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition cursor-pointer bg-white"
                    >
                      <option value="">-- Select Expense Category --</option>
                      {activeExpenseTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nameEnglish}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Expense Name / Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={expenseName}
                    onChange={(e) => setExpenseName(e.target.value)}
                    placeholder="e.g., Sound System Rental, Mineral Water"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                  />
                </div>
              </div>

              {/* Row 3: Expense Claimed By (Committee Member) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-stone-700">
                    Expense Claimed By (Committee Member) <span className="text-red-500">*</span>
                    <span className="text-[10px] text-amber-700 font-bold ml-1">
                      (Triggers Live Balance Card)
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

              {/* Row 4: Expense Amount & Supporting Receipt/Bill */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Expense Amount (INR) <span className="text-red-500">*</span>
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
                      placeholder="e.g. 18500"
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-sm font-black text-stone-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                    />
                  </div>
                  {amount && parseFloat(amount) > 0 && (
                    <div className="text-[11px] font-bold text-amber-800 mt-1">
                      {formatINR(parseFloat(amount))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Supporting Receipt/Bill Ref <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={billReference}
                    onChange={(e) => setBillReference(e.target.value)}
                    placeholder="e.g., Inv #8821, Royal Audio Bill #4"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                  />
                </div>
              </div>

              {/* Row 5: Remarks */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Remarks / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g., Approved in meeting; 3-day rental settled"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Submit & Save Expense Voucher</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: DYNAMIC LIVE BALANCE CARD (Requirement 3) */}
        <div className="lg:col-span-5 space-y-4">
          {selectedMember && memberSummary ? (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-amber-300 shadow-md space-y-4 relative overflow-hidden">
              {/* Corner Watermark */}
              <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-700" />
                <span>Live Balance Card</span>
              </div>

              {/* Member Title */}
              <div className="flex items-center gap-3 pt-1">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-sm shrink-0 border border-amber-200">
                  👤
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-stone-900">
                    {selectedMember.name}
                  </h3>
                  <p className="text-xs text-stone-500 font-medium">
                    {selectedMember.designation} • +91 {selectedMember.phone}
                  </p>
                </div>
              </div>

              {/* Metrics Box */}
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-stone-200">
                  <span className="text-stone-600 font-medium">Total Advances Received:</span>
                  <span className="font-bold text-emerald-800 text-sm">
                    {formatINR(memberSummary.total_advances)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-stone-200">
                  <span className="text-stone-600 font-medium">Total Approved/Claimed Expenses:</span>
                  <span className="font-bold text-amber-900 text-sm">
                    {formatINR(memberSummary.total_expenses)}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-1.5">
                  <span className="font-extrabold text-stone-900">Current Balance in Hand:</span>
                  <span
                    className={`font-black text-base ${
                      memberSummary.balance_in_hand > 0
                        ? 'text-emerald-700'
                        : memberSummary.balance_in_hand < 0
                        ? 'text-red-700'
                        : 'text-stone-800'
                    }`}
                  >
                    {formatINR(memberSummary.balance_in_hand)}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="p-3 rounded-2xl border flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700">Account Status:</span>
                {memberSummary.status === 'due_from_member' && (
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Due from Member / Cash in Hand
                  </span>
                )}
                {memberSummary.status === 'settled' && (
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-stone-100 text-stone-700 border border-stone-300">
                    Settled (₹0.00)
                  </span>
                )}
                {memberSummary.status === 'reimbursement_due' && (
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Reimbursement Due to Member
                  </span>
                )}
              </div>

              {/* Live Projected Balance Impact */}
              {enteredAmountNum > 0 && (
                <div className="p-4 bg-linear-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-300/80 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-amber-950">
                      Projected Balance After This Claim:
                    </span>
                    <span
                      className={`text-base font-black ${
                        projectedBalance > 0
                          ? 'text-emerald-700'
                          : projectedBalance < 0
                          ? 'text-red-700'
                          : 'text-stone-800'
                      }`}
                    >
                      {formatINR(projectedBalance)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-stone-600 font-medium">New Status will be:</span>
                    <span
                      className={`font-black text-[10px] px-2 py-0.5 rounded-md uppercase ${
                        projectedStatus === 'due_from_member'
                          ? 'bg-emerald-100 text-emerald-800'
                          : projectedStatus === 'settled'
                          ? 'bg-stone-200 text-stone-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {projectedStatus === 'due_from_member' && 'Cash in Hand Remaining'}
                      {projectedStatus === 'settled' && 'Exact Settlement (₹0.00)'}
                      {projectedStatus === 'reimbursement_due' && 'Reimbursement Due'}
                    </span>
                  </div>

                  <p className="text-[10px] text-stone-500 italic pt-1">
                    Formula: Current Balance ({formatINR(memberSummary.balance_in_hand)}) − Entered Expense ({formatINR(enteredAmountNum)})
                  </p>
                </div>
              )}

              {/* Action Button: View Member Ledger */}
              <button
                type="button"
                onClick={() => onViewMemberLedger(selectedMember)}
                className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>View Member Ledger / Detailed Statement</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Direct Expenses History Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-stone-900">
              Approved Direct Expense Vouchers
            </h3>
            <p className="text-xs text-stone-500">
              Showing {filteredExpenses.length} recorded expense claims
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
                placeholder="Search title, bill ref..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-medium bg-white"
            >
              <option value="all">All Categories</option>
              {expenseTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nameEnglish}
                </option>
              ))}
            </select>

            {/* Member Filter */}
            <select
              value={filterMember}
              onChange={(e) => setFilterMember(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-medium bg-white"
            >
              <option value="all">All Claimants</option>
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

        {filteredExpenses.length === 0 ? (
          <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-300">
            <p className="text-xs text-stone-500">No expense vouchers found matching the filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-stone-200">
            <table className="w-full text-left text-xs text-stone-800">
              <thead className="bg-stone-100/90 text-stone-700 uppercase text-[10px] font-black tracking-wider border-b border-stone-200">
                <tr>
                  <th className="py-3 px-3">Voucher No</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Expense Head</th>
                  <th className="py-3 px-3">Expense Title & Remarks</th>
                  <th className="py-3 px-3">Claimed By</th>
                  <th className="py-3 px-3">Supporting Bill/Ref</th>
                  <th className="py-3 px-3 text-right">Expense Amount</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredExpenses.map((exp) => {
                  const m = committeeMembers.find((item) => item.id === exp.member_id || item.name === exp.claimed_by);
                  const isMemberInvalid = !m;
                  return (
                    <tr
                      key={exp.id}
                      className={
                        isMemberInvalid
                          ? 'bg-rose-50/50 hover:bg-rose-50/80 transition border-l-4 border-l-rose-500'
                          : 'hover:bg-amber-50/30 transition'
                      }
                    >
                      <td className="py-3 px-3 font-mono font-bold text-amber-900 whitespace-nowrap">
                        {exp.voucher_no}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-stone-600 font-medium">
                        {exp.date}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-amber-100 text-amber-900 border border-amber-200">
                          {exp.expense_type_name}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-stone-800 max-w-xs">
                        <div className="font-extrabold text-stone-900">{exp.expense_name}</div>
                        {exp.remarks && (
                          <div className="text-[11px] text-stone-500 italic mt-0.5">
                            {exp.remarks}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-stone-900">{exp.claimed_by}</span>
                          <MemberValidationBadge
                            memberId={exp.member_id}
                            memberName={exp.claimed_by}
                            committeeMembers={committeeMembers}
                          />
                        </div>
                        {m && <div className="text-[10px] text-stone-500">{m.designation}</div>}
                      </td>
                      <td className="py-3 px-3 font-mono text-stone-700 font-semibold whitespace-nowrap">
                        {exp.bill_reference}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-amber-900 text-sm whitespace-nowrap">
                        {formatINR(exp.amount)}
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
                                if (confirm(`Delete expense voucher ${exp.voucher_no} of ${formatINR(exp.amount)}?`)) {
                                  onDeleteExpense(exp.id);
                                }
                              }}
                              className="btn-delete p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition cursor-pointer"
                              title="Delete Expense"
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
