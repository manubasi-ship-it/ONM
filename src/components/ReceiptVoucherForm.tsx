import React, { useState, useEffect, useMemo } from 'react';
import {
  Commitment,
  ReceiptVoucher,
  VoucherPaymentMode,
  CommitmentWithStats,
  Setting,
  CommitteeMember,
} from '../types';
import { generateReceiptTransactionNo, computeCommitmentStats } from '../utils/storage';
import { isCurrentUserAdmin, getActiveSession } from '../modules/auth';
import { validateMemberExistsInCommittee } from '../utils/memberValidation';
import { MemberValidationBadge } from './MemberValidationBadge';
import {
  Receipt,
  Calendar,
  User,
  Home,
  MapPin,
  IndianRupee,
  CheckCircle,
  Search,
  Download,
  AlertCircle,
  AlertTriangle,
  Printer,
  Trash2,
  PlusCircle,
  CreditCard,
  Banknote,
  BookOpen,
  ShieldCheck,
  Clock,
} from 'lucide-react';

interface ReceiptVoucherFormProps {
  commitments: Commitment[];
  receiptVouchers: ReceiptVoucher[];
  committeeMembers?: CommitteeMember[];
  activeVolunteerName: string;
  setting: Setting;
  preSelectedCommitment?: Commitment | null;
  onClearPreSelectedCommitment?: () => void;
  onSaveReceiptVoucher: (voucher: ReceiptVoucher) => void;
  onDeleteReceiptVoucher: (id: string) => void;
  onOpenReceiptSlip: (voucher: ReceiptVoucher) => void;
  onSelectForLedger: (payeeName: string) => void;
  isAdmin?: boolean;
}

