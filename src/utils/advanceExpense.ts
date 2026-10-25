import {
  AdvancePayment,
  DirectExpense,
  CommitteeMember,
  MemberBalanceSummary,
  ProgramBooking,
  ReceiptVoucher,
} from '../types';
import {
  ProgramBookingModule,
  MemberAccount,
  ExpenseLedgerEntry,
} from '../modules/ProgramBookingModule';
import { loadLocalReceiptVouchers } from './storage';

/**
 * Robust numerical parser for currency values:
 * Handles null/undefined, numbers, strings containing commas, spaces, or currency symbols (₹, $).
 * Prevents negative zero (-0) artifacts.
 */
export function parseAmount(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') {
    if (isNaN(val) || Math.abs(val) < 0.0001) return 0;
    return val;
  }
  const cleanStr = String(val).replace(/₹|,|\s/g, '').trim();
  const parsed = parseFloat(cleanStr);
  if (isNaN(parsed) || Math.abs(parsed) < 0.0001) return 0;
  return parsed;
}

/**
 * Clean zero-dependency Indian Rupee currency formatter:
 * Example: 100000 -> "₹1,00,000.00", -2500 -> "-₹2,500.00"
 * Strictly prevents negative zero artifacts (-₹0.00).
 */
export function formatINR(val: number | string | undefined | null): string {
  const num = parseAmount(val);
  if (Math.abs(num) < 0.0001) return '₹0.00';

  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const parts = absNum.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Indian Rupee grouping: last 3 digits, then groups of 2
  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }

  const formatted = `₹${integerPart}.${decimalPart}`;
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Robust matcher for committee member identity:
 * Matches by ID or name (handling designation prefixes/suffixes in parentheses like 'JISHNU KV (Joint Convenor)').
 */
export function isMemberMatch(
  member: { id?: string; name: string; designation?: string; phone?: string } | string,
  candidateId?: string,
  candidateName?: string
): boolean {
  if (!member) return false;

  const memberId = typeof member === 'string' ? '' : member.id || '';
  const memberName = typeof member === 'string' ? member : member.name || '';

  // 1. Direct ID match
  if (candidateId && memberId && candidateId.trim().toLowerCase() === memberId.trim().toLowerCase()) {
    return true;
  }

  const clean = (str: string) =>
    str
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .trim()
      .toLowerCase();

  // 2. Check if candidateId matches a ProgramBookingModule wallet member whose ID or name matches
  if (candidateId) {
    try {
      const walletMembers = ProgramBookingModule.getMemberAccounts();
      const matchedWallet = walletMembers.find(
        (m) => m.id.toLowerCase() === candidateId.trim().toLowerCase()
      );
      if (matchedWallet) {
        if (memberId && matchedWallet.id.toLowerCase() === memberId.toLowerCase()) return true;
        const cleanWalletName = clean(matchedWallet.name);
        const cleanMember = clean(memberName);
        if (
          cleanWalletName &&
          cleanMember &&
          (cleanWalletName === cleanMember ||
            cleanWalletName.includes(cleanMember) ||
            cleanMember.includes(cleanWalletName))
        ) {
          return true;
        }
      }
    } catch {
      // fallback
    }
  }

  if (!candidateName) return false;

  const cleanCandidate = clean(candidateName);
  const cleanMember = clean(memberName);

  if (!cleanCandidate || !cleanMember) return false;

  // Exact clean name match
  if (cleanCandidate === cleanMember) return true;

  // Full string case-insensitive match
  if (candidateName.trim().toLowerCase() === memberName.trim().toLowerCase()) return true;

  // Prefix check: e.g. "JISHNU KV" vs "JISHNU KV (Joint Convenor)"
  if (cleanCandidate.startsWith(cleanMember) || cleanMember.startsWith(cleanCandidate)) {
    return true;
  }

  if (cleanCandidate.includes(cleanMember) || cleanMember.includes(cleanCandidate)) {
    return true;
  }

  return false;
}

