import React, { useState, useEffect, useMemo } from 'react';
import {
  MemberAccount,
  ExpenseLedgerEntry,
  ProgramBookingModule,
} from '../modules/ProgramBookingModule';
import {
  CommitteeMember,
  AdvancePayment,
  DirectExpense,
  ProgramBooking,
  ReceiptVoucher,
} from '../types';
import {
  formatINR,
  parseAmount,
  isMemberMatch,
  calculateMemberNetBalance,
  buildUnifiedAuditLedger,
  UnifiedAuditLedgerEntry,
} from '../utils/advanceExpense';
import { MemberLedgerModal } from './MemberLedgerModal';
import { ResetFinancialDataModal } from './ResetFinancialDataModal';
import { isCurrentUserAdmin } from '../modules/auth';
import { validateMemberExistsInCommittee } from '../utils/memberValidation';
import { MemberValidationBadge } from './MemberValidationBadge';
import {
  Wallet,
  PlusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Filter,
  Download,
  Search,
  CheckCircle,
  AlertCircle,
  Coins,
  ShieldCheck,
  User,
  Phone,
  FileSpreadsheet,
  RefreshCw,
  Clock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  BookOpen,
  Eye,
  Tag,
  RotateCcw,
  Trash2,
} from 'lucide-react';

interface MemberAdvanceLedgerViewProps {
  onNavigateToBookings: () => void;
  onNavigateToReports: () => void;
  committeeMembers?: CommitteeMember[];
  receiptVouchers?: ReceiptVoucher[];
  advances?: AdvancePayment[];
  expenses?: DirectExpense[];
  programBookings?: ProgramBooking[];
  onOpenMemberStatement?: (member: CommitteeMember) => void;
  onResetFinancialData?: () => Promise<void> | void;
  isAdmin?: boolean;
}