export const ReceiptVoucherForm: React.FC<ReceiptVoucherFormProps> = ({
  commitments,
  receiptVouchers,
  committeeMembers = [],
  activeVolunteerName,
  setting,
  preSelectedCommitment,
  onClearPreSelectedCommitment,
  onSaveReceiptVoucher,
  onDeleteReceiptVoucher,
  onOpenReceiptSlip,
  onSelectForLedger,
  isAdmin,
}) => {
  const isUserAdmin = isAdmin ?? isCurrentUserAdmin();
  const todayStr = new Date().toISOString().split('T')[0];

  // Active committee members list
  const activeCommitteeMembers = useMemo(() => {
    return committeeMembers.filter((m) => m.active);
  }, [committeeMembers]);

  // Initial collector detection from active session or activeVolunteerName
  const defaultCollectorId = useMemo(() => {
    const session = getActiveSession();
    if (session?.memberId) {
      const match = activeCommitteeMembers.find((m) => m.id === session.memberId);
      if (match) return match.id;
    }
    const nameMatch = activeCommitteeMembers.find(
      (m) => m.name.toLowerCase() === (activeVolunteerName || '').toLowerCase()
    );
    if (nameMatch) return nameMatch.id;
    return activeCommitteeMembers[0]?.id || '';
  }, [activeCommitteeMembers, activeVolunteerName]);

  // Form State
  const [date, setDate] = useState(todayStr);
  const [receiptNo, setReceiptNo] = useState('');
  const [autoTransNo, setAutoTransNo] = useState(() => generateReceiptTransactionNo(todayStr));
  const [selectedCommitmentId, setSelectedCommitmentId] = useState<string>('');
  const [name, setName] = useState('');
  const [houseName, setHouseName] = useState('');
  const [place, setPlace] = useState('ONAMPILLY');
  const [amountCommitted, setAmountCommitted] = useState<number>(0);
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentMode, setPaymentMode] = useState<VoucherPaymentMode>('Cash');
  const [collectedByMemberId, setCollectedByMemberId] = useState<string>(defaultCollectorId);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    if (!collectedByMemberId && defaultCollectorId) {
      setCollectedByMemberId(defaultCollectorId);
    }
  }, [defaultCollectorId]);

  // Search & Filter State for Table
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'Cash' | 'UPI'>('all');

  // Delete State
  const [deletingVoucher, setDeletingVoucher] = useState<ReceiptVoucher | null>(null);

  // Pre-fill if navigated from Commitments tab or Dashboard
  useEffect(() => {
    if (preSelectedCommitment) {
      setSelectedCommitmentId(preSelectedCommitment.id);
      setName(preSelectedCommitment.name);
      setHouseName(preSelectedCommitment.house_name);
      setPlace(preSelectedCommitment.place || 'ONAMPILLY');
      setAmountCommitted(preSelectedCommitment.amount_committed);
    }
  }, [preSelectedCommitment]);

  // Compute all commitments with their current stats
  const computedCommitments = useMemo(() => {
    return commitments.map((c) => computeCommitmentStats(c, receiptVouchers));
  }, [commitments, receiptVouchers]);

  // Find linked commitment stats if one is selected
  const activeCommitmentStats: CommitmentWithStats | null = useMemo(() => {
    if (selectedCommitmentId) {
      const found = computedCommitments.find((c) => c.id === selectedCommitmentId);
      if (found) return found;
    }
    // Also try matching by name if user typed/selected a name
    if (name.trim()) {
      const found = computedCommitments.find(
        (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (found) return found;
    }
    return null;
  }, [selectedCommitmentId, name, computedCommitments]);

  // Dynamic calculations for selected payee
  const previouslyCollected = activeCommitmentStats ? activeCommitmentStats.total_collected : 0;
  const currentOutstandingBalance = activeCommitmentStats
    ? activeCommitmentStats.balance
    : amountCommitted > 0
    ? amountCommitted
    : 0;

  const currentEnteredAmount = parseFloat(amountReceived) || 0;

  // New remaining balance calculated in real-time
  const newRemainingBalance = useMemo(() => {
    if (amountCommitted <= 0) return 0;
    const rem = amountCommitted - (previouslyCollected + currentEnteredAmount);
    return rem < 0 ? 0 : rem;
  }, [amountCommitted, previouslyCollected, currentEnteredAmount]);

  const isOverpaying =
    amountCommitted > 0 && currentEnteredAmount > currentOutstandingBalance;

  // Duplicate Receipt No validation
  const duplicateReceiptCheck = useMemo(() => {
    const trimmed = receiptNo.trim();
    if (!trimmed) return false;
    return receiptVouchers.some(
      (v) => v.receipt_no.trim().toLowerCase() === trimmed.toLowerCase()
    );
  }, [receiptNo, receiptVouchers]);

  // Handle Payee selection from dropdown
  const handleSelectPayeeDropdown = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'new_manual') {
      setSelectedCommitmentId('');
      setName('');
      setHouseName('');
      setPlace('ONAMPILLY');
      setAmountCommitted(0);
      if (onClearPreSelectedCommitment) onClearPreSelectedCommitment();
      return;
    }

    const commitment = commitments.find((c) => c.id === val);
    if (commitment) {
      setSelectedCommitmentId(commitment.id);
      setName(commitment.name);
      setHouseName(commitment.house_name);
      setPlace(commitment.place || 'ONAMPILLY');
      setAmountCommitted(commitment.amount_committed);
    }
  };

  // Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!receiptNo.trim()) {
      setErrorMsg('Physical Receipt Book Number is required');
      return;
    }

    if (duplicateReceiptCheck) {
      setErrorMsg(
        `Receipt Book Number "${receiptNo.trim()}" is already used. Please enter a unique serial number.`
      );
      return;
    }

    if (!name.trim()) {
      setErrorMsg('Payee / Donor Name is required');
      return;
    }

    if (!houseName.trim()) {
      setErrorMsg('House Name is required');
      return;
    }

    if (currentEnteredAmount <= 0) {
      setErrorMsg('Amount Received must be a valid positive number greater than 0');
      return;
    }

    // Verify collector is selected and actually exists in committee_members Master Data
    const selectedCollector = committeeMembers.find((m) => m.id === collectedByMemberId);
    if (!collectedByMemberId || !selectedCollector) {
      setErrorMsg('Please select the Committee Member who collected these funds.');
      return;
    }

    const collectorValidation = validateMemberExistsInCommittee(
      selectedCollector.id,
      selectedCollector.name,
      committeeMembers
    );
    if (!collectorValidation.isValid) {
      setErrorMsg(
        `Invalid Member Reference: Collector "${selectedCollector.name}" does not exist in 'committee_members' Master Data collection.`
      );
      return;
    }

    const newVoucher: ReceiptVoucher = {
      id: `rcp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      transaction_no: autoTransNo,
      commitment_id: selectedCommitmentId || undefined,
      receipt_no: receiptNo.trim(),
      date,
      name: name.trim(),
      house_name: houseName.trim(),
      place: place.trim() || 'ONAMPILLY',
      amount_committed: amountCommitted || 0,
      amount_received: currentEnteredAmount,
      balance: newRemainingBalance,
      payment_mode: paymentMode,
      amount_collected_by: selectedCollector.name,
      // Additive fields (non-breaking):
      collectedByMemberId: selectedCollector.id,
      collectedByMemberName: selectedCollector.name,
      collectedByMemberRole:
        selectedCollector.designationRole || selectedCollector.designation || 'Member',
      settlementStatus: 'In-Hand',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSaveReceiptVoucher(newVoucher);

    // Reset Form
    setReceiptNo('');
    setAmountReceived('');
    setAutoTransNo(generateReceiptTransactionNo(todayStr));
    setDate(todayStr);
    if (onClearPreSelectedCommitment) onClearPreSelectedCommitment();

    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 3500);

    // Open receipt slip for fast printing / sharing
    onOpenReceiptSlip(newVoucher);
  };

  // Filter Table
  const filteredVouchers = receiptVouchers.filter((v) => {
    const matchesSearch =
      v.receipt_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.transaction_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.house_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.amount_collected_by.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMode = modeFilter === 'all' || v.payment_mode === modeFilter;
    return matchesSearch && matchesMode;
  });

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Transaction No',
      'Receipt Book No',
      'Date',
      'Payee Name',
      'House Name',
      'Place',
      'Amount Received (INR)',
      'Remaining Balance (INR)',
      'Payment Mode',
      'Collector Name',
    ];

    const rows = filteredVouchers.map((v) => [
      v.transaction_no,
      `"${v.receipt_no.replace(/"/g, '""')}"`,
      v.date,
      `"${v.name.replace(/"/g, '""')}"`,
      `"${v.house_name.replace(/"/g, '""')}"`,
      `"${v.place.replace(/"/g, '""')}"`,
      v.amount_received,
      v.balance,
      v.payment_mode,
      `"${v.amount_collected_by.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `receipt_vouchers_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="bg-white rounded-2xl p-3 sm:p-5 border border-emerald-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-emerald-800 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-0.5">
            <Receipt className="w-3.5 h-3.5" />
            <span>Tab 2 • Collection Voucher Desk</span>
          </div>
          <h2 className="text-sm sm:text-xl md:text-2xl font-black text-stone-900 tracking-tight">
            Receipt Voucher Entry & Installments
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 sm:p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] sm:text-xs">
            <span className="text-stone-500 font-medium">Logged-in Collector: </span>
            <span className="font-extrabold text-emerald-950">{activeVolunteerName}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Form Left, Table Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Receipt Voucher Form Card */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-linear-to-r from-emerald-950 via-emerald-900 to-stone-900 text-white px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-sm sm:text-base">
                  Issue Receipt Voucher
                </h3>
              </div>
              <span className="font-mono text-[11px] text-emerald-200 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                {autoTransNo}
              </span>
            </div>
            <p className="text-[11px] text-emerald-200/80 mt-1">
              Supports multiple installments with automated balance tracking.
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
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Receipt voucher issued successfully!</span>
              </div>
            )}

            {/* Payee Selection Dropdown / Auto-complete */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
                <span>Select Committed Payee:</span>
                <span className="text-[10px] text-stone-400 font-normal">
                  Or choose "Manual / Walk-in"
                </span>
              </label>
              <select
                value={selectedCommitmentId}
                onChange={handleSelectPayeeDropdown}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-600/30 font-medium text-stone-900 bg-stone-50"
              >
                <option value="">-- Choose from Committed Donors ({commitments.length}) --</option>
                {commitments.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.house_name}) - Pledged ₹{c.amount_committed.toLocaleString('en-IN')}
                  </option>
                ))}
                <option value="new_manual">✍️ + Type New / Walk-in Payee manually</option>
              </select>
            </div>

            {/* Dynamic Summary Box for Selected Payee */}
            {activeCommitmentStats ? (
              <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200/80 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center justify-between">
                  <span>Pledge & History Summary</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                      activeCommitmentStats.status === 'Completed'
                        ? 'bg-emerald-200 text-emerald-900'
                        : activeCommitmentStats.status === 'Partially Paid'
                        ? 'bg-blue-200 text-blue-900'
                        : 'bg-amber-200 text-amber-900'
                    }`}
                  >
                    {activeCommitmentStats.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-amber-200/50">
                  <div className="p-1.5 bg-white/80 rounded-lg">
                    <div className="text-[10px] text-stone-500 font-medium">Committed</div>
                    <div className="font-mono font-bold text-xs text-stone-900">
                      ₹{activeCommitmentStats.amount_committed.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="p-1.5 bg-white/80 rounded-lg">
                    <div className="text-[10px] text-stone-500 font-medium">Prev Collected</div>
                    <div className="font-mono font-bold text-xs text-emerald-700">
                      ₹{previouslyCollected.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="p-1.5 bg-white/80 rounded-lg">
                    <div className="text-[10px] text-stone-500 font-medium">Current Balance</div>
                    <div className="font-mono font-bold text-xs text-amber-900">
                      ₹{currentOutstandingBalance.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {activeCommitmentStats.receipt_count > 0 && (
                  <div className="text-[11px] text-stone-500 italic pt-1">
                    ℹ️ {activeCommitmentStats.receipt_count} previous{' '}
                    {activeCommitmentStats.receipt_count === 1 ? 'installment' : 'installments'}{' '}
                    recorded for this devotee.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2.5 bg-stone-100/80 rounded-xl border border-stone-200 text-[11px] text-stone-600 flex items-center gap-1.5">
                <span>Direct / Walk-in collection without prior pledge.</span>
              </div>
            )}

            {/* 1. Receipt Book Serial Number (Required with duplicate check) */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span>Physical Receipt Book Number *</span>
                </span>
                {duplicateReceiptCheck && (
                  <span className="text-[10px] text-red-600 font-bold flex items-center gap-0.5">
                    <AlertTriangle className="w-3 h-3" /> Duplicate No!
                  </span>
                )}
              </label>
              <input
                type="text"
                required
                value={receiptNo}
                onChange={(e) => setReceiptNo(e.target.value)}
                placeholder="e.g., 1045, B-204"
                className={`w-full px-3 py-2 rounded-xl border font-mono font-bold text-stone-900 focus:outline-hidden focus:ring-2 ${
                  duplicateReceiptCheck
                    ? 'border-red-400 bg-red-50/50 focus:ring-red-400'
                    : 'border-stone-300 focus:ring-emerald-600/30'
                }`}
              />
            </div>

            {/* 2. Collection Date Picker */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                <span>Collection Date *</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setAutoTransNo(generateReceiptTransactionNo(e.target.value));
                }}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-600/30 font-semibold text-stone-800"
              />
            </div>

            {/* 3. Payee Full Name (Editable) */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-700" />
                <span>Payee Name *</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Payee full name"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-600/30 font-medium"
              />
            </div>

            {/* 4. House Name */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-emerald-700" />
                <span>House / Residential Name *</span>
              </label>
              <input
                type="text"
                required
                value={houseName}
                onChange={(e) => setHouseName(e.target.value)}
                placeholder="House name"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-600/30 font-medium"
              />
            </div>

            {/* 5. Place (Default: ONAMPILLY, Editable) */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                <span>Place / Desham</span>
              </label>
              <input
                type="text"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="ONAMPILLY"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-600/30 font-medium"
              />
            </div>

            {/* 6. Amount Received (Current Installment) */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Amount Received (Current Installment) *</span>
                </span>
                {isOverpaying && (
                  <span className="text-[10px] text-amber-700 font-bold">
                    ⚠️ Exceeds outstanding balance
                  </span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-stone-500 font-bold">₹</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="e.g., 2000"
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-600/30 font-mono font-bold text-stone-900 text-base"
                />
              </div>
            </div>

            {/* Real-time Dynamic Balance Preview */}
            <div className="p-3 bg-stone-100 rounded-xl border border-stone-200 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-stone-500 uppercase font-bold">
                  New Remaining Balance
                </div>
                <div className="text-[11px] text-stone-400">
                  After recording this receipt
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`font-mono font-black text-lg ${
                    newRemainingBalance > 0 ? 'text-amber-900' : 'text-emerald-700'
                  }`}
                >
                  ₹{newRemainingBalance.toLocaleString('en-IN')}
                </span>
                {newRemainingBalance === 0 && amountCommitted > 0 && (
                  <div className="text-[10px] font-bold text-emerald-700">
                    Pledge Fully Settled! 🎉
                  </div>
                )}
              </div>
            </div>

            {/* 7. Payment Mode (Cash / UPI) */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Payment Mode *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode('Cash')}
                  className={`p-2.5 rounded-xl border text-center font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    paymentMode === 'Cash'
                      ? 'bg-amber-100 border-amber-400 text-amber-950 shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-amber-700" />
                  <span>💵 Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('UPI')}
                  className={`p-2.5 rounded-xl border text-center font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    paymentMode === 'UPI'
                      ? 'bg-emerald-100 border-emerald-400 text-emerald-950 shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                  <span>📱 UPI QR / App</span>
                </button>
              </div>
            </div>

            {/* 8. Collector Selection (Mandatory) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-stone-700">
                  Collected By (Committee Member) <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  Holds Floating Cash
                </span>
              </div>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                <select
                  value={collectedByMemberId}
                  onChange={(e) => setCollectedByMemberId(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-xs font-bold bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Select Collecting Committee Member --</option>
                  {activeCommitteeMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.designationRole || m.designation}) — +91 {m.phone}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-stone-400 mt-1">
                Cash collected remains In-Hand with this member until settled with the Treasurer.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-linear-to-r from-emerald-900 to-emerald-800 hover:from-emerald-950 hover:to-emerald-900 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4 text-emerald-300" />
                <span>Issue & Save Receipt Voucher</span>
              </button>
            </div>
          </form>
        </div>

        {/* Generated Receipts Table */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search, Filter & CSV */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Receipt No, Payee Name, Voucher No, or Collector..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-600/30 font-medium"
              />
            </div>

            {/* Payment Mode Filter */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-stone-400 font-bold text-[11px] hidden sm:inline mr-1">
                Mode:
              </span>
              {(['all', 'Cash', 'UPI'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModeFilter(m)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                    modeFilter === m
                      ? 'bg-emerald-900 text-white shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {m === 'all' ? 'All' : m}
                </button>
              ))}

              <button
                type="button"
                onClick={handleExportCSV}
                className="ml-2 px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100 transition text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                title="Export receipts to CSV"
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
                Issued Receipt Vouchers ({filteredVouchers.length})
              </div>
              <div className="text-[11px] text-stone-500">
                Total Collected:{' '}
                <span className="font-extrabold text-emerald-800 font-mono">
                  ₹{filteredVouchers.reduce((s, v) => s + v.amount_received, 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {filteredVouchers.length === 0 ? (
              <div className="p-12 text-center text-stone-400 space-y-2">
                <Receipt className="w-10 h-10 mx-auto text-stone-300" />
                <p className="text-sm font-semibold text-stone-600">No receipt vouchers issued yet</p>
                <p className="text-xs text-stone-400">
                  {searchTerm ? 'Try adjusting your search filters' : 'Use the form on the left to issue your first voucher'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-stone-100/80 text-stone-600 font-bold border-b border-stone-200 text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-3">Receipt / Voucher No</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Payee & House</th>
                      <th className="py-3 px-3 text-right">Amount Paid</th>
                      <th className="py-3 px-3 text-center">Mode</th>
                      <th className="py-3 px-3">Collected By</th>
                      <th className="py-3 px-3 text-center">Settlement</th>
                      <th className="py-3 px-3 text-right">Balance</th>
                      <th className="py-3 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredVouchers.map((v) => {
                      const collectorDisplayName = v.collectedByMemberName
                        ? `${v.collectedByMemberName} (${v.collectedByMemberRole || 'Member'})`
                        : v.amount_collected_by || 'Direct / Unassigned Counter Collection';
                      const isSettled = v.settlementStatus === 'Settled';

                      return (
                        <tr key={v.id} className="hover:bg-emerald-50/30 transition text-stone-800">
                          {/* Receipt Book No & Voucher ID */}
                          <td className="py-3 px-3">
                            <div className="font-mono font-black text-emerald-950 text-sm">
                              #{v.receipt_no}
                            </div>
                            <div className="text-[10px] text-stone-400 font-mono">
                              {v.transaction_no}
                            </div>
                          </td>

                          {/* Date */}
                          <td className="py-3 px-3 text-stone-600 font-medium whitespace-nowrap">
                            {v.date}
                          </td>

                          {/* Payee & House */}
                          <td className="py-3 px-3">
                            <div className="font-extrabold text-stone-900 text-xs">
                              {v.name}
                            </div>
                            <div className="text-[11px] text-stone-500">
                              {v.house_name}, {v.place}
                            </div>
                          </td>

                          {/* Amount Paid */}
                          <td className="py-3 px-3 text-right font-mono font-black text-emerald-800 text-sm">
                            ₹{v.amount_received.toLocaleString('en-IN')}
                          </td>

                          {/* Payment Mode */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                                v.payment_mode === 'Cash'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              }`}
                            >
                              {v.payment_mode}
                            </span>
                          </td>

                          {/* Collector with Designation & Validation Badge */}
                          <td className="py-3 px-3 text-stone-700">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs">{collectorDisplayName}</span>
                              <MemberValidationBadge
                                memberId={v.collectedByMemberId}
                                memberName={v.collectedByMemberName || v.amount_collected_by}
                                committeeMembers={committeeMembers}
                              />
                            </div>
                          </td>

                          {/* Settlement Status (In-Hand vs Settled) */}
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            {isSettled ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                <span>Settled to Vault</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>In-Hand</span>
                              </span>
                            )}
                          </td>

                          {/* Balance */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-stone-700 whitespace-nowrap">
                            ₹{v.balance.toLocaleString('en-IN')}
                          </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View / Print Slip */}
                            <button
                              type="button"
                              onClick={() => onOpenReceiptSlip(v)}
                              className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer"
                              title="Print or share digital receipt slip"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Slip</span>
                            </button>

                            {/* View Payee Ledger */}
                            <button
                              type="button"
                              onClick={() => onSelectForLedger(v.name)}
                              className="p-1 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer"
                              title="View full statement in Payee Ledger"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete (Admin Only) */}
                            {isUserAdmin && (
                              <button
                                type="button"
                                onClick={() => setDeletingVoucher(v)}
                                className="btn-delete p-1 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition cursor-pointer"
                                title="Delete Receipt Voucher"
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
      </div>

      {/* Delete Confirmation Modal */}
      {deletingVoucher && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-red-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-100 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-stone-900">
                Delete Receipt Voucher?
              </h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to permanently delete receipt voucher{' '}
              <span className="font-bold text-stone-900">
                #{deletingVoucher.receipt_no} ({deletingVoucher.name})
              </span>{' '}
              for ₹{deletingVoucher.amount_received.toLocaleString('en-IN')}? This will adjust the remaining balance for this payee.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingVoucher(null)}
                className="px-4 py-2 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteReceiptVoucher(deletingVoucher.id);
                  setDeletingVoucher(null);
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