/**
 * Generate unique Advance Voucher Number (e.g. ADV-YYYY-XXXX)
 */
export function generateAdvanceVoucherNo(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const year = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ADV-${year}-${randomSuffix}`;
}

/**
 * Generate unique Expense Voucher Number (e.g. EXP-YYYY-XXXX)
 */
export function generateExpenseVoucherNo(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const year = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `EXP-${year}-${randomSuffix}`;
}

export interface MemberNetBalanceResult {
  memberId: string;
  memberName: string;
  designation?: string;
  phone?: string;
  active?: boolean;
  // Credits (Inflow / Float)
  initialFloat: number;
  walletTopUps: number;
  directAdvances: number;
  receiptsCollected: number;
  totalCredits: number;
  // Debits (Outflow / Expenses)
  directExpenses: number;
  programAdvances: number;
  programSettlements: number;
  totalDebits: number;
  // Net Calculations
  netBalance: number; // totalCredits - totalDebits
  reimbursementDue: number; // If netBalance < 0: Math.abs(netBalance), else 0
  availableAdvance: number; // If netBalance > 0: netBalance, else 0
  inHandFloatCash: number; // Float in hand: (initialFloat + topUps + directAdvances + receipts) - (programAdvances + settlements)
  directExpensesPendingSettlement: number; // directExpenses
  status: 'settled' | 'surplus' | 'reimbursement_due';
}

export interface CalculationOptions {
  advances?: AdvancePayment[];
  expenses?: DirectExpense[];
  programBookings?: ProgramBooking[];
  receipts?: ReceiptVoucher[];
  memberAccounts?: MemberAccount[];
  committeeMembers?: CommitteeMember[];
}

/**
 * Centralized Unified Balance Calculation Engine
 * Computes:
 * - totalCredits = float allocations, cash top-ups, direct advances, and receipts collected.
 * - totalDebits = direct expenses claimed + program booking advances + program settlements.
 * - netBalance = totalCredits - totalDebits.
 * - reimbursementDue = if netBalance < 0: Math.abs(netBalance), else 0.
 *
 * Guarantees that Member Float Cards, Double-Entry Audit Ledger, and Detailed Statements never diverge.
 */
export function calculateMemberNetBalance(
  memberIdentifier: string | { id?: string; name: string; designation?: string; phone?: string; active?: boolean },
  options?: CalculationOptions
): MemberNetBalanceResult {
  const bookings =
    options?.programBookings !== undefined
      ? options.programBookings
      : ProgramBookingModule.getBookings();

  const receiptList =
    options?.receipts !== undefined
      ? options.receipts
      : loadLocalReceiptVouchers();

  const advances = options?.advances || [];
  const expenses = options?.expenses || [];
  const memberAccounts =
    options?.memberAccounts || ProgramBookingModule.getMemberAccounts();
  const committeeMembers = options?.committeeMembers || [];

  // Resolve member identity
  let memberId = '';
  let memberName = '';
  let designation = '';
  let phone = '';
  let active = true;

  if (typeof memberIdentifier === 'string') {
    memberId = memberIdentifier;
    // Attempt lookup in memberAccounts or committeeMembers
    const foundAcc = memberAccounts.find(
      (m) => m.id === memberIdentifier || isMemberMatch(m, memberIdentifier, memberIdentifier)
    );
    const foundCm = committeeMembers.find(
      (c) => c.id === memberIdentifier || isMemberMatch(c, memberIdentifier, memberIdentifier)
    );

    memberName = foundAcc?.name || foundCm?.name || memberIdentifier;
    designation = foundAcc?.designation || foundCm?.designation || 'Committee Member';
    phone = foundAcc?.phone || foundCm?.phone || '';
    active = foundCm?.active !== undefined ? foundCm.active : true;
  } else {
    memberId = memberIdentifier.id || '';
    memberName = memberIdentifier.name || '';
    designation = memberIdentifier.designation || 'Committee Member';
    phone = memberIdentifier.phone || '';
    active = memberIdentifier.active !== undefined ? memberIdentifier.active : true;
  }

  const targetMember = { id: memberId, name: memberName, designation, phone, active };

  // 1. Find Member Wallet Account (Opening float and top-ups)
  const walletAcc = memberAccounts.find(
    (m) => m.id === memberId || isMemberMatch(m, memberId, memberName)
  );

  const initialFloat = parseAmount(walletAcc?.initialAdvance);
  const walletTopUps = parseAmount(walletAcc?.totalTopUps);

  // 2. Direct Advances from Committee
  const memberAdvances = advances.filter((a) =>
    isMemberMatch(targetMember, a.member_id, a.member_name)
  );
  const directAdvances = memberAdvances.reduce(
    (sum, a) => sum + parseAmount(a.amount),
    0
  );

  // 3. Receipts collected on behalf of Committee
  const memberReceipts = receiptList.filter((r) =>
    isMemberMatch(targetMember, undefined, r.amount_collected_by)
  );
  const receiptsCollected = memberReceipts.reduce(
    (sum, r) => sum + parseAmount(r.amount_received),
    0
  );

  // Total Credits (Inflow / Float)
  const totalCredits = initialFloat + walletTopUps + directAdvances + receiptsCollected;

  // 4. Direct Expenses claimed by Member (EXP-*)
  const memberExpenses = expenses.filter((e) =>
    isMemberMatch(targetMember, e.member_id, e.claimed_by)
  );
  const directExpenses = memberExpenses.reduce(
    (sum, e) => sum + parseAmount(e.amount),
    0
  );

  // 5. Program Booking Artist Advances disbursed by Member (PRG-*)
  const memberProgramAdvances = bookings.filter(
    (b) =>
      parseAmount(b.advanceAmount) > 0 &&
      isMemberMatch(targetMember, b.advancePaidById, b.advancePaidBy)
  );
  const programAdvances = memberProgramAdvances.reduce(
    (sum, b) => sum + parseAmount(b.advanceAmount),
    0
  );

  // 6. Program Booking Balance Settlements paid by Member
  const memberProgramSettlements = bookings.filter(
    (b) =>
      parseAmount(b.settledAmount) > 0 &&
      isMemberMatch(targetMember, undefined, b.settledByMember)
  );
  const programSettlements = memberProgramSettlements.reduce(
    (sum, b) => sum + parseAmount(b.settledAmount),
    0
  );

  // Total Debits (Outflow / Expenses)
  const totalDebits = directExpenses + programAdvances + programSettlements;

  // Net Calculations
  let netBalance = totalCredits - totalDebits;
  if (Math.abs(netBalance) < 0.0001) netBalance = 0;

  const reimbursementDue = netBalance < -0.0001 ? Math.abs(netBalance) : 0;
  const availableAdvance = netBalance > 0.0001 ? netBalance : 0;

  // Cash float in-hand (excluding direct un-reimbursed expense claims)
  let inHandFloatCash =
    initialFloat + walletTopUps + directAdvances + receiptsCollected - (programAdvances + programSettlements);
  if (Math.abs(inHandFloatCash) < 0.0001) inHandFloatCash = 0;

  let status: 'settled' | 'surplus' | 'reimbursement_due' = 'settled';
  if (netBalance > 0.0001) {
    status = 'surplus';
  } else if (netBalance < -0.0001) {
    status = 'reimbursement_due';
  } else {
    status = 'settled';
  }

  return {
    memberId,
    memberName,
    designation,
    phone,
    active,
    initialFloat,
    walletTopUps,
    directAdvances,
    receiptsCollected,
    totalCredits,
    directExpenses,
    programAdvances,
    programSettlements,
    totalDebits,
    netBalance,
    reimbursementDue,
    availableAdvance,
    inHandFloatCash,
    directExpensesPendingSettlement: directExpenses,
    status,
  };
}

/**
 * Calculate Member Financial Summary for Member Ledger Modal
 * Consumes the unified balance calculation engine.
 */
export function calculateMemberSummary(
  member: CommitteeMember,
  advances: AdvancePayment[],
  expenses: DirectExpense[],
  programBookings?: ProgramBooking[],
  receipts?: ReceiptVoucher[]
): MemberBalanceSummary {
  const net = calculateMemberNetBalance(member, {
    advances,
    expenses,
    programBookings,
    receipts,
  });

  const bookings =
    programBookings !== undefined ? programBookings : ProgramBookingModule.getBookings();
  const receiptList =
    receipts !== undefined ? receipts : loadLocalReceiptVouchers();

  const memberAdvances = advances.filter((a) =>
    isMemberMatch(member, a.member_id, a.member_name)
  );
  const memberReceipts = receiptList.filter((r) =>
    isMemberMatch(member, undefined, r.amount_collected_by)
  );
  const memberExpenses = expenses.filter((e) =>
    isMemberMatch(member, e.member_id, e.claimed_by)
  );
  const memberProgramAdvances = bookings.filter(
    (b) =>
      parseAmount(b.advanceAmount) > 0 &&
      isMemberMatch(member, b.advancePaidById, b.advancePaidBy)
  );
  const memberProgramSettlements = bookings.filter(
    (b) =>
      parseAmount(b.settledAmount) > 0 &&
      isMemberMatch(member, undefined, b.settledByMember)
  );

  return {
    member_id: member.id,
    member_name: member.name,
    designation: member.designation,
    phone: member.phone,
    active: member.active,
    total_advances: net.totalCredits,
    total_expenses: net.totalDebits,
    balance_in_hand: net.netBalance,
    status:
      net.netBalance > 0.0001
        ? 'due_from_member'
        : net.netBalance < -0.0001
        ? 'reimbursement_due'
        : 'settled',
    advances_count: memberAdvances.length + (net.initialFloat > 0 ? 1 : 0),
    expenses_count:
      memberExpenses.length + memberProgramAdvances.length + memberProgramSettlements.length,
    program_advances_count: memberProgramAdvances.length + memberProgramSettlements.length,
    program_advances_amount: net.programAdvances + net.programSettlements,
    receipts_count: memberReceipts.length,
    receipts_amount: net.receiptsCollected,
    direct_advances_amount: net.directAdvances + net.initialFloat + net.walletTopUps,
    direct_expenses_amount: net.directExpenses,
  };
}

export interface LedgerTimelineEntry {
  id: string;
  date: string;
  timestamp: number;
  sourceModule: 'Program Booking' | 'Direct Expense' | 'Wallet Inflow' | 'Receipt' | string;
  type: 'Advance' | 'Expense' | 'Program Advance' | 'Program Settlement' | 'Receipt' | string;
  txn_direction: 'Credit' | 'Debit';
  voucher_no: string;
  description: string;
  remarks?: string;
  payment_mode?: string;
  bill_reference?: string;
  recorded_by: string;
  credit_received: number; // Inflow (Cr)
  debit_spent: number;     // Outflow (Dr)
  amount: number;
  running_balance: number;
}

/**
 * Build chronological timeline of a member's advances, receipts, expenses, and program bookings
 */
export function buildMemberLedgerTimeline(
  member: CommitteeMember | string,
  advances: AdvancePayment[],
  expenses: DirectExpense[],
  programBookings?: ProgramBooking[],
  receipts?: ReceiptVoucher[]
): LedgerTimelineEntry[] {
  const memberObj: { id?: string; name: string; designation?: string; phone?: string } =
    typeof member === 'string' ? { name: member } : member;

  const bookings =
    programBookings !== undefined ? programBookings : ProgramBookingModule.getBookings();

  const receiptList =
    receipts !== undefined ? receipts : loadLocalReceiptVouchers();

  const walletAccounts = ProgramBookingModule.getMemberAccounts();
  const walletAcc = walletAccounts.find((m) =>
    isMemberMatch(memberObj, m.id, m.name)
  );

  const mAdvances = advances.filter((a) =>
    isMemberMatch(memberObj, a.member_id, a.member_name)
  );
  const mReceipts = receiptList.filter((r) =>
    isMemberMatch(memberObj, undefined, r.amount_collected_by)
  );
  const mExpenses = expenses.filter((e) =>
    isMemberMatch(memberObj, e.member_id, e.claimed_by)
  );

  const mProgramAdvances = bookings.filter(
    (b) =>
      parseAmount(b.advanceAmount) > 0 &&
      isMemberMatch(memberObj, b.advancePaidById, b.advancePaidBy)
  );

  const mProgramSettlements = bookings.filter(
    (b) =>
      parseAmount(b.settledAmount) > 0 &&
      isMemberMatch(memberObj, undefined, b.settledByMember)
  );

  type RawItem = {
    id: string;
    date: string;
    timestamp: number;
    sourceModule: 'Program Booking' | 'Direct Expense' | 'Wallet Inflow' | 'Receipt';
    type: 'Advance' | 'Expense' | 'Program Advance' | 'Program Settlement' | 'Receipt' | 'Opening Float';
    txn_direction: 'Credit' | 'Debit';
    voucher_no: string;
    description: string;
    remarks?: string;
    payment_mode?: string;
    bill_reference?: string;
    recorded_by: string;
    credit: number;
    debit: number;
    amount: number;
  };

  const raw: RawItem[] = [];

  // 0. Opening Wallet Float if created with initial float
  if (walletAcc && parseAmount(walletAcc.initialAdvance) > 0) {
    const initAmt = parseAmount(walletAcc.initialAdvance);
    const initDate = walletAcc.createdAt ? walletAcc.createdAt.split('T')[0] : '2026-01-01';
    raw.push({
      id: `WALLET-INIT-${walletAcc.id}`,
      date: initDate,
      timestamp: new Date(walletAcc.createdAt || initDate).getTime() || 0,
      sourceModule: 'Wallet Inflow',
      type: 'Opening Float',
      txn_direction: 'Credit',
      voucher_no: `FLT-${walletAcc.id.substring(0, 8)}`,
      description: 'Opening Float Allocation for Program & Festival Operations',
      remarks: 'Initial advance float credited to member wallet',
      payment_mode: 'Cash / Committee Allocation',
      recorded_by: 'Committee Treasury',
      credit: initAmt,
      debit: 0,
      amount: initAmt,
    });
  }

  // 1. Advance Disbursements received from Committee (Credit / Wallet Inflow)
  mAdvances.forEach((a) => {
    const amt = parseAmount(a.amount);
    raw.push({
      id: a.id,
      date: a.date,
      timestamp: new Date(a.date).getTime() || 0,
      sourceModule: 'Wallet Inflow',
      type: 'Advance',
      txn_direction: 'Credit',
      voucher_no: a.voucher_no,
      description: a.purpose || 'Advance Disbursement from Committee',
      remarks: a.remarks,
      payment_mode: a.payment_mode,
      recorded_by: a.paid_by_user,
      credit: amt,
      debit: 0,
      amount: amt,
    });
  });

  // 2. Receipts directly collected by Member on behalf of Committee (Credit / Receipt Inflow)
  mReceipts.forEach((r) => {
    const amt = parseAmount(r.amount_received);
    const vNo = r.receipt_no
      ? (r.receipt_no.startsWith('RCP') ? r.receipt_no : `RCP-${r.receipt_no}`)
      : r.transaction_no;
    raw.push({
      id: r.id,
      date: r.date,
      timestamp: new Date(r.created_at || r.date).getTime() || 0,
      sourceModule: 'Receipt',
      type: 'Receipt',
      txn_direction: 'Credit',
      voucher_no: vNo,
      description: `Festival Receipt Collection – ${r.name} (${r.house_name || r.place || 'Onampilly'})`,
      remarks: `Payee: ${r.name} | Mode: ${r.payment_mode} | Ref: ${r.transaction_no}`,
      payment_mode: r.payment_mode,
      bill_reference: `Receipt #${r.receipt_no}`,
      recorded_by: r.amount_collected_by || 'Volunteer',
      credit: amt,
      debit: 0,
      amount: amt,
    });
  });

  // 3. Direct Expenses claimed / spent by Member (Debit / Outflow)
  mExpenses.forEach((e) => {
    const amt = parseAmount(e.amount);
    raw.push({
      id: e.id,
      date: e.date,
      timestamp: new Date(e.date).getTime() || 0,
      sourceModule: 'Direct Expense',
      type: 'Expense',
      txn_direction: 'Debit',
      voucher_no: e.voucher_no,
      description: `${e.expense_type_name}: ${e.expense_name}`,
      remarks: e.remarks,
      bill_reference: e.bill_reference,
      recorded_by: e.recorded_by,
      credit: 0,
      debit: amt,
      amount: amt,
    });
  });

  // 4. Program Booking Advances Disbursed to Artist (Debit / Program Booking Outflow)
  mProgramAdvances.forEach((b) => {
    const amt = parseAmount(b.advanceAmount);
    raw.push({
      id: `${b.id}-adv`,
      date: b.programeDate,
      timestamp: new Date(b.createdAt || b.programeDate).getTime() || 0,
      sourceModule: 'Program Booking',
      type: 'Program Advance',
      txn_direction: 'Debit',
      voucher_no: b.id,
      description: `Advance Disbursed to Artist – ${b.programeName}`,
      remarks: `Coordinator: ${b.coordinatorName} (${b.mobileNumber1}) | Artists: ${b.noOfArtist} | Timing: ${b.reportingTime} - ${b.endTime} | Contract: ${formatINR(b.totalAmount)}`,
      payment_mode: 'Program Booking Advance',
      bill_reference: `Voucher: ${b.id}`,
      recorded_by: b.coordinatorName ? `Coordinator ${b.coordinatorName}` : 'Cultural Committee',
      credit: 0,
      debit: amt,
      amount: amt,
    });
  });

  // 5. Program Booking Balance Settlements paid by Member (Debit / Program Settlement Outflow)
  mProgramSettlements.forEach((b) => {
    const amt = parseAmount(b.settledAmount);
    const settleDate = b.updatedAt ? b.updatedAt.split('T')[0] : b.programeDate;
    raw.push({
      id: `${b.id}-settle`,
      date: settleDate,
      timestamp: (new Date(b.updatedAt || b.createdAt || b.programeDate).getTime() || 0) + 1000,
      sourceModule: 'Program Booking',
      type: 'Program Settlement',
      txn_direction: 'Debit',
      voucher_no: `${b.id}-SETTLE`,
      description: `Program Balance Settlement – ${b.programeName}`,
      remarks: `Settled balance payment for ${b.programeName} (Mode: ${b.settledPaymentMode || 'Direct'})`,
      payment_mode: b.settledPaymentMode || 'Settlement',
      bill_reference: `Voucher: ${b.id}`,
      recorded_by: b.coordinatorName ? `Coordinator ${b.coordinatorName}` : 'Cultural Committee',
      credit: 0,
      debit: amt,
      amount: amt,
    });
  });

  // Sort chronologically ascending
  raw.sort((a, b) => a.timestamp - b.timestamp);

  let currentRunningBalance = 0;
  const entries: LedgerTimelineEntry[] = raw.map((item) => {
    currentRunningBalance = currentRunningBalance + item.credit - item.debit;
    if (Math.abs(currentRunningBalance) < 0.0001) currentRunningBalance = 0;

    return {
      id: item.id,
      date: item.date,
      timestamp: item.timestamp,
      sourceModule: item.sourceModule,
      type: item.type,
      txn_direction: item.txn_direction,
      voucher_no: item.voucher_no,
      description: item.description,
      remarks: item.remarks,
      payment_mode: item.payment_mode,
      bill_reference: item.bill_reference,
      recorded_by: item.recorded_by,
      credit_received: item.credit,
      debit_spent: item.debit,
      amount: item.amount,
      running_balance: currentRunningBalance,
    };
  });

  return entries;
}

