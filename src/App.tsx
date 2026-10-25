/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { db, testConnection } from './firebase/config';
import { handleFirestoreError, OperationType } from './firebase/errors';
import {
  Commitment,
  ReceiptVoucher,
  Setting,
  UserProfile,
  ActiveSession,
  AppUser,
  DEFAULT_SETTING,
  CommitteeMember,
  ExpenseType,
  ReceiptType,
  AdvancePayment,
  DirectExpense,
  ProgramBooking,
  SettlementRecord,
  INITIAL_COMMITTEE_MEMBERS,
  INITIAL_EXPENSE_TYPES,
  INITIAL_ADVANCE_PAYMENTS,
  INITIAL_DIRECT_EXPENSES,
} from './types';
import { ProgramBookingModule } from './modules/ProgramBookingModule';
import {
  loadLocalCommitments,
  saveLocalCommitments,
  loadLocalReceiptVouchers,
  saveLocalReceiptVouchers,
  loadLocalSettlements,
  saveLocalSettlements,
  loadActiveVolunteerName,
  saveActiveVolunteerName,
  DEFAULT_VOLUNTEER_NAME,
  loadLocalSetting,
  saveLocalSetting,
  loadLocalCommitteeMembers,
  saveLocalCommitteeMembers,
  loadLocalExpenseTypes,
  saveLocalExpenseTypes,
  loadLocalReceiptTypes,
  saveLocalReceiptTypes,
  loadLocalAppUsers,
  saveLocalAppUsers,
  loadLocalAdvances,
  saveLocalAdvances,
  loadLocalDirectExpenses,
  saveLocalDirectExpenses,
  loadActiveSession,
  saveActiveSession,
  clearActiveSession,
  clearAllLocalMasterAndSampleData,
  clearLocalTransactionsOnly,
  purgeFinancialDataLocal,
} from './utils/storage';
import { Sidebar, AppNavTab } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { CommitmentForm } from './components/CommitmentForm';
import { ReceiptVoucherForm } from './components/ReceiptVoucherForm';
import { PayeeLedgerView } from './components/PayeeLedgerView';
import { ReceiptSlipModal } from './components/ReceiptSlipModal';
import { AdvanceDisbursementForm } from './components/AdvanceDisbursementForm';
import { DirectExpenseEntryForm } from './components/DirectExpenseEntryForm';
import { AdvanceExpenseDashboard } from './components/AdvanceExpenseDashboard';
import { MemberLedgerModal } from './components/MemberLedgerModal';
import { MasterDataManagementView } from './components/MasterDataManagementView';
import { ProgramBookingsView } from './components/ProgramBookingsView';
import { ProgramReportsView } from './components/ProgramReportsView';
import { MemberAdvanceLedgerView } from './components/MemberAdvanceLedgerView';
import { LoginModal } from './components/LoginModal';
import { StandaloneLoginScreen } from './components/StandaloneLoginScreen';
import { ResetFinancialDataModal } from './components/ResetFinancialDataModal';
import { TreasurerSettlementModal } from './components/TreasurerSettlementModal';
import {
  AuthUser,
  getCurrentUser,
  setCurrentUser as setAuthCurrentUser,
  canPerformAction,
  logout as authLogout,
} from './modules/auth';
import {
  saveMasterMember,
  deleteMasterMember,
  saveMasterCategory,
  deleteMasterCategory,
  saveAdvanceTransaction,
  deleteAdvanceRecord,
  saveDirectExpenseTransaction,
  deleteDirectExpenseRecord,
  saveReceiptVoucherTransaction,
  deleteReceiptVoucherRecord,
  saveCommitmentTransaction,
  deleteCommitmentRecord,
  saveSettlementTransaction,
  deleteSettlementRecord,
  purgeAllTransactions,
  purgeFinancialDataFromCloud,
} from './firebase/crud';
import {
  Menu,
  Wifi,
  WifiOff,
  User,
  Shield,
  RotateCw,
  RotateCcw,
  TrendingUp,
  FileText,
  Receipt,
  BookOpen,
  Database,
  Lock,
  KeyRound,
  LogOut,
  Sparkles,
  ChevronRight,
  Coins,
  Scale,
  Download,
  Calendar,
  FileSpreadsheet,
  Wallet,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  Smartphone,
} from 'lucide-react';
import {
  hideInitialSplashScreen,
  isStandaloneApp,
  previewSplashScreen,
} from './utils/splashScreen';

