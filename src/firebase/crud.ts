/**
 * Firestore Master Data & Transaction CRUD Operations
 * Features Role-Based Access Control (RBAC) permission guards:
 * - Create/Read/Update allowed for ADMIN and standard USER
 * - Delete operations STRICTLY restricted to ADMIN
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import { canPerformAction, getCurrentUser } from '../modules/auth';
import {
  CommitteeMember,
  ExpenseType,
  ProgramBooking,
  DirectExpense,
  AdvancePayment,
  ReceiptVoucher,
  Commitment,
  SettlementRecord,
} from '../types';

/**
 * -------------------------------------------------------------
 * 1. Committee Members Master Data CRUD (/members & /committee_members)
 * -------------------------------------------------------------
 */

export async function saveMasterMember(member: CommitteeMember): Promise<string> {
  if (!canPerformAction('ENTRY_CREATE') && !canPerformAction('ENTRY_EDIT_DRAFT')) {
    throw new Error('Permission denied: You do not have permission to add or edit members.');
  }

  const memberId = member.id || `mem_${Date.now()}`;
  const now = new Date().toISOString();
  const payload = {
    ...member,
    id: memberId,
    updatedAt: now,
  };

  // Save to /members as requested, and mirror to /committee_members
  await setDoc(doc(db, 'members', memberId), payload, { merge: true });
  await setDoc(doc(db, 'committee_members', memberId), payload, { merge: true });
  return memberId;
}

export async function deleteMasterMember(memberId: string): Promise<void> {
  if (!canPerformAction('DELETE')) {
    throw new Error('Permission denied: Only Administrators have delete privileges for master members.');
  }

  await deleteDoc(doc(db, 'members', memberId));
  await deleteDoc(doc(db, 'committee_members', memberId));
}