/**
 * Unified Double-Entry Audit Ledger Entry Structure
 */
export interface UnifiedAuditLedgerEntry {
  id: string;
  date: string;
  timestamp: number;
  memberId: string;
  memberName: string;
  programId?: string;
  programName?: string;
  type:
    | 'DIRECT_EXPENSE'
    | 'ADVANCE_DISBURSEMENT'
    | 'WALLET_TOPUP'
    | 'WALLET_INITIAL'
    | 'DIRECT_ADVANCE'
    | 'RECEIPT_COLLECTION'
    | 'SETTLEMENT_PAYMENT'
    | 'WALLET_REFUND';
  debitCredit: 'DEBIT' | 'CREDIT';
  amount: number;
  closingBalance: number;
  notes: string;
  sourceModule: string;
  voucherNo: string;
}

/**
 * Builds the comprehensive Double-Entry Expense Audit Ledger
 * Queries ALL transaction collections:
 * - Direct Expenses (EXP-*)
 * - Program Advance Disbursements (PRG-*)
 * - Float Top-Ups / Adjustments (TXN-*)
 * - Direct Advances (ADV-*)
 * - Receipt Inflows (RCP-*)
 *
 * Sequentially computes the running balance column in chronological order:
 * Formula: Previous Running Balance + (Credit - Debit)
 */