export const MemberAdvanceLedgerView: React.FC<MemberAdvanceLedgerViewProps> = ({
  onNavigateToBookings,
  onNavigateToReports,
  committeeMembers = [],
  receiptVouchers = [],
  advances = [],
  expenses = [],
  programBookings = [],
  onOpenMemberStatement,
  onResetFinancialData,
  isAdmin,
}) => {
  const isUserAdmin = isAdmin ?? isCurrentUserAdmin();
  const [members, setMembers] = useState<MemberAccount[]>(() =>
    ProgramBookingModule.getMemberAccounts()
  );
  const [ledgerEntries, setLedgerEntries] = useState<ExpenseLedgerEntry[]>(() =>
    ProgramBookingModule.getLedger()
  );

  // Reset financial data state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Statement modal state
  const [statementModalMember, setStatementModalMember] = useState<CommitteeMember | null>(null);

  // Modals state
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [newMemberForm, setNewMemberForm] = useState({
    name: '',
    phone: '',
    designation: '',
    initialAdvance: '',
  });
  const [addMemberError, setAddMemberError] = useState('');

  const [topUpModalMember, setTopUpModalMember] = useState<MemberAccount | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpNotes, setTopUpNotes] = useState('');
  const [topUpError, setTopUpError] = useState('');

  // Notification state
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const refreshData = () => {
    setMembers(ProgramBookingModule.getMemberAccounts());
    setLedgerEntries(ProgramBookingModule.getLedger());
  };

  const handleExecuteReset = async () => {
    setIsResetting(true);
    try {
      if (onResetFinancialData) {
        await onResetFinancialData();
      } else {
        ProgramBookingModule.resetFinancialData();
      }
      refreshData();
      showNotification('All financial records, advances, top-ups, and wallets have been reset to ₹0.00.', 'success');
    } catch (err: any) {
      showNotification('Error during reset: ' + (err?.message || String(err)), 'error');
    } finally {
      setIsResetting(false);
      setIsResetModalOpen(false);
    }
  };

  // Ledger Filter states
  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Real-time synchronization: subscribe to local storage and custom dispatch events
  useEffect(() => {
    const handleUpdate = () => {
      refreshData();
    };

    window.addEventListener('program_booking_updated', handleUpdate);
    window.addEventListener('receipt_voucher_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('program_booking_updated', handleUpdate);
      window.removeEventListener('receipt_voucher_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Strict Two-Way Synchronization with Master Data (committeeMembers is the single source of truth)
  useEffect(() => {
    const cleanName = (str: string) =>
      (str || '').replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim().toLowerCase();

    const currentAccounts = ProgramBookingModule.getMemberAccounts();

    // 1. If committeeMembers is populated, prune any member accounts that do NOT exist in Master Data!
    let prunedAccounts = currentAccounts;
    if (committeeMembers && committeeMembers.length > 0) {
      const masterIds = new Set(committeeMembers.map((cm) => cm.id));
      const masterNames = new Set(committeeMembers.map((cm) => cleanName(cm.name)));

      prunedAccounts = currentAccounts.filter((acc) => {
        const matchId = masterIds.has(acc.id);
        const matchName = masterNames.has(cleanName(acc.name));
        return matchId || matchName;
      });
    } else if (committeeMembers && committeeMembers.length === 0) {
      // Master Data is explicitly empty, clear any orphaned member accounts
      prunedAccounts = [];
    }

    let changed = prunedAccounts.length !== currentAccounts.length;
    const finalAccounts = [...prunedAccounts];

    // 2. Ensure each active committee member from Master Data is represented
    if (committeeMembers && committeeMembers.length > 0) {
      committeeMembers.forEach((cm) => {
        const found = finalAccounts.find(
          (a) => a.id === cm.id || cleanName(a.name) === cleanName(cm.name)
        );
        if (!found) {
          finalAccounts.push({
            id: cm.id,
            name: cm.name,
            phone: cm.phone,
            designation: cm.designation,
            initialAdvance: 0,
            totalTopUps: 0,
            totalDisbursed: 0,
            currentBalance: 0,
            createdAt: cm.createdAt || new Date().toISOString(),
            updatedAt: cm.updatedAt || new Date().toISOString(),
          });
          changed = true;
        } else {
          if (found.id !== cm.id) {
            found.id = cm.id;
            changed = true;
          }
          if (cm.designation && found.designation !== cm.designation) {
            found.designation = cm.designation;
            changed = true;
          }
          if (cm.phone && found.phone !== cm.phone) {
            found.phone = cm.phone;
            changed = true;
          }
        }
      });
    }

    if (changed || finalAccounts.length !== members.length) {
      ProgramBookingModule.saveMemberAccounts(finalAccounts);
      setMembers(finalAccounts);
    }
  }, [committeeMembers]);

  // Open statement for a member
  const handleOpenStatement = (m: MemberAccount) => {
    const cm =
      committeeMembers.find(
        (c) => c.id === m.id || isMemberMatch(c, m.id, m.name)
      ) || {
        id: m.id,
        name: m.name,
        fullName: m.name,
        designation: m.designation || 'Committee Member',
        designationRole: m.designation || 'Member',
        phone: m.phone || '',
        active: true,
        status: 'Active',
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        role: 'USER' as const,
      };

    if (onOpenMemberStatement) {
      onOpenMemberStatement(cm);
    } else {
      setStatementModalMember(cm);
    }
  };

  // Add Member Submission
  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddMemberError('');

    if (!newMemberForm.name.trim()) {
      setAddMemberError('Member name is required.');
      return;
    }

    // Verify member exists in committee_members Master Data
    const memberValidation = validateMemberExistsInCommittee(
      undefined,
      newMemberForm.name.trim(),
      committeeMembers
    );
    if (!memberValidation.isValid) {
      setAddMemberError(
        `Validation Error: Member "${newMemberForm.name.trim()}" does not exist in 'committee_members' Master Data. Only registered committee members can have advance float wallets.`
      );
      return;
    }

    const initAdv = parseAmount(newMemberForm.initialAdvance);
    const res = ProgramBookingModule.addMemberAccount(
      newMemberForm.name.trim(),
      initAdv,
      newMemberForm.phone.trim(),
      newMemberForm.designation.trim()
    );

    if (!res.success) {
      setAddMemberError(res.error || 'Failed to create member account.');
      return;
    }

    refreshData();
    setIsAddMemberModalOpen(false);
    setNewMemberForm({ name: '', phone: '', designation: '', initialAdvance: '' });
    showNotification(`Member wallet created for "${res.data?.name}" with ${formatINR(initAdv)} initial advance float.`);
  };

  // Top Up Advance Submission
  const handleTopUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTopUpError('');

    if (!topUpModalMember) return;
    const amt = parseAmount(topUpAmount);
    if (amt <= 0) {
      setTopUpError('Please enter a valid top-up amount greater than zero.');
      return;
    }

    const res = ProgramBookingModule.topUpMemberAdvance(
      topUpModalMember.id,
      amt,
      topUpNotes.trim() || `Replenishment of advance float for ${topUpModalMember.name}`
    );

    if (!res.success) {
      setTopUpError(res.error || 'Failed to top-up advance.');
      return;
    }

    refreshData();
    setTopUpModalMember(null);
    setTopUpAmount('');
    setTopUpNotes('');
    showNotification(`Successfully deposited ${formatINR(amt)} into ${topUpModalMember.name}'s advance wallet.`);
  };

  const handleDeleteWallet = (memberId: string, memberName: string) => {
    if (window.confirm(`Are you sure you want to remove the advance wallet for "${memberName}"?`)) {
      ProgramBookingModule.deleteMemberAccount(memberId);
      refreshData();
      showNotification(`Removed advance wallet for ${memberName}.`);
    }
  };

  // Compute unified net balance summaries for all members strictly aligned with Master Data
  const memberSummaries = useMemo(() => {
    const cleanName = (str: string) =>
      (str || '').replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim().toLowerCase();

    // STRICT MASTER DATA ALIGNMENT: Only render members that actually exist in Master Data (committeeMembers)
    const validMembers =
      committeeMembers && committeeMembers.length > 0
        ? members.filter((m) =>
            committeeMembers.some(
              (cm) => cm.id === m.id || cleanName(cm.name) === cleanName(m.name)
            )
          )
        : committeeMembers && committeeMembers.length === 0
        ? []
        : members;

    return validMembers.map((m) => {
      const net = calculateMemberNetBalance(m, {
        advances,
        expenses,
        programBookings,
        receipts: receiptVouchers,
        memberAccounts: validMembers,
        committeeMembers,
      });
      return {
        member: m,
        net,
      };
    });
  }, [members, advances, expenses, programBookings, receiptVouchers, committeeMembers]);

  // High-Level Wallet Metrics Summary across all members
  const totalAllocated = useMemo(
    () => memberSummaries.reduce((sum, item) => sum + item.net.totalCredits, 0),
    [memberSummaries]
  );
  const totalDisbursed = useMemo(
    () => memberSummaries.reduce((sum, item) => sum + item.net.totalDebits, 0),
    [memberSummaries]
  );
  const totalNetBalance = useMemo(
    () => memberSummaries.reduce((sum, item) => sum + item.net.netBalance, 0),
    [memberSummaries]
  );

  // Build the Double-Entry Expense Audit Ledger combining ALL transaction types (EXP, PRG, TXN, ADV, RCP)
  const unifiedAuditLedger = useMemo(() => {
    return buildUnifiedAuditLedger({
      selectedMemberId: selectedMemberFilter,
      members,
      committeeMembers,
      expenses,
      advances,
      receipts: receiptVouchers,
      programBookings,
      rawLedger: ledgerEntries,
    });
  }, [
    selectedMemberFilter,
    members,
    committeeMembers,
    expenses,
    advances,
    receiptVouchers,
    programBookings,
    ledgerEntries,
  ]);

  // Filtered Ledger entries based on user filter selections
  const filteredLedger = useMemo(() => {
    return unifiedAuditLedger.filter((entry) => {
      // Type Filter
      if (selectedTypeFilter !== 'all') {
        if (entry.type !== selectedTypeFilter) return false;
      }
      // Date Filter
      if (dateFrom && entry.date < dateFrom) return false;
      if (dateTo && entry.date > dateTo) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = entry.memberName.toLowerCase().includes(q);
        const matchProgram = entry.programName?.toLowerCase().includes(q) || false;
        const matchId = entry.id.toLowerCase().includes(q);
        const matchVoucher = entry.voucherNo?.toLowerCase().includes(q) || false;
        const matchNotes = entry.notes.toLowerCase().includes(q);
        if (!matchName && !matchProgram && !matchId && !matchVoucher && !matchNotes) {
          return false;
        }
      }
      return true;
    });
  }, [unifiedAuditLedger, selectedTypeFilter, dateFrom, dateTo, searchQuery]);

  // Export Unified Audit Ledger to CSV
  const handleExportCSV = () => {
    if (filteredLedger.length === 0) {
      showNotification('No transactions to export', 'error');
      return;
    }

    const headers = [
      'Transaction ID',
      'Date',
      'Member',
      'Voucher / Program',
      'Transaction Type',
      'Debit (Expense)',
      'Credit (Float)',
      'Closing Balance',
      'Audit Remarks',
    ];

    const rows = filteredLedger.map((entry) => [
      `"${entry.id}"`,
      `"${entry.date}"`,
      `"${entry.memberName.replace(/"/g, '""')}"`,
      `"${(entry.programName || entry.voucherNo || '').replace(/"/g, '""')}"`,
      `"${entry.type} (${entry.debitCredit})"`,
      entry.debitCredit === 'DEBIT' ? entry.amount : 0,
      entry.debitCredit === 'CREDIT' ? entry.amount : 0,
      entry.closingBalance,
      `"${entry.notes.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `Audit_Ledger_${selectedMemberFilter !== 'all' ? selectedMemberFilter : 'All_Members'}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Exported double-entry audit ledger to CSV');
  };

  const getTransactionTypeBadge = (type: string, debitCredit: 'DEBIT' | 'CREDIT') => {
    switch (type) {
      case 'DIRECT_EXPENSE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <ArrowUpRight className="w-3 h-3 mr-1 text-rose-500" />
            Direct Expense (Debit)
          </span>
        );
      case 'ADVANCE_DISBURSEMENT':
      case 'PROGRAM_ADVANCE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <ArrowUpRight className="w-3 h-3 mr-1 text-amber-600" />
            Program Advance (Debit)
          </span>
        );
      case 'SETTLEMENT_PAYMENT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <ArrowUpRight className="w-3 h-3 mr-1 text-purple-500" />
            Settlement Payment (Debit)
          </span>
        );
      case 'WALLET_TOPUP':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ArrowDownLeft className="w-3 h-3 mr-1 text-emerald-500" />
            Float Top-Up (Credit)
          </span>
        );
      case 'WALLET_INITIAL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Coins className="w-3 h-3 mr-1 text-blue-500" />
            Opening Float (Credit)
          </span>
        );
      case 'DIRECT_ADVANCE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            <ArrowDownLeft className="w-3 h-3 mr-1 text-teal-500" />
            Direct Advance (Credit)
          </span>
        );
      case 'RECEIPT_COLLECTION':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
            <ArrowDownLeft className="w-3 h-3 mr-1 text-cyan-500" />
            Receipt Inflow (Credit)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-700">
            {type} ({debitCredit === 'DEBIT' ? 'Debit' : 'Credit'})
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Module Navigation Tabs */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-stone-900 text-white rounded-2xl p-3.5 sm:p-6 shadow-xl border border-emerald-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center space-x-1.5 text-emerald-300 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Double-Entry Reconciliation Ledger</span>
            </div>
            <h1 className="text-sm sm:text-xl md:text-2xl font-bold tracking-tight text-white">
              Member Advance Wallets & Expense Ledger
            </h1>
          </div>

          {/* Module Navigation Tabs */}
          <div className="flex items-center space-x-2 bg-black/25 p-1.5 rounded-xl border border-white/10 self-start md:self-auto">
            <button
              type="button"
              onClick={onNavigateToBookings}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-emerald-100 hover:text-white hover:bg-white/10 transition cursor-pointer flex items-center space-x-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Program Bookings</span>
            </button>
            <button
              type="button"
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-500 text-white shadow-sm cursor-default flex items-center space-x-1.5"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Member Wallets & Ledger</span>
            </button>
            <button
              type="button"
              onClick={onNavigateToReports}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-emerald-100 hover:text-white hover:bg-white/10 transition cursor-pointer flex items-center space-x-1.5"
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
          className={`p-4 rounded-xl flex items-center justify-between shadow-md transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          <div className="flex items-center space-x-3">
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-stone-400 hover:text-stone-700 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* High-Level Wallet Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
              Total Advance Float & Inflow Allocated
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-stone-900">
              {formatINR(totalAllocated)}
            </span>
            <span className="text-xs text-stone-500 font-medium">{members.length} Members</span>
          </div>
          <p className="text-xs text-stone-400 mt-1">Initial floats + top-ups + committee advances</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
              Total Expensed / Outflows
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-rose-700">
              {formatINR(totalDisbursed)}
            </span>
            <span className="text-xs text-rose-600 font-medium">Debits</span>
          </div>
          <p className="text-xs text-stone-400 mt-1">Direct expense claims + program advances</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
              Net Balance / Advance Pool
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span
              className={`text-2xl font-bold ${
                totalNetBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatINR(totalNetBalance)}
            </span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded ${
                totalNetBalance >= 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {totalNetBalance >= 0 ? 'Surplus in Hand' : 'Reimbursement Due'}
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            {totalNetBalance >= 0
              ? 'Unspent member advance funds in hand'
              : 'Committee reimbursement payable to members'}
          </p>
        </div>
      </div>

      {/* Section 1: Member Advance Wallets & Float Cards */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900 flex items-center space-x-2">
              <Coins className="w-5 h-5 text-emerald-600" />
              <span>Member Advance Accounts & Float Cards</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Unified real-time balances synchronized across float allocations, direct expenses, and program disbursements.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refreshData}
              className="p-2 border border-stone-300 rounded-lg text-stone-600 hover:bg-stone-50 text-xs font-medium cursor-pointer"
              title="Refresh Balances"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {isUserAdmin && (
              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                className="btn-reset px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition cursor-pointer"
                title="Admin: Reset / Purge Financial Data (advances, top-ups, expenses, wallets)"
                data-action="reset"
              >
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <span>Reset / Purge Financial Data</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setAddMemberError('');
                setIsAddMemberModalOpen(true);
              }}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Member Wallet</span>
            </button>
          </div>
        </div>

        {/* Wallets Grid */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {memberSummaries.map(({ member, net }) => {
            const isReimbursementDue = net.netBalance < -0.001;
            const isSurplus = net.netBalance > 0.001;

            return (
              <div
                key={member.id}
                className="bg-stone-50/70 hover:bg-stone-50 rounded-xl p-4 border border-stone-200 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-stone-900 text-sm flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-stone-500" />
                        <span>{member.name}</span>
                      </h3>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {member.designation || 'Committee Member'}{' '}
                        {member.phone && `• ${member.phone}`}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                        isReimbursementDue
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : isSurplus
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-stone-100 text-stone-800 border-stone-200'
                      }`}
                    >
                      {isReimbursementDue
                        ? 'Reimbursement Due'
                        : isSurplus
                        ? 'Surplus in Hand'
                        : 'Fully Settled'}
                    </span>
                  </div>

                  {/* Financial Breakdown Table */}
                  <div className="mt-4 pt-3 border-t border-stone-200/80 space-y-1.5 text-xs">
                    <div className="flex justify-between text-stone-500">
                      <span>Initial Float:</span>
                      <span className="font-medium text-stone-800">
                        {formatINR(net.initialFloat)}
                      </span>
                    </div>

                    {net.walletTopUps > 0 && (
                      <div className="flex justify-between text-stone-500">
                        <span>Top-Up Deposits:</span>
                        <span className="font-medium text-emerald-700">
                          +{formatINR(net.walletTopUps)}
                        </span>
                      </div>
                    )}

                    {net.directAdvances > 0 && (
                      <div className="flex justify-between text-stone-500">
                        <span>Committee Advances:</span>
                        <span className="font-medium text-emerald-700">
                          +{formatINR(net.directAdvances)}
                        </span>
                      </div>
                    )}

                    {net.receiptsCollected > 0 && (
                      <div className="flex justify-between text-stone-500">
                        <span>Receipts Collected:</span>
                        <span className="font-medium text-teal-700">
                          +{formatINR(net.receiptsCollected)}
                        </span>
                      </div>
                    )}

                    {net.programAdvances > 0 && (
                      <div className="flex justify-between text-stone-500">
                        <span>Program Advances Paid:</span>
                        <span className="font-medium text-rose-700">
                          -{formatINR(net.programAdvances)}
                        </span>
                      </div>
                    )}

                    {net.directExpenses > 0 && (
                      <div className="flex justify-between text-stone-500">
                        <span>Direct Expenses Claimed:</span>
                        <span className="font-medium text-rose-700">
                          -{formatINR(net.directExpenses)}
                        </span>
                      </div>
                    )}

                    {net.programSettlements > 0 && (
                      <div className="flex justify-between text-stone-500">
                        <span>Program Settlements Paid:</span>
                        <span className="font-medium text-rose-700">
                          -{formatINR(net.programSettlements)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-stone-700 font-semibold pt-1 border-t border-stone-200/60">
                      <span>Total Expensed / Paid:</span>
                      <span className="text-rose-700">
                        -{formatINR(net.totalDebits)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Unified Net Balance Footer Metric */}
                <div className="mt-4 pt-3 border-t border-stone-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider block font-bold">
                      {isReimbursementDue
                        ? 'Reimbursement Due'
                        : isSurplus
                        ? 'Available Advance'
                        : 'Net Balance'}
                    </span>
                    <span
                      className={`text-base font-bold ${
                        net.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {formatINR(net.netBalance)}
                    </span>
                    <div className="text-[10px] text-stone-400 font-medium">
                      In-Hand Float: {formatINR(net.inHandFloatCash)}
                      {net.directExpenses > 0 && (
                        <span> | Direct Exp: {formatINR(net.directExpenses)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenStatement(member)}
                      className="px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1 transition cursor-pointer"
                      title="View Detailed Running Balance Statement & Transaction Timeline"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                      <span>Statement</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTopUpModalMember(member);
                        setTopUpAmount('');
                        setTopUpNotes('');
                        setTopUpError('');
                      }}
                      className="px-2.5 py-1.5 bg-white border border-stone-300 hover:border-emerald-500 hover:text-emerald-700 text-stone-700 rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1 transition cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Top Up</span>
                    </button>
                    {isUserAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteWallet(member.id, member.name)}
                        className="btn-delete p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer border border-stone-200 hover:border-rose-300"
                        title="Remove / Delete Member Wallet"
                        data-action="delete"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Double-Entry Expense Audit Ledger */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-stone-900 flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <span>Double-Entry Expense Audit Ledger</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Chronological, immutable audit trail of every float allocation, direct expense claim, and program disbursement.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border border-stone-300 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Ledger Filter Toolbar */}
        <div className="p-4 bg-stone-50/60 border-b border-stone-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search voucher, program, member..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Member Filter */}
          <div>
            <select
              value={selectedMemberFilter}
              onChange={(e) => setSelectedMemberFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Members</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Transaction Types</option>
              <option value="DIRECT_EXPENSE">Direct Expenses (EXP-*)</option>
              <option value="ADVANCE_DISBURSEMENT">Program Advance Disbursements (PRG-*)</option>
              <option value="WALLET_TOPUP">Float Top-Ups (TXN-*)</option>
              <option value="WALLET_INITIAL">Opening Floats</option>
              <option value="DIRECT_ADVANCE">Committee Advances (ADV-*)</option>
              <option value="RECEIPT_COLLECTION">Receipt Inflows (RCP-*)</option>
              <option value="SETTLEMENT_PAYMENT">Program Settlements</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              title="From Date"
            />
          </div>

          {/* Date To */}
          <div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
              title="To Date"
            />
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-100/80 text-stone-700 border-b border-stone-200">
                <th className="py-2.5 px-3 font-semibold w-12 text-center">#</th>
                <th className="py-2.5 px-3 font-semibold">Txn / Voucher ID</th>
                <th className="py-2.5 px-3 font-semibold">Date</th>
                <th className="py-2.5 px-3 font-semibold">Member</th>
                <th className="py-2.5 px-3 font-semibold">Description / Purpose</th>
                <th className="py-2.5 px-3 font-semibold">Transaction Type</th>
                <th className="py-2.5 px-3 font-semibold text-right">Debit (Expense)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Credit (Float)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Closing Balance</th>
                <th className="py-2.5 px-3 font-semibold">Audit Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-stone-500">
                    <p className="font-semibold text-stone-700 text-sm">No ledger entries found</p>
                    <p className="text-xs text-stone-400 mt-1">
                      Transactions will automatically appear here when direct expenses, program advances, or wallet deposits occur.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLedger.map((entry, idx) => {
                  const isDebit = entry.debitCredit === 'DEBIT';

                  return (
                    <tr key={entry.id + '-' + idx} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-center text-stone-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-[11px] text-stone-700 font-semibold block">
                          {entry.voucherNo || entry.id}
                        </span>
                        {entry.sourceModule && (
                          <span className="text-[10px] text-stone-400 font-medium">
                            {entry.sourceModule}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-stone-600 whitespace-nowrap">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-stone-400 inline" />
                          <span>{entry.date}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-stone-900">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{entry.memberName}</span>
                          <MemberValidationBadge
                            memberId={entry.memberId}
                            memberName={entry.memberName}
                            committeeMembers={committeeMembers}
                          />
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-stone-700">
                        <span className="font-semibold text-stone-800 block">
                          {entry.programName || entry.notes}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {getTransactionTypeBadge(entry.type, entry.debitCredit)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                        {isDebit ? formatINR(entry.amount) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        {!isDebit ? formatINR(entry.amount) : '—'}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-bold ${
                          entry.closingBalance >= 0 ? 'text-stone-900' : 'text-rose-700'
                        }`}
                      >
                        {formatINR(entry.closingBalance)}
                      </td>
                      <td className="py-2.5 px-3 text-stone-600 max-w-xs truncate" title={entry.notes}>
                        {entry.notes}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Member Account */}
      {isAddMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-200">
            <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-base">Add Member Advance Wallet</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMemberModalOpen(false)}
                className="text-emerald-100 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMemberSubmit} className="p-5 space-y-4">
              {addMemberError && (
                <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-200">
                  {addMemberError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Select Registered Committee Member (Master Data) *
                </label>
                {committeeMembers && committeeMembers.length > 0 ? (
                  <select
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white mb-2"
                    onChange={(e) => {
                      const selected = committeeMembers.find((m) => m.id === e.target.value);
                      if (selected) {
                        setNewMemberForm({
                          ...newMemberForm,
                          name: selected.name,
                          designation: selected.designation || '',
                          phone: selected.phone || '',
                        });
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>-- Choose Committee Member from Master Data --</option>
                    {committeeMembers.filter((m) => m.active).map((cm) => (
                      <option key={cm.id} value={cm.id}>
                        {cm.name} ({cm.designation || 'Member'}) {cm.phone ? `• ${cm.phone}` : ''}
                      </option>
                    ))}
                  </select>
                ) : null}
                <input
                  type="text"
                  required
                  placeholder="e.g., Harikrishnan K."
                  value={newMemberForm.name}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Only committee members registered in Master Data ('committee_members') can be allocated advance float wallets.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Designation / Role
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Convenor"
                    value={newMemberForm.designation}
                    onChange={(e) =>
                      setNewMemberForm({ ...newMemberForm, designation: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="10 digits"
                    value={newMemberForm.phone}
                    onChange={(e) =>
                      setNewMemberForm({ ...newMemberForm, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Initial Advance Float (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="e.g., 50000"
                  value={newMemberForm.initialAdvance}
                  onChange={(e) =>
                    setNewMemberForm({ ...newMemberForm, initialAdvance: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  Initial cash/bank float handed over to this member for booking expenses.
                </p>
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm cursor-pointer"
                >
                  Create Wallet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Top-up Member Advance */}
      {topUpModalMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-stone-200">
            <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <PlusCircle className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-base">Top-Up Advance Float</h3>
              </div>
              <button
                type="button"
                onClick={() => setTopUpModalMember(null)}
                className="text-emerald-100 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTopUpSubmit} className="p-5 space-y-4">
              {topUpError && (
                <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-lg border border-rose-200">
                  {topUpError}
                </div>
              )}

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-500">Member:</span>
                  <span className="font-bold text-stone-800">{topUpModalMember.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Current Balance:</span>
                  <span className="font-bold text-emerald-700">
                    {formatINR(topUpModalMember.currentBalance)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Additional Deposit Amount (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="100"
                  placeholder="e.g., 10000"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Notes / Source of Funds
                </label>
                <input
                  type="text"
                  placeholder="e.g., Cheque No. 44102 / Bank Withdrawal"
                  value={topUpNotes}
                  onChange={(e) => setTopUpNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setTopUpModalMember(null)}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm cursor-pointer"
                >
                  Deposit to Wallet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Detailed Statement & Running Balance Modal */}
      {statementModalMember && (
        <MemberLedgerModal
          isOpen={Boolean(statementModalMember)}
          member={statementModalMember}
          advances={advances}
          expenses={expenses}
          receipts={receiptVouchers}
          programBookings={programBookings}
          onClose={() => setStatementModalMember(null)}
        />
      )}

      {/* Reset / Purge Financial Data Modal */}
      <ResetFinancialDataModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirmReset={handleExecuteReset}
        isLoading={isResetting}
      />
    </div>
  );
};
