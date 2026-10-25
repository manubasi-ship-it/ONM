import { z } from 'zod';

export type TransactionType = 'income' | 'expense';
export type PaymentMode = 'cash' | 'upi' | 'bank_transfer';
export type TransactionStatus = 'completed' | 'pending' | 'cancelled';

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  role: 'admin' | 'treasurer' | 'volunteer' | 'user';
  phone?: string;
  memberId?: string;
}

export interface ActiveSession {
  sessionToken: string;
  loginTimestamp: string;
  user: UserProfile;
}

export const AppUserSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(1, 'Full name is required'),
  username: z.string().min(1, 'Username / Mobile is required'),
  password: z.string().min(1, 'Password / PIN is required'),
  role: z.enum(['admin', 'volunteer']),
  phone: z.string().optional().default(''),
  active: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AppUser = z.infer<typeof AppUserSchema>;

export const INITIAL_APP_USERS: AppUser[] = [];

export const TransactionSchema = z.object({
  id: z.string().min(1),
  receiptNo: z.string().min(1),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1, 'Category is required'),
  amount: z.number().positive('Amount must be greater than zero'),
  donorOrPayee: z.string().min(1, 'Name is required'),
  phone: z.string().optional().default(''),
  location: z.string().optional().default(''),
  paymentMode: z.enum(['cash', 'upi', 'bank_transfer']),
  status: z.enum(['completed', 'pending', 'cancelled']).default('completed'),
  notes: z.string().optional().default(''),
  collectedBy: z.string().min(1),
  collectedByRole: z.enum(['admin', 'treasurer', 'volunteer', 'user']),
  createdAt: z.string(),
  updatedAt: z.string(),
  synced: z.boolean().optional().default(true),
});

export type Transaction = z.infer<typeof TransactionSchema>;

export const SettingSchema = z.object({
  id: z.string(),
  sangamNameEnglish: z.string().min(1),
  sangamNameMalayalam: z.string().min(1),
  upiId: z.string().min(3),
  merchantName: z.string().min(1),
  mcc: z.string().optional().default('8661'),
  festivalYear: z.string(),
  contactPhone: z.string(),
  welcomeMessage: z.string(),
});

export type Setting = z.infer<typeof SettingSchema>;

export type UserRole = 'admin' | 'treasurer' | 'volunteer' | 'user';

export const COMMITTEE_DESIGNATIONS = [
  'Member',
  'Convenor',
  'Joint Convenor',
  'Treasurer',
  'Rakshadhikari',
  'Additional Member',
  // Backward compatibility aliases
  'Patron',
  'Committee Member',
] as const;

export type CommitteeDesignation = typeof COMMITTEE_DESIGNATIONS[number];

export const CommitteeMemberSchema = z.object({
  id: z.string().min(1),
  memberId: z.string().optional(),
  name: z.string().min(1, 'Member name is required'),
  fullName: z.string().optional(),
  phone: z.string().optional().default(''),
  designation: z.string().min(1, 'Designation is required'),
  designationRole: z.string().optional(),
  active: z.boolean().default(true),
  status: z.string().optional().default('Active'),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  userId: z.string().optional(),
  password: z.string().optional(),
  role: z.enum(['ADMIN', 'TREASURER', 'VOLUNTEER', 'USER']).optional().default('VOLUNTEER'),
  passwordLastChangedAt: z.string().optional(),
});

export type CommitteeMember = z.infer<typeof CommitteeMemberSchema>;

export interface ActiveMemberSession {
  memberId: string;
  userId: string;
  name: string;
  designation: string;
  phone: string;
  role: 'ADMIN' | 'TREASURER' | 'VOLUNTEER' | 'USER';
  password?: string;
  status?: string;
}