export function buildUnifiedAuditLedger(options: {
  selectedMemberId?: string;
  members: MemberAccount[];
  committeeMembers?: CommitteeMember[];
  expenses?: DirectExpense[];
  advances?: AdvancePayment[];
  receipts?: ReceiptVoucher[];
  programBookings?: ProgramBooking[];
  rawLedger?: ExpenseLedgerEntry[];
}): UnifiedAuditLedgerEntry[] {
  const {
    selectedMemberId,
    members,
    committeeMembers = [],
    expenses = [],
    advances = [],
    receipts = [],
    programBookings = [],
    rawLedger = [],
  } = options;

  const rawItems: Omit<UnifiedAuditLedgerEntry, 'closingBalance'>[] = [];

  // Helper to test if a record belongs to the selected member
  const memberFilterCheck = (mId?: string, mName?: string) => {
    if (!selectedMemberId || selectedMemberId === 'all') return true;
    const target = members.find((m) => m.id === selectedMemberId) ||
      committeeMembers.find((c) => c.id === selectedMemberId) || {
        id: selectedMemberId,
        name: selectedMemberId,
      };
    return isMemberMatch(target, mId, mName);
  };

  // 1. Program Booking Module Raw Ledger entries (PRG-* Disbursements, Top-Ups, Wallet Initials)
  const processedPrgIds = new Set<string>();

  rawLedger.forEach((entry) => {
    if (!memberFilterCheck(entry.memberId, entry.memberName)) return;

    if (entry.programId) {
      processedPrgIds.add(entry.programId);
    }

    rawItems.push({
      id: entry.id,
      date: entry.date,
      timestamp: new Date(entry.date || entry.createdAt).getTime() || 0,
      memberId: entry.memberId,
      memberName: entry.memberName,
      programId: entry.programId,
      programName: entry.programName,
      type: entry.type,
      debitCredit: entry.debitCredit,
      amount: parseAmount(entry.amount),
      notes: entry.notes,
      sourceModule:
        entry.type === 'ADVANCE_DISBURSEMENT' || entry.type === 'SETTLEMENT_PAYMENT'
          ? 'Program Booking'
          : 'Wallet Float',
      voucherNo: entry.programId || entry.id,
    });
  });

  // Fallback: If program bookings exist that are not yet in rawLedger
  programBookings.forEach((b) => {
    if (processedPrgIds.has(b.id)) return;
    const advAmt = parseAmount(b.advanceAmount);
    if (advAmt <= 0) return;
    if (!memberFilterCheck(b.advancePaidById, b.advancePaidBy)) return;

    rawItems.push({
      id: `${b.id}-adv`,
      date: b.programeDate,
      timestamp: new Date(b.createdAt || b.programeDate).getTime() || 0,
      memberId: b.advancePaidById || '',
      memberName: b.advancePaidBy || 'Committee Member',
      programId: b.id,
      programName: b.programeName,
      type: 'ADVANCE_DISBURSEMENT',
      debitCredit: 'DEBIT',
      amount: advAmt,
      notes: `Advance disbursement for ${b.programeName} (${b.noOfArtist} artists)`,
      sourceModule: 'Program Booking',
      voucherNo: b.id,
    });
  });

  // 2. Direct Expenses (EXP-*)
  expenses.forEach((e) => {
    if (!memberFilterCheck(e.member_id, e.claimed_by)) return;

    const amt = parseAmount(e.amount);
    rawItems.push({
      id: e.id || e.voucher_no,
      date: e.date,
      timestamp: new Date(e.date).getTime() || 0,
      memberId: e.member_id || '',
      memberName: e.claimed_by,
      programId: e.voucher_no,
      programName: `${e.expense_type_name}: ${e.expense_name}`,
      type: 'DIRECT_EXPENSE',
      debitCredit: 'DEBIT',
      amount: amt,
      notes: e.remarks || `Direct expense claim recorded by ${e.recorded_by}`,
      sourceModule: 'Direct Expense',
      voucherNo: e.voucher_no,
    });
  });

  // 3. Direct Committee Advances (ADV-*)
  advances.forEach((a) => {
    if (!memberFilterCheck(a.member_id, a.member_name)) return;

    const amt = parseAmount(a.amount);
    rawItems.push({
      id: a.id || a.voucher_no,
      date: a.date,
      timestamp: new Date(a.date).getTime() || 0,
      memberId: a.member_id,
      memberName: a.member_name,
      programId: a.voucher_no,
      programName: a.purpose || 'Committee Advance Allocation',
      type: 'DIRECT_ADVANCE',
      debitCredit: 'CREDIT',
      amount: amt,
      notes: a.remarks || `Advance paid via ${a.payment_mode} by ${a.paid_by_user}`,
      sourceModule: 'Wallet Inflow',
      voucherNo: a.voucher_no,
    });
  });

  // 4. Receipt Inflows (RCP-*)
  receipts.forEach((r) => {
    if (!memberFilterCheck(undefined, r.amount_collected_by)) return;

    const amt = parseAmount(r.amount_received);
    const vNo = r.receipt_no
      ? (r.receipt_no.startsWith('RCP') ? r.receipt_no : `RCP-${r.receipt_no}`)
      : r.transaction_no;

    rawItems.push({
      id: r.id,
      date: r.date,
      timestamp: new Date(r.created_at || r.date).getTime() || 0,
      memberId: '',
      memberName: r.amount_collected_by || 'Volunteer',
      programId: vNo,
      programName: `Festival Receipt – ${r.name}`,
      type: 'RECEIPT_COLLECTION',
      debitCredit: 'CREDIT',
      amount: amt,
      notes: `Payee: ${r.name} | Mode: ${r.payment_mode} | Ref: ${r.transaction_no}`,
      sourceModule: 'Receipt',
      voucherNo: vNo,
    });
  });

  // Sort chronologically ascending
  rawItems.sort((a, b) => a.timestamp - b.timestamp);

  // Compute running balance sequentially: Previous Running Balance + (Credit - Debit)
  let currentRunningBalance = 0;
  const auditEntries: UnifiedAuditLedgerEntry[] = rawItems.map((item) => {
    if (item.debitCredit === 'CREDIT') {
      currentRunningBalance += item.amount;
    } else {
      currentRunningBalance -= item.amount;
    }

    if (Math.abs(currentRunningBalance) < 0.0001) currentRunningBalance = 0;

    return {
      ...item,
      closingBalance: currentRunningBalance,
    };
  });

  return auditEntries;
}
