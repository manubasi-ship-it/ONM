/**
 * ProgramBookingModule
 * Standalone, isolated module for Program Expense & Member Advance Reconciliation.
 * Adheres strictly to double-entry accounting & immutable audit ledger logic.
 *
 * Dedicated LocalStorage Namespaces:
 * - APP_PROGRAM_BOOKINGS_DATA / APP_PROGRAM_EXPENSES
 * - APP_MEMBER_ACCOUNTS
 * - APP_EXPENSE_LEDGER
 *
 * Zero collisions with existing database collections or active user sessions.
 */

export interface ProgramBooking {
  id: string;
  programeName: string;
  programeDate: string; // YYYY-MM-DD
  programeTime: string; // HH:mm
  coordinatorName: string;
  mobileNumber1: string; // 10 digits
  mobileNumber2?: string; // 10 digits optional
  noOfArtist: number;
  reportingTime: string;
  endTime: string;
  totalAmount: number;
  advanceAmount: number;
  advancePaidBy: string; // Member Name or ID
  advancePaidById?: string;
  balanceAmount: number; // totalAmount - advanceAmount
  settledAmount: number; // amount settled
  difference: number; // balanceAmount - settledAmount
  settledByMember?: string; // Member who settled balance if any
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
  initialAdvance: number; // Opening Float
  totalTopUps: number; // Sum of additional advance deposits
  totalDisbursed: number; // Sum of advances disbursed for program bookings
  currentBalance: number; // initialAdvance + totalTopUps - totalDisbursed
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
  date: string; // YYYY-MM-DD
  memberId: string;
  memberName: string;
  programId?: string;
  programName?: string;
  type: LedgerTransactionType;
  debitCredit: 'DEBIT' | 'CREDIT'; // DEBIT = Money leaving member wallet (disbursement/expense), CREDIT = Money added to wallet (top-up/initial)
  amount: number;
  closingBalance: number; // Member remaining advance balance after this txn
  notes: string;
  createdAt: string;
}

export type ReportPeriod = 'all' | 'today' | 'this_month' | 'last_month' | 'custom';

