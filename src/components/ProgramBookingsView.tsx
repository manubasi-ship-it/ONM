import React, { useState, useEffect, useMemo } from 'react';
import {
  ProgramBooking,
  MemberAccount,
  ProgramBookingModule,
} from '../modules/ProgramBookingModule';
import { CommitteeMember } from '../types';
import { canPerformAction } from '../modules/auth';
import { MemberValidationBadge } from './MemberValidationBadge';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Users,
  Coins,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Trash2,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Printer,
  Sparkles,
  X,
  FileSpreadsheet,
  Wallet,
  AlertTriangle,
  Lock,
} from 'lucide-react';

interface ProgramBookingsViewProps {
  onNavigateToWallets?: () => void;
  onNavigateToReports?: () => void;
  committeeMembersList?: string[];
  committeeMembers?: CommitteeMember[];
}

export const ProgramBookingsView: React.FC<ProgramBookingsViewProps> = ({
  onNavigateToWallets,
  onNavigateToReports,
  committeeMembersList = [],
  committeeMembers = [],
}) => {
  // Module state
  const [bookings, setBookings] = useState<ProgramBooking[]>(() =>
    ProgramBookingModule.getBookings()
  );
  const [memberAccounts, setMemberAccounts] = useState<MemberAccount[]>(() =>
    ProgramBookingModule.getMemberAccounts()
  );

  const refreshAllData = () => {
    setBookings(ProgramBookingModule.getBookings());
    setMemberAccounts(ProgramBookingModule.getMemberAccounts());
  };

  // Real-time synchronization
  useEffect(() => {
    const handleUpdate = () => {
      refreshAllData();
    };
    window.addEventListener('program_booking_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('program_booking_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Sync committee members if passed
  useEffect(() => {
    if (committeeMembers && committeeMembers.length > 0) {
      const cleanName = (str: string) =>
        (str || '').replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim().toLowerCase();
      const current = ProgramBookingModule.getMemberAccounts();
      const masterIds = new Set(committeeMembers.map((cm) => cm.id));
      const masterNames = new Set(committeeMembers.map((cm) => cleanName(cm.name)));

      let updated = false;
      const pruned = current.filter((m) => masterIds.has(m.id) || masterNames.has(cleanName(m.name)));
      if (pruned.length !== current.length) {
        updated = true;
      }
      const newList = [...pruned];
      committeeMembers.forEach((cm) => {
        if (!cm.active) return;
        const displayName = cm.designation ? `${cm.name} (${cm.designation})` : cm.name;
        const existingIdx = newList.findIndex(
          (m) =>
            m.id === cm.id ||
            m.name.toLowerCase() === cm.name.trim().toLowerCase() ||
            m.name.toLowerCase() === displayName.toLowerCase()
        );
        if (existingIdx === -1) {
          newList.push({
            id: cm.id,
            name: displayName,
            phone: cm.phone,
            designation: cm.designation,
            initialAdvance: 0,
            totalTopUps: 0,
            totalDisbursed: 0,
            currentBalance: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          updated = true;
        } else {
          // If existing account was using temporary MEM- ID, link to real cm.id
          if (newList[existingIdx].id !== cm.id && newList[existingIdx].id.startsWith('MEM-')) {
            newList[existingIdx].id = cm.id;
            newList[existingIdx].name = displayName;
            updated = true;
          }
        }
      });
      if (updated) {
        ProgramBookingModule.saveMemberAccounts(newList);
        setMemberAccounts(newList);
      }
    } else if (committeeMembersList.length > 0) {
      const current = ProgramBookingModule.getMemberAccounts();
      let updated = false;
      committeeMembersList.forEach((cm) => {
        if (cm && !current.some((m) => m.name.toLowerCase() === cm.trim().toLowerCase())) {
          ProgramBookingModule.addMemberAccount(cm, 0);
          updated = true;
        }
      });
      if (updated) {
        setMemberAccounts(ProgramBookingModule.getMemberAccounts());
      }
    }
  }, [committeeMembers, committeeMembersList]);

  // Today's ISO date string
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // Form State
  const initialFormState = {
    programeName: '',
    programeDate: getTodayDate(),
    programeTime: '18:00',
    coordinatorName: '',
    mobileNumber1: '',
    mobileNumber2: '',
    noOfArtist: 1,
    reportingTime: '17:00',
    endTime: '21:00',
    totalAmount: '',
    advanceAmount: '',
    advancePaidById: memberAccounts[0]?.id || '',
    advancePaidBy: memberAccounts[0]?.name || '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: string;
  } | null>(null);

  // Overdraft confirmation prompt state
  const [overdraftWarningModal, setOverdraftWarningModal] = useState<{
    isOpen: boolean;
    memberName: string;
    available: number;
    required: number;
    pendingData?: any;
  }>({
    isOpen: false,
    memberName: '',
    available: 0,
    required: 0,
  });

  // Settlement Modal State
  const [settleModalBooking, setSettleModalBooking] = useState<ProgramBooking | null>(null);
  const [settleAmountInput, setSettleAmountInput] = useState<string>('');
  const [settlePaymentMode, setSettlePaymentMode] = useState<
    'MEMBER_ADVANCE' | 'CASH_DIRECT' | 'BANK_TRANSFER'
  >('MEMBER_ADVANCE');
  const [settleMemberId, setSettleMemberId] = useState<string>(memberAccounts[0]?.id || '');
  const [settleNotes, setSettleNotes] = useState<string>('');
  const [settleError, setSettleError] = useState<string>('');

  // Quick Add Member Modal State
  const [isQuickAddMemberOpen, setIsQuickAddMemberOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberFloat, setNewMemberFloat] = useState('');
  const [quickAddError, setQuickAddError] = useState('');

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilterFrom, setDateFilterFrom] = useState('');
  const [dateFilterTo, setDateFilterTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'settled' | 'pending'>('all');

  // Delete confirmation
  const [bookingToDelete, setBookingToDelete] = useState<ProgramBooking | null>(null);

  // Receipt preview modal
  const [receiptBooking, setReceiptBooking] = useState<ProgramBooking | null>(null);

  // Selected Member for Advance
  const selectedMember = useMemo(() => {
    return (
      memberAccounts.find((m) => m.id === formData.advancePaidById) ||
      memberAccounts.find((m) => m.name === formData.advancePaidBy) ||
      memberAccounts[0]
    );
  }, [memberAccounts, formData.advancePaidById, formData.advancePaidBy]);

  // Real-time calculated fields for form
  const parsedTotal = parseFloat(formData.totalAmount) || 0;
  const parsedAdvance = parseFloat(formData.advanceAmount) || 0;
  const dynamicBalance = Math.max(0, parsedTotal - parsedAdvance);

  // Check if advance exceeds selected member's available balance
  const isAdvanceOverdraft = selectedMember && parsedAdvance > selectedMember.currentBalance;

  // Auto-dismiss notification after 6s
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Form input change handler
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === 'advancePaidById') {
      const mem = memberAccounts.find((m) => m.id === value);
      setFormData((prev) => ({
        ...prev,
        advancePaidById: value,
        advancePaidBy: mem ? mem.name : prev.advancePaidBy,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Clear specific error on change
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  // Validate form client-side
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.programeName.trim()) {
      errors.programeName = 'Program name is required';
    }
    if (!formData.programeDate) {
      errors.programeDate = 'Program date is required';
    }
    if (!formData.programeTime) {
      errors.programeTime = 'Program time is required';
    }
    if (!formData.coordinatorName.trim()) {
      errors.coordinatorName = 'Co-ordinator name is required';
    }
    if (!formData.mobileNumber1) {
      errors.mobileNumber1 = 'Mobile number 1 is required';
    } else if (!ProgramBookingModule.validateMobile(formData.mobileNumber1)) {
      errors.mobileNumber1 = 'Mobile number 1 must be exactly 10 digits';
    }

    if (formData.mobileNumber2 && formData.mobileNumber2.trim() !== '') {
      if (!ProgramBookingModule.validateMobile(formData.mobileNumber2)) {
        errors.mobileNumber2 = 'Mobile number 2 must be 10 digits';
      }
    }

    if (!formData.noOfArtist || formData.noOfArtist < 1) {
      errors.noOfArtist = 'At least 1 artist required';
    }
    if (!formData.reportingTime) {
      errors.reportingTime = 'Reporting time is required';
    }
    if (!formData.endTime) {
      errors.endTime = 'End time is required';
    }

    if (formData.totalAmount === '' || isNaN(parsedTotal) || parsedTotal < 0) {
      errors.totalAmount = 'Valid total amount is required';
    }

    if (formData.advanceAmount === '' || isNaN(parsedAdvance) || parsedAdvance < 0) {
      errors.advanceAmount = 'Valid advance amount is required (enter 0 if none)';
    } else if (parsedAdvance > parsedTotal) {
      errors.advanceAmount = 'Advance cannot exceed total agreed amount';
    }

    if (!formData.advancePaidBy && !formData.advancePaidById) {
      errors.advancePaidBy = 'Select who paid the advance';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Process saving booking (with optional overdraft allow)
  const processSaveBooking = (allowOverdraft = false) => {
    const memberName = selectedMember ? selectedMember.name : formData.advancePaidBy;
    const memberId = selectedMember ? selectedMember.id : undefined;

    const result = ProgramBookingModule.createBooking(
      {
        programeName: formData.programeName.trim(),
        programeDate: formData.programeDate,
        programeTime: formData.programeTime,
        coordinatorName: formData.coordinatorName.trim(),
        mobileNumber1: formData.mobileNumber1.trim(),
        mobileNumber2: formData.mobileNumber2.trim() || undefined,
        noOfArtist: Number(formData.noOfArtist) || 1,
        reportingTime: formData.reportingTime,
        endTime: formData.endTime,
        totalAmount: parsedTotal,
        advanceAmount: parsedAdvance,
        advancePaidBy: memberName,
        advancePaidById: memberId,
        settledAmount: 0,
      },
      allowOverdraft
    );

    if (!result.success) {
      if (result.requiresOverdraftConfirm && selectedMember) {
        setOverdraftWarningModal({
          isOpen: true,
          memberName: selectedMember.name,
          available: selectedMember.currentBalance,
          required: parsedAdvance,
        });
        return;
      }
      setNotification({
        type: 'error',
        message: result.error || 'Failed to save booking.',
      });
      return;
    }

    // Refresh state
    refreshAllData();

    // Reset Form
    handleResetForm();

    // Success Notification with double-entry feedback
    const remainingAfter = (selectedMember?.currentBalance || 0) - parsedAdvance;
    setNotification({
      type: 'success',
      message: `Program "${result.data?.programeName}" successfully booked!`,
      details:
        parsedAdvance > 0
          ? `₹${parsedAdvance.toLocaleString('en-IN')} automatically debited from ${memberName}'s advance wallet. (Remaining Balance: ₹${remainingAfter.toLocaleString('en-IN')})`
          : 'Zero advance recorded.',
    });
  };

  // Submit Handler
  const handleSaveBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Check overdraft upfront
    if (selectedMember && parsedAdvance > selectedMember.currentBalance) {
      setOverdraftWarningModal({
        isOpen: true,
        memberName: selectedMember.name,
        available: selectedMember.currentBalance,
        required: parsedAdvance,
      });
      return;
    }

    processSaveBooking(false);
  };

  // Reset Handler
  const handleResetForm = () => {
    setFormData({
      ...initialFormState,
      programeDate: getTodayDate(),
      advancePaidById: memberAccounts[0]?.id || '',
      advancePaidBy: memberAccounts[0]?.name || '',
    });
    setFormErrors({});
  };

  // Settlement Submit Handler
  const handleSaveSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    setSettleError('');

    if (!settleModalBooking) return;

    const parsed = parseFloat(settleAmountInput);
    if (isNaN(parsed) || parsed < 0) {
      setSettleError('Please enter a valid non-negative settled amount.');
      return;
    }

    if (parsed > settleModalBooking.balanceAmount) {
      setSettleError(
        `Settled amount (₹${parsed.toLocaleString('en-IN')}) cannot exceed remaining balance (₹${settleModalBooking.balanceAmount.toLocaleString('en-IN')}).`
      );
      return;
    }

    const res = ProgramBookingModule.recordSettlement(settleModalBooking.id, parsed, {
      settledByMemberId: settlePaymentMode === 'MEMBER_ADVANCE' ? settleMemberId : undefined,
      paymentMode: settlePaymentMode,
      notes: settleNotes,
    });

    if (!res.success) {
      setSettleError(res.error || 'Failed to update settlement.');
      return;
    }

    refreshAllData();
    setSettleModalBooking(null);
    setSettleAmountInput('');
    setSettleNotes('');
    setNotification({
      type: 'success',
      message: `Payment settlement of ₹${parsed.toLocaleString('en-IN')} recorded for "${res.data?.programeName}".`,
      details:
        res.data?.difference === 0
          ? 'Program is now FULLY SETTLED!'
          : `Outstanding difference: ₹${res.data?.difference.toLocaleString('en-IN')}`,
    });
  };

  // Quick Add Member Handler
  const handleQuickAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    setQuickAddError('');

    const trimmed = newMemberName.trim();
    if (!trimmed) {
      setQuickAddError('Member name cannot be blank.');
      return;
    }

    const initFloat = Number(newMemberFloat) || 0;
    const res = ProgramBookingModule.addMemberAccount(trimmed, initFloat);
    if (!res.success) {
      setQuickAddError(res.error || 'Failed to add member.');
      return;
    }

    const updatedMembers = ProgramBookingModule.getMemberAccounts();
    setMemberAccounts(updatedMembers);

    const added = updatedMembers.find((m) => m.name.toLowerCase() === trimmed.toLowerCase());
    if (added) {
      setFormData((prev) => ({
        ...prev,
        advancePaidById: added.id,
        advancePaidBy: added.name,
      }));
    }

    setNewMemberName('');
    setNewMemberFloat('');
    setIsQuickAddMemberOpen(false);
    setNotification({
      type: 'success',
      message: `Member "${trimmed}" added with ₹${initFloat.toLocaleString('en-IN')} advance pool and selected.`,
    });
  };

  // Delete Booking Handler
  const confirmDeleteBooking = () => {
    if (!bookingToDelete) return;
    ProgramBookingModule.deleteBooking(bookingToDelete.id);
    refreshAllData();
    setBookingToDelete(null);
    setNotification({
      type: 'success',
      message: `Booking for "${bookingToDelete.programeName}" was removed.`,
    });
  };

  // Filtered Bookings for the Live Table
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = b.programeName?.toLowerCase().includes(q);
        const matchesCoord = b.coordinatorName?.toLowerCase().includes(q);
        const matchesMobile = b.mobileNumber1?.includes(q) || b.mobileNumber2?.includes(q);
        const matchesPayer = b.advancePaidBy?.toLowerCase().includes(q);
        if (!matchesName && !matchesCoord && !matchesMobile && !matchesPayer) {
          return false;
        }
      }

      // Date Range
      if (dateFilterFrom && b.programeDate < dateFilterFrom) return false;
      if (dateFilterTo && b.programeDate > dateFilterTo) return false;

      // Status
      if (statusFilter === 'settled' && b.difference > 0) return false;
      if (statusFilter === 'pending' && b.difference === 0) return false;

      return true;
    });
  }, [bookings, searchQuery, dateFilterFrom, dateFilterTo, statusFilter]);

  // Live Summary KPIs
  const metrics = useMemo(() => {
    return ProgramBookingModule.calculateMetrics(bookings);
  }, [bookings, memberAccounts]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Module Navigation Tabs */}
      <div className="bg-gradient-to-r from-amber-900 via-orange-950 to-stone-900 text-white rounded-2xl p-3.5 sm:p-6 shadow-xl border border-amber-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center space-x-1.5 text-amber-300 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-0.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Program Management & Expense Reconciliation</span>
            </div>
            <h1 className="text-sm sm:text-xl md:text-2xl font-bold tracking-tight text-white">
              Program Booking & Advance Ledger
            </h1>
          </div>

          {/* Module Navigation Tabs */}
          <div className="flex items-center space-x-2 bg-black/25 p-1.5 rounded-xl border border-white/10 self-start md:self-auto">
            <button
              type="button"
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-500 text-stone-950 shadow-sm cursor-default flex items-center space-x-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Program Bookings</span>
            </button>
            <button
              type="button"
              onClick={onNavigateToWallets}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-amber-100 hover:text-white hover:bg-white/10 transition cursor-pointer flex items-center space-x-1.5"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Member Wallets & Ledger</span>
            </button>
            <button
              type="button"
              onClick={onNavigateToReports}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-amber-100 hover:text-white hover:bg-white/10 transition cursor-pointer flex items-center space-x-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Financial Reports</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-start justify-between shadow-md transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <div className="flex items-start space-x-3">
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-semibold">{notification.message}</p>
              {notification.details && (
                <p className="text-xs text-stone-600 mt-1">{notification.details}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-stone-400 hover:text-stone-700 text-xs font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* SECTION 1: PROGRAM BOOKING FORM (Data Entry) */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="p-5 border-b border-stone-200 bg-stone-50/50 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Program Booking Entry Form</h2>
              <p className="text-xs text-stone-500">
                Advances paid out automatically deduct from the selected member's advance wallet.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-medium text-stone-500 hidden sm:inline">
              Fields marked with * are required
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveBooking} className="p-6 space-y-6">
          {/* Row 1: Program Name & Coordinator Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                PROGRAME NAME <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="programeName"
                placeholder="e.g., Thayambaka / Panchavadyam / Drama"
                value={formData.programeName}
                onChange={handleInputChange}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
                  formErrors.programeName
                    ? 'border-rose-300 ring-2 ring-rose-100'
                    : 'border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
                } focus:outline-none transition bg-white`}
              />
              {formErrors.programeName && (
                <p className="text-xs text-rose-600 mt-1">{formErrors.programeName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                CO ORDINATOR NAME <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
                <input
                  type="text"
                  name="coordinatorName"
                  placeholder="e.g., Kalabhavan Suresh"
                  value={formData.coordinatorName}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border ${
                    formErrors.coordinatorName
                      ? 'border-rose-300 ring-2 ring-rose-100'
                      : 'border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
                  } focus:outline-none transition bg-white`}
                />
              </div>
              {formErrors.coordinatorName && (
                <p className="text-xs text-rose-600 mt-1">{formErrors.coordinatorName}</p>
              )}
            </div>
          </div>

          {/* Row 2: Date, Program Time, Reporting Time, End Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                PROGRAME DATE <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="programeDate"
                value={formData.programeDate}
                onChange={handleInputChange}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
                  formErrors.programeDate
                    ? 'border-rose-300 ring-2 ring-rose-100'
                    : 'border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
                } focus:outline-none transition bg-white`}
              />
              {formErrors.programeDate && (
                <p className="text-xs text-rose-600 mt-1">{formErrors.programeDate}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                PROGRAME TIME <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
                <input
                  type="time"
                  name="programeTime"
                  value={formData.programeTime}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border ${
                    formErrors.programeTime
                      ? 'border-rose-300 ring-2 ring-rose-100'
                      : 'border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
                  } focus:outline-none transition bg-white`}
                />
              </div>
              {formErrors.programeTime && (
                <p className="text-xs text-rose-600 mt-1">{formErrors.programeTime}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                REPORTING TIME <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
                <input
                  type="time"
                  name="reportingTime"
                  value={formData.reportingTime}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border ${
                    formErrors.reportingTime
                      ? 'border-rose-300 ring-2 ring-rose-100'
                      : 'border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
                  } focus:outline-none transition bg-white`}
                />
              </div>
              {formErrors.reportingTime && (
                <p className="text-xs text-rose-600 mt-1">{formErrors.reportingTime}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                END TIME <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
                <input
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border ${
                    formErrors.endTime
                      ? 'border-rose-300 ring-2 ring-rose-100'
                      : 'border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
                  } focus:outline-none transition bg-white`}
                />
              </div>
              {formErrors.endTime && (
                <p className="text-xs text-rose-600 mt-1">{formErrors.endTime}</p>
              )}
            </div>
          </div>

          {/* Row 3: Mobile 1, Mobile 2, No of Artists */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                MOBILE NUMBER 1 <span className="text-rose-500">* (10 Digits)</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
                <input
                  type="tel"
                  name="mobileNumber1"
                  placeholder="9847000000"
                  maxLength={10}
                  value={formData.mobileNumber1}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border ${
                    formErrors.mobileNumber1
                      ? 'border-rose-300 ring-2 ring-rose-100'
                      : 'border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
                  } focus:outline-none transition bg-white`}
                />
              </div>
              {formErrors.mobileNumber1 && (
                <p className="text-xs text-rose-600 mt-1">{formErrors.mobileNumber1}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                MOBILE NUMBER 2 <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
                <input
                  type="tel"
                  name="mobileNumber2"
                  placeholder="9847111111"
                  maxLength={10}
                  value={formData.mobileNumber2}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border ${
                    formErrors.mobileNumber2
                      ? 'border-rose-300 ring-2 ring-rose-100'
                      : 'border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
                  } focus:outline-none transition bg-white`}
                />
              </div>
              {formErrors.mobileNumber2 && (
                <p className="text-xs text-rose-600 mt-1">{formErrors.mobileNumber2}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                NO OF ARTIST <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Users className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
                <input
                  type="number"
                  min="1"
                  name="noOfArtist"
                  value={formData.noOfArtist}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border ${
                    formErrors.noOfArtist
                      ? 'border-rose-300 ring-2 ring-rose-100'
                      : 'border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
                  } focus:outline-none transition bg-white`}
                />
              </div>
              {formErrors.noOfArtist && (
                <p className="text-xs text-rose-600 mt-1">{formErrors.noOfArtist}</p>
              )}
            </div>
          </div>

          {/* Row 4: Financial Calculations & Member Advance Deduction */}
          <div className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center space-x-1.5">
                <Coins className="w-4 h-4 text-amber-600" />
                <span>Financial Terms & Member Advance Wallet Deduction</span>
              </span>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                Double-Entry Synchronized
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Amount */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  TOTAL AMOUNT <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-stone-500 font-semibold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    name="totalAmount"
                    placeholder="0.00"
                    value={formData.totalAmount}
                    onChange={handleInputChange}
                    className={`w-full pl-8 pr-3.5 py-2.5 text-sm font-semibold rounded-xl border ${
                      formErrors.totalAmount
                        ? 'border-rose-300 ring-2 ring-rose-100'
                        : 'border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
                    } focus:outline-none transition bg-white`}
                  />
                </div>
                {formErrors.totalAmount && (
                  <p className="text-xs text-rose-600 mt-1">{formErrors.totalAmount}</p>
                )}
              </div>

              {/* Advance Amount */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  ADVANCE AMOUNT <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-stone-500 font-semibold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    name="advanceAmount"
                    placeholder="0.00"
                    value={formData.advanceAmount}
                    onChange={handleInputChange}
                    className={`w-full pl-8 pr-3.5 py-2.5 text-sm font-semibold rounded-xl border ${
                      formErrors.advanceAmount
                        ? 'border-rose-300 ring-2 ring-rose-100'
                        : isAdvanceOverdraft
                        ? 'border-amber-400 ring-2 ring-amber-100'
                        : 'border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
                    } focus:outline-none transition bg-white`}
                  />
                </div>
                {formErrors.advanceAmount && (
                  <p className="text-xs text-rose-600 mt-1">{formErrors.advanceAmount}</p>
                )}
              </div>

              {/* Advance Paid By - Member Dropdown showing available balance */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                    ADVANCE PAID BY <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickAddError('');
                      setIsQuickAddMemberOpen(true);
                    }}
                    className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 flex items-center space-x-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Quick Add</span>
                  </button>
                </div>
                <select
                  name="advancePaidById"
                  value={formData.advancePaidById}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 focus:outline-none transition bg-white"
                >
                  {memberAccounts.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (Available: ₹{m.currentBalance.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
                {selectedMember && (
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="text-stone-500">Wallet balance:</span>
                    <span
                      className={`font-semibold ${
                        selectedMember.currentBalance >= parsedAdvance
                          ? 'text-emerald-700'
                          : 'text-rose-600'
                      }`}
                    >
                      ₹{selectedMember.currentBalance.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              {/* Balance Amount (Read-Only Dynamic Calculation) */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  BALANCE AMOUNT <span className="text-stone-400 font-normal">(Total - Advance)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-stone-500 font-semibold text-sm">
                    ₹
                  </span>
                  <input
                    type="text"
                    readOnly
                    value={dynamicBalance.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                    className="w-full pl-8 pr-3.5 py-2.5 text-sm font-bold rounded-xl border border-stone-200 bg-stone-100 text-stone-800 cursor-not-allowed select-none"
                  />
                </div>
                <p className="text-[10px] text-stone-400 mt-1">
                  Dynamically calculated in real-time
                </p>
              </div>
            </div>

            {/* Overdraft Warning Banner inside form */}
            {isAdvanceOverdraft && (
              <div className="p-3 bg-amber-100/90 border border-amber-300 rounded-xl flex items-center justify-between text-xs text-amber-900">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0" />
                  <span>
                    Advance of ₹{parsedAdvance.toLocaleString('en-IN')} exceeds{' '}
                    <strong>{selectedMember?.name}</strong>'s current balance (₹
                    {selectedMember?.currentBalance.toLocaleString('en-IN')}). Saving will prompt for overdraft confirmation.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onNavigateToWallets}
                  className="font-bold underline text-amber-950 ml-3 hover:text-black cursor-pointer"
                >
                  Top Up Wallet
                </button>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-5 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-sm font-semibold transition cursor-pointer flex items-center space-x-1.5"
            >
              <RefreshCw className="w-4 h-4 text-stone-500" />
              <span>Reset</span>
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-sm font-bold shadow-md hover:shadow-lg transition cursor-pointer flex items-center space-x-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Save Booking & Disburse Advance</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: PROGRAM LIST OVERVIEW (Live Data Grid) */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        {/* Table Header & Search/Filter Bar */}
        <div className="p-5 border-b border-stone-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center space-x-2">
                <span>Program List Overview</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
                  {filteredBookings.length} Programs
                </span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Exact 10-column live ledger view with dynamic difference calculation and settlement triggers.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => ProgramBookingModule.exportToCSV(filteredBookings)}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 border border-stone-300 transition cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-stone-600" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
              <input
                type="text"
                placeholder="Search program, co-ordinator, mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            {/* Date From */}
            <div>
              <input
                type="date"
                value={dateFilterFrom}
                onChange={(e) => setDateFilterFrom(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                title="Date From"
              />
            </div>

            {/* Date To */}
            <div>
              <input
                type="date"
                value={dateFilterTo}
                onChange={(e) => setDateFilterTo(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                title="Date To"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'all' | 'settled' | 'pending')
                }
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="all">All Statuses</option>
                <option value="settled">Settled (Difference == 0)</option>
                <option value="pending">Pending (Difference &gt; 0)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Live Data Grid Table (Exact 10 Columns) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-100 text-stone-700 border-b border-stone-200">
                <th className="py-3 px-3 font-bold w-12 text-center">1. SL NO</th>
                <th className="py-3 px-3 font-bold min-w-[160px]">2. PROGRAME NAME</th>
                <th className="py-3 px-3 font-bold min-w-[110px]">3. PROGRAME DATE</th>
                <th className="py-3 px-3 font-bold min-w-[140px]">4. CO ORDINATOR NAME</th>
                <th className="py-3 px-3 font-bold min-w-[110px]">5. MOBILE NUMBER 1</th>
                <th className="py-3 px-3 font-bold text-right min-w-[110px]">6. TOTAL AMOUNT</th>
                <th className="py-3 px-3 font-bold text-right min-w-[110px]">7. ADVANCE AMOUNT</th>
                <th className="py-3 px-3 font-bold text-right min-w-[110px]">8. BALANCE AMOUNT</th>
                <th className="py-3 px-3 font-bold text-right min-w-[120px]">9. SETTLED AMOUNT</th>
                <th className="py-3 px-3 font-bold text-right min-w-[120px]">10. DIFFERENCE</th>
                <th className="py-3 px-3 font-bold text-center w-28">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-stone-500">
                    <p className="font-semibold text-stone-700 text-sm">No program bookings found</p>
                    <p className="text-xs text-stone-400 mt-1">
                      Use the booking form above to record your first program entry.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b, index) => {
                  const isSettled = b.difference === 0;

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-amber-50/40 transition-colors group"
                    >
                      {/* 1. SL NO */}
                      <td className="py-3 px-3 text-center text-stone-500 font-mono font-medium">
                        {index + 1}
                      </td>

                      {/* 2. PROGRAME NAME */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-stone-900">{b.programeName}</div>
                        <div className="text-[11px] text-stone-400 flex items-center space-x-2 mt-0.5">
                          <span>{b.programeTime}</span>
                          <span>•</span>
                          <span>{b.noOfArtist} Artists</span>
                        </div>
                      </td>

                      {/* 3. PROGRAME DATE */}
                      <td className="py-3 px-3 font-medium text-stone-700">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          <span>{b.programeDate}</span>
                        </div>
                      </td>

                      {/* 4. CO ORDINATOR NAME */}
                      <td className="py-3 px-3 text-stone-800 font-medium">
                        {b.coordinatorName}
                      </td>

                      {/* 5. MOBILE NUMBER 1 */}
                      <td className="py-3 px-3 font-mono text-stone-700">
                        {b.mobileNumber1}
                        {b.mobileNumber2 && (
                          <span className="block text-[10px] text-stone-400 font-normal">
                            Alt: {b.mobileNumber2}
                          </span>
                        )}
                      </td>

                      {/* 6. TOTAL AMOUNT */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-stone-900">
                        ₹{b.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* 7. ADVANCE AMOUNT */}
                      <td className="py-3 px-3 text-right">
                        <span className="font-mono font-bold text-rose-700 block">
                          ₹{b.advanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <span className="text-[10px] text-stone-400 truncate max-w-[100px]" title={b.advancePaidBy}>
                            By: {b.advancePaidBy}
                          </span>
                          {b.advanceAmount > 0 && b.advancePaidBy && (
                            <MemberValidationBadge
                              memberId={b.advancePaidById}
                              memberName={b.advancePaidBy}
                              committeeMembers={committeeMembers}
                            />
                          )}
                        </div>
                      </td>

                      {/* 8. BALANCE AMOUNT */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-stone-800">
                        ₹{b.balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* 9. SETTLED AMOUNT */}
                      <td className="py-3 px-3 text-right">
                        <span className="font-mono font-bold text-emerald-700 block">
                          ₹{b.settledAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        {b.settledByMember && (
                          <span className="text-[10px] text-stone-400 block truncate max-w-[120px] ml-auto">
                            By: {b.settledByMember}
                          </span>
                        )}
                      </td>

                      {/* 10. DIFFERENCE */}
                      <td className="py-3 px-3 text-right font-mono">
                        {isSettled ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle className="w-3 h-3 mr-1 text-emerald-600" />
                            Settled
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            Pending ₹{b.difference.toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* Settle Payment Action */}
                          <button
                            type="button"
                            onClick={() => {
                              setSettleModalBooking(b);
                              setSettleAmountInput(b.settledAmount ? b.settledAmount.toString() : b.balanceAmount.toString());
                              setSettlePaymentMode('MEMBER_ADVANCE');
                              setSettleNotes(`Settlement balance for ${b.programeName}`);
                              setSettleError('');
                            }}
                            className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-bold transition cursor-pointer"
                            title="Settle Payment"
                          >
                            Settle
                          </button>

                          {/* Print Slip */}
                          <button
                            type="button"
                            onClick={() => setReceiptBooking(b)}
                            className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
                            title="Print Voucher Slip"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete (Admin Only) */}
                          {canPerformAction('DELETE') && (
                            <button
                              type="button"
                              onClick={() => setBookingToDelete(b)}
                              className="btn-delete p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Delete Booking (Admin Only)"
                              data-action="delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* OVERDRAFT CONFIRMATION WARNING MODAL */}
      {overdraftWarningModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-amber-200">
            <div className="p-5 bg-gradient-to-r from-amber-600 to-orange-600 text-white flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 text-amber-200 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-base">Advance Pool Overdraft Warning</h3>
                <p className="text-xs text-amber-100">Insufficient advance float in member wallet</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-stone-600 leading-relaxed">
                <strong>{overdraftWarningModal.memberName}</strong> currently has{' '}
                <strong className="text-emerald-700">
                  ₹{overdraftWarningModal.available.toLocaleString('en-IN')}
                </strong>{' '}
                available in their advance pool, but the requested advance disbursement is{' '}
                <strong className="text-rose-700">
                  ₹{overdraftWarningModal.required.toLocaleString('en-IN')}
                </strong>
                .
              </p>

              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="flex justify-between">
                  <span>Deficit / Overdraft Amount:</span>
                  <span className="font-bold text-rose-700">
                    ₹{(overdraftWarningModal.required - overdraftWarningModal.available).toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-[11px] text-amber-700 mt-1">
                  You can allow an overdraft entry (closing balance will reflect as negative until topped up), or cancel to top up their wallet first.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() =>
                    setOverdraftWarningModal({ isOpen: false, memberName: '', available: 0, required: 0 })
                  }
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg cursor-pointer"
                >
                  Cancel & Top-Up Wallet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOverdraftWarningModal({ isOpen: false, memberName: '', available: 0, required: 0 });
                    processSaveBooking(true); // Allow overdraft
                  }}
                  className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm cursor-pointer"
                >
                  Confirm Overdraft & Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Settle Payment */}
      {settleModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-200">
            <div className="p-5 bg-gradient-to-r from-amber-800 to-stone-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base">Record Settlement Payment</h3>
                <p className="text-xs text-amber-200/80">Program: {settleModalBooking.programeName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSettleModalBooking(null)}
                className="text-stone-300 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettlement} className="p-5 space-y-4">
              {settleError && (
                <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-200">
                  {settleError}
                </div>
              )}

              {/* Financial Snapshot */}
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Total Program Cost:</span>
                  <span className="font-semibold text-stone-900">
                    ₹{settleModalBooking.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Advance Disbursed:</span>
                  <span className="font-semibold text-rose-700">
                    ₹{settleModalBooking.advanceAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Balance Payable:</span>
                  <span className="font-bold text-stone-900">
                    ₹{settleModalBooking.balanceAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600 pt-1 border-t border-stone-200">
                  <span>Previously Settled:</span>
                  <span className="font-semibold text-emerald-700">
                    ₹{settleModalBooking.settledAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Settled Amount Input */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Settled Amount (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  required
                  placeholder="0.00"
                  value={settleAmountInput}
                  onChange={(e) => setSettleAmountInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-bold border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Payment Source */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Settled Via / Source
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettlePaymentMode('MEMBER_ADVANCE')}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                      settlePaymentMode === 'MEMBER_ADVANCE'
                        ? 'bg-amber-100 text-amber-900 border-amber-400'
                        : 'bg-stone-50 text-stone-600 border-stone-200'
                    }`}
                  >
                    Member Advance
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettlePaymentMode('CASH_DIRECT')}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                      settlePaymentMode === 'CASH_DIRECT'
                        ? 'bg-amber-100 text-amber-900 border-amber-400'
                        : 'bg-stone-50 text-stone-600 border-stone-200'
                    }`}
                  >
                    Direct Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettlePaymentMode('BANK_TRANSFER')}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                      settlePaymentMode === 'BANK_TRANSFER'
                        ? 'bg-amber-100 text-amber-900 border-amber-400'
                        : 'bg-stone-50 text-stone-600 border-stone-200'
                    }`}
                  >
                    Bank Transfer
                  </button>
                </div>
              </div>

              {/* If settled via Member Advance, select which member */}
              {settlePaymentMode === 'MEMBER_ADVANCE' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Deduct from Member Wallet:
                  </label>
                  <select
                    value={settleMemberId}
                    onChange={(e) => setSettleMemberId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                  >
                    {memberAccounts.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} (Available: ₹{m.currentBalance.toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Settlement Notes */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Settlement Notes / Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g., Final payment settled upon stage finish"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSettleModalBooking(null)}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm cursor-pointer"
                >
                  Save Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Quick Add Member */}
      {isQuickAddMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-stone-200">
            <div className="p-4 bg-stone-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-sm">Quick Add Member Account</h3>
              <button
                type="button"
                onClick={() => setIsQuickAddMemberOpen(false)}
                className="text-stone-400 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickAddMember} className="p-5 space-y-3">
              {quickAddError && (
                <div className="p-2.5 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-200">
                  {quickAddError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Member Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Vijay Kumar (Member)"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Initial Advance Float (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="e.g., 25000"
                  value={newMemberFloat}
                  onChange={(e) => setNewMemberFloat(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <p className="text-[10px] text-stone-400 mt-1">
                  Initial float allocated to this member for program advances.
                </p>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsQuickAddMemberOpen(false)}
                  className="px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg cursor-pointer"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Delete Confirmation */}
      {bookingToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-stone-200 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h3 className="font-bold text-base text-stone-900">Delete Program Booking?</h3>
            </div>
            <p className="text-xs text-stone-600">
              Are you sure you want to delete the booking for{' '}
              <strong className="text-stone-900">"{bookingToDelete.programeName}"</strong> scheduled on{' '}
              {bookingToDelete.programeDate}?
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setBookingToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteBooking}
                className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer"
              >
                Delete Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Print Voucher Preview */}
      {receiptBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-stone-200 print:shadow-none print:border-none print:m-0 print:max-w-none">
            <div className="p-4 bg-stone-900 text-white flex justify-between items-center print:hidden">
              <h3 className="font-bold text-sm">Program Booking Voucher Slip</h3>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded text-xs font-bold cursor-pointer flex items-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptBooking(null)}
                  className="text-stone-400 hover:text-white font-bold ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Slip Content */}
            <div className="p-6 space-y-4 text-stone-800">
              <div className="text-center pb-4 border-b border-stone-300">
                <h2 className="text-lg font-bold uppercase tracking-wide text-stone-900">
                  PROGRAM BOOKING VOUCHER
                </h2>
                <p className="text-xs text-stone-500">Festival Cultural Committee</p>
                <p className="text-[11px] font-mono text-stone-400 mt-1">ID: {receiptBooking.id}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">Program Name</span>
                  <span className="font-bold text-stone-900 text-sm">{receiptBooking.programeName}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">Date & Time</span>
                  <span className="font-semibold">{receiptBooking.programeDate} at {receiptBooking.programeTime}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">Coordinator</span>
                  <span className="font-semibold">{receiptBooking.coordinatorName} ({receiptBooking.mobileNumber1})</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">Timing & Artists</span>
                  <span className="font-semibold">{receiptBooking.noOfArtist} Artists ({receiptBooking.reportingTime} - {receiptBooking.endTime})</span>
                </div>
              </div>

              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-600">Total Contract Value:</span>
                  <span className="font-bold text-stone-900">₹{receiptBooking.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-rose-700">
                  <span>Advance Disbursed to Artist:</span>
                  <span className="font-bold">-₹{receiptBooking.advanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-stone-500 text-[11px] pl-3">
                  <span>Advance Paid By (Wallet):</span>
                  <span className="font-medium text-stone-800">{receiptBooking.advancePaidBy}</span>
                </div>
                <div className="flex justify-between border-t border-stone-200 pt-1.5 font-bold">
                  <span>Balance Payable:</span>
                  <span>₹{receiptBooking.balanceAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Settled Amount:</span>
                  <span className="font-bold">₹{receiptBooking.settledAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between border-t border-stone-200 pt-1.5 font-bold text-sm">
                  <span>Outstanding Difference:</span>
                  <span className={receiptBooking.difference === 0 ? 'text-emerald-700' : 'text-rose-700'}>
                    {receiptBooking.difference === 0 ? 'SETTLED (₹0.00)' : `₹${receiptBooking.difference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                  </span>
                </div>
              </div>

              <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs text-stone-500">
                <div className="border-t border-stone-300 pt-2">
                  <p className="font-semibold text-stone-700">Program Co-ordinator</p>
                  <p className="text-[10px]">Signature & Date</p>
                </div>
                <div className="border-t border-stone-300 pt-2">
                  <p className="font-semibold text-stone-700">Committee Treasurer</p>
                  <p className="text-[10px]">Authorized Signatory</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
