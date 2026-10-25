import {
  Transaction,
  Setting,
  CommitteeMember,
  ExpenseType,
  ReceiptType,
  AppUser,
  ActiveSession,
  Commitment,
  ReceiptVoucher,
  CommitmentWithStats,
  AdvancePayment,
  DirectExpense,
  SettlementRecord,
  DEFAULT_SETTING,
  INITIAL_COMMITTEE_MEMBERS,
  INITIAL_EXPENSE_TYPES,
  INITIAL_RECEIPT_TYPES,
  INITIAL_APP_USERS,
  INITIAL_ADVANCE_PAYMENTS,
  INITIAL_DIRECT_EXPENSES,
} from '../types';

const STORAGE_KEYS = {
  TRANSACTIONS: 'oks_local_transactions',
  OFFLINE_QUEUE: 'oks_offline_queue',
  SETTINGS: 'oks_portal_settings',
  ACTIVE_USER: 'oks_active_session',
  COMMITTEE_MEMBERS: 'oks_committee_members',
  EXPENSE_TYPES: 'oks_expense_types',
  RECEIPT_TYPES: 'oks_receipt_types',
  APP_USERS: 'oks_app_users',
  COMMITMENTS: 'oks_commitments',
  RECEIPT_VOUCHERS: 'oks_receipt_vouchers',
  ACTIVE_VOLUNTEER: 'oks_active_volunteer_name',
  ADVANCES: 'oks_advance_payments',
  DIRECT_EXPENSES: 'oks_direct_expenses',
  SETTLEMENTS: 'oks_settlements',
};

export const INITIAL_DEMO_TRANSACTIONS: Transaction[] = [];


export function loadLocalTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed reading local storage:', e);
    return [];
  }
}

export function saveLocalTransactions(txs: Transaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
  } catch (e) {
    console.error('Failed saving to local storage:', e);
  }
}

export function getOfflineQueue(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToOfflineQueue(tx: Transaction): void {
  try {
    const queue = getOfflineQueue();
    queue.push(tx);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed queueing offline transaction:', e);
  }
}

export function clearOfflineQueue(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
  } catch (e) {
    console.error('Failed clearing offline queue:', e);
  }
}

export function loadLocalSetting(): Setting {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTING;
    return { ...DEFAULT_SETTING, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTING;
  }
}

export function saveLocalSetting(setting: Setting): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(setting));
  } catch (e) {
    console.error('Failed saving settings:', e);
  }
}

// Committee Members Local Cache
export function loadLocalCommitteeMembers(): CommitteeMember[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMMITTEE_MEMBERS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalCommitteeMembers(members: CommitteeMember[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.COMMITTEE_MEMBERS, JSON.stringify(members));
  } catch (e) {
    console.error('Failed saving committee members:', e);
  }
}

// Expense Types Local Cache
export function loadLocalExpenseTypes(): ExpenseType[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPENSE_TYPES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalExpenseTypes(types: ExpenseType[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EXPENSE_TYPES, JSON.stringify(types));
  } catch (e) {
    console.error('Failed saving expense types:', e);
  }
}

// -------------------------------------------------------------
// Committee Advances Local Cache
// -------------------------------------------------------------
export function loadLocalAdvances(): AdvancePayment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ADVANCES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalAdvances(advances: AdvancePayment[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ADVANCES, JSON.stringify(advances));
  } catch (e) {
    console.error('Failed saving advances:', e);
  }
}

// -------------------------------------------------------------
// Direct Expenses Local Cache
// -------------------------------------------------------------
export function loadLocalDirectExpenses(): DirectExpense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DIRECT_EXPENSES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalDirectExpenses(expenses: DirectExpense[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DIRECT_EXPENSES, JSON.stringify(expenses));
  } catch (e) {
    console.error('Failed saving direct expenses:', e);
  }
}

// Receipt Types Local Cache
export function loadLocalReceiptTypes(): ReceiptType[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECEIPT_TYPES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalReceiptTypes(types: ReceiptType[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RECEIPT_TYPES, JSON.stringify(types));
  } catch (e) {
    console.error('Failed saving receipt types:', e);
  }
}