export const ProgramBookingModule = (() => {
  const STORAGE_KEYS = {
    BOOKINGS: 'APP_PROGRAM_EXPENSES',
    MEMBERS: 'APP_MEMBER_ACCOUNTS',
    LEDGER: 'APP_EXPENSE_LEDGER',
    // Fallback legacy key check for seamless continuity
    LEGACY_BOOKINGS: 'APP_PROGRAM_BOOKINGS_DATA',
  };

  const dispatchUpdate = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('program_booking_updated'));
    }
  };

  // Helper: Generate unique safe IDs
  const generateId = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

  // ==========================================
  // MEMBER ACCOUNTS / ADVANCE WALLETS
  // ==========================================

  const getMemberAccounts = (): MemberAccount[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Filter out legacy dummy seeds and orphaned ghost entries not in Master Data
      const filtered = parsed.filter((m) => {
        if (!m) return false;
        // Legacy dummy seeds
        if (
          m.id &&
          typeof m.id === 'string' &&
          m.id.startsWith('MEM-100') &&
          (m.initialAdvance === 50000 ||
            m.initialAdvance === 35000 ||
            m.initialAdvance === 30000 ||
            m.initialAdvance === 25000)
        ) {
          return false;
        }

        // Ghost entries for Kiran Das K and Jishnu KV if not in Master Data
        const cleanName = (m.name || '').toLowerCase();
        const phone = (m.phone || '').trim();
        if (
          phone === '8089997001' ||
          phone === '9946809341' ||
          cleanName.includes('kiran das') ||
          cleanName.includes('jishnu kv')
        ) {
          // If they have zero financial transactions or initial float, prune them
          if ((Number(m.initialAdvance) || 0) === 0 && (Number(m.totalTopUps) || 0) === 0 && (Number(m.totalDisbursed) || 0) === 0) {
            return false;
          }
        }

        return true;
      });

      // If any orphaned entries were removed, update localStorage immediately
      if (filtered.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(filtered));
      }

      return filtered.map((m) => ({
        ...m,
        initialAdvance: Number(m.initialAdvance) || 0,
        totalTopUps: Number(m.totalTopUps) || 0,
        totalDisbursed: Number(m.totalDisbursed) || 0,
        currentBalance:
          Number(m.currentBalance) ??
          (Number(m.initialAdvance) || 0) +
            (Number(m.totalTopUps) || 0) -
            (Number(m.totalDisbursed) || 0),
      }));
    } catch (e) {
      console.error('ProgramBookingModule: Error reading member accounts', e);
      return [];
    }
  };

  const saveMemberAccounts = (members: MemberAccount[]): boolean => {
    try {
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
      dispatchUpdate();
      return true;
    } catch (e) {
      console.error('ProgramBookingModule: Error saving member accounts', e);
      return false;
    }
  };

  const deleteMemberAccount = (idOrName: string): boolean => {
    try {
      const list = getMemberAccounts();
      const cleanTarget = idOrName.trim().toLowerCase();
      const updated = list.filter(
        (m) =>
          m.id.toLowerCase() !== cleanTarget &&
          m.name.toLowerCase() !== cleanTarget &&
          !m.name.toLowerCase().includes(cleanTarget)
      );
      saveMemberAccounts(updated);
      return true;
    } catch (e) {
      console.error('ProgramBookingModule: Error deleting member account', e);
      return false;
    }
  };

  const addMemberAccount = (
    name: string,
    initialAdvance: number = 0,
    phone: string = '',
    designation: string = '',
    id?: string
  ): { success: boolean; data?: MemberAccount; error?: string } => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, error: 'Member Name is required.' };
    }
    const currentList = getMemberAccounts();
    const existing = currentList.find(
      (m) => (id && m.id === id) || m.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      return { success: true, data: existing };
    }

    const now = new Date().toISOString();
    const cleanAdvance = Math.max(0, Number(initialAdvance) || 0);
    const newMember: MemberAccount = {
      id: id || generateId('MEM'),
      name: trimmed,
      phone: phone.trim(),
      designation: designation.trim() || 'Member',
      initialAdvance: cleanAdvance,
      totalTopUps: 0,
      totalDisbursed: 0,
      currentBalance: cleanAdvance,
      createdAt: now,
      updatedAt: now,
    };

    const updated = [...currentList, newMember];
    saveMemberAccounts(updated);

    if (cleanAdvance > 0) {
      // Add opening float transaction to ledger
      addLedgerEntry({
        date: now.split('T')[0],
        memberId: newMember.id,
        memberName: newMember.name,
        type: 'WALLET_INITIAL',
        debitCredit: 'CREDIT',
        amount: cleanAdvance,
        closingBalance: cleanAdvance,
        notes: `Opening advance fund allocated to ${newMember.name}`,
      });
    }

    return { success: true, data: newMember };
  };

  const topUpMemberAdvance = (
    memberId: string,
    amount: number,
    notes: string = 'Advance pool top-up'
  ): { success: boolean; data?: MemberAccount; error?: string } => {
    const cleanAmount = Number(amount) || 0;
    if (cleanAmount <= 0) {
      return { success: false, error: 'Top-up amount must be greater than zero.' };
    }

    const members = getMemberAccounts();
    const idx = members.findIndex((m) => m.id === memberId || m.name === memberId);
    if (idx === -1) {
      return { success: false, error: 'Member wallet not found.' };
    }

    const member = members[idx];
    const newTopUps = (member.totalTopUps || 0) + cleanAmount;
    const newBalance = (member.currentBalance || 0) + cleanAmount;
    const now = new Date().toISOString();

    const updatedMember: MemberAccount = {
      ...member,
      totalTopUps: newTopUps,
      currentBalance: newBalance,
      updatedAt: now,
    };

    members[idx] = updatedMember;
    saveMemberAccounts(members);

    // Audit ledger record
    addLedgerEntry({
      date: now.split('T')[0],
      memberId: updatedMember.id,
      memberName: updatedMember.name,
      type: 'WALLET_TOPUP',
      debitCredit: 'CREDIT',
      amount: cleanAmount,
      closingBalance: newBalance,
      notes: notes || `Advance wallet replenished with ₹${cleanAmount.toLocaleString('en-IN')}`,
    });

    return { success: true, data: updatedMember };
  };

  // ==========================================
  // EXPENSE AUDIT LEDGER
  // ==========================================

  const getLedger = (): ExpenseLedgerEntry[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.LEDGER);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (e) {
      console.error('ProgramBookingModule: Error reading ledger', e);
      return [];
    }
  };

  const addLedgerEntry = (
    entry: Omit<ExpenseLedgerEntry, 'id' | 'createdAt'>
  ): ExpenseLedgerEntry => {
    const now = new Date().toISOString();
    const newEntry: ExpenseLedgerEntry = {
      ...entry,
      id: generateId('TXN'),
      createdAt: now,
    };

    try {
      const current = getLedger();
      const updated = [newEntry, ...current];
      localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(updated));
      dispatchUpdate();
    } catch (e) {
      console.error('ProgramBookingModule: Error writing to ledger', e);
    }

    return newEntry;
  };

  // ==========================================
  // PROGRAM BOOKINGS / EXPENSES
  // ==========================================

  const getBookings = (): ProgramBooking[] => {
    try {
      // Check primary key first, then fallback to legacy key if empty
      let raw = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
      if (!raw) {
        raw = localStorage.getItem(STORAGE_KEYS.LEGACY_BOOKINGS);
      }
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed.map((item) => {
        const total = Number(item.totalAmount) || 0;
        const advance = Number(item.advanceAmount) || 0;
        const balance = total - advance;
        const settled = Number(item.settledAmount) || 0;
        const difference = balance - settled;
        return {
          ...item,
          totalAmount: total,
          advanceAmount: advance,
          balanceAmount: balance,
          settledAmount: settled,
          difference: difference,
        };
      });
    } catch (e) {
      console.error('ProgramBookingModule: Error reading bookings', e);
      return [];
    }
  };

  const saveBookings = (bookings: ProgramBooking[]): boolean => {
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      dispatchUpdate();
      return true;
    } catch (e) {
      console.error('ProgramBookingModule: Error saving bookings', e);
      return false;
    }
  };

  // Validation helper
  const validateMobile = (mobile: string): boolean => {
    const clean = (mobile || '').replace(/\D/g, '');
    return clean.length === 10;
  };

  // Create Booking with Double-Entry Accounting
  const createBooking = (
    input: Omit<ProgramBooking, 'id' | 'balanceAmount' | 'difference' | 'createdAt'>,
    allowOverdraft: boolean = false
  ): { success: boolean; data?: ProgramBooking; error?: string; requiresOverdraftConfirm?: boolean } => {
    if (!input.programeName?.trim()) {
      return { success: false, error: 'Program Name is required.' };
    }
    if (!input.programeDate) {
      return { success: false, error: 'Program Date is required.' };
    }
    if (!input.programeTime) {
      return { success: false, error: 'Program Time is required.' };
    }
    if (!input.coordinatorName?.trim()) {
      return { success: false, error: 'Co-ordinator Name is required.' };
    }
    if (!input.mobileNumber1 || !validateMobile(input.mobileNumber1)) {
      return { success: false, error: 'Mobile Number 1 must be a valid 10-digit number.' };
    }
    if (input.mobileNumber2 && input.mobileNumber2.trim() !== '') {
      if (!validateMobile(input.mobileNumber2)) {
        return { success: false, error: 'Mobile Number 2 must be a valid 10-digit number.' };
      }
    }
    if (!input.noOfArtist || input.noOfArtist < 1) {
      return { success: false, error: 'Number of artists must be at least 1.' };
    }
    if (!input.reportingTime) {
      return { success: false, error: 'Reporting Time is required.' };
    }
    if (!input.endTime) {
      return { success: false, error: 'End Time is required.' };
    }
    if (input.totalAmount < 0) {
      return { success: false, error: 'Total Amount cannot be negative.' };
    }
    if (input.advanceAmount < 0) {
      return { success: false, error: 'Advance Amount cannot be negative.' };
    }
    if (input.advanceAmount > input.totalAmount) {
      return { success: false, error: 'Advance Amount cannot exceed Total Amount.' };
    }
    if (!input.advancePaidBy?.trim()) {
      return { success: false, error: 'Please select who paid the advance.' };
    }

    const total = Number(input.totalAmount) || 0;
    const advance = Number(input.advanceAmount) || 0;
    const balance = total - advance;
    const settled = Number(input.settledAmount) || 0;
    const difference = balance - settled;

    // Find Member Account
    const members = getMemberAccounts();
    const memberIdx = members.findIndex(
      (m) =>
        m.id === input.advancePaidById ||
        m.name.toLowerCase() === input.advancePaidBy.trim().toLowerCase()
    );

    let member = memberIdx !== -1 ? members[memberIdx] : null;

    // Overdraft check if advance > 0
    if (advance > 0 && member) {
      if (member.currentBalance < advance && !allowOverdraft) {
        return {
          success: false,
          error: `Insufficient advance pool! ${member.name} has ₹${member.currentBalance.toLocaleString('en-IN')} available, but advance amount is ₹${advance.toLocaleString('en-IN')}. Please confirm overdraft or top-up their wallet.`,
          requiresOverdraftConfirm: true,
        };
      }
    }

    const bookingId = generateId('PRG');
    const now = new Date().toISOString();

    const newBooking: ProgramBooking = {
      ...input,
      id: bookingId,
      advancePaidBy: member ? member.name : input.advancePaidBy,
      advancePaidById: member ? member.id : undefined,
      balanceAmount: balance,
      settledAmount: settled,
      difference: difference,
      createdAt: now,
    };

    // 1. Save Booking
    const currentList = getBookings();
    const updatedBookings = [newBooking, ...currentList];
    saveBookings(updatedBookings);

    // 2. Perform Double-Entry Member Wallet Deduction & Audit Ledger Entry
    if (advance > 0) {
      if (!member) {
        // If member doesn't exist yet, auto-create wallet
        const createResult = addMemberAccount(input.advancePaidBy, 0);
        if (createResult.data) {
          member = createResult.data;
        }
      }

      if (member) {
        const freshMembers = getMemberAccounts();
        const fIdx = freshMembers.findIndex((m) => m.id === member!.id);
        if (fIdx !== -1) {
          const mRecord = freshMembers[fIdx];
          const newDisbursed = (mRecord.totalDisbursed || 0) + advance;
          const newBal = (mRecord.currentBalance || 0) - advance;

          freshMembers[fIdx] = {
            ...mRecord,
            totalDisbursed: newDisbursed,
            currentBalance: newBal,
            updatedAt: now,
          };
          saveMemberAccounts(freshMembers);

          // 3. Post Immutable Ledger Entry
          addLedgerEntry({
            date: input.programeDate || now.split('T')[0],
            memberId: mRecord.id,
            memberName: mRecord.name,
            programId: bookingId,
            programName: input.programeName,
            type: 'ADVANCE_DISBURSEMENT',
            debitCredit: 'DEBIT',
            amount: advance,
            closingBalance: newBal,
            notes: `Advance disbursement for ${input.programeName} on ${input.programeDate} (${input.noOfArtist} artists)`,
          });
        }
      }
    }

    return { success: true, data: newBooking };
  };

  // Record or Update Settlement with Double-Entry support
  const recordSettlement = (
    bookingId: string,
    settledAmount: number,
    options?: {
      settledByMemberId?: string;
      paymentMode?: 'MEMBER_ADVANCE' | 'CASH_DIRECT' | 'BANK_TRANSFER';
      notes?: string;
    }
  ): { success: boolean; data?: ProgramBooking; error?: string } => {
    if (settledAmount < 0) {
      return { success: false, error: 'Settled amount cannot be negative.' };
    }

    const currentList = getBookings();
    const index = currentList.findIndex((b) => b.id === bookingId);
    if (index === -1) {
      return { success: false, error: 'Booking record not found.' };
    }

    const booking = currentList[index];
    const previousSettled = booking.settledAmount || 0;
    const deltaSettled = settledAmount - previousSettled;
    const newDifference = booking.balanceAmount - settledAmount;
    const now = new Date().toISOString();

    let settledMemberName = booking.settledByMember;

    // If settled via Member Advance and delta is positive, deduct from that member
    if (deltaSettled > 0 && options?.paymentMode === 'MEMBER_ADVANCE' && options?.settledByMemberId) {
      const members = getMemberAccounts();
      const mIdx = members.findIndex((m) => m.id === options.settledByMemberId);
      if (mIdx !== -1) {
        const mRecord = members[mIdx];
        settledMemberName = mRecord.name;
        const newDisbursed = (mRecord.totalDisbursed || 0) + deltaSettled;
        const newBal = (mRecord.currentBalance || 0) - deltaSettled;

        members[mIdx] = {
          ...mRecord,
          totalDisbursed: newDisbursed,
          currentBalance: newBal,
          updatedAt: now,
        };
        saveMemberAccounts(members);

        addLedgerEntry({
          date: now.split('T')[0],
          memberId: mRecord.id,
          memberName: mRecord.name,
          programId: booking.id,
          programName: booking.programeName,
          type: 'SETTLEMENT_PAYMENT',
          debitCredit: 'DEBIT',
          amount: deltaSettled,
          closingBalance: newBal,
          notes: options.notes || `Balance settlement payment for ${booking.programeName}`,
        });
      }
    }

    const updatedBooking: ProgramBooking = {
      ...booking,
      settledAmount: settledAmount,
      difference: newDifference,
      settledByMember: settledMemberName,
      settledPaymentMode: options?.paymentMode || booking.settledPaymentMode,
      updatedAt: now,
    };

    currentList[index] = updatedBooking;
    saveBookings(currentList);

    return { success: true, data: updatedBooking };
  };

  // Delete a booking with automatic advance deduction reversal
  const deleteBooking = (id: string): boolean => {
    const currentList = getBookings();
    const target = currentList.find((b) => b.id === id);
    if (target) {
      const now = new Date().toISOString();
      // Revert advance disbursed if any
      if (target.advanceAmount > 0 && (target.advancePaidById || target.advancePaidBy)) {
        const members = getMemberAccounts();
        const mIdx = members.findIndex(
          (m) =>
            (target.advancePaidById && m.id === target.advancePaidById) ||
            m.name.toLowerCase() === target.advancePaidBy.toLowerCase() ||
            target.advancePaidBy.toLowerCase().startsWith(m.name.toLowerCase())
        );
        if (mIdx !== -1) {
          const mRecord = members[mIdx];
          const newDisbursed = Math.max(0, (mRecord.totalDisbursed || 0) - target.advanceAmount);
          const newBal = (mRecord.currentBalance || 0) + target.advanceAmount;
          members[mIdx] = {
            ...mRecord,
            totalDisbursed: newDisbursed,
            currentBalance: newBal,
            updatedAt: now,
          };
          saveMemberAccounts(members);

          addLedgerEntry({
            date: now.split('T')[0],
            memberId: mRecord.id,
            memberName: mRecord.name,
            programId: target.id,
            programName: target.programeName,
            type: 'WALLET_REFUND',
            debitCredit: 'CREDIT',
            amount: target.advanceAmount,
            closingBalance: newBal,
            notes: `Reversal / refund of advance payout for cancelled booking: ${target.programeName}`,
          });
        }
      }

      // Revert settlement if settled via member advance
      if (
        (target.settledAmount || 0) > 0 &&
        target.settledPaymentMode === 'MEMBER_ADVANCE' &&
        target.settledByMember
      ) {
        const members = getMemberAccounts();
        const mIdx = members.findIndex(
          (m) =>
            m.name.toLowerCase() === target.settledByMember!.toLowerCase() ||
            target.settledByMember!.toLowerCase().startsWith(m.name.toLowerCase())
        );
        if (mIdx !== -1) {
          const mRecord = members[mIdx];
          const newDisbursed = Math.max(0, (mRecord.totalDisbursed || 0) - target.settledAmount);
          const newBal = (mRecord.currentBalance || 0) + target.settledAmount;
          members[mIdx] = {
            ...mRecord,
            totalDisbursed: newDisbursed,
            currentBalance: newBal,
            updatedAt: now,
          };
          saveMemberAccounts(members);
        }
      }
    }

    const filtered = currentList.filter((b) => b.id !== id);
    return saveBookings(filtered);
  };

  // Update an existing booking with double-entry adjustment
  const updateBooking = (
    id: string,
    updatedData: Partial<ProgramBooking>
  ): { success: boolean; data?: ProgramBooking; error?: string } => {
    const currentList = getBookings();
    const idx = currentList.findIndex((b) => b.id === id);
    if (idx === -1) {
      return { success: false, error: 'Booking not found.' };
    }

    const oldBooking = currentList[idx];
    const now = new Date().toISOString();

    const oldAdv = Number(oldBooking.advanceAmount) || 0;
    const newAdv = updatedData.advanceAmount !== undefined ? Number(updatedData.advanceAmount) || 0 : oldAdv;
    const oldPayerId = oldBooking.advancePaidById;
    const oldPayerName = oldBooking.advancePaidBy;
    const newPayerId = updatedData.advancePaidById || oldPayerId;
    const newPayerName = updatedData.advancePaidBy || oldPayerName;

    // Handle advance adjustments
    if (oldAdv !== newAdv || oldPayerId !== newPayerId || oldPayerName !== newPayerName) {
      const members = getMemberAccounts();
      // 1. Revert old advance from old member
      if (oldAdv > 0 && (oldPayerId || oldPayerName)) {
        const oIdx = members.findIndex(
          (m) =>
            (oldPayerId && m.id === oldPayerId) ||
            m.name.toLowerCase() === oldPayerName.toLowerCase() ||
            oldPayerName.toLowerCase().startsWith(m.name.toLowerCase())
        );
        if (oIdx !== -1) {
          const oMember = members[oIdx];
          members[oIdx] = {
            ...oMember,
            totalDisbursed: Math.max(0, (oMember.totalDisbursed || 0) - oldAdv),
            currentBalance: (oMember.currentBalance || 0) + oldAdv,
            updatedAt: now,
          };
        }
      }

      // 2. Deduct new advance from new member
      if (newAdv > 0 && (newPayerId || newPayerName)) {
        const nIdx = members.findIndex(
          (m) =>
            (newPayerId && m.id === newPayerId) ||
            m.name.toLowerCase() === newPayerName.toLowerCase() ||
            newPayerName.toLowerCase().startsWith(m.name.toLowerCase())
        );
        if (nIdx !== -1) {
          const nMember = members[nIdx];
          members[nIdx] = {
            ...nMember,
            totalDisbursed: (nMember.totalDisbursed || 0) + newAdv,
            currentBalance: (nMember.currentBalance || 0) - newAdv,
            updatedAt: now,
          };

          addLedgerEntry({
            date: updatedData.programeDate || oldBooking.programeDate,
            memberId: nMember.id,
            memberName: nMember.name,
            programId: id,
            programName: updatedData.programeName || oldBooking.programeName,
            type: 'ADVANCE_DISBURSEMENT',
            debitCredit: 'DEBIT',
            amount: newAdv,
            closingBalance: members[nIdx].currentBalance,
            notes: `Adjusted advance disbursement for ${updatedData.programeName || oldBooking.programeName}`,
          });
        }
      }

      saveMemberAccounts(members);
    }

    const totalAmt = updatedData.totalAmount !== undefined ? Number(updatedData.totalAmount) : oldBooking.totalAmount;
    const advAmt = newAdv;
    const balAmt = totalAmt - advAmt;
    const setAmt = updatedData.settledAmount !== undefined ? Number(updatedData.settledAmount) : oldBooking.settledAmount;
    const diff = balAmt - setAmt;

    const merged: ProgramBooking = {
      ...oldBooking,
      ...updatedData,
      totalAmount: totalAmt,
      advanceAmount: advAmt,
      balanceAmount: balAmt,
      settledAmount: setAmt,
      difference: diff,
      updatedAt: now,
    };

    currentList[idx] = merged;
    saveBookings(currentList);

    return { success: true, data: merged };
  };

  // Metrics calculation
  const calculateMetrics = (bookings: ProgramBooking[]) => {
    const totalPrograms = bookings.length;
    const totalContractValue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalAdvanceCollected = bookings.reduce((sum, b) => sum + (b.advanceAmount || 0), 0);
    const totalSettledAmount = bookings.reduce((sum, b) => sum + (b.settledAmount || 0), 0);
    const totalDifference = bookings.reduce((sum, b) => sum + (b.difference || 0), 0);
    const fullySettledCount = bookings.filter((b) => b.difference === 0).length;
    const pendingCount = bookings.filter((b) => b.difference > 0).length;

    // Member advance wallet pool metrics
    const memberAccounts = getMemberAccounts();
    const totalAdvancePool = memberAccounts.reduce(
      (sum, m) => sum + (m.initialAdvance || 0) + (m.totalTopUps || 0),
      0
    );
    const totalAdvanceDisbursedFromPool = memberAccounts.reduce(
      (sum, m) => sum + (m.totalDisbursed || 0),
      0
    );
    const remainingAdvancePool = memberAccounts.reduce(
      (sum, m) => sum + (m.currentBalance || 0),
      0
    );

    return {
      totalPrograms,
      totalContractValue,
      totalAdvanceCollected,
      totalSettledAmount,
      totalDifference,
      fullySettledCount,
      pendingCount,
      totalAdvancePool,
      totalAdvanceDisbursedFromPool,
      remainingAdvancePool,
    };
  };

  // Filter Bookings by date period
  const filterByPeriod = (
    bookings: ProgramBooking[],
    period: ReportPeriod,
    customFrom?: string,
    customTo?: string
  ): ProgramBooking[] => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return bookings.filter((b) => {
      if (!b.programeDate) return false;
      const bDate = b.programeDate;

      if (period === 'all') return true;

      if (period === 'today') {
        return bDate === todayStr;
      }

      if (period === 'this_month') {
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const prefix = `${year}-${month}`;
        return bDate.startsWith(prefix);
      }

      if (period === 'last_month') {
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const year = lastMonthDate.getFullYear();
        const month = String(lastMonthDate.getMonth() + 1).padStart(2, '0');
        const prefix = `${year}-${month}`;
        return bDate.startsWith(prefix);
      }

      if (period === 'custom') {
        if (customFrom && bDate < customFrom) return false;
        if (customTo && bDate > customTo) return false;
        return true;
      }

      return true;
    });
  };

  // Export Bookings to CSV
  const exportToCSV = (bookings: ProgramBooking[], filename = 'Program_Bookings_Report.csv') => {
    const headers = [
      'Sl No',
      'Program Name',
      'Program Date',
      'Program Time',
      'Co-ordinator Name',
      'Mobile 1',
      'Mobile 2',
      'No of Artists',
      'Reporting Time',
      'End Time',
      'Total Amount (INR)',
      'Advance Amount (INR)',
      'Advance Paid By',
      'Balance Amount (INR)',
      'Settled Amount (INR)',
      'Difference (INR)',
      'Status',
    ];

    const rows = bookings.map((b, idx) => [
      idx + 1,
      `"${(b.programeName || '').replace(/"/g, '""')}"`,
      b.programeDate,
      b.programeTime,
      `"${(b.coordinatorName || '').replace(/"/g, '""')}"`,
      b.mobileNumber1,
      b.mobileNumber2 || '-',
      b.noOfArtist,
      b.reportingTime,
      b.endTime,
      b.totalAmount.toFixed(2),
      b.advanceAmount.toFixed(2),
      `"${(b.advancePaidBy || '').replace(/"/g, '""')}"`,
      b.balanceAmount.toFixed(2),
      b.settledAmount.toFixed(2),
      b.difference.toFixed(2),
      b.difference === 0 ? 'Settled' : `Pending ₹${b.difference.toFixed(2)}`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
  };

  // Export Ledger to CSV
  const exportLedgerToCSV = (entries: ExpenseLedgerEntry[], filename = 'Expense_Ledger_Audit.csv') => {
    const headers = [
      'Sl No',
      'Transaction ID',
      'Date',
      'Member Name',
      'Program / Voucher',
      'Transaction Type',
      'Flow',
      'Amount (INR)',
      'Closing Balance (INR)',
      'Notes & Audit Remarks',
    ];

    const rows = entries.map((e, idx) => [
      idx + 1,
      e.id,
      e.date,
      `"${(e.memberName || '').replace(/"/g, '""')}"`,
      `"${(e.programName || '-').replace(/"/g, '""')}"`,
      e.type,
      e.debitCredit,
      e.amount.toFixed(2),
      e.closingBalance.toFixed(2),
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadBlob(csvContent, filename, 'text/csv;charset=utf-8;');
  };

  const downloadBlob = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetFinancialData = (): void => {
    try {
      // 1. Reset all member accounts balances to 0
      const currentMembers = getMemberAccounts();
      const resetMembers = currentMembers.map((m) => ({
        ...m,
        initialAdvance: 0,
        totalTopUps: 0,
        totalDisbursed: 0,
        currentBalance: 0,
      }));
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(resetMembers));

      // 2. Clear Double-Entry Ledger
      localStorage.removeItem(STORAGE_KEYS.LEDGER);

      // 3. Reset any program booking advances/settlements
      const bookings = getBookings();
      const updatedBookings = bookings.map((b) => ({
        ...b,
        advanceAmount: 0,
        settledAmount: 0,
        balanceAmount: b.totalAmount,
      }));
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(updatedBookings));

      dispatchUpdate();
    } catch (e) {
      console.error('ProgramBookingModule: Error resetting financial data', e);
    }
  };

  return {
    getBookings,
    saveBookings,
    getMemberAccounts,
    saveMemberAccounts,
    addMemberAccount,
    deleteMemberAccount,
    topUpMemberAdvance,
    getLedger,
    createBooking,
    updateBooking,
    recordSettlement,
    deleteBooking,
    calculateMetrics,
    filterByPeriod,
    exportToCSV,
    exportLedgerToCSV,
    validateMobile,
    resetFinancialData,
  };
})();
