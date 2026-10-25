import {
  ReceiptVoucher,
  SettlementRecord,
  DirectExpense,
  AdvancePayment,
  CommitteeMember,
} from '../types';
import { isMemberMatch } from './advanceExpense';

export interface MemberRunningBalance {
  memberId: string;
  memberName: string;
  designationRole: string;
  phone: string;
  totalPublicCollections: number;
  totalHandedOverToTreasurer: number;
  currentBalanceInHand: number; // in-hand floating cash
  settlementStatus: 'Settled' | 'Pending Handover';
  receiptsCount: number;
  settlementsCount: number;
  unsettledReceipts: ReceiptVoucher[];
}

export interface SystemBalancesSummary {
  treasurerCentralFund: number; // Total settled handed over to treasurer - approved expenses
  floatingCashUnsettled: number; // Total collections held by members not yet handed over
  grossFestivalCollection: number; // Total sum of all issued receipt vouchers
  totalExpensesDisbursed: number; // Total direct expenses
  totalSettlementsAmount: number; // Total amount handed over to treasurer
  memberBalances: MemberRunningBalance[];
  settledMembersCount: number;
  pendingMembersCount: number;
  monthlyBreakdown: {
    month: string;
    collections: number;
    expenses: number;
    net: number;
  }[];
  expensesByCategory: {
    category: string;
    amount: number;
    percentage: number;
  }[];
}

/**
 * Core calculation engine for Festival Committee Accounts & Inter-User Settlements
 * Computes:
 * - Individual member running in-hand balances
 * - Treasurer Central Fund (Vault)
 * - Floating Cash unsettled with members
 * - Gross Festival collection
 */