// App Users (Master User Management) Local Cache
export function loadLocalAppUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.APP_USERS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalAppUsers(users: AppUser[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.APP_USERS, JSON.stringify(users));
  } catch (e) {
    console.error('Failed saving app users:', e);
  }
}

// Purge all local master data, sample data, and transactions
export function clearAllLocalMasterAndSampleData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
    localStorage.removeItem(STORAGE_KEYS.COMMITTEE_MEMBERS);
    localStorage.removeItem(STORAGE_KEYS.EXPENSE_TYPES);
    localStorage.removeItem(STORAGE_KEYS.RECEIPT_TYPES);
    localStorage.removeItem(STORAGE_KEYS.APP_USERS);
    localStorage.removeItem(STORAGE_KEYS.COMMITMENTS);
    localStorage.removeItem(STORAGE_KEYS.RECEIPT_VOUCHERS);
    localStorage.removeItem(STORAGE_KEYS.ADVANCES);
    localStorage.removeItem(STORAGE_KEYS.DIRECT_EXPENSES);
  } catch (e) {
    console.error('Failed clearing local master & sample data:', e);
  }
}

// Purge ONLY transactions while keeping master data (members, categories, programs, settings) intact
export function clearLocalTransactionsOnly(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
    localStorage.removeItem(STORAGE_KEYS.COMMITMENTS);
    localStorage.removeItem(STORAGE_KEYS.RECEIPT_VOUCHERS);
    localStorage.removeItem(STORAGE_KEYS.ADVANCES);
    localStorage.removeItem(STORAGE_KEYS.DIRECT_EXPENSES);
    localStorage.removeItem('APP_EXPENSE_LEDGER');
  } catch (e) {
    console.error('Failed clearing local transactions:', e);
  }
}

// Purge financial records (advances, top_ups, expenses, ledgers) and reset member advance balances to 0
export function purgeFinancialDataLocal(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.ADVANCES);
    localStorage.removeItem(STORAGE_KEYS.DIRECT_EXPENSES);
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem('APP_EXPENSE_LEDGER');
    localStorage.removeItem('oks_top_ups');
    localStorage.removeItem('top_ups');
    localStorage.removeItem('advances');
    localStorage.removeItem('expenses');

    // Reset member accounts balances to 0 in APP_MEMBER_ACCOUNTS
    const rawMembers = localStorage.getItem('APP_MEMBER_ACCOUNTS');
    if (rawMembers) {
      const parsed = JSON.parse(rawMembers);
      if (Array.isArray(parsed)) {
        const resetList = parsed.map((m) => ({
          ...m,
          initialAdvance: 0,
          totalTopUps: 0,
          totalDisbursed: 0,
          currentBalance: 0,
          available_advance: 0,
          top_ups: 0,
          expenses_paid: 0,
        }));
        localStorage.setItem('APP_MEMBER_ACCOUNTS', JSON.stringify(resetList));
      }
    }
  } catch (e) {
    console.error('Failed purging local financial data:', e);
  }
}

// -------------------------------------------------------------
// Commitments Local Cache
// -------------------------------------------------------------
export function loadLocalCommitments(): Commitment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMMITMENTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalCommitments(commitments: Commitment[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.COMMITMENTS, JSON.stringify(commitments));
  } catch (e) {
    console.error('Failed saving commitments:', e);
  }
}

// -------------------------------------------------------------
// Receipt Vouchers Local Cache
// -------------------------------------------------------------
export function loadLocalReceiptVouchers(): ReceiptVoucher[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECEIPT_VOUCHERS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalReceiptVouchers(vouchers: ReceiptVoucher[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RECEIPT_VOUCHERS, JSON.stringify(vouchers));
  } catch (e) {
    console.error('Failed saving receipt vouchers:', e);
  }
}

