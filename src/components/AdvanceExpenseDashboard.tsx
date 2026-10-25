import React, { useState, useMemo, useEffect } from 'react';
import {
  TEMPLE_BACKGROUNDS,
  getStoredBackgroundId,
  setStoredBackgroundId,
} from '../utils/backgrounds';
import {
  CommitteeMember,
  ExpenseType,
  AdvancePayment,
  DirectExpense,
  Setting,
  ProgramBooking,
  ReceiptVoucher,
  SettlementRecord,
  Commitment,
} from '../types';
import { formatINR } from '../utils/advanceExpense';
import {
  computeSystemBalances,
  MemberRunningBalance,
} from '../utils/balanceCalculation';
import {
  TrendingUp,
  TrendingDown,
  Coins,
  Receipt,
  Scale,
  Users,
  Search,
  Filter,
  Download,
  Calendar,
  BookOpen,
  PlusCircle,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Trash2,
  Lock,
  Landmark,
  ShieldCheck,
  CheckCheck,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { canPerformAction, isCurrentUserTreasurer } from '../modules/auth';
import { MemberValidationBadge } from './MemberValidationBadge';

interface AdvanceExpenseDashboardProps {
  committeeMembers: CommitteeMember[];
  expenseTypes: ExpenseType[];
  advances: AdvancePayment[];
  expenses: DirectExpense[];
  receipts?: ReceiptVoucher[];
  programBookings?: ProgramBooking[];
  settlements?: SettlementRecord[];
  commitments?: Commitment[];
  setting: Setting;
  onNavigateTab: (tab: 'advances' | 'expenses' | 'members' | 'master' | 'receipts' | 'commitments') => void;
  onPayAdvanceToMember: (member: CommitteeMember) => void;
  onAddExpenseForMember: (member: CommitteeMember) => void;
  onViewMemberLedger: (member: CommitteeMember) => void;
  onDeleteAdvance: (id: string) => void;
  onDeleteExpense: (id: string) => void;
  onDownloadStandaloneHtml: () => void;
  onOpenSettlementModal?: (memberId?: string) => void;
}

export const AdvanceExpenseDashboard: React.FC<AdvanceExpenseDashboardProps> = ({
  committeeMembers,
  expenseTypes,
  advances,
  expenses,
  receipts = [],
  programBookings = [],
  settlements = [],
  commitments = [],
  setting,
  onNavigateTab,
  onPayAdvanceToMember,
  onAddExpenseForMember,
  onViewMemberLedger,
  onDeleteAdvance,
  onDeleteExpense,
  onDownloadStandaloneHtml,
  onOpenSettlementModal,
}) => {
  // Filters for Unified Recent Transactions Feed
  const [searchTerm, setSearchTerm] = useState('');
  const [feedType, setFeedType] = useState<'all' | 'advance' | 'expense' | 'settlement'>('all');
  const [selectedMemberFilter, setSelectedMemberFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Search & Filters for Committee Member Ledger Table
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState<'all' | 'pending' | 'settled'>('all');
  const [memberRoleFilter, setMemberRoleFilter] = useState('all');

  // Temple Background Customization
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

  // Compute System Balances through the double-entry balance calculation engine
  const systemBalances = useMemo(() => {
    return computeSystemBalances(receipts, settlements, expenses, advances, committeeMembers);
  }, [receipts, settlements, expenses, advances, committeeMembers]);

  // Total Pledges Committed vs Realized Collections
  const totalCommitted = useMemo(() => {
    return commitments.reduce((sum, c) => sum + (Number(c.amount_committed) || 0), 0);
  }, [commitments]);

  const outstandingPledges = useMemo(() => {
    return Math.max(0, totalCommitted - systemBalances.grossFestivalCollection);
  }, [totalCommitted, systemBalances.grossFestivalCollection]);

  const pledgeCollectionPercent = useMemo(() => {
    if (totalCommitted <= 0) return 100;
    return Math.min(100, Math.round((systemBalances.grossFestivalCollection / totalCommitted) * 100));
  }, [totalCommitted, systemBalances.grossFestivalCollection]);

  // Filtered Member Running Balances for the Committee Member Ledger Table
  const filteredMemberLedgers = useMemo<MemberRunningBalance[]>(() => {
    return systemBalances.memberBalances.filter((m) => {
      const q = memberSearchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        m.memberName.toLowerCase().includes(q) ||
        m.designationRole.toLowerCase().includes(q) ||
        m.phone.includes(q);

      const matchesStatus =
        memberStatusFilter === 'all' ||
        (memberStatusFilter === 'pending' && m.currentBalanceInHand > 0) ||
        (memberStatusFilter === 'settled' && m.currentBalanceInHand === 0);

      const matchesRole =
        memberRoleFilter === 'all' ||
        m.designationRole.toLowerCase() === memberRoleFilter.toLowerCase();

      return matchesSearch && matchesStatus && (m.totalPublicCollections > 0 || m.totalHandedOverToTreasurer > 0 || m.currentBalanceInHand > 0 || !memberSearchTerm);
    });
  }, [systemBalances.memberBalances, memberSearchTerm, memberStatusFilter, memberRoleFilter]);

  // Unified Transactions Feed: Combines Advances, Expenses, Program Bookings, and Handover Settlements
  type FeedItem = {
    id: string;
    itemType: 'advance' | 'expense' | 'settlement';
    voucher_no: string;
    date: string;
    memberName: string;
    memberId: string;
    categoryOrMode: string;
    description: string;
    billRef?: string;
    amount: number;
    recordedBy: string;
    timestamp: number;
    rawAdvance?: AdvancePayment;
    rawExpense?: DirectExpense;
    rawSettlement?: SettlementRecord;
  };

  const unifiedTransactions = useMemo<FeedItem[]>(() => {
    const list: FeedItem[] = [];

    // Advances
    advances.forEach((a) => {
      list.push({
        id: a.id,
        itemType: 'advance',
        voucher_no: a.voucher_no,
        date: a.date,
        memberName: a.member_name,
        memberId: a.member_id,
        categoryOrMode: a.payment_mode,
        description: a.purpose,
        amount: Number(a.amount) || 0,
        recordedBy: a.paid_by_user,
        timestamp: new Date(a.date).getTime() || 0,
        rawAdvance: a,
      });
    });

    // Expenses
    expenses.forEach((e) => {
      list.push({
        id: e.id,
        itemType: 'expense',
        voucher_no: e.voucher_no,
        date: e.date,
        memberName: e.claimed_by,
        memberId: e.member_id,
        categoryOrMode: e.expense_type_name,
        description: e.expense_name,
        billRef: e.bill_reference,
        amount: Number(e.amount) || 0,
        recordedBy: e.recorded_by,
        timestamp: new Date(e.date).getTime() || 0,
        rawExpense: e,
      });
    });

    // Settlements (Member cash handed over to Treasurer)
    settlements.forEach((s) => {
      list.push({
        id: s.id,
        itemType: 'settlement',
        voucher_no: s.settlementNo,
        date: s.date,
        memberName: s.memberName,
        memberId: s.memberId,
        categoryOrMode: `Vault Handover (${s.paymentMode})`,
        description: s.remarks || `Settlement of public collections to Treasurer Central Vault`,
        billRef: s.transactionRef || s.referenceNo,
        amount: Number(s.amount) || 0,
        recordedBy: s.receivedByTreasurerName || s.receivedByTreasurer || 'Treasurer',
        timestamp: new Date(s.date).getTime() || 0,
        rawSettlement: s,
      });
    });

    // Program Bookings advances / settlements
    programBookings.forEach((b) => {
      if ((Number(b.advanceAmount) || 0) > 0) {
        list.push({
          id: `${b.id}-adv`,
          itemType: 'expense',
          voucher_no: b.id,
          date: b.programeDate,
          memberName: b.advancePaidBy,
          memberId: b.advancePaidById || '',
          categoryOrMode: 'Program Advance',
          description: `Advance Disbursed to Artist – ${b.programeName}`,
          billRef: b.id,
          amount: Number(b.advanceAmount) || 0,
          recordedBy: b.coordinatorName ? `Coordinator ${b.coordinatorName}` : 'Cultural Committee',
          timestamp: new Date(b.createdAt || b.programeDate).getTime() || 0,
        });
      }
    });

    // Sort descending by timestamp
    list.sort((a, b) => b.timestamp - a.timestamp);

    // Apply filters
    return list.filter((item) => {
      if (feedType !== 'all' && item.itemType !== feedType) return false;
      if (selectedMemberFilter !== 'all' && item.memberId !== selectedMemberFilter) return false;
      if (startDate && item.date < startDate) return false;
      if (endDate && item.date > endDate) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          item.voucher_no.toLowerCase().includes(q) ||
          item.memberName.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.categoryOrMode.toLowerCase().includes(q) ||
          (item.billRef && item.billRef.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [advances, expenses, settlements, programBookings, feedType, selectedMemberFilter, startDate, endDate, searchTerm]);

  // Export Unified Feed to CSV
  const handleExportFeedCSV = () => {
    const headers = [
      'Type',
      'Voucher / Settlement No',
      'Date',
      'Committee Member',
      'Category / Mode',
      'Description / Purpose',
      'Supporting Bill / Ref',
      'Amount (INR)',
      'Recorded By',
    ];

    const rows = unifiedTransactions.map((item) => [
      item.itemType === 'advance'
        ? 'Advance Payment (Cr)'
        : item.itemType === 'settlement'
        ? 'Treasurer Handover (Vault Cr)'
        : 'Direct Expense (Dr)',
      item.voucher_no,
      item.date,
      `"${item.memberName.replace(/"/g, '""')}"`,
      `"${item.categoryOrMode.replace(/"/g, '""')}"`,
      `"${item.description.replace(/"/g, '""')}"`,
      `"${(item.billRef || '').replace(/"/g, '""')}"`,
      item.amount,
      `"${item.recordedBy.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['"Unified Transactions & Settlements Register"', headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Festival_Accounts_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-7">
      {/* Hero Banner: Central Treasury & Member Float Overview */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-amber-500/40 bg-stone-950/75 backdrop-blur-md">
        <div className="relative z-10 p-3.5 sm:p-6 md:p-8 text-white space-y-2.5 sm:space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-sm">
              <Landmark className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
              <span>Onampilly Kavadi Sangam • Kalady, Kerala</span>
            </div>
          </div>

          <div className="max-w-3xl">
            <h1 className="text-base sm:text-2xl md:text-3xl font-black text-amber-50 tracking-tight drop-shadow-md">
              Central Treasury, Member Float & Settlement Desk
            </h1>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-3">
            {/* Primary Action: Settle Member Cash to Treasurer */}
            <button
              type="button"
              onClick={() => onOpenSettlementModal?.()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-stone-950 font-black text-xs shadow-lg transition flex items-center gap-2 cursor-pointer border border-emerald-300/40"
            >
              <Landmark className="w-4 h-4 text-stone-950" />
              <span>Settle Member Cash to Treasurer</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('receipts')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Receipt className="w-4 h-4" />
              <span>Collection Receipt Desk</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('expenses')}
              className="px-4 py-2.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 text-stone-100 font-extrabold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer border border-stone-700/80 backdrop-blur-sm"
            >
              <Receipt className="w-4 h-4 text-amber-400" />
              <span>Record Direct Expense</span>
            </button>

            <button
              type="button"
              onClick={onDownloadStandaloneHtml}
              className="px-3.5 py-2.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 text-amber-300 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer border border-amber-400/30 backdrop-blur-sm"
              title="Download self-contained single-file HTML executable"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Download Standalone index.html</span>
            </button>
          </div>
        </div>

        {/* Ambient Emblem */}
        <div className="absolute right-4 bottom-[-20px] text-amber-400/5 select-none pointer-events-none text-9xl">
          🔱
        </div>
      </div>

      {/* TOP KPI EXECUTIVE SUMMARY CARDS (Core Requirement 5) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Treasurer Central Fund (Vault) */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm relative overflow-hidden flex flex-col justify-between dashboard-tile-zoom cursor-pointer">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-900">
              Treasurer Central Fund (Vault)
            </span>
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs">
              <Landmark className="w-5 h-5 text-emerald-700" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-black ${
                systemBalances.treasurerCentralFund >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatINR(systemBalances.treasurerCentralFund)}
            </div>
            <p className="text-[11px] text-stone-500 font-medium mt-1 leading-tight">
              Verified collections handed over minus direct expenses disbursed
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-500 font-medium">Vault Liquid Total</span>
            <span className="font-bold text-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Reconciled
            </span>
          </div>
        </div>

        {/* Card 2: Floating Cash (Unsettled with Members) */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm relative overflow-hidden flex flex-col justify-between dashboard-tile-zoom cursor-pointer">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900">
              Floating Cash (Unsettled)
            </span>
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200 shadow-xs">
              <Coins className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-700">
              {formatINR(systemBalances.floatingCashUnsettled)}
            </div>
            <p className="text-[11px] text-stone-500 font-medium mt-1 leading-tight">
              Held in-hand across {systemBalances.pendingMembersCount} committee collector(s)
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-500 font-medium">Pending Turnover</span>
            <button
              type="button"
              onClick={() => onOpenSettlementModal?.()}
              className="text-amber-800 hover:text-amber-900 font-black flex items-center gap-1 cursor-pointer"
            >
              <span>Settle Now</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Card 3: Gross Festival Collection */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm relative overflow-hidden flex flex-col justify-between dashboard-tile-zoom cursor-pointer">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-600">
              Gross Festival Collection
            </span>
            <div className="p-2.5 rounded-2xl bg-teal-50 text-teal-800 border border-teal-200 shadow-xs">
              <Receipt className="w-5 h-5 text-teal-700" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-stone-900">
              {formatINR(systemBalances.grossFestivalCollection)}
            </div>
            <p className="text-[11px] text-stone-500 font-medium mt-1 leading-tight">
              Total sum of all {receipts.length} receipt vouchers issued
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-500 font-medium">Verified Receipts</span>
            <span className="font-bold text-teal-800">{receipts.length} issued</span>
          </div>
        </div>

        {/* Card 4: Total Expenses Incurred */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm relative overflow-hidden flex flex-col justify-between dashboard-tile-zoom cursor-pointer">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-900">
              Total Expenses Incurred
            </span>
            <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-800 border border-rose-200 shadow-xs">
              <TrendingDown className="w-5 h-5 text-rose-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-700">
              {formatINR(systemBalances.totalExpensesDisbursed)}
            </div>
            <p className="text-[11px] text-stone-500 font-medium mt-1 leading-tight">
              {expenses.length} approved direct expense vouchers
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-500 font-medium">Active Categories</span>
            <span className="font-bold text-rose-800">
              {systemBalances.expensesByCategory.length} categories
            </span>
          </div>
        </div>
      </div>

      {/* ADVANCED REPORTING DASHBOARD VISUALIZATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visualization A: Monthly Income vs Expenses */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4 flex flex-col justify-between dashboard-tile-zoom">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-stone-900">
                    Monthly Income vs Expenses
                  </h3>
                  <p className="text-[11px] text-stone-500">Receipts vs Direct Vouchers</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-3">
              {systemBalances.monthlyBreakdown.length === 0 ? (
                <div className="text-center py-8 text-stone-400 text-xs">
                  No monthly transaction data available yet.
                </div>
              ) : (
                systemBalances.monthlyBreakdown.map((item) => {
                  const maxVal = Math.max(item.collections, item.expenses, 1);
                  const collWidth = Math.min(100, Math.round((item.collections / maxVal) * 100));
                  const expWidth = Math.min(100, Math.round((item.expenses / maxVal) * 100));

                  return (
                    <div key={item.month} className="space-y-1.5 p-3 rounded-2xl bg-stone-50 border border-stone-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-stone-800">{item.month}</span>
                        <span
                          className={`font-black text-[11px] px-2 py-0.5 rounded-full ${
                            item.net >= 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          Net {item.net >= 0 ? '+' : ''}{formatINR(item.net)}
                        </span>
                      </div>

                      {/* Collections Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-stone-600">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                            Collections
                          </span>
                          <span className="font-bold text-emerald-800">{formatINR(item.collections)}</span>
                        </div>
                        <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${collWidth}%` }}
                          />
                        </div>
                      </div>

                      {/* Expenses Bar */}
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[10px] text-stone-600">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                            Expenses
                          </span>
                          <span className="font-bold text-rose-700">{formatINR(item.expenses)}</span>
                        </div>
                        <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-rose-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${expWidth}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 text-[11px] text-stone-500 flex justify-between">
            <span>Calculated from verified Firestore records</span>
            <span className="font-bold text-stone-700">Auto-Reconciled</span>
          </div>
        </div>

        {/* Visualization B: Breakdown of Expenses by Category */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4 flex flex-col justify-between dashboard-tile-zoom">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-50 text-orange-800">
                  <PieChart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-stone-900">
                    Expenditure by Category
                  </h3>
                  <p className="text-[11px] text-stone-500">Distribution of Festival Costs</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-3">
              {systemBalances.expensesByCategory.length === 0 ? (
                <div className="text-center py-8 text-stone-400 text-xs">
                  No expense records logged yet.
                </div>
              ) : (
                systemBalances.expensesByCategory.map((cat, idx) => {
                  const colors = [
                    'bg-amber-500',
                    'bg-emerald-600',
                    'bg-teal-600',
                    'bg-rose-500',
                    'bg-indigo-500',
                    'bg-cyan-500',
                  ];
                  const barColor = colors[idx % colors.length];

                  return (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-stone-800 truncate max-w-[180px]">
                          {cat.category}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-stone-900">{formatINR(cat.amount)}</span>
                          <span className="text-[10px] font-bold text-stone-400">({cat.percentage}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`${barColor} h-full rounded-full transition-all duration-500`}
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-500 font-medium">Total Spent</span>
            <span className="font-black text-stone-900">
              {formatINR(systemBalances.totalExpensesDisbursed)}
            </span>
          </div>
        </div>

        {/* Visualization C: Total Collections & Outstanding Balances Summary */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4 flex flex-col justify-between dashboard-tile-zoom">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-50 text-teal-800">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-stone-900">
                    Collections & Outstanding Pledges
                  </h3>
                  <p className="text-[11px] text-stone-500">Donor Pledge Target Realization</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-3">
              {/* Target Meter */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-emerald-950">Collection Realization</span>
                  <span className="text-sm font-black text-emerald-800">
                    {pledgeCollectionPercent}%
                  </span>
                </div>
                <div className="w-full bg-emerald-200/60 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${pledgeCollectionPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-emerald-900/80 font-medium pt-1">
                  <span>Collected: {formatINR(systemBalances.grossFestivalCollection)}</span>
                  <span>Target: {formatINR(totalCommitted)}</span>
                </div>
              </div>

              {/* Outstanding Breakdown Cards */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 dashboard-tile-zoom cursor-pointer">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">
                    Total Pledged
                  </span>
                  <span className="text-sm font-black text-stone-800 mt-1 block">
                    {formatINR(totalCommitted)}
                  </span>
                  <span className="text-[10px] text-stone-500">{commitments.length} donors</span>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 dashboard-tile-zoom cursor-pointer">
                  <span className="text-[10px] uppercase font-bold text-amber-700 block">
                    Outstanding
                  </span>
                  <span className="text-sm font-black text-amber-900 mt-1 block">
                    {formatINR(outstandingPledges)}
                  </span>
                  <span className="text-[10px] text-amber-700">Pending collections</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => onNavigateTab('commitments')}
              className="text-stone-700 hover:text-stone-900 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>View Pledges Register</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('receipts')}
              className="text-emerald-700 hover:text-emerald-800 font-black flex items-center gap-1 cursor-pointer"
            >
              <span>Issue Receipt</span>
              <PlusCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* COMMITTEE MEMBER LEDGER TABLE (Core Requirement 5) */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-stone-900">
                Committee Member Ledger & In-Hand Balances
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                Double-Entry Inter-User Balance
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Real-time filterable status of public collections in hand vs settled turnovers to Treasurer Central Vault
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                placeholder="Search member name, phone..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white"
              />
            </div>

            {/* Status Filter */}
            <select
              value={memberStatusFilter}
              onChange={(e) => setMemberStatusFilter(e.target.value as 'all' | 'pending' | 'settled')}
              className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-medium bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="all">All Settlement Statuses</option>
              <option value="pending">Pending Handover (In-Hand &gt; ₹0)</option>
              <option value="settled">Settled (₹0 In-Hand)</option>
            </select>

            {/* Role Filter */}
            <select
              value={memberRoleFilter}
              onChange={(e) => setMemberRoleFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-medium bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="Convenor">Convenor</option>
              <option value="Joint Convenor">Joint Convenor</option>
              <option value="Treasurer">Treasurer</option>
              <option value="Rakshadhikari">Rakshadhikari</option>
              <option value="Member">Member</option>
              <option value="Additional Member">Additional Member</option>
            </select>

            {/* Settle to Treasurer Shortcut */}
            <button
              type="button"
              onClick={() => onOpenSettlementModal?.()}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>Settle Desk</span>
            </button>
          </div>
        </div>

        {filteredMemberLedgers.length === 0 ? (
          <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-300 space-y-2">
            <Users className="w-8 h-8 text-stone-400 mx-auto" />
            <p className="text-xs font-bold text-stone-700">No committee members matched the criteria.</p>
            <p className="text-[11px] text-stone-500">
              Go to Master Data to register committee members or issue vouchers tagged to members.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-stone-200">
            <table className="w-full text-left text-xs text-stone-800">
              <thead className="bg-stone-100/90 text-stone-700 uppercase text-[10px] font-black tracking-wider border-b border-stone-200">
                <tr>
                  <th className="py-3 px-3.5">Member Name</th>
                  <th className="py-3 px-3">Designation Role</th>
                  <th className="py-3 px-3 text-right">Total Public Collections (₹)</th>
                  <th className="py-3 px-3 text-right">Total Handed Over to Treasurer (₹)</th>
                  <th className="py-3 px-3 text-right font-black">Current Balance In-Hand (₹)</th>
                  <th className="py-3 px-3 text-center">Settlement Status</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredMemberLedgers.map((member) => {
                  const hasInHandCash = member.currentBalanceInHand > 0;
                  const memberObj = committeeMembers.find(
                    (cm) => cm.id === member.memberId || cm.name === member.memberName
                  );

                  return (
                    <tr
                      key={member.memberId}
                      className={
                        hasInHandCash
                          ? 'bg-amber-50/20 hover:bg-amber-50/40 transition'
                          : 'hover:bg-stone-50/60 transition'
                      }
                    >
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="font-extrabold text-stone-900 text-sm">
                          {member.memberName}
                        </div>
                        {member.phone && (
                          <div className="text-[11px] text-stone-500 font-mono">
                            +91 {member.phone}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-stone-100 text-stone-700 border border-stone-200">
                          {member.designationRole}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-stone-900 whitespace-nowrap">
                        {formatINR(member.totalPublicCollections)}
                        <div className="text-[10px] text-stone-400 font-normal">
                          {member.receiptsCount} voucher(s)
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-800 whitespace-nowrap">
                        {formatINR(member.totalHandedOverToTreasurer)}
                        <div className="text-[10px] text-stone-400 font-normal">
                          {member.settlementsCount} handover(s)
                        </div>
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-black text-sm whitespace-nowrap ${
                          hasInHandCash ? 'text-amber-700' : 'text-emerald-800'
                        }`}
                      >
                        {formatINR(member.currentBalanceInHand)}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {hasInHandCash ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1 shadow-xs">
                            <Clock className="w-3 h-3 text-amber-700" />
                            Pending Handover
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                            <CheckCheck className="w-3 h-3 text-emerald-700" />
                            Settled
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Settle to Treasurer button */}
                          <button
                            type="button"
                            onClick={() => onOpenSettlementModal?.(member.memberId)}
                            disabled={!hasInHandCash}
                            className={`px-2.5 py-1 rounded-lg font-black text-[11px] transition flex items-center gap-1 cursor-pointer ${
                              hasInHandCash
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                                : 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed opacity-60'
                            }`}
                            title={hasInHandCash ? `Settle ${member.memberName}'s in-hand balance to Treasurer Central Vault` : 'Account fully settled'}
                          >
                            <Landmark className="w-3 h-3" />
                            <span>Settle to Treasurer</span>
                          </button>

                          {/* View Statement button */}
                          {memberObj && (
                            <button
                              type="button"
                              onClick={() => onViewMemberLedger(memberObj)}
                              className="p-1.5 rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition cursor-pointer"
                              title="View Complete Member Statement"
                            >
                              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
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

      {/* UNIFIED TRANSACTIONS & SETTLEMENTS FEED */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-stone-900">
              Unified Transactions & Handover Feed
            </h3>
            <p className="text-xs text-stone-500">
              Chronological log of member advances, spent direct expenses, and treasurer vault handovers
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
                placeholder="Search voucher, member..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white"
              />
            </div>

            {/* Feed Type Filter */}
            <select
              value={feedType}
              onChange={(e) => setFeedType(e.target.value as 'all' | 'advance' | 'expense' | 'settlement')}
              className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-medium bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="all">All Transaction Types</option>
              <option value="settlement">Treasurer Handovers (Vault Cr)</option>
              <option value="advance">Advances Only (Float Cr)</option>
              <option value="expense">Direct Expenses Only (Dr)</option>
            </select>

            {/* Member Filter */}
            <select
              value={selectedMemberFilter}
              onChange={(e) => setSelectedMemberFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-medium bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              <option value="all">All Members</option>
              {committeeMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>

            {/* Date Range: Start */}
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              title="Filter from date"
              className="px-2 py-1.5 rounded-xl border border-stone-300 text-xs bg-white text-stone-700 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />

            {/* Date Range: End */}
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              title="Filter to date"
              className="px-2 py-1.5 rounded-xl border border-stone-300 text-xs bg-white text-stone-700 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />

            {/* Clear Filters */}
            {(searchTerm || feedType !== 'all' || selectedMemberFilter !== 'all' || startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFeedType('all');
                  setSelectedMemberFilter('all');
                  setStartDate('');
                  setEndDate('');
                }}
                className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold transition cursor-pointer"
              >
                Reset
              </button>
            )}

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportFeedCSV}
              className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-stone-300"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {unifiedTransactions.length === 0 ? (
          <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-300">
            <p className="text-xs text-stone-500">No transactions match your current search/filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-stone-200">
            <table className="w-full text-left text-xs text-stone-800">
              <thead className="bg-stone-100/90 text-stone-700 uppercase text-[10px] font-black tracking-wider border-b border-stone-200">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Voucher / Handover Ref</th>
                  <th className="py-3 px-3">Committee Member</th>
                  <th className="py-3 px-3">Description / Purpose</th>
                  <th className="py-3 px-3 text-right">Amount (INR)</th>
                  <th className="py-3 px-3">Recorded By</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {unifiedTransactions.map((item) => {
                  const m = committeeMembers.find(
                    (cm) => cm.id === item.memberId || cm.name === item.memberName
                  );
                  const isMemberInvalid = !m && item.itemType !== 'settlement';

                  return (
                    <tr
                      key={item.id}
                      className={
                        isMemberInvalid
                          ? 'bg-rose-50/50 hover:bg-rose-50/80 transition border-l-4 border-l-rose-500'
                          : item.itemType === 'settlement'
                          ? 'bg-emerald-50/20 hover:bg-emerald-50/40 transition'
                          : 'hover:bg-amber-50/20 transition'
                      }
                    >
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-stone-600">
                        {item.date}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {item.itemType === 'advance' ? (
                          <span className="px-2 py-0.5 rounded-md font-extrabold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Advance (Cr)
                          </span>
                        ) : item.itemType === 'settlement' ? (
                          <span className="px-2 py-0.5 rounded-md font-extrabold text-[10px] bg-teal-100 text-teal-800 border border-teal-300">
                            Vault Handover
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md font-extrabold text-[10px] bg-amber-100 text-amber-900 border border-amber-300">
                            Expense (Dr)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-mono font-bold text-stone-900">
                        {item.voucher_no}
                        {item.billRef && (
                          <div className="text-[10px] font-sans font-normal text-stone-500">
                            Ref: {item.billRef}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-stone-900">{item.memberName}</span>
                          <MemberValidationBadge
                            memberId={item.memberId}
                            memberName={item.memberName}
                            committeeMembers={committeeMembers}
                          />
                        </div>
                        {m && <div className="text-[10px] text-stone-500">{m.designationRole || m.designation}</div>}
                      </td>
                      <td className="py-3 px-3 text-stone-800 max-w-xs">
                        <div className="font-medium">{item.description}</div>
                        <div className="text-[10px] text-stone-400 font-sans mt-0.5">
                          {item.categoryOrMode}
                        </div>
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-black text-sm whitespace-nowrap ${
                          item.itemType === 'advance'
                            ? 'text-emerald-800'
                            : item.itemType === 'settlement'
                            ? 'text-teal-800'
                            : 'text-amber-900'
                        }`}
                      >
                        {formatINR(item.amount)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-stone-600 text-[11px]">
                        {item.recordedBy}
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
                          {canPerformAction('DELETE') && item.itemType !== 'settlement' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (item.itemType === 'advance') {
                                  if (confirm(`Delete advance voucher ${item.voucher_no}?`)) {
                                    onDeleteAdvance(item.id);
                                  }
                                } else {
                                  if (confirm(`Delete expense voucher ${item.voucher_no}?`)) {
                                    onDeleteExpense(item.id);
                                  }
                                }
                              }}
                              className="btn-delete p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition cursor-pointer"
                              title="Delete Record (Admin Only)"
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