export default function App() {
  // Committee Advance & Direct Expense State
  const [advances, setAdvances] = useState<AdvancePayment[]>(() =>
    loadLocalAdvances()
  );
  const [directExpenses, setDirectExpenses] = useState<DirectExpense[]>(() =>
    loadLocalDirectExpenses()
  );

  // Program Bookings State
  const [programBookings, setProgramBookings] = useState<ProgramBooking[]>(() =>
    ProgramBookingModule.getBookings()
  );

  // Sync program bookings on module update
  useEffect(() => {
    const handleProgramUpdate = () => {
      setProgramBookings(ProgramBookingModule.getBookings());
    };
    window.addEventListener('program_booking_updated', handleProgramUpdate);
    window.addEventListener('storage', handleProgramUpdate);
    return () => {
      window.removeEventListener('program_booking_updated', handleProgramUpdate);
      window.removeEventListener('storage', handleProgramUpdate);
    };
  }, []);

  // Selected Member for Statement Modal
  const [selectedMemberForLedger, setSelectedMemberForLedger] = useState<CommitteeMember | null>(null);
  const [isMemberLedgerModalOpen, setIsMemberLedgerModalOpen] = useState(false);

  // Commitments & Receipt Vouchers Core State
  const [commitments, setCommitments] = useState<Commitment[]>(() =>
    loadLocalCommitments()
  );
  const [receiptVouchers, setReceiptVouchers] = useState<ReceiptVoucher[]>(() =>
    loadLocalReceiptVouchers()
  );
  const [settlements, setSettlements] = useState<SettlementRecord[]>(() =>
    loadLocalSettlements()
  );

  // Settlement Desk Modal State
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [selectedSettlementMemberId, setSelectedSettlementMemberId] = useState<string | undefined>(undefined);

  // Active Volunteer Simulation State (Default: "Admin Volunteer")
  const [activeVolunteerName, setActiveVolunteerName] = useState<string>(() =>
    loadActiveVolunteerName()
  );

  // Settings State
  const [setting, setSetting] = useState<Setting>(() => loadLocalSetting());

  // Multi-User Auth & RBAC State (Firestore /users & Firebase Auth)
  const [authProfile, setAuthProfile] = useState<AuthUser | null>(() => getCurrentUser());

  const [activeSession, setActiveSession] = useState<ActiveSession | null>(() =>
    loadActiveSession()
  );

  // Authentication & Reset Modal States
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isResetFinancialModalOpen, setIsResetFinancialModalOpen] = useState<boolean>(false);
  const [isResettingFinancial, setIsResettingFinancial] = useState<boolean>(false);

  // Keep authProfile in sync with event broadcasts
  useEffect(() => {
    const handleAuthChange = (e: any) => {
      const u = e.detail || getCurrentUser();
      setAuthProfile(u || null);
      if (u) {
        setActiveVolunteerName(u.name);
      }
    };
    window.addEventListener('auth_state_changed', handleAuthChange);
    return () => window.removeEventListener('auth_state_changed', handleAuthChange);
  }, []);

  const currentUser = {
    uid: authProfile?.uid || 'usr_guest',
    username: authProfile?.userId || 'guest',
    displayName: authProfile?.name || 'Guest User',
    role: (authProfile?.role === 'ADMIN' ? 'admin' : 'volunteer') as 'admin' | 'volunteer',
    phone: authProfile?.phone,
  };

  const isAdmin = authProfile?.role === 'ADMIN' || currentUser.role === 'admin';

  // Navigation State
  const [currentTab, setCurrentTab] = useState<AppNavTab>('dashboard');

  // Master Data Menu Access Guard: Only Chief Administrator can view or access Master Data
  useEffect(() => {
    if (!isAdmin && currentTab === 'master') {
      setCurrentTab('dashboard');
    }
  }, [isAdmin, currentTab]);

  // Master Users State
  const [appUsers, setAppUsers] = useState<AppUser[]>(() => loadLocalAppUsers());
  const [committeeMembers, setCommitteeMembers] = useState<CommitteeMember[]>(() =>
    loadLocalCommitteeMembers()
  );
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>(() =>
    loadLocalExpenseTypes()
  );
  const [receiptTypes, setReceiptTypes] = useState<ReceiptType[]>(() =>
    loadLocalReceiptTypes()
  );

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Workflow Inter-tab Redirection State
  const [preSelectedCommitment, setPreSelectedCommitment] = useState<Commitment | null>(null);
  const [initialSelectedPayeeForLedger, setInitialSelectedPayeeForLedger] = useState<string>('');

  // Modals State
  const [selectedReceiptForSlip, setSelectedReceiptForSlip] = useState<ReceiptVoucher | null>(null);

  // Online / Offline Sync State
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const [isStandalone, setIsStandalone] = useState<boolean>(() => isStandaloneApp());

  // Native Splash Screen & Standalone PWA Lifecycle
  useEffect(() => {
    hideInitialSplashScreen();
    setIsStandalone(isStandaloneApp());
  }, []);

  // Monitor Network Connectivity
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    testConnection().then((connected) => {
      console.log('Firebase ready status:', connected);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save local mirror on commitments changes
  useEffect(() => {
    saveLocalCommitments(commitments);
  }, [commitments]);

  // Save local mirror on vouchers changes
  useEffect(() => {
    saveLocalReceiptVouchers(receiptVouchers);
  }, [receiptVouchers]);

  // Save local mirror on settlements changes
  useEffect(() => {
    saveLocalSettlements(settlements);
  }, [settlements]);

  // ---------------------------------------------------------------------------
  // Real-Time Cloud Firestore Subscriptions
  // ---------------------------------------------------------------------------

  // 1. Listen to Commitments
  useEffect(() => {
    const commitmentsCollection = collection(db, 'commitments');
    const unsubscribe = onSnapshot(
      commitmentsCollection,
      (snapshot) => {
        const list: Commitment[] = [];
        snapshot.forEach((snap) => {
          const d = snap.data();
          list.push({
            id: snap.id,
            transaction_no: d.transaction_no || `CMT-${snap.id}`,
            name: d.name || '',
            house_name: d.house_name || '',
            date: d.date || '',
            place: d.place || 'ONAMPILLY',
            amount_committed: Number(d.amount_committed || 0),
            data_entry_user: d.data_entry_user || 'Admin Volunteer',
            created_at: d.created_at || new Date().toISOString(),
            updated_at: d.updated_at || '',
          });
        });
        setCommitments(list);
        saveLocalCommitments(list);
      },
      (err) => {
        console.warn('Commitments fetch fallback to local:', err.message);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Listen to Receipt Vouchers
  useEffect(() => {
    const vouchersCollection = collection(db, 'receipt_vouchers');
    const unsubscribe = onSnapshot(
      vouchersCollection,
      (snapshot) => {
        const list: ReceiptVoucher[] = [];
        snapshot.forEach((snap) => {
          const d = snap.data();
          list.push({
            id: snap.id,
            transaction_no: d.transaction_no || `RCP-${snap.id}`,
            commitment_id: d.commitment_id || undefined,
            receipt_no: d.receipt_no || '',
            date: d.date || '',
            name: d.name || '',
            house_name: d.house_name || '',
            place: d.place || 'ONAMPILLY',
            amount_committed: Number(d.amount_committed || 0),
            amount_received: Number(d.amount_received || 0),
            balance: Number(d.balance || 0),
            payment_mode: d.payment_mode === 'UPI' ? 'UPI' : 'Cash',
            amount_collected_by: d.amount_collected_by || 'Admin Volunteer',
            collectedByMemberId: d.collectedByMemberId || undefined,
            collectedByMemberName: d.collectedByMemberName || undefined,
            collectedByMemberRole: d.collectedByMemberRole || undefined,
            settlementStatus: d.settlementStatus || (d.collectedByMemberId ? 'In-Hand' : 'Settled'),
            settlementId: d.settlementId || undefined,
            settledAt: d.settledAt || undefined,
            created_at: d.created_at || new Date().toISOString(),
            updated_at: d.updated_at || '',
          });
        });
        setReceiptVouchers(list);
        saveLocalReceiptVouchers(list);
      },
      (err) => {
        console.warn('Receipt vouchers fetch fallback to local:', err.message);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2b. Listen to Settlements (Cash Handover to Treasurer Central Vault)
  useEffect(() => {
    const settlementsCollection = collection(db, 'settlements');
    const unsubscribe = onSnapshot(
      settlementsCollection,
      (snapshot) => {
        const list: SettlementRecord[] = [];
        snapshot.forEach((snap) => {
          const d = snap.data();
          list.push({
            id: snap.id,
            settlementNo: d.settlementNo || `SETTLE-${snap.id}`,
            date: d.date || '',
            memberId: d.memberId || '',
            memberName: d.memberName || '',
            designationRole: d.designationRole || 'Member',
            amount: Number(d.amount || 0),
            paymentMode:
              d.paymentMode === 'UPI' || d.paymentMode === 'UPI / Direct Bank Transfer'
                ? 'UPI / Direct Bank Transfer'
                : 'Cash',
            transactionRef: d.transactionRef || '',
            receivedByTreasurerName: d.receivedByTreasurerName || 'Treasurer',
            receivedByTreasurerId: d.receivedByTreasurerId || '',
            remarks: d.remarks || '',
            status: d.status || 'Settled',
            voucherIds: Array.isArray(d.voucherIds) ? d.voucherIds : [],
            createdAt: d.createdAt || new Date().toISOString(),
            updatedAt: d.updatedAt || new Date().toISOString(),
          });
        });
        setSettlements(list);
        saveLocalSettlements(list);
      },
      (err) => {
        console.warn('Settlements fetch fallback to local:', err.message);
      }
    );
    return () => unsubscribe();
  }, []);

  // 3. Listen to Advance Disbursements
  useEffect(() => {
    const advancesCollection = collection(db, 'advance_payments');
    const unsubscribe = onSnapshot(
      advancesCollection,
      (snapshot) => {
        const list: AdvancePayment[] = [];
        snapshot.forEach((snap) => {
          const d = snap.data();
          list.push({
            id: snap.id,
            voucher_no: d.voucher_no || `ADV-${snap.id}`,
            date: d.date || '',
            member_id: d.member_id || '',
            member_name: d.member_name || '',
            payment_mode: d.payment_mode || 'Cash',
            amount: Number(d.amount || 0),
            purpose: d.purpose || '',
            remarks: d.remarks || '',
            paid_by_user: d.paid_by_user || 'Admin Volunteer',
            created_at: d.created_at || new Date().toISOString(),
            updated_at: d.updated_at || '',
          });
        });
        setAdvances(list);
        saveLocalAdvances(list);
      },
      (err) => {
        console.warn('Advances fetch fallback to local:', err.message);
      }
    );
    return () => unsubscribe();
  }, []);

  // 4. Listen to Direct Expenses
  useEffect(() => {
    const expensesCollection = collection(db, 'direct_expenses');
    const unsubscribe = onSnapshot(
      expensesCollection,
      (snapshot) => {
        const list: DirectExpense[] = [];
        snapshot.forEach((snap) => {
          const d = snap.data();
          list.push({
            id: snap.id,
            voucher_no: d.voucher_no || `EXP-${snap.id}`,
            date: d.date || '',
            expense_type_id: d.expense_type_id || '',
            expense_type_name: d.expense_type_name || '',
            expense_name: d.expense_name || '',
            member_id: d.member_id || '',
            claimed_by: d.claimed_by || '',
            amount: Number(d.amount || 0),
            bill_reference: d.bill_reference || '',
            remarks: d.remarks || '',
            recorded_by: d.recorded_by || 'Admin Volunteer',
            created_at: d.created_at || new Date().toISOString(),
            updated_at: d.updated_at || '',
          });
        });
        setDirectExpenses(list);
        saveLocalDirectExpenses(list);
      },
      (err) => {
        console.warn('Direct expenses fetch fallback to local:', err.message);
      }
    );
    return () => unsubscribe();
  }, []);

  // 5. Listen to Settings
  useEffect(() => {
    const settingDoc = doc(db, 'settings', 'general_config');
    const unsubscribe = onSnapshot(
      settingDoc,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Setting;
          setSetting((prev) => ({ ...prev, ...data }));
          saveLocalSetting(data);
        }
      },
      (err) => {
        console.warn('Settings fetch fallback to local:', err.message);
      }
    );
    return () => unsubscribe();
  }, []);

  // 6. Listen to Committee Members
  useEffect(() => {
    const membersCollection = collection(db, 'committee_members');
    const unsubscribe = onSnapshot(
      membersCollection,
      (snapshot) => {
        const list: CommitteeMember[] = [];
        snapshot.forEach((snap) => {
          const d = snap.data();
          list.push({
            id: snap.id,
            memberId: d.memberId || snap.id,
            name: d.name || d.fullName || '',
            fullName: d.fullName || d.name || '',
            phone: d.phone || '',
            designation: d.designation || d.designationRole || 'Member',
            designationRole: d.designationRole || d.designation || 'Member',
            active: d.active !== false && d.status !== 'Inactive',
            status: d.status || (d.active !== false ? 'Active' : 'Inactive'),
            createdAt: d.createdAt || new Date().toISOString(),
            updatedAt: d.updatedAt || new Date().toISOString(),
            role: (d.role as 'ADMIN' | 'USER') || 'USER',
            userId: d.userId,
            password: d.password,
            passwordLastChangedAt: d.passwordLastChangedAt,
          });
        });
        setCommitteeMembers(list);
        saveLocalCommitteeMembers(list);
      },
      (err) => {
        console.warn('Committee members fetch fallback:', err.message);
      }
    );
    return () => unsubscribe();
  }, []);

  // 7. Listen to Expense Types
  useEffect(() => {
    const typesCollection = collection(db, 'expense_types');
    const unsubscribe = onSnapshot(
      typesCollection,
      (snapshot) => {
        const list: ExpenseType[] = [];
        snapshot.forEach((snap) => {
          const d = snap.data();
          list.push({
            id: snap.id,
            nameEnglish: d.nameEnglish || '',
            nameMalayalam: d.nameMalayalam || '',
            active: d.active !== false,
            createdAt: d.createdAt || new Date().toISOString(),
            updatedAt: d.updatedAt || new Date().toISOString(),
          });
        });
        setExpenseTypes(list);
        saveLocalExpenseTypes(list);
      },
      (err) => {
        console.warn('Expense types fetch fallback:', err.message);
      }
    );
    return () => unsubscribe();
  }, []);

  // 8. Listen to App Users
  useEffect(() => {
    const usersCollection = collection(db, 'app_users');
    const unsubscribe = onSnapshot(
      usersCollection,
      (snapshot) => {
        const list: AppUser[] = [];
        snapshot.forEach((snap) => {
          list.push(snap.data() as AppUser);
        });
        setAppUsers(list);
        saveLocalAppUsers(list);
      },
      (err) => {
        console.warn('App users fetch fallback:', err.message);
      }
    );
    return () => unsubscribe();
  }, []);

  // 9. Listen to Programs in Firestore (/programs)
  useEffect(() => {
    const programsCollection = collection(db, 'programs');
    const unsubscribe = onSnapshot(
      programsCollection,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: ProgramBooking[] = [];
          snapshot.forEach((snap) => {
            list.push(snap.data() as ProgramBooking);
          });
          setProgramBookings(list);
          ProgramBookingModule.saveBookings(list);
        }
      },
      (err) => {
        console.warn('Programs Firestore listener notice:', err.message);
      }
    );
    return () => unsubscribe();
  }, []);

  // ---------------------------------------------------------------------------
  // Action Handlers
  // ---------------------------------------------------------------------------

  // Commitments CRUD
  const handleSaveCommitment = async (commitment: Commitment) => {
    setCommitments((prev) => {
      const idx = prev.findIndex((c) => c.id === commitment.id);
      const updated = idx >= 0 ? prev.map((c) => (c.id === commitment.id ? commitment : c)) : [commitment, ...prev];
      saveLocalCommitments(updated);
      return updated;
    });

    try {
      await saveCommitmentTransaction(commitment);
    } catch (err) {
      console.warn('Save commitment Firestore error:', err);
    }

    setSyncToast(`Commitment ${commitment.transaction_no} saved successfully`);
    setTimeout(() => setSyncToast(null), 3000);
  };

  const handleDeleteCommitment = async (id: string) => {
    setCommitments((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveLocalCommitments(updated);
      return updated;
    });

    try {
      await deleteCommitmentRecord(id);
    } catch (err) {
      console.warn('Delete commitment Firestore error:', err);
    }

    setSyncToast('Commitment record permanently deleted');
    setTimeout(() => setSyncToast(null), 2500);
  };

  // Receipt Vouchers CRUD
  const handleSaveReceiptVoucher = async (voucher: ReceiptVoucher) => {
    setReceiptVouchers((prev) => {
      const idx = prev.findIndex((v) => v.id === voucher.id);
      const updated = idx >= 0 ? prev.map((v) => (v.id === voucher.id ? voucher : v)) : [voucher, ...prev];
      saveLocalReceiptVouchers(updated);
      return updated;
    });

    try {
      await saveReceiptVoucherTransaction(voucher);
    } catch (err) {
      console.warn('Save voucher Firestore error:', err);
    }

    setSyncToast(`Receipt Voucher #${voucher.receipt_no} issued successfully!`);
    setTimeout(() => setSyncToast(null), 3000);
  };

  const handleDeleteReceiptVoucher = async (id: string) => {
    setReceiptVouchers((prev) => {
      const updated = prev.filter((v) => v.id !== id);
      saveLocalReceiptVouchers(updated);
      return updated;
    });

    try {
      await deleteReceiptVoucherRecord(id);
    } catch (err) {
      console.warn('Delete voucher Firestore error:', err);
    }

    setSyncToast('Receipt voucher permanently deleted');
    setTimeout(() => setSyncToast(null), 2500);
  };

  // Settlement Handlers (Double-Entry Turnover to Treasurer Central Vault)
  const handleSaveSettlement = async (
    settlementData: SettlementRecord,
    voucherIds: string[] = []
  ) => {
    try {
      const savedId = await saveSettlementTransaction(settlementData, voucherIds);
      const record: SettlementRecord = {
        ...settlementData,
        id: savedId || settlementData.id,
      };
      setSettlements((prev) => [record, ...prev.filter((s) => s.id !== record.id)]);
      saveLocalSettlements([record, ...settlements.filter((s) => s.id !== record.id)]);

      // If voucher IDs were settled, update local vouchers status
      if (voucherIds && voucherIds.length > 0) {
        setReceiptVouchers((prev) => {
          const updated = prev.map((v) =>
            voucherIds.includes(v.id)
              ? {
                  ...v,
                  settlementStatus: 'Settled' as const,
                  settlementId: record.id,
                  settledAt: record.date,
                }
              : v
          );
          saveLocalReceiptVouchers(updated);
          return updated;
        });
      }

      setSyncToast(`Turnover settlement #${record.settlementNo} recorded in Treasurer Central Vault!`);
      setTimeout(() => setSyncToast(null), 3000);
    } catch (err: any) {
      console.error('Error saving settlement:', err);
      alert('Failed to record settlement: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDeleteSettlement = async (id: string) => {
    if (!canPerformAction('DELETE')) {
      alert('Permission denied: Only Administrators can delete settlement records.');
      return;
    }
    try {
      await deleteSettlementRecord(id);
      setSettlements((prev) => {
        const updated = prev.filter((s) => s.id !== id);
        saveLocalSettlements(updated);
        return updated;
      });
      setSyncToast('Settlement record deleted');
      setTimeout(() => setSyncToast(null), 2500);
    } catch (err: any) {
      console.error('Error deleting settlement:', err);
      alert('Failed to delete settlement: ' + (err.message || 'Unknown error'));
    }
  };

  // Workflow Quick Actions
  const handleSelectForCollection = (commitment: Commitment) => {
    setPreSelectedCommitment(commitment);
    setCurrentTab('receipts');
  };

  const handleSelectForLedger = (payeeName: string) => {
    setInitialSelectedPayeeForLedger(payeeName);
    setCurrentTab('ledger');
  };

  // Purge All Master Data, Users, Commitments, and Vouchers
  const handlePurgeAllMasterAndSampleData = async () => {
    if (!canPerformAction('RESET')) {
      setSyncToast('Permission denied: Only Administrators can purge database records.');
      setTimeout(() => setSyncToast(null), 3000);
      return;
    }

    setCommitments([]);
    setReceiptVouchers([]);
    setCommitteeMembers([]);
    setExpenseTypes([]);
    setReceiptTypes([]);
    setAppUsers([]);
    clearAllLocalMasterAndSampleData();

    if (navigator.onLine) {
      const collectionsToWipe = [
        'commitments',
        'receipt_vouchers',
        'transactions',
        'committee_members',
        'members',
        'categories',
        'expense_types',
        'receipt_types',
        'app_users',
      ];
      for (const colName of collectionsToWipe) {
        try {
          const snap = await getDocs(collection(db, colName));
          const deletes = snap.docs.map((d) => deleteDoc(doc(db, colName, d.id)));
          await Promise.all(deletes);
        } catch (e) {
          console.warn(`Purge ${colName} error:`, e);
        }
      }
    }
    setSyncToast('All master data, commitments, and vouchers successfully purged!');
    setTimeout(() => setSyncToast(null), 3500);
  };

  // Settings & Master Data Handlers
  const handleSaveSetting = async (newSetting: Setting) => {
    setSetting(newSetting);
    saveLocalSetting(newSetting);
    if (navigator.onLine) {
      try {
        await setDoc(doc(db, 'settings', 'general_config'), newSetting);
      } catch (err) {
        console.warn('Save settings Firestore error:', err);
      }
    }
  };

  const handleSaveMember = async (member: CommitteeMember) => {
    setCommitteeMembers((prev) => {
      const idx = prev.findIndex((m) => m.id === member.id);
      const updated = idx >= 0 ? prev.map((m) => (m.id === member.id ? member : m)) : [member, ...prev];
      saveLocalCommitteeMembers(updated);
      return updated;
    });
    if (navigator.onLine) {
      try {
        await saveMasterMember(member);
      } catch (err: any) {
        setSyncToast(err.message || 'Error saving member');
      }
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!canPerformAction('DELETE')) {
      setSyncToast('Permission denied: Only Administrators can delete master member records.');
      setTimeout(() => setSyncToast(null), 3000);
      return;
    }

    setCommitteeMembers((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      saveLocalCommitteeMembers(updated);
      return updated;
    });

    // Synchronize removal with member advance wallets
    try {
      ProgramBookingModule.deleteMemberAccount(id);
    } catch (e) {
      console.warn('Could not sync member deletion to ProgramBookingModule:', e);
    }

    if (navigator.onLine) {
      try {
        await deleteMasterMember(id);
      } catch (err: any) {
        setSyncToast(err.message || 'Error deleting member');
      }
    }
  };

  const handleSaveExpenseType = async (type: ExpenseType) => {
    setExpenseTypes((prev) => {
      const idx = prev.findIndex((t) => t.id === type.id);
      const updated = idx >= 0 ? prev.map((t) => (t.id === type.id ? type : t)) : [type, ...prev];
      saveLocalExpenseTypes(updated);
      return updated;
    });
    if (navigator.onLine) {
      try {
        await saveMasterCategory(type);
      } catch (err: any) {
        setSyncToast(err.message || 'Error saving expense category');
      }
    }
  };

  const handleDeleteExpenseType = async (id: string) => {
    if (!canPerformAction('DELETE')) {
      setSyncToast('Permission denied: Only Administrators can delete expense categories.');
      setTimeout(() => setSyncToast(null), 3000);
      return;
    }

    setExpenseTypes((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveLocalExpenseTypes(updated);
      return updated;
    });
    if (navigator.onLine) {
      try {
        await deleteMasterCategory(id);
      } catch (err: any) {
        setSyncToast(err.message || 'Error deleting expense category');
      }
    }
  };

  const handleSaveReceiptType = async (type: ReceiptType) => {
    setReceiptTypes((prev) => {
      const idx = prev.findIndex((t) => t.id === type.id);
      const updated = idx >= 0 ? prev.map((t) => (t.id === type.id ? type : t)) : [type, ...prev];
      saveLocalReceiptTypes(updated);
      return updated;
    });
    if (navigator.onLine) {
      try {
        await setDoc(doc(db, 'receipt_types', type.id), type);
      } catch {}
    }
  };

  const handleDeleteReceiptType = async (id: string) => {
    if (!canPerformAction('DELETE')) {
      setSyncToast('Permission denied: Only Administrators can delete receipt types.');
      setTimeout(() => setSyncToast(null), 3000);
      return;
    }

    setReceiptTypes((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      saveLocalReceiptTypes(updated);
      return updated;
    });
    if (navigator.onLine) {
      try {
        await deleteDoc(doc(db, 'receipt_types', id));
      } catch {}
    }
  };

  const handleSaveAppUser = async (user: AppUser) => {
    setAppUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === user.id);
      const updated = idx >= 0 ? prev.map((u) => (u.id === user.id ? user : u)) : [user, ...prev];
      saveLocalAppUsers(updated);
      return updated;
    });
    if (navigator.onLine) {
      try {
        await setDoc(doc(db, 'app_users', user.id), user);
      } catch {}
    }
  };

  const handleDeleteAppUser = async (id: string) => {
    if (!canPerformAction('DELETE')) {
      setSyncToast('Permission denied: Only Administrators can delete user profiles.');
      setTimeout(() => setSyncToast(null), 3000);
      return;
    }

    setAppUsers((prev) => {
      const updated = prev.filter((u) => u.id !== id);
      saveLocalAppUsers(updated);
      return updated;
    });
    if (navigator.onLine) {
      try {
        await deleteDoc(doc(db, 'app_users', id));
      } catch {}
    }
  };

  const handlePurgeAllTransactions = async () => {
    await purgeAllTransactions(
      (loading) => {
        if (loading) {
          setSyncToast('Purging all transactions from Cloud Firestore...');
        }
      },
      (count) => {
        setAdvances([]);
        setDirectExpenses([]);
        setReceiptVouchers([]);
        setCommitments([]);
        clearLocalTransactionsOnly();
        setSyncToast(`Successfully purged ${count} transaction records from the cloud.`);
        setTimeout(() => setSyncToast(null), 3500);
      }
    );
  };

  const handleLogout = async () => {
    try {
      await authLogout();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    clearActiveSession();
    setActiveSession(null);
    setAuthProfile(null);
    setActiveVolunteerName('Volunteer Desk');
    setSyncToast('Logged out successfully.');
    setTimeout(() => setSyncToast(null), 2500);
    setIsLoginModalOpen(false);
  };

  const handleLoginSuccess = (user: AuthUser) => {
    setAuthProfile(user);
    setActiveVolunteerName(user.name);
    setAuthCurrentUser(user);
    setIsLoginModalOpen(false);
    setSyncToast(`Authenticated as ${user.name} (${user.role})`);
    setTimeout(() => setSyncToast(null), 3000);
  };

  const handleResetFinancialData = async () => {
    setIsResettingFinancial(true);
    try {
      // 1. Purge from Cloud Firestore (batch delete advances, top_ups, expenses, reset member wallets)
      await purgeFinancialDataFromCloud();

      // 2. Purge from Local Storage
      purgeFinancialDataLocal();
      ProgramBookingModule.resetFinancialData();

      // 3. Reset React state immediately
      setAdvances([]);
      setDirectExpenses([]);

      // Reset member accounts in committeeMembers state
      setCommitteeMembers((prev) =>
        prev.map((m) => ({
          ...m,
          available_advance: 0,
          top_ups: 0,
          expenses_paid: 0,
        }))
      );

      // 4. Dispatch updates so all listening components immediately re-render
      window.dispatchEvent(new CustomEvent('program_booking_updated'));
      window.dispatchEvent(new CustomEvent('storage'));

      setSyncToast('Financial records purged. All advance wallets, top-ups, and metrics reset to ₹0.00.');
      setTimeout(() => setSyncToast(null), 4000);
    } catch (err: any) {
      console.error('Error during financial reset:', err);
      setSyncToast('Failed to reset financial data: ' + (err?.message || String(err)));
      throw err;
    } finally {
      setIsResettingFinancial(false);
      setIsResetFinancialModalOpen(false);
    }
  };

  // -------------------------------------------------------------
  // Advance & Direct Expense Handlers (Firestore CRUD)
  // -------------------------------------------------------------
  const handleSaveAdvance = async (newAdvance: AdvancePayment) => {
    setAdvances((prev) => {
      const idx = prev.findIndex((a) => a.id === newAdvance.id);
      const updated = idx >= 0 ? prev.map((a) => (a.id === newAdvance.id ? newAdvance : a)) : [newAdvance, ...prev];
      saveLocalAdvances(updated);
      return updated;
    });

    try {
      await saveAdvanceTransaction(newAdvance);
    } catch (err) {
      console.warn('Save advance error:', err);
    }

    setSyncToast(`Advance ${newAdvance.voucher_no} recorded successfully`);
    setTimeout(() => setSyncToast(null), 2500);
  };

  const handleDeleteAdvance = async (id: string) => {
    setAdvances((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      saveLocalAdvances(updated);
      return updated;
    });

    try {
      await deleteAdvanceRecord(id);
    } catch (err) {
      console.warn('Delete advance error:', err);
    }

    setSyncToast('Advance disbursement voucher permanently deleted');
    setTimeout(() => setSyncToast(null), 2500);
  };

  const handleSaveDirectExpense = async (newExpense: DirectExpense) => {
    setDirectExpenses((prev) => {
      const idx = prev.findIndex((e) => e.id === newExpense.id);
      const updated = idx >= 0 ? prev.map((e) => (e.id === newExpense.id ? newExpense : e)) : [newExpense, ...prev];
      saveLocalDirectExpenses(updated);
      return updated;
    });

    try {
      await saveDirectExpenseTransaction(newExpense);
    } catch (err) {
      console.warn('Save expense error:', err);
    }

    setSyncToast(`Expense voucher ${newExpense.voucher_no} saved successfully`);
    setTimeout(() => setSyncToast(null), 2500);
  };

  const handleDeleteDirectExpense = async (id: string) => {
    setDirectExpenses((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveLocalDirectExpenses(updated);
      return updated;
    });

    try {
      await deleteDirectExpenseRecord(id);
    } catch (err) {
      console.warn('Delete expense error:', err);
    }

    setSyncToast('Expense voucher record permanently deleted');
    setTimeout(() => setSyncToast(null), 2500);
  };

  const handleOpenMemberLedger = (member: CommitteeMember) => {
    setSelectedMemberForLedger(member);
    setIsMemberLedgerModalOpen(true);
  };

  const handleToggleMemberStatus = async (id: string) => {
    const member = committeeMembers.find((m) => m.id === id);
    if (!member) return;
    const updatedMember = { ...member, active: !member.active, updatedAt: new Date().toISOString() };
    setCommitteeMembers((prev) => prev.map((m) => (m.id === id ? updatedMember : m)));
    saveLocalCommitteeMembers(committeeMembers.map((m) => (m.id === id ? updatedMember : m)));

    try {
      await setDoc(doc(db, 'committee_members', id), updatedMember);
    } catch (err) {
      console.warn('Toggle member status error:', err);
    }
  };

  const handleToggleExpenseTypeStatus = async (id: string) => {
    const type = expenseTypes.find((t) => t.id === id);
    if (!type) return;
    const updatedType = { ...type, active: !type.active, updatedAt: new Date().toISOString() };
    setExpenseTypes((prev) => prev.map((t) => (t.id === id ? updatedType : t)));
    saveLocalExpenseTypes(expenseTypes.map((t) => (t.id === id ? updatedType : t)));

    try {
      await setDoc(doc(db, 'expense_types', id), updatedType);
    } catch (err) {
      console.warn('Toggle expense type status error:', err);
    }
  };

  const handleResetSeedData = () => {
    // Zero mock/sample data: Preserve live records, no automatic overwrite on reset
  };

  const handleDownloadStandaloneHtml = () => {
    const link = document.createElement('a');
    link.href = '/advance-expense-system.html';
    link.download = 'committee-advance-expense-system.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Tab Info Meta
  const tabTitles: Record<AppNavTab, { title: string; sub: string; icon: any }> = {
    dashboard: {
      title: 'Committee Advance & Direct Expense Dashboard',
      sub: 'Summary metrics, member floating cash, and unified transactions feed',
      icon: TrendingUp,
    },
    advances: {
      title: 'Pay Advance to Committee Member (Module 2)',
      sub: 'Disburse cash or digital float advances with member balance update',
      icon: Coins,
    },
    expenses: {
      title: 'Direct Expense Voucher Entry (Module 3)',
      sub: 'Record spent bills with supporting vouchers and live dynamic balance card',
      icon: Receipt,
    },
    member_ledgers: {
      title: 'Committee Member Ledgers & Statements (Module 4)',
      sub: 'Detailed transaction timeline, debits, credits, and running balance',
      icon: BookOpen,
    },
    master: {
      title: 'Master Data Management (Module 1)',
      sub: 'Committee members and expense categories with full CRUD',
      icon: Database,
    },
    commitments: {
      title: 'Festival Donor Commitments (Pledge Register)',
      sub: 'Record devotee pledges with unique CMT identifiers',
      icon: FileText,
    },
    receipts: {
      title: 'Donor Receipt Vouchers (Collection Desk)',
      sub: 'Record collections, multi-installments, and issue slips',
      icon: Scale,
    },
    ledger: {
      title: 'Donor Payee Ledger & Statement',
      sub: 'Chronological donor audit history and net balances',
      icon: BookOpen,
    },
    programs: {
      title: 'New Booking & Program Overview',
      sub: 'Artist scheduling, coordinator contacts, and float balance grid',
      icon: Calendar,
    },
    program_wallets: {
      title: 'Member Advance Wallets & Expense Ledger',
      sub: 'Double-entry advance balance pools, disbursements & audit trail',
      icon: Wallet,
    },
    program_reports: {
      title: 'Reports & Financial Summary',
      sub: 'Contract values, advance floats, settlements, and PDF statements',
      icon: FileSpreadsheet,
    },
  };

  const currentTabInfo = tabTitles[currentTab] || tabTitles.dashboard;
  const TabIcon = currentTabInfo.icon;

  // Unauthenticated / Logged Out: Render only the clean Standalone Login Screen
  if (!authProfile) {
    return (
      <StandaloneLoginScreen
        onLoginSuccess={handleLoginSuccess}
        setting={setting}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden relative text-stone-100 font-sans selection:bg-amber-500/30">
      {/* Full-Screen Window Background Image */}
      <div
        className="fixed inset-0 pointer-events-none -z-10 bg-cover bg-center bg-no-repeat transition-all duration-1000 scale-100"
        style={{
          backgroundImage: `url('/assets/aistudio/Gemini_Generated_Image_te35te35te35te35_b921a4ad.png')`,
        }}
      />
      {/* Atmospheric Warm Dark Vignette & Shading */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-gradient-to-b from-stone-950/85 via-stone-950/75 to-stone-950/90 backdrop-blur-[2px]" />
      <div className="fixed inset-0 pointer-events-none -z-10 bg-radial from-transparent via-stone-950/30 to-stone-950/80" />

      {/* Toast Notification */}
      {syncToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold border border-emerald-700 animate-bounce">
          <span>☁️</span>
          <span>{syncToast}</span>
        </div>
      )}

      {/* Desktop Fixed Left Sidebar (100vh) */}
      <div className="hidden md:flex h-full shrink-0">
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          currentUser={currentUser}
          authRole={authProfile?.role || 'USER'}
          activeVolunteerName={activeVolunteerName}
          setting={setting}
          isOnline={isOnline}
          offlineCount={0}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          onOpenSettings={() => setCurrentTab('master')}
          onOpenAuth={() => setIsLoginModalOpen(true)}
          onLogout={handleLogout}
          onSyncOffline={() => {}}
          isSyncing={false}
        />
      </div>

      {/* Mobile Slide-Over Sidebar Drawer */}
      {isMobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative z-50 h-full">
            <Sidebar
              currentTab={currentTab}
              setCurrentTab={(tab) => {
                setCurrentTab(tab);
                setIsMobileSidebarOpen(false);
              }}
              currentUser={currentUser}
              authRole={authProfile?.role || 'USER'}
              activeVolunteerName={activeVolunteerName}
              setting={setting}
              isOnline={isOnline}
              offlineCount={0}
              isCollapsed={false}
              setIsCollapsed={() => {}}
              onOpenSettings={() => {
                setCurrentTab('master');
                setIsMobileSidebarOpen(false);
              }}
              onOpenAuth={() => {
                setIsLoginModalOpen(true);
                setIsMobileSidebarOpen(false);
              }}
              onLogout={handleLogout}
              onSyncOffline={() => {}}
              isSyncing={false}
            />
          </div>
        </div>
      )}

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Viewport Navigation Bar */}
        <header className="no-print shrink-0 bg-stone-950/75 backdrop-blur-md border-b border-amber-500/20 px-2.5 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-3 shadow-md z-20 text-stone-100">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-xl text-stone-300 hover:text-white hover:bg-stone-800 transition cursor-pointer"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* View Title */}
            <div className="flex items-center gap-2 sm:gap-2.5 truncate">
              <div className="p-1.5 sm:p-2 rounded-xl bg-amber-500/20 text-amber-300 shrink-0 border border-amber-500/40">
                <TabIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
              </div>
              <div className="truncate">
                <h2 className="text-xs sm:text-base font-extrabold text-amber-100 truncate tracking-tight">
                  {currentTabInfo.title}
                </h2>
                <p className="text-[10px] sm:text-[11px] text-amber-300/80 truncate hidden sm:block">
                  {currentTabInfo.sub}
                </p>
              </div>
            </div>
          </div>

          {/* Top Right User & Network Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Download Standalone Single File Button */}
            <button
              type="button"
              onClick={handleDownloadStandaloneHtml}
              className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-amber-500/30 text-amber-200 text-xs font-bold transition cursor-pointer"
              title="Download executable standalone index.html file"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Standalone HTML</span>
            </button>

            {/* Native Mobile App Indicator / Splash Screen Preview */}
            <button
              type="button"
              onClick={() => previewSplashScreen(1600)}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-bold transition cursor-pointer"
              title="Preview native mobile app splash screen"
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              <span>{isStandalone ? 'Native App' : 'Splash Screen'}</span>
            </button>

            {/* Cloud Status */}
            <div className="hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-stone-900/80 border border-amber-500/30 text-stone-300">
              {isOnline ? (
                <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                  <Wifi className="w-3 h-3 text-emerald-400" />
                  <span>Cloud Active</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400 font-bold text-[11px]">
                  <WifiOff className="w-3 h-3 text-amber-400" />
                  <span>Offline Local</span>
                </span>
              )}
            </div>

            {/* Reset / Purge Financial Data Action Trigger (Admin Only) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsResetFinancialModalOpen(true)}
                className="btn-reset flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-950/70 hover:bg-rose-900/80 text-rose-200 font-extrabold text-xs shadow-2xs transition cursor-pointer border border-rose-700/60 shrink-0"
                title="Admin Action: Reset / Purge Financial Data (advances, top-ups, expenses, wallets)"
                data-action="reset"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Reset Financial Data</span>
                <span className="sm:hidden">Reset</span>
              </button>
            )}

            {/* Navbar Session Bar: User Profile Badge & Log Out */}
            {authProfile ? (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-stone-900/80 border border-amber-500/30 rounded-xl px-2 py-1 sm:px-2.5 sm:py-1.5 shadow-2xs">
                {/* User Avatar */}
                <div
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    authProfile.role === 'ADMIN'
                      ? 'bg-amber-600 text-stone-950 shadow-2xs'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {authProfile.name.charAt(0).toUpperCase()}
                </div>

                {/* Name & Role Badge */}
                <div className="flex flex-col text-left leading-none min-w-0">
                  <span className="text-xs font-bold text-amber-100 truncate max-w-[90px] sm:max-w-[140px]">
                    {authProfile.name}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded tracking-wide ${
                        authProfile.role === 'ADMIN'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {authProfile.role}
                    </span>
                  </div>
                </div>

                {/* Switch User shortcut */}
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="p-1 text-stone-400 hover:text-amber-200 hover:bg-stone-800 rounded transition cursor-pointer"
                  title="Switch / Authenticate Account"
                >
                  <RotateCw className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs shadow-xs transition cursor-pointer shrink-0"
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}

            {/* Prominent Log Out Button */}
            {authProfile && (
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 border border-rose-800/60 font-bold text-xs shadow-2xs transition cursor-pointer shrink-0 active:scale-95"
                title="Log Out and end session"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Log Out</span>
                <span className="sm:hidden">Exit</span>
              </button>
            )}
          </div>
        </header>

        {/* Viewport Content Area */}
        <main className="flex-1 overflow-y-auto p-2.5 sm:p-5 lg:p-8 space-y-3.5 sm:space-y-6">
          <div key={currentTab} className="animate-menu-flip w-full space-y-3.5 sm:space-y-6">
          {currentTab === 'dashboard' && (
            <AdvanceExpenseDashboard
              committeeMembers={committeeMembers}
              expenseTypes={expenseTypes}
              advances={advances}
              expenses={directExpenses}
              receipts={receiptVouchers}
              programBookings={programBookings}
              settlements={settlements}
              commitments={commitments}
              setting={setting}
              onNavigateTab={(tab) => setCurrentTab(tab as AppNavTab)}
              onPayAdvanceToMember={(member) => {
                setCurrentTab('advances');
              }}
              onAddExpenseForMember={(member) => {
                setCurrentTab('expenses');
              }}
              onViewMemberLedger={handleOpenMemberLedger}
              onDeleteAdvance={handleDeleteAdvance}
              onDeleteExpense={handleDeleteDirectExpense}
              onDownloadStandaloneHtml={handleDownloadStandaloneHtml}
              onOpenSettlementModal={(memberId) => {
                setSelectedSettlementMemberId(memberId);
                setIsSettlementModalOpen(true);
              }}
            />
          )}

          {currentTab === 'advances' && (
            <AdvanceDisbursementForm
              committeeMembers={committeeMembers}
              advances={advances}
              expenses={directExpenses}
              activeVolunteerName={activeVolunteerName}
              onSaveAdvance={handleSaveAdvance}
              onDeleteAdvance={handleDeleteAdvance}
              onViewMemberLedger={handleOpenMemberLedger}
              isAdmin={isAdmin}
            />
          )}

          {currentTab === 'expenses' && (
            <DirectExpenseEntryForm
              committeeMembers={committeeMembers}
              expenseTypes={expenseTypes}
              expenses={directExpenses}
              advances={advances}
              activeVolunteerName={activeVolunteerName}
              onSaveExpense={handleSaveDirectExpense}
              onDeleteExpense={handleDeleteDirectExpense}
              onViewMemberLedger={handleOpenMemberLedger}
              isAdmin={isAdmin}
            />
          )}

          {currentTab === 'member_ledgers' && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-stone-900">
                    Committee Member Statements Directory
                  </h2>
                  <p className="text-xs text-stone-500">
                    Select any committee member to open their complete running balance statement.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {committeeMembers.map((m) => (
                  <div
                    key={m.id}
                    className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs flex flex-col justify-between hover:border-amber-400 transition dashboard-tile-zoom"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-extrabold text-stone-900 text-sm">{m.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.active ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-500'}`}>
                          {m.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1">{m.designation}</p>
                      <p className="text-xs font-mono text-stone-600 mt-0.5">+91 {m.phone}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenMemberLedger(m)}
                      className="mt-4 w-full py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                      <span>View Statement & Timeline</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentTab === 'master' && (
            isAdmin ? (
              <MasterDataManagementView
                committeeMembers={committeeMembers}
                expenseTypes={expenseTypes}
                onSaveMember={handleSaveMember}
                onDeleteMember={handleDeleteMember}
                onToggleMemberStatus={handleToggleMemberStatus}
                onSaveExpenseType={handleSaveExpenseType}
                onDeleteExpenseType={handleDeleteExpenseType}
                onToggleExpenseTypeStatus={handleToggleExpenseTypeStatus}
                onResetSeedData={handleResetSeedData}
                onPurgeAllTransactions={handlePurgeAllTransactions}
              />
            ) : (
              <div className="p-8 text-center bg-white rounded-3xl border border-stone-200 shadow-sm max-w-lg mx-auto my-12">
                <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-stone-900">Access Restricted</h3>
                <p className="text-xs text-stone-600 mt-1">
                  Master Data management (Members, Expense Types & System Configurations) is restricted to Chief Administrators only.
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentTab('dashboard')}
                  className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            )
          )}

          {currentTab === 'commitments' && (
            <CommitmentForm
              commitments={commitments}
              receiptVouchers={receiptVouchers}
              activeVolunteerName={activeVolunteerName}
              onSaveCommitment={handleSaveCommitment}
              onDeleteCommitment={handleDeleteCommitment}
              onSelectForCollection={handleSelectForCollection}
              onSelectForLedger={handleSelectForLedger}
              isAdmin={isAdmin}
            />
          )}

          {currentTab === 'receipts' && (
            <ReceiptVoucherForm
              commitments={commitments}
              receiptVouchers={receiptVouchers}
              committeeMembers={committeeMembers}
              activeVolunteerName={activeVolunteerName}
              setting={setting}
              preSelectedCommitment={preSelectedCommitment}
              onClearPreSelectedCommitment={() => setPreSelectedCommitment(null)}
              onSaveReceiptVoucher={handleSaveReceiptVoucher}
              onDeleteReceiptVoucher={handleDeleteReceiptVoucher}
              onOpenReceiptSlip={(voucher) => setSelectedReceiptForSlip(voucher)}
              onSelectForLedger={handleSelectForLedger}
              isAdmin={isAdmin}
            />
          )}

          {currentTab === 'ledger' && (
            <PayeeLedgerView
              commitments={commitments}
              receiptVouchers={receiptVouchers}
              setting={setting}
              initialSelectedPayee={initialSelectedPayeeForLedger}
              onOpenReceiptSlip={(voucher) => setSelectedReceiptForSlip(voucher)}
            />
          )}

          {currentTab === 'programs' && (
            <ProgramBookingsView
              onNavigateToReports={() => setCurrentTab('program_reports')}
              onNavigateToWallets={() => setCurrentTab('program_wallets')}
              committeeMembers={committeeMembers}
              committeeMembersList={committeeMembers.filter((m) => m.active).map((m) => `${m.name} (${m.designation})`)}
            />
          )}

          {currentTab === 'program_wallets' && (
            <MemberAdvanceLedgerView
              onNavigateToBookings={() => setCurrentTab('programs')}
              onNavigateToReports={() => setCurrentTab('program_reports')}
              committeeMembers={committeeMembers}
              receiptVouchers={receiptVouchers}
              advances={advances}
              expenses={directExpenses}
              programBookings={programBookings}
              onOpenMemberStatement={(m) => handleOpenMemberLedger(m)}
              onResetFinancialData={handleResetFinancialData}
              isAdmin={isAdmin}
            />
          )}

          {currentTab === 'program_reports' && (
            <ProgramReportsView
              onNavigateToBookings={() => setCurrentTab('programs')}
              onNavigateToWallets={() => setCurrentTab('program_wallets')}
            />
          )}
          </div>
        </main>
      </div>

      {/* Member Ledger Modal */}
      <MemberLedgerModal
        isOpen={isMemberLedgerModalOpen}
        member={selectedMemberForLedger}
        advances={advances}
        expenses={directExpenses}
        receipts={receiptVouchers}
        programBookings={programBookings}
        onClose={() => {
          setIsMemberLedgerModalOpen(false);
          setSelectedMemberForLedger(null);
        }}
      />

      {/* Receipt Slip Modal */}
      <ReceiptSlipModal
        voucher={selectedReceiptForSlip}
        setting={setting}
        onClose={() => setSelectedReceiptForSlip(null)}
      />

      {/* Treasurer Central Settlement Desk Modal */}
      <TreasurerSettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => {
          setIsSettlementModalOpen(false);
          setSelectedSettlementMemberId(undefined);
        }}
        committeeMembers={committeeMembers}
        receiptVouchers={receiptVouchers}
        settlements={settlements}
        initialSelectedMemberId={selectedSettlementMemberId}
        treasurerName={authProfile?.name || 'Treasurer'}
        onSaveSettlement={handleSaveSettlement}
      />

      {/* Multi-User Login & Account Switch Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        currentUser={authProfile}
      />

      {/* Administrative Reset Financial Data Modal */}
      <ResetFinancialDataModal
        isOpen={isResetFinancialModalOpen}
        onClose={() => setIsResetFinancialModalOpen(false)}
        onConfirmReset={handleResetFinancialData}
        isLoading={isResettingFinancial}
      />
    </div>
  );
}