// -------------------------------------------------------------
// Active Volunteer Simulation State
// -------------------------------------------------------------
export const DEFAULT_VOLUNTEER_NAME = 'Admin Volunteer';

export function loadActiveVolunteerName(): string {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.ACTIVE_VOLUNTEER);
    return val && val.trim() ? val.trim() : DEFAULT_VOLUNTEER_NAME;
  } catch {
    return DEFAULT_VOLUNTEER_NAME;
  }
}

export function saveActiveVolunteerName(name: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_VOLUNTEER, name.trim() || DEFAULT_VOLUNTEER_NAME);
  } catch (e) {
    console.error('Failed saving active volunteer:', e);
  }
}

// -------------------------------------------------------------
// Unique Identifier Generators
// -------------------------------------------------------------
function getRandomSuffix(len = 4): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let res = '';
  for (let i = 0; i < len; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

export function generateCommitmentNo(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `CMT-${year}${month}${day}-${getRandomSuffix(4)}`;
}

export function generateReceiptTransactionNo(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `RCP-${year}${month}${day}-${getRandomSuffix(4)}`;
}

// -------------------------------------------------------------
// Calculation Helper: Dynamic Commitment Stats
// -------------------------------------------------------------
export function computeCommitmentStats(
  commitment: Commitment,
  allVouchers: ReceiptVoucher[]
): CommitmentWithStats {
  // Match vouchers by commitment_id or by exact trimmed payee name + house name
  const linked = allVouchers.filter((v) => {
    if (v.commitment_id && v.commitment_id === commitment.id) return true;
    if (!v.commitment_id && v.name.trim().toLowerCase() === commitment.name.trim().toLowerCase()) {
      return true;
    }
    return false;
  });

  const totalCollected = linked.reduce((sum, v) => sum + (Number(v.amount_received) || 0), 0);
  const rawBalance = (Number(commitment.amount_committed) || 0) - totalCollected;
  const balance = rawBalance < 0 ? 0 : rawBalance;

  let status: 'Pending' | 'Partially Paid' | 'Completed' = 'Pending';
  if (totalCollected >= commitment.amount_committed && commitment.amount_committed > 0) {
    status = 'Completed';
  } else if (totalCollected > 0) {
    status = 'Partially Paid';
  } else {
    status = 'Pending';
  }

  return {
    ...commitment,
    total_collected: totalCollected,
    balance,
    status,
    receipt_count: linked.length,
    receipts: linked.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
  };
}

// Active Session Management & Cross-Tab Concurrency
export function loadActiveSession(): ActiveSession | null {
  try {
    const sessionRaw = sessionStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
    if (sessionRaw) {
      return JSON.parse(sessionRaw);
    }
    const localRaw = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER);
    if (localRaw) {
      const parsed = JSON.parse(localRaw);
      sessionStorage.setItem(STORAGE_KEYS.ACTIVE_USER, localRaw);
      return parsed;
    }
    return null;
  } catch (e) {
    console.error('Failed loading active session:', e);
    return null;
  }
}

export function saveActiveSession(session: ActiveSession): void {
  try {
    const serialized = JSON.stringify(session);
    sessionStorage.setItem(STORAGE_KEYS.ACTIVE_USER, serialized);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER, serialized);
  } catch (e) {
    console.error('Failed saving active session:', e);
  }
}

export function clearActiveSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
  } catch (e) {
    console.error('Failed clearing active session:', e);
  }
}

// -------------------------------------------------------------
// Member-to-Treasurer Settlements Storage
// -------------------------------------------------------------
export function loadLocalSettlements(): SettlementRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTLEMENTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed loading settlements from localStorage:', e);
    return [];
  }
}

export function saveLocalSettlements(settlements: SettlementRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTLEMENTS, JSON.stringify(settlements));
    window.dispatchEvent(new CustomEvent('settlements_updated', { detail: settlements }));
  } catch (e) {
    console.error('Failed saving settlements to localStorage:', e);
  }
}

export function generateSettlementNo(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `STL-${yyyy}${mm}${dd}-${rand}`;
}