export const ExpenseTypeSchema = z.object({
  id: z.string().min(1),
  nameMalayalam: z.string().optional().default(''),
  nameEnglish: z.string().min(1, 'Category name is required'),
  active: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ExpenseType = z.infer<typeof ExpenseTypeSchema>;

export const ReceiptTypeSchema = z.object({
  id: z.string().min(1),
  nameMalayalam: z.string().optional().default(''),
  nameEnglish: z.string().min(1, 'Receipt type name is required'),
  codePrefix: z.string().optional().default(''),
  active: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ReceiptType = z.infer<typeof ReceiptTypeSchema>;

export const DEFAULT_SETTING: Setting = {
  id: 'general_config',
  sangamNameEnglish: 'ONAMPILLY KAVADI SANGAM',
  sangamNameMalayalam: 'ONAMPILLY KAVADI SANGAM',
  upiId: 'onampillykavadi@sbi',
  merchantName: 'ONAMPILLY KAVADI SANGAM',
  mcc: '8661',
  festivalYear: '2027',
  contactPhone: '+91 94952 33833',
  welcomeMessage: 'May Lord Muruga shower divine blessings, peace, and prosperity upon you and your family.',
};

export const INITIAL_COMMITTEE_MEMBERS: CommitteeMember[] = [];

export const INITIAL_EXPENSE_TYPES: ExpenseType[] = [];

export const INITIAL_RECEIPT_TYPES: ReceiptType[] = [];

// ---------------------------------------------------------
// Committee Advance & Direct Expense Entity Specifications
// ---------------------------------------------------------
export type AdvancePaymentMode = 'Cash' | 'UPI / GPay' | 'Bank Transfer' | 'Cheque';

export const AdvancePaymentSchema = z.object({
  id: z.string().min(1),
  voucher_no: z.string().min(1), // e.g. ADV-2026-0001
  date: z.string().min(1),
  member_id: z.string().min(1),
  member_name: z.string().min(1),
  payment_mode: z.enum(['Cash', 'UPI / GPay', 'Bank Transfer', 'Cheque']),
  amount: z.number().positive('Advance amount must be greater than zero'),
  purpose: z.string().min(1, 'Purpose of advance is required'),
  remarks: z.string().optional().default(''),
  paid_by_user: z.string().min(1),
  created_at: z.string(),
  updated_at: z.string().optional(),
});

export type AdvancePayment = z.infer<typeof AdvancePaymentSchema>;

export const DirectExpenseSchema = z.object({
  id: z.string().min(1),
  voucher_no: z.string().min(1), // e.g. EXP-2026-0001
  date: z.string().min(1),
  expense_type_id: z.string().min(1),
  expense_type_name: z.string().min(1),
  expense_name: z.string().min(1, 'Expense name / title is required'),
  member_id: z.string().min(1),
  claimed_by: z.string().min(1, 'Claimed by member is required'),
  amount: z.number().positive('Expense amount must be greater than zero'),
  bill_reference: z.string().min(1, 'Supporting receipt/bill reference is required'),
  remarks: z.string().optional().default(''),
  recorded_by: z.string().min(1),
  created_at: z.string(),
  updated_at: z.string().optional(),
});

export type DirectExpense = z.infer<typeof DirectExpenseSchema>;

export interface MemberBalanceSummary {
  member_id: string;
  member_name: string;
  designation: string;
  phone: string;
  active: boolean;
  total_advances: number;
  total_expenses: number;
  balance_in_hand: number; // advances + receipts - expenses
  status: 'due_from_member' | 'settled' | 'reimbursement_due';
  advances_count: number;
  expenses_count: number;
  program_advances_count?: number;
  program_advances_amount?: number;
  receipts_count?: number;
  receipts_amount?: number;
  direct_advances_amount?: number;
  direct_expenses_amount?: number;
}

export const INITIAL_ADVANCE_PAYMENTS: AdvancePayment[] = [];

export const INITIAL_DIRECT_EXPENSES: DirectExpense[] = [];

// ---------------------------------------------------------
// Festival Commitments & Receipt Vouchers Specifications
// ---------------------------------------------------------
export type CommitmentStatus = 'Pending' | 'Partially Paid' | 'Completed' | 'Direct/Uncommitted';
export type VoucherPaymentMode = 'Cash' | 'UPI';

export const CommitmentSchema = z.object({
  id: z.string().min(1),
  transaction_no: z.string().min(1), // Format: CMT-YYYYMMDD-XXXX
  name: z.string().min(1, 'Payee / Donor Full Name is required'),
  house_name: z.string().min(1, 'House / Residential Name is required'),
  date: z.string().min(1, 'Date is required'),
  place: z.string().default('ONAMPILLY'),
  amount_committed: z.number().positive('Committed Amount must be greater than zero'),
  data_entry_user: z.string().min(1),
  created_at: z.string(),
  updated_at: z.string().optional(),
});

export type Commitment = z.infer<typeof CommitmentSchema>;

export const ReceiptVoucherSchema = z.object({
  id: z.string().min(1),
  transaction_no: z.string().min(1), // Format: RCP-YYYYMMDD-XXXX
  commitment_id: z.string().optional(), // Optional linked commitment ID
  receipt_no: z.string().min(1, 'Physical Receipt Book Number is required'),
  date: z.string().min(1, 'Collection Date is required'),
  name: z.string().min(1, 'Payee Name is required'),
  house_name: z.string().min(1, 'House Name is required'),
  place: z.string().default('ONAMPILLY'),
  amount_committed: z.number().optional().default(0),
  amount_received: z.number().positive('Amount received must be greater than zero'),
  balance: z.number().default(0),
  payment_mode: z.enum(['Cash', 'UPI']),
  amount_collected_by: z.string().min(1),
  // Additive collector fields (User prompt requirement)
  collectedByMemberId: z.string().optional(),
  collectedByMemberName: z.string().optional(),
  collectedByMemberRole: z.string().optional(),
  settlementStatus: z.enum(['In-Hand', 'Settled']).optional().default('In-Hand'),
  settlementId: z.string().optional(),
  settledAt: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
});

export type ReceiptVoucher = z.infer<typeof ReceiptVoucherSchema>;

export interface SettlementRecord {
  id: string;
  settlementNo: string; // e.g. STL-20261023-0001
  date: string;
  memberId: string;
  memberName: string;
  designationRole?: string;
  memberRole?: string;
  amount: number;
  paymentMode: 'Cash' | 'UPI' | 'UPI / Direct Bank Transfer';
  referenceNo?: string;
  transactionRef?: string;
  remarks?: string;
  receivedByTreasurer?: string;
  receivedByTreasurerName?: string;
  receivedByTreasurerId?: string;
  voucherIds?: string[];
  status?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CommitmentWithStats extends Commitment {
  total_collected: number;
  balance: number;
  status: 'Pending' | 'Partially Paid' | 'Completed';
  receipt_count: number;
  receipts: ReceiptVoucher[];
}

// ---------------------------------------------------------
// Program Booking & Reports Specifications
// ---------------------------------------------------------
export interface ProgramBooking {
  id: string;
  programeName: string;
  programeDate: string;
  programeTime: string;
  coordinatorName: string;
  mobileNumber1: string;
  mobileNumber2?: string;
  noOfArtist: number;
  reportingTime: string;
  endTime: string;
  totalAmount: number;
  advanceAmount: number;
  advancePaidBy: string;
  advancePaidById?: string;
  balanceAmount: number;
  settledAmount: number;
  difference: number;
  settledByMember?: string;
  settledPaymentMode?: 'MEMBER_ADVANCE' | 'CASH_DIRECT' | 'BANK_TRANSFER';
  createdAt: string;
  updatedAt?: string;
  notes?: string;
}

export interface MemberAccount {
  id: string;
  name: string;
  phone?: string;
  designation?: string;
  initialAdvance: number;
  totalTopUps: number;
  totalDisbursed: number;
  currentBalance: number;
  createdAt: string;
  updatedAt: string;
}

export type LedgerTransactionType =
  | 'ADVANCE_DISBURSEMENT'
  | 'SETTLEMENT_PAYMENT'
  | 'WALLET_TOPUP'
  | 'WALLET_INITIAL'
  | 'WALLET_REFUND';

export interface ExpenseLedgerEntry {
  id: string;
  date: string;
  memberId: string;
  memberName: string;
  programId?: string;
  programName?: string;
  type: LedgerTransactionType;
  debitCredit: 'DEBIT' | 'CREDIT';
  amount: number;
  closingBalance: number;
  notes: string;
  createdAt: string;
}