export function computeSystemBalances(
  receiptsList: ReceiptVoucher[] = [],
  settlementsList: SettlementRecord[] = [],
  expensesList: DirectExpense[] = [],
  advancesList: AdvancePayment[] = [],
  committeeMembers: CommitteeMember[] = []
): SystemBalancesSummary {
  // 1. Gross Festival Collection (all receipts issued)
  const grossFestivalCollection = receiptsList.reduce(
    (sum, r) => sum + (Number(r.amount_received) || 0),
    0
  );

  // 2. Total Handed Over to Treasurer through Settlements
  const totalSettlementsAmount = settlementsList.reduce(
    (sum, s) => sum + (Number(s.amount) || 0),
    0
  );

  // 3. Total Expenses Disbursed
  const totalExpensesDisbursed = expensesList.reduce(
    (sum, e) => sum + (Number(e.amount) || 0),
    0
  );

  // 4. Calculate Individual Member Running Balances
  // Build a distinct set of member profiles from committeeMembers master data and receipts
  const memberMap = new Map<string, { member: Partial<CommitteeMember>; name: string }>();

  // Populate from committeeMembers
  committeeMembers.forEach((m) => {
    memberMap.set(m.id, { member: m, name: m.name });
  });

  // Also include any collecting members referenced in receipts who might not have an explicit ID
  receiptsList.forEach((r) => {
    const candidateId = r.collectedByMemberId;
    const candidateName = r.collectedByMemberName || r.amount_collected_by;
    if (candidateId && !memberMap.has(candidateId)) {
      memberMap.set(candidateId, {
        member: {
          id: candidateId,
          name: candidateName || 'Committee Collector',
          designationRole: r.collectedByMemberRole || 'Member',
          phone: '',
        },
        name: candidateName || 'Committee Collector',
      });
    }
  });

  const memberBalances: MemberRunningBalance[] = [];

  memberMap.forEach(({ member, name }, memId) => {
    // A. Total public collections for this member
    const memberReceipts = receiptsList.filter((r) => {
      if (r.collectedByMemberId && r.collectedByMemberId === memId) return true;
      if (member.name && r.collectedByMemberName && r.collectedByMemberName.trim().toLowerCase() === member.name.trim().toLowerCase()) return true;
      if (member.name && r.amount_collected_by && isMemberMatch(member as CommitteeMember, undefined, r.amount_collected_by)) return true;
      return false;
    });

    const totalPublicCollections = memberReceipts.reduce(
      (sum, r) => sum + (Number(r.amount_received) || 0),
      0
    );

    // B. Total handed over to treasurer
    const memberSettlements = settlementsList.filter((s) => {
      if (s.memberId === memId) return true;
      if (member.name && s.memberName && s.memberName.trim().toLowerCase() === member.name.trim().toLowerCase()) return true;
      return false;
    });

    const totalHandedOverToTreasurer = memberSettlements.reduce(
      (sum, s) => sum + (Number(s.amount) || 0),
      0
    );

    // C. Current Balance in hand
    const balanceDiff = totalPublicCollections - totalHandedOverToTreasurer;
    const currentBalanceInHand = balanceDiff > 0 ? balanceDiff : 0;
    const settlementStatus: 'Settled' | 'Pending Handover' =
      currentBalanceInHand === 0 ? 'Settled' : 'Pending Handover';

    const unsettledReceipts = memberReceipts.filter(
      (r) => r.settlementStatus !== 'Settled'
    );

    memberBalances.push({
      memberId: memId,
      memberName: member.name || name || 'Member',
      designationRole:
        member.designationRole || member.designation || 'Member',
      phone: member.phone || '',
      totalPublicCollections,
      totalHandedOverToTreasurer,
      currentBalanceInHand,
      settlementStatus,
      receiptsCount: memberReceipts.length,
      settlementsCount: memberSettlements.length,
      unsettledReceipts,
    });
  });

  // Sort: members with pending in-hand cash first, then by collections descending
  memberBalances.sort((a, b) => {
    if (b.currentBalanceInHand !== a.currentBalanceInHand) {
      return b.currentBalanceInHand - a.currentBalanceInHand;
    }
    return b.totalPublicCollections - a.totalPublicCollections;
  });

  // 5. Total floating cash unsettled across all members
  const floatingCashUnsettled = memberBalances.reduce(
    (sum, m) => sum + m.currentBalanceInHand,
    0
  );

  // 6. Treasurer Central Fund (Vault): Total verified settlements minus approved expenditures
  // Plus any direct counter receipts that were unassigned and directly received in treasury
  const unassignedDirectReceipts = receiptsList
    .filter((r) => !r.collectedByMemberId && !r.collectedByMemberName)
    .reduce((sum, r) => sum + (Number(r.amount_received) || 0), 0);

  const treasurerCentralFund =
    totalSettlementsAmount + unassignedDirectReceipts - totalExpensesDisbursed;

  // 7. Counts
  const settledMembersCount = memberBalances.filter(
    (m) => m.settlementStatus === 'Settled' && m.totalPublicCollections > 0
  ).length;
  const pendingMembersCount = memberBalances.filter(
    (m) => m.settlementStatus === 'Pending Handover' && m.currentBalanceInHand > 0
  ).length;

  // 8. Monthly Breakdown for Visual Charts (Monthly Income vs Expenses)
  const monthMap = new Map<string, { collections: number; expenses: number }>();

  receiptsList.forEach((r) => {
    const month = (r.date || '').substring(0, 7) || 'Current Month';
    const current = monthMap.get(month) || { collections: 0, expenses: 0 };
    current.collections += Number(r.amount_received) || 0;
    monthMap.set(month, current);
  });

  expensesList.forEach((e) => {
    const month = (e.date || '').substring(0, 7) || 'Current Month';
    const current = monthMap.get(month) || { collections: 0, expenses: 0 };
    current.expenses += Number(e.amount) || 0;
    monthMap.set(month, current);
  });

  const monthlyBreakdown = Array.from(monthMap.entries())
    .map(([month, data]) => ({
      month,
      collections: data.collections,
      expenses: data.expenses,
      net: data.collections - data.expenses,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // If empty, provide current month
  if (monthlyBreakdown.length === 0) {
    const currentMonth = new Date().toISOString().substring(0, 7);
    monthlyBreakdown.push({
      month: currentMonth,
      collections: grossFestivalCollection,
      expenses: totalExpensesDisbursed,
      net: grossFestivalCollection - totalExpensesDisbursed,
    });
  }

  // 9. Expenses Breakdown by Category for Visual Charts
  const catMap = new Map<string, number>();
  expensesList.forEach((e) => {
    const cat = e.expense_type_name || 'General Operations';
    catMap.set(cat, (catMap.get(cat) || 0) + (Number(e.amount) || 0));
  });

  const totalExpenseAmt = totalExpensesDisbursed || 1;
  const expensesByCategory = Array.from(catMap.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: Math.round((amount / totalExpenseAmt) * 100),
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    treasurerCentralFund,
    floatingCashUnsettled,
    grossFestivalCollection,
    totalExpensesDisbursed,
    totalSettlementsAmount,
    memberBalances,
    settledMembersCount,
    pendingMembersCount,
    monthlyBreakdown,
    expensesByCategory,
  };
}