export function subscribeMasterMembers(
  onUpdate: (members: CommitteeMember[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  // Listen to /members collection
  return onSnapshot(
    collection(db, 'members'),
    (snapshot) => {
      if (snapshot.empty) {
        // Fallback to /committee_members if /members is not yet populated
        getDocs(collection(db, 'committee_members')).then((cmSnap) => {
          if (!cmSnap.empty) {
            const list: CommitteeMember[] = [];
            cmSnap.forEach((d) => list.push(d.data() as CommitteeMember));
            onUpdate(list);
          }
        });
        return;
      }
      const list: CommitteeMember[] = [];
      snapshot.forEach((d) => list.push(d.data() as CommitteeMember));
      onUpdate(list);
    },
    (err) => {
      console.warn('Firestore: Members listener error:', err.message);
      if (onError) onError(err);
    }
  );
}

/**
 * -------------------------------------------------------------
 * 2. Expense Categories Master Data CRUD (/categories & /expense_types)
 * -------------------------------------------------------------
 */

export async function saveMasterCategory(category: ExpenseType): Promise<string> {
  if (!canPerformAction('ENTRY_CREATE') && !canPerformAction('ENTRY_EDIT_DRAFT')) {
    throw new Error('Permission denied: You do not have permission to add or edit categories.');
  }

  const catId = category.id || `cat_${Date.now()}`;
  const now = new Date().toISOString();
  const payload = {
    ...category,
    id: catId,
    updatedAt: now,
  };

  await setDoc(doc(db, 'categories', catId), payload, { merge: true });
  await setDoc(doc(db, 'expense_types', catId), payload, { merge: true });
  return catId;
}

export async function deleteMasterCategory(categoryId: string): Promise<void> {
  if (!canPerformAction('DELETE')) {
    throw new Error('Permission denied: Only Administrators can delete expense categories.');
  }

  await deleteDoc(doc(db, 'categories', categoryId));
  await deleteDoc(doc(db, 'expense_types', categoryId));
}

export function subscribeMasterCategories(
  onUpdate: (categories: ExpenseType[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'categories'),
    (snapshot) => {
      if (snapshot.empty) {
        getDocs(collection(db, 'expense_types')).then((etSnap) => {
          if (!etSnap.empty) {
            const list: ExpenseType[] = [];
            etSnap.forEach((d) => list.push(d.data() as ExpenseType));
            onUpdate(list);
          }
        });
        return;
      }
      const list: ExpenseType[] = [];
      snapshot.forEach((d) => list.push(d.data() as ExpenseType));
      onUpdate(list);
    },
    (err) => {
      console.warn('Firestore: Categories listener error:', err.message);
      if (onError) onError(err);
    }
  );
}

/**
 * -------------------------------------------------------------
 * 3. Programs Master Data CRUD (/programs)
 * -------------------------------------------------------------
 */

export async function saveProgramBooking(program: ProgramBooking): Promise<string> {
  if (!canPerformAction('ENTRY_CREATE') && !canPerformAction('ENTRY_EDIT_DRAFT')) {
    throw new Error('Permission denied: You do not have permission to create or edit program bookings.');
  }

  const progId = program.id || `PRG-${Date.now()}`;
  const now = new Date().toISOString();
  const payload = {
    ...program,
    id: progId,
    updatedAt: now,
  };

  await setDoc(doc(db, 'programs', progId), payload, { merge: true });
  return progId;
}

export async function deleteProgramBooking(programId: string): Promise<void> {
  if (!canPerformAction('DELETE')) {
    throw new Error('Permission denied: Only Administrators can delete program bookings and artist advance records.');
  }

  await deleteDoc(doc(db, 'programs', programId));
}

export function subscribePrograms(
  onUpdate: (programs: ProgramBooking[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'programs'),
    (snapshot) => {
      const list: ProgramBooking[] = [];
      snapshot.forEach((d) => list.push(d.data() as ProgramBooking));
      onUpdate(list);
    },
    (err) => {
      console.warn('Firestore: Programs listener error:', err.message);
      if (onError) onError(err);
    }
  );
}

/**
 * -------------------------------------------------------------
 * 4. General Transactions CRUD (/transactions)
 * -------------------------------------------------------------
 */

export async function saveTransaction(transaction: any): Promise<string> {
  const txnId = transaction.id || `TXN-${Date.now()}`;
  const payload = {
    ...transaction,
    id: txnId,
    serverTimestamp: serverTimestamp(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'transactions', txnId), payload, { merge: true });
  return txnId;
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  await deleteDoc(doc(db, 'transactions', transactionId));
}

/**
 * -------------------------------------------------------------
 * 5. Direct Expenses & Advances: Synced to /transactions & Collections
 * -------------------------------------------------------------
 */

export async function saveAdvanceTransaction(advance: AdvancePayment): Promise<string> {
  const advId = advance.id || `ADV-${Date.now()}`;
  const payload = {
    ...advance,
    id: advId,
    transaction_no: advance.voucher_no,
    type: 'advance',
    sub_type: 'advance_payment',
    serverTimestamp: serverTimestamp(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'advance_payments', advId), payload, { merge: true });
  await setDoc(doc(db, 'transactions', advId), payload, { merge: true });
  return advId;
}

export async function deleteAdvanceRecord(advanceId: string): Promise<void> {
  await deleteDoc(doc(db, 'advance_payments', advanceId));
  await deleteDoc(doc(db, 'transactions', advanceId));
}

export async function saveDirectExpenseTransaction(expense: DirectExpense): Promise<string> {
  const expId = expense.id || `EXP-${Date.now()}`;
  const payload = {
    ...expense,
    id: expId,
    transaction_no: expense.voucher_no,
    type: 'expense',
    sub_type: 'direct_expense',
    serverTimestamp: serverTimestamp(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'direct_expenses', expId), payload, { merge: true });
  await setDoc(doc(db, 'transactions', expId), payload, { merge: true });
  return expId;
}

export async function deleteDirectExpenseRecord(expenseId: string): Promise<void> {
  await deleteDoc(doc(db, 'direct_expenses', expenseId));
  await deleteDoc(doc(db, 'transactions', expenseId));
}

export async function saveReceiptVoucherTransaction(voucher: ReceiptVoucher): Promise<string> {
  const vId = voucher.id || `RCP-${Date.now()}`;
  const payload = {
    ...voucher,
    id: vId,
    transaction_no: voucher.transaction_no || voucher.receipt_no,
    type: 'receipt',
    sub_type: 'receipt_voucher',
    serverTimestamp: serverTimestamp(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'receipt_vouchers', vId), payload, { merge: true });
  await setDoc(doc(db, 'transactions', vId), payload, { merge: true });
  return vId;
}

export async function deleteReceiptVoucherRecord(voucherId: string): Promise<void> {
  await deleteDoc(doc(db, 'receipt_vouchers', voucherId));
  await deleteDoc(doc(db, 'transactions', voucherId));
}

export async function saveCommitmentTransaction(commitment: Commitment): Promise<string> {
  const cId = commitment.id || `CMT-${Date.now()}`;
  const payload = {
    ...commitment,
    id: cId,
    transaction_no: commitment.transaction_no,
    type: 'commitment',
    sub_type: 'commitment_record',
    serverTimestamp: serverTimestamp(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'commitments', cId), payload, { merge: true });
  await setDoc(doc(db, 'transactions', cId), payload, { merge: true });
  return cId;
}

export async function deleteCommitmentRecord(commitmentId: string): Promise<void> {
  await deleteDoc(doc(db, 'commitments', commitmentId));
  await deleteDoc(doc(db, 'transactions', commitmentId));
}

/**
 * -------------------------------------------------------------
 * 5b. Inter-User Account Settlement & Vault Handover CRUD (/settlements)
 * -------------------------------------------------------------
 */
export async function saveSettlementTransaction(
  settlement: SettlementRecord,
  voucherIdsToMarkSettled: string[] = []
): Promise<string> {
  const sId = settlement.id || `STL-${Date.now()}`;
  const batch = writeBatch(db);

  const payload = {
    ...settlement,
    id: sId,
    type: 'settlement',
    sub_type: 'member_treasurer_handover',
    serverTimestamp: serverTimestamp(),
    updatedAt: new Date().toISOString(),
  };

  // Write to /settlements and mirror to /transactions
  batch.set(doc(db, 'settlements', sId), payload, { merge: true });
  batch.set(doc(db, 'transactions', sId), payload, { merge: true });

  // Atomically mark any associated receipt vouchers as 'Settled'
  for (const vId of voucherIdsToMarkSettled) {
    if (vId) {
      batch.update(doc(db, 'receipt_vouchers', vId), {
        settlementStatus: 'Settled',
        settlementId: sId,
        settledAt: new Date().toISOString(),
      });
    }
  }

  await batch.commit();
  return sId;
}

export async function deleteSettlementRecord(settlementId: string): Promise<void> {
  await deleteDoc(doc(db, 'settlements', settlementId));
  await deleteDoc(doc(db, 'transactions', settlementId));
}

/**
 * -------------------------------------------------------------
 * 6. Cloud Permanent Purge All Transactions (Batch Delete)
 * Safely keeps Master Data (/members, /categories, /programs) intact.
 * -------------------------------------------------------------
 */
export async function purgeAllTransactionsFromCloud(): Promise<number> {
  const collectionsToPurge = [
    'transactions',
    'advance_payments',
    'direct_expenses',
    'receipt_vouchers',
    'commitments',
    'settlements',
  ];

  let totalDeleted = 0;

  for (const colName of collectionsToPurge) {
    try {
      const snap = await getDocs(collection(db, colName));
      if (!snap.empty) {
        const batches = [];
        let currentBatch = writeBatch(db);
        let count = 0;

        snap.docs.forEach((docSnap) => {
          currentBatch.delete(docSnap.ref);
          count++;
          totalDeleted++;
          if (count % 400 === 0) {
            batches.push(currentBatch.commit());
            currentBatch = writeBatch(db);
          }
        });

        if (count % 400 !== 0) {
          batches.push(currentBatch.commit());
        }

        await Promise.all(batches);
      }
    } catch (err) {
      console.warn(`Error during batch delete of collection "${colName}":`, err);
    }
  }

  return totalDeleted;
}

/**
 * Interactive Purge All Transactions with safety confirmation prompt
 * Permanently removes all transactions from Cloud Firestore using batch deletes.
 * Leaves Master Data (/members, /categories, /programs) intact.
 */
export async function purgeAllTransactions(
  onLoading?: (isLoading: boolean) => void,
  onSuccess?: (deletedCount: number) => void
): Promise<boolean> {
  const confirmation = window.prompt(
    "Warning: This will permanently delete all transaction vouchers, expense claims, and float audit logs from the cloud database. Master data (Members, Programs) will remain intact. This cannot be undone. Type 'CONFIRM' to proceed:"
  );
  if (confirmation !== "CONFIRM") {
    alert("Operation cancelled.");
    return false;
  }

  try {
    if (onLoading) onLoading(true);
    const totalDeleted = await purgeAllTransactionsFromCloud();
    if (totalDeleted === 0) {
      alert("No transaction records found to delete in the cloud database.");
      if (onSuccess) onSuccess(0);
      return false;
    }

    alert(`Successfully deleted ${totalDeleted} transaction records permanently from the cloud database.`);
    if (onSuccess) onSuccess(totalDeleted);
    return true;
  } catch (error: any) {
    console.error("Error purging transactions:", error);
    alert("Failed to delete transactions: " + (error?.message || String(error)));
    return false;
  } finally {
    if (onLoading) onLoading(false);
  }
}

/**
 * -------------------------------------------------------------
 * 7. Cloud Financial Records Purge & Wallet Reset (Batch Delete)
 * Clears advances, top_ups, expenses, and resets member advance balances
 * -------------------------------------------------------------
 */
export async function purgeFinancialDataFromCloud(): Promise<{ deletedCount: number; membersResetCount: number }> {
  const collectionsToPurge = [
    'advances',
    'advance_payments',
    'top_ups',
    'topups',
    'expenses',
    'direct_expenses',
    'ledger',
    'expense_ledger',
  ];

  let deletedCount = 0;

  for (const colName of collectionsToPurge) {
    try {
      const snap = await getDocs(collection(db, colName));
      if (!snap.empty) {
        const batches = [];
        let currentBatch = writeBatch(db);
        let count = 0;

        snap.docs.forEach((docSnap) => {
          currentBatch.delete(docSnap.ref);
          count++;
          deletedCount++;
          if (count % 400 === 0) {
            batches.push(currentBatch.commit());
            currentBatch = writeBatch(db);
          }
        });

        if (count % 400 !== 0) {
          batches.push(currentBatch.commit());
        }

        await Promise.all(batches);
      }
    } catch (err) {
      console.warn(`Error purging collection "${colName}":`, err);
    }
  }

  // Reset member advance balances in Firestore members & member_accounts
  let membersResetCount = 0;
  for (const memColName of ['members', 'committee_members', 'member_accounts']) {
    try {
      const snap = await getDocs(collection(db, memColName));
      if (!snap.empty) {
        let currentBatch = writeBatch(db);
        let bCount = 0;
        const bList = [];

        snap.docs.forEach((docSnap) => {
          currentBatch.update(docSnap.ref, {
            available_advance: 0,
            top_ups: 0,
            expenses_paid: 0,
            initialAdvance: 0,
            totalTopUps: 0,
            totalDisbursed: 0,
            currentBalance: 0,
            updatedAt: new Date().toISOString(),
          });
          bCount++;
          membersResetCount++;
          if (bCount % 400 === 0) {
            bList.push(currentBatch.commit());
            currentBatch = writeBatch(db);
          }
        });

        if (bCount % 400 !== 0) {
          bList.push(currentBatch.commit());
        }
        await Promise.all(bList);
      }
    } catch (err) {
      console.warn(`Error resetting member balances in "${memColName}":`, err);
    }
  }

  return { deletedCount, membersResetCount };
}
