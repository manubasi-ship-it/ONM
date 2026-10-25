import React, { useState, useMemo } from 'react';
import {
  CommitteeMember,
  ExpenseType,
  ReceiptType,
  AppUser,
  UserProfile,
  Setting,
  COMMITTEE_DESIGNATIONS,
  CommitteeDesignation,
} from '../types';
import { validateUPIId } from '../utils/upi';
import {
  Users,
  Receipt,
  MinusCircle,
  Plus,
  Edit2,
  Trash2,
  Search,
  Check,
  X,
  Phone,
  Shield,
  Tag,
  ToggleLeft,
  ToggleRight,
  Database,
  CheckCircle,
  CreditCard,
  Save,
  AlertTriangle,
  QrCode,
  Key,
  Eye,
  EyeOff,
  UserCheck,
  UserPlus,
  User,
  Lock,
  RotateCcw,
} from 'lucide-react';
import { UpiPaymentModal } from './UpiPaymentModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { AdminResetPasswordModal } from './AdminResetPasswordModal';
import { checkDuplicateUserId, canPerformAction, UserRole } from '../modules/auth';

interface MasterDataSettingsProps {
  committeeMembers: CommitteeMember[];
  expenseTypes: ExpenseType[];
  receiptTypes: ReceiptType[];
  appUsers: AppUser[];
  setting: Setting;
  currentUser: UserProfile;
  onSaveSetting: (newSetting: Setting) => void;
  onSaveMember: (member: CommitteeMember) => void;
  onDeleteMember: (id: string) => void;
  onSaveExpenseType: (type: ExpenseType) => void;
  onDeleteExpenseType: (id: string) => void;
  onSaveReceiptType: (type: ReceiptType) => void;
  onDeleteReceiptType: (id: string) => void;
  onSaveAppUser: (user: AppUser) => void;
  onDeleteAppUser: (id: string) => void;
  onClearAllMembers?: () => void;
  onClearAllExpenseTypes?: () => void;
  onClearAllReceiptTypes?: () => void;
  onClearAllUsers?: () => void;
  onPurgeAllMasterAndSampleData?: () => Promise<void> | void;
}

export const MasterDataSettings: React.FC<MasterDataSettingsProps> = ({
  committeeMembers,
  expenseTypes,
  receiptTypes,
  appUsers,
  setting,
  currentUser,
  onSaveSetting,
  onSaveMember,
  onDeleteMember,
  onSaveExpenseType,
  onDeleteExpenseType,
  onSaveReceiptType,
  onDeleteReceiptType,
  onSaveAppUser,
  onDeleteAppUser,
  onClearAllMembers,
  onClearAllExpenseTypes,
  onClearAllReceiptTypes,
  onClearAllUsers,
  onPurgeAllMasterAndSampleData,
}) => {
  const [activeTab, setActiveTab] = useState<'upi' | 'users' | 'members' | 'expenses' | 'receipts'>('upi');
  const [searchTerm, setSearchTerm] = useState('');

  const [merchantName, setMerchantName] = useState(setting.merchantName);
  const [upiId, setUpiId] = useState(setting.upiId);
  const [mcc, setMcc] = useState(setting.mcc || '8661');
  const [festivalYear, setFestivalYear] = useState(setting.festivalYear);
  const [contactPhone, setContactPhone] = useState(setting.contactPhone);
  const [sangamNameEn, setSangamNameEn] = useState(setting.sangamNameEnglish);
  const [sangamNameMl, setSangamNameMl] = useState(setting.sangamNameMalayalam);
  const [welcomeMessage, setWelcomeMessage] = useState(setting.welcomeMessage);
  const [upiSaveToast, setUpiSaveToast] = useState(false);
  const [showTestQrModal, setShowTestQrModal] = useState(false);

  // Keep form fields synced when setting prop updates from Cloud Firestore or reset
  React.useEffect(() => {
    setMerchantName(setting.merchantName);
    setUpiId(setting.upiId);
    setMcc(setting.mcc || '8661');
    setFestivalYear(setting.festivalYear);
    setContactPhone(setting.contactPhone);
    setSangamNameEn(setting.sangamNameEnglish);
    setSangamNameMl(setting.sangamNameMalayalam);
    setWelcomeMessage(setting.welcomeMessage);
  }, [setting]);

  // Validation
  const isUpiValid = validateUPIId(upiId);

  // Committee Member Modal State
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<CommitteeMember | null>(null);
  const [memberName, setMemberName] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberDesignation, setMemberDesignation] = useState<CommitteeDesignation>(
    COMMITTEE_DESIGNATIONS[4]
  );
  const [memberUserId, setMemberUserId] = useState('');
  const [memberRole, setMemberRole] = useState<UserRole>('USER');
  const [memberPassword, setMemberPassword] = useState('welcome123');
  const [memberActive, setMemberActive] = useState(true);
  const [memberError, setMemberError] = useState('');

  // Admin Reset Password Modal State
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedMemberForReset, setSelectedMemberForReset] = useState<CommitteeMember | null>(null);

  // Expense Type Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpenseType, setEditingExpenseType] = useState<ExpenseType | null>(null);
  const [expenseMl, setExpenseMl] = useState('');
  const [expenseEn, setExpenseEn] = useState('');
  const [expenseActive, setExpenseActive] = useState(true);
  const [expenseError, setExpenseError] = useState('');

  // Receipt Type Modal State
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [editingReceiptType, setEditingReceiptType] = useState<ReceiptType | null>(null);
  const [receiptMl, setReceiptMl] = useState('');
  const [receiptEn, setReceiptEn] = useState('');
  const [receiptCode, setReceiptCode] = useState('');
  const [receiptActive, setReceiptActive] = useState(true);
  const [receiptError, setReceiptError] = useState('');

  // User Management Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [userFullName, setUserFullName] = useState('');
  const [userUsername, setUserUsername] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'volunteer'>('volunteer');
  const [userPhone, setUserPhone] = useState('');
  const [userActive, setUserActive] = useState(true);
  const [userError, setUserError] = useState('');
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Safety & Confirmation Modal State for Master Deletion
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    title: string;
    itemName: string;
    description: string;
    confirmLabel?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    itemName: '',
    description: '',
    confirmLabel: 'Permanently Delete',
    onConfirm: () => {},
  });

  const toggleShowPassword = (userId: string) => {
    setShowPasswordMap((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  // Reset / Clear UPI Merchant Credentials (Admin Only)
  const handleResetUpiSettings = () => {
    setDeleteModalState({
      isOpen: true,
      title: 'Reset UPI Merchant Credentials',
      itemName: `${setting.merchantName} (${setting.upiId})`,
      description: 'Are you sure you want to reset or clear the configured UPI Merchant Credentials and VPA? Once cleared, dynamic QR generation will prompt users to configure payment parameters.',
      confirmLabel: 'Reset UPI Data',
      onConfirm: () => {
        const cleared: Setting = {
          ...setting,
          upiId: '',
          merchantName: '',
          mcc: '',
        };
        setMerchantName('');
        setUpiId('');
        setMcc('');
        onSaveSetting(cleared);
        setUpiSaveToast(true);
        setTimeout(() => setUpiSaveToast(false), 2500);
      },
    });
  };

  // ---------------- UPI SUBMIT ----------------
  const handleSaveUpiSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Setting = {
      ...setting,
      merchantName: merchantName.trim(),
      upiId: upiId.trim(),
      mcc: mcc.trim(),
      festivalYear: festivalYear.trim(),
      contactPhone: contactPhone.trim(),
      sangamNameEnglish: sangamNameEn.trim(),
      sangamNameMalayalam: sangamNameMl.trim(),
      welcomeMessage: welcomeMessage.trim(),
    };
    onSaveSetting(updated);
    setUpiSaveToast(true);
    setTimeout(() => setUpiSaveToast(false), 2500);
  };

  // ---------------- PURGE ALL MASTER & SAMPLE DATA ----------------
  const handlePurgeAllClick = () => {
    setDeleteModalState({
      isOpen: true,
      title: 'Permanently Clear All Master & Sample Data?',
      itemName: 'All Master Data, Users & Transactions',
      description:
        'This will permanently remove all committee members, expense types, receipt types, volunteer accounts, and transactions from both the web app local cache and Cloud Firestore. The app will be completely empty and reset to a clean state. Are you sure you want to proceed?',
      confirmLabel: 'Clear All Data Permanently',
      onConfirm: async () => {
        if (onPurgeAllMasterAndSampleData) {
          await onPurgeAllMasterAndSampleData();
        }
        setDeleteModalState((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // ---------------- MEMBERS HANDLERS ----------------
  const openAddMemberModal = () => {
    setEditingMember(null);
    setMemberName('');
    setMemberPhone('');
    setMemberDesignation(COMMITTEE_DESIGNATIONS[4]);
    setMemberUserId('');
    setMemberRole('USER');
    setMemberPassword('welcome123');
    setMemberActive(true);
    setMemberError('');
    setIsMemberModalOpen(true);
  };

  const openEditMemberModal = (member: CommitteeMember) => {
    setEditingMember(member);
    setMemberName(member.name);
    setMemberPhone(member.phone);
    setMemberDesignation(
      (COMMITTEE_DESIGNATIONS.includes(member.designation as CommitteeDesignation)
        ? member.designation
        : COMMITTEE_DESIGNATIONS[4]) as CommitteeDesignation
    );
    setMemberUserId(member.userId || member.phone || '');
    setMemberRole((member.role as UserRole) || 'USER');
    setMemberPassword(member.password || '');
    setMemberActive(member.active);
    setMemberError('');
    setIsMemberModalOpen(true);
  };

  const handleSaveMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberError('');

    if (!memberName.trim()) {
      setMemberError('Please enter member name');
      return;
    }

    const cleanPhone = memberPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setMemberError('Please enter a valid 10-digit phone number');
      return;
    }

    const isCurrentUserAdmin = canPerformAction('ADMIN_MANAGE') || currentUser.role === 'admin';
    const targetUserId = isCurrentUserAdmin
      ? (memberUserId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || cleanPhone)
      : (editingMember?.userId || cleanPhone);

    if (isCurrentUserAdmin && targetUserId) {
      const dup = await checkDuplicateUserId(targetUserId, editingMember?.id);
      if (dup.isDuplicate) {
        setMemberError(
          `User ID "${targetUserId}" is already assigned to ${dup.existingMemberName || 'another member'}. Please choose a unique User ID.`
        );
        return;
      }
    }

    const nowIso = new Date().toISOString();
    const member: CommitteeMember = {
      id: editingMember ? editingMember.id : `cm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: memberName.trim(),
      fullName: memberName.trim(),
      phone: cleanPhone,
      designation: memberDesignation,
      designationRole: memberDesignation,
      active: memberActive,
      status: memberActive ? 'Active' : 'Inactive',
      userId: targetUserId,
      role: isCurrentUserAdmin ? memberRole : ((editingMember?.role as UserRole) || 'USER'),
      password: editingMember?.password || memberPassword.trim() || 'welcome123',
      createdAt: editingMember ? editingMember.createdAt : nowIso,
      updatedAt: nowIso,
    };

    onSaveMember(member);
    setIsMemberModalOpen(false);
  };

  const handleToggleMemberStatus = (member: CommitteeMember) => {
    onSaveMember({
      ...member,
      active: !member.active,
      updatedAt: new Date().toISOString(),
    });
  };

  // ---------------- EXPENSE TYPE HANDLERS ----------------
  const openAddExpenseModal = () => {
    setEditingExpenseType(null);
    setExpenseMl('');
    setExpenseEn('');
    setExpenseActive(true);
    setExpenseError('');
    setIsExpenseModalOpen(true);
  };

  const openEditExpenseModal = (exp: ExpenseType) => {
    setEditingExpenseType(exp);
    setExpenseMl(exp.nameMalayalam || '');
    setExpenseEn(exp.nameEnglish || exp.nameMalayalam || '');
    setExpenseActive(exp.active);
    setExpenseError('');
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseError('');

    const title = expenseEn.trim() || expenseMl.trim();
    if (!title) {
      setExpenseError('Please enter expense category title');
      return;
    }

    const nowIso = new Date().toISOString();
    const exp: ExpenseType = {
      id: editingExpenseType
        ? editingExpenseType.id
        : `et_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      nameMalayalam: expenseMl.trim() || title,
      nameEnglish: title,
      active: expenseActive,
      createdAt: editingExpenseType ? editingExpenseType.createdAt : nowIso,
      updatedAt: nowIso,
    };

    onSaveExpenseType(exp);
    setIsExpenseModalOpen(false);
  };

  const handleToggleExpenseStatus = (exp: ExpenseType) => {
    onSaveExpenseType({
      ...exp,
      active: !exp.active,
      updatedAt: new Date().toISOString(),
    });
  };

  // ---------------- RECEIPT TYPE HANDLERS ----------------
  const openAddReceiptModal = () => {
    setEditingReceiptType(null);
    setReceiptMl('');
    setReceiptEn('');
    setReceiptCode('');
    setReceiptActive(true);
    setReceiptError('');
    setIsReceiptModalOpen(true);
  };

  const openEditReceiptModal = (rec: ReceiptType) => {
    setEditingReceiptType(rec);
    setReceiptMl(rec.nameMalayalam || '');
    setReceiptEn(rec.nameEnglish || rec.nameMalayalam || '');
    setReceiptCode(rec.codePrefix || '');
    setReceiptActive(rec.active);
    setReceiptError('');
    setIsReceiptModalOpen(true);
  };

  const handleSaveReceiptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReceiptError('');

    const title = receiptEn.trim() || receiptMl.trim();
    if (!title) {
      setReceiptError('Please enter receipt category title');
      return;
    }

    const nowIso = new Date().toISOString();
    const rec: ReceiptType = {
      id: editingReceiptType
        ? editingReceiptType.id
        : `rt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      nameMalayalam: receiptMl.trim() || title,
      nameEnglish: title,
      codePrefix: receiptCode.trim().toUpperCase(),
      active: receiptActive,
      createdAt: editingReceiptType ? editingReceiptType.createdAt : nowIso,
      updatedAt: nowIso,
    };

    onSaveReceiptType(rec);
    setIsReceiptModalOpen(false);
  };

  const handleToggleReceiptStatus = (rec: ReceiptType) => {
    onSaveReceiptType({
      ...rec,
      active: !rec.active,
      updatedAt: new Date().toISOString(),
    });
  };

  // ---------------- USER MASTER HANDLERS ----------------
  const openAddUserModal = () => {
    setEditingUser(null);
    setUserFullName('');
    setUserUsername('');
    setUserPassword('1234');
    setUserRole('volunteer');
    setUserPhone('');
    setUserActive(true);
    setUserError('');
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (user: AppUser) => {
    setEditingUser(user);
    setUserFullName(user.fullName);
    setUserUsername(user.username);
    setUserPassword(user.password);
    setUserRole(user.role);
    setUserPhone(user.phone || '');
    setUserActive(user.active);
    setUserError('');
    setIsUserModalOpen(true);
  };

  const handleSaveUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');

    if (!userFullName.trim()) {
      setUserError('Full name is required');
      return;
    }
    if (!userUsername.trim()) {
      setUserError('Username / mobile is required');
      return;
    }
    if (!userPassword.trim()) {
      setUserError('Password / PIN is required');
      return;
    }

    // Check duplicate username if creating or renaming
    const duplicate = appUsers.find(
      (u) =>
        u.username.toLowerCase() === userUsername.trim().toLowerCase() &&
        u.id !== editingUser?.id
    );
    if (duplicate) {
      setUserError('This username already exists!');
      return;
    }

    const nowIso = new Date().toISOString();
    const userToSave: AppUser = {
      id: editingUser ? editingUser.id : `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fullName: userFullName.trim(),
      username: userUsername.trim(),
      password: userPassword.trim(),
      role: userRole,
      phone: userPhone.trim(),
      active: userActive,
      createdAt: editingUser ? editingUser.createdAt : nowIso,
      updatedAt: nowIso,
    };

    onSaveAppUser(userToSave);
    setIsUserModalOpen(false);
  };

  const handleToggleUserStatus = (user: AppUser) => {
    onSaveAppUser({
      ...user,
      active: !user.active,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeleteUserClick = (user: AppUser) => {
    if (user.username === 'admin' || user.id === 'usr_admin') {
      alert('Cannot delete primary administrator account');
      return;
    }
    setDeleteModalState({
      isOpen: true,
      title: 'Delete User Account',
      itemName: `${user.fullName} (@${user.username} - ${user.role.toUpperCase()})`,
      description: `Are you sure you want to permanently delete collector/volunteer account "${user.fullName}"? Once deleted, this account will lose login privileges immediately.`,
      confirmLabel: 'Permanently Delete User',
      onConfirm: () => {
        onDeleteAppUser(user.id);
      },
    });
  };

  // ---------------- FILTERED LISTS ----------------
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return appUsers;
    const q = searchTerm.toLowerCase();
    return appUsers.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q)) ||
        u.role.toLowerCase().includes(q)
    );
  }, [appUsers, searchTerm]);
  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return committeeMembers;
    const q = searchTerm.toLowerCase();
    return committeeMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.phone.includes(q) ||
        m.designation.toLowerCase().includes(q)
    );
  }, [committeeMembers, searchTerm]);

  const filteredExpenses = useMemo(() => {
    if (!searchTerm.trim()) return expenseTypes;
    const q = searchTerm.toLowerCase();
    return expenseTypes.filter(
      (e) =>
        e.nameMalayalam.toLowerCase().includes(q) ||
        e.nameEnglish.toLowerCase().includes(q)
    );
  }, [expenseTypes, searchTerm]);

  const filteredReceipts = useMemo(() => {
    if (!searchTerm.trim()) return receiptTypes;
    const q = searchTerm.toLowerCase();
    return receiptTypes.filter(
      (r) =>
        r.nameMalayalam.toLowerCase().includes(q) ||
        r.nameEnglish.toLowerCase().includes(q) ||
        (r.codePrefix && r.codePrefix.toLowerCase().includes(q))
    );
  }, [receiptTypes, searchTerm]);

  // Enforce Role-Based Access Control (RBAC): Admin only for Master Settings
  if (currentUser.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-6">
        <div className="bg-white rounded-2xl p-8 border border-amber-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto border border-amber-300">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-stone-900">
            Administrator Access Required
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Master Data Settings and Deletion features are restricted to Administrators only. Volunteer accounts do not have access to merchant configurations, user masters, or deletion triggers.
          </p>
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-500 font-mono">
            Current User: <span className="font-bold text-stone-800">{currentUser.displayName}</span> ({currentUser.role})
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-linear-to-r from-stone-900 via-amber-950 to-stone-900 text-white rounded-2xl p-3.5 sm:p-6 shadow-md border border-amber-800/40 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-amber-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
            <Database className="w-3.5 h-3.5" />
            <span>Master Data Settings • System Configuration</span>
          </div>
          <h2 className="text-sm sm:text-xl md:text-2xl font-black mt-0.5 sm:mt-1 text-amber-100">
            UPI Merchant & Master Data Configuration
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentUser.role === 'admin' && onPurgeAllMasterAndSampleData && (
            <button
              type="button"
              onClick={handlePurgeAllClick}
              className="px-3.5 py-2.5 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800/80 font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              title="Permanently remove all master data and sample data from app and cloud"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Clear All Master Data</span>
            </button>
          )}

          {activeTab === 'upi' && (
            <button
              type="button"
              onClick={() => setShowTestQrModal(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Test UPI QR Code</span>
            </button>
          )}

          {activeTab === 'users' && (
            <button
              type="button"
              onClick={openAddUserModal}
              className="px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add User / Agent</span>
            </button>
          )}

          {activeTab === 'members' && (
            <button
              type="button"
              onClick={openAddMemberModal}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Committee Member</span>
            </button>
          )}

          {activeTab === 'expenses' && (
            <button
              type="button"
              onClick={openAddExpenseModal}
              className="px-4 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Expense Head</span>
            </button>
          )}

          {activeTab === 'receipts' && (
            <button
              type="button"
              onClick={openAddReceiptModal}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Receipt Type</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs and Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100 space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                setActiveTab('upi');
                setSearchTerm('');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'upi'
                  ? 'bg-amber-900 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <CreditCard className="w-4 h-4 text-amber-300" />
              <span>1. UPI & Merchant</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('users');
                setSearchTerm('');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-amber-900 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Shield className="w-4 h-4 text-amber-500" />
              <span>2. Users & Agents ({appUsers.length})</span>
              <span className="text-[9px] uppercase px-1 rounded bg-amber-200 text-amber-950 font-mono font-bold">
                Admin
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('members');
                setSearchTerm('');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'members'
                  ? 'bg-amber-900 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Users className="w-4 h-4 text-amber-300" />
              <span>3. Committee Members ({committeeMembers.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('expenses');
                setSearchTerm('');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'expenses'
                  ? 'bg-red-900 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <MinusCircle className="w-4 h-4 text-red-300" />
              <span>4. Expense Heads ({expenseTypes.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('receipts');
                setSearchTerm('');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'receipts'
                  ? 'bg-emerald-900 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <Receipt className="w-4 h-4 text-emerald-300" />
              <span>5. Receipt Types ({receiptTypes.length})</span>
            </button>
          </div>

          {/* Search Input for tabs 2, 3, 4 */}
          {activeTab !== 'upi' && (
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search in this tab..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/30 text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* ---------------- TAB 1: UPI & MERCHANT SETUP ---------------- */}
      {activeTab === 'upi' && (
        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
          <div className="p-5 bg-amber-50/70 border-b border-amber-100 flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-stone-900">
                Merchant Payment Credentials & UPI Settings
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                The parameters below define the official Payee Name and VPA used for generating on-demand dynamic UPI QR codes and payment intents.
              </p>
            </div>
            {isUpiValid ? (
              <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>UPI Config Valid</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full text-xs font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>UPI VPA Requires Setup</span>
              </span>
            )}
          </div>

          <form onSubmit={handleSaveUpiSettings} className="p-6 space-y-5">
            {upiSaveToast && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl flex items-center gap-2 font-bold text-xs">
                <Check className="w-4 h-4 text-emerald-600" />
                Master UPI & Merchant settings saved and synchronized to Cloud Firestore!
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Merchant / Payee Name */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Merchant Name / Payee Name *
                </label>
                <input
                  type="text"
                  required
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  placeholder="e.g., ONAMPILLY KAVADI SANGAM"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/30 text-sm font-semibold"
                />
                <span className="text-[11px] text-stone-400 mt-0.5 block">
                  Official name shown in Google Pay / PhonePe / BHIM on devotee devices
                </span>
              </div>

              {/* UPI ID / VPA */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
                  <span>UPI ID / VPA (Virtual Payment Address) *</span>
                  {isUpiValid ? (
                    <span className="text-[10px] text-emerald-700 font-bold">✓ Valid format</span>
                  ) : (
                    <span className="text-[10px] text-red-600 font-bold">⚠️ Must be username@bank</span>
                  )}
                </label>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g., onampillykavadi@sbi or store@upi"
                  className={`w-full px-3.5 py-2.5 rounded-xl border focus:outline-hidden focus:ring-2 text-sm font-mono font-bold ${
                    isUpiValid
                      ? 'border-emerald-400 bg-emerald-50/20 text-emerald-950 focus:ring-emerald-500/30'
                      : 'border-red-300 bg-red-50/20 text-red-950 focus:ring-red-500/30'
                  }`}
                />
                <span className="text-[11px] text-stone-400 mt-0.5 block">
                  Format: <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-600 font-mono">name@bank</code> (e.g., <code className="text-stone-600">merchant@okhdfcbank</code>)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Merchant Category Code (MCC) */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Merchant Category Code (MCC) (Optional)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={mcc}
                  onChange={(e) => setMcc(e.target.value.replace(/\D/g, ''))}
                  placeholder="8661"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/30 text-sm font-mono font-bold"
                />
                <span className="text-[11px] text-stone-400 mt-0.5 block">
                  e.g., <span className="font-semibold">8661</span> (Religious organizations) or 0000
                </span>
              </div>

              {/* Festival Year */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Festival Year *
                </label>
                <input
                  type="text"
                  required
                  value={festivalYear}
                  onChange={(e) => setFestivalYear(e.target.value)}
                  placeholder="2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/30 text-sm font-semibold"
                />
              </div>

              {/* Helpline Contact Phone */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Sangam Helpline Contact
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 94952 33833"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/30 text-sm font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Sangam Name (English) */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Sangam Title (Primary English) *
                </label>
                <input
                  type="text"
                  required
                  value={sangamNameEn}
                  onChange={(e) => setSangamNameEn(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/30 text-sm font-semibold"
                />
              </div>

              {/* Sangam Name (Short / Alternative) */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Sangam Subtitle / Tagline *
                </label>
                <input
                  type="text"
                  required
                  value={sangamNameMl}
                  onChange={(e) => setSangamNameMl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/30 text-sm font-semibold"
                />
              </div>
            </div>

            {/* Welcome / Blessing Message */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Blessing Note on Digital Receipts (English)
              </label>
              <textarea
                rows={2}
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/30 text-xs font-medium"
              />
            </div>

            {/* Live UPI Link Preview Card */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
              <span className="text-[11px] uppercase font-bold text-stone-500 tracking-wider">
                Live Dynamic UPI Link Preview
              </span>
              <div className="font-mono text-xs text-amber-950 mt-1 break-all bg-white p-2.5 rounded-xl border border-stone-200">
                upi://pay?pa={upiId || '{UPI_ID}'}&pn={encodeURIComponent(merchantName || '{MERCHANT_NAME}')}&am=501.00&cu=INR&tn=Kavadi+Offering{mcc ? `&mc=${mcc}` : ''}
              </div>
            </div>

            {/* Save & Reset Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-stone-100">
              {currentUser.role === 'admin' ? (
                <button
                  type="button"
                  onClick={handleResetUpiSettings}
                  className="px-4 py-2.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Admin Privilege: Reset or delete configured UPI merchant profile"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-red-600" />
                  <span>Reset / Clear UPI Profile</span>
                </button>
              ) : <div />}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTestQrModal(true)}
                  disabled={!isUpiValid}
                  className="px-4 py-2.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Preview On-Demand QR</span>
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-amber-900 hover:bg-amber-950 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4 text-amber-300" />
                  <span>Save Master UPI Data</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ---------------- TAB 2: USER MASTER & COLLECTOR AGENTS (ADMIN ONLY) ---------------- */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
          <div className="p-4 bg-amber-50/70 border-b border-amber-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-800" />
                <h3 className="font-extrabold text-sm text-stone-900">
                  User Accounts & Collection Agents
                </h3>
                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-md bg-amber-200 text-amber-950 font-bold border border-amber-300">
                  Admin Only
                </span>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Manage collection agents, volunteers, and administrative credentials for secure multi-user portal access.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-900 bg-amber-100/80 px-2.5 py-1 rounded-full border border-amber-200">
                Active Agents: {appUsers.filter((u) => u.active).length} / {appUsers.length}
              </span>
              {appUsers.filter((u) => u.username !== 'admin' && u.id !== 'usr_admin').length > 0 && onClearAllUsers && (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModalState({
                      isOpen: true,
                      title: 'Delete All Volunteer Accounts',
                      itemName: 'All volunteer user accounts',
                      description: 'Are you sure you want to permanently delete all volunteer collection agent accounts? The primary admin account will be retained.',
                      confirmLabel: 'Delete All Volunteers',
                      onConfirm: () => onClearAllUsers(),
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Delete all volunteer accounts"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  <span>Clear Volunteers</span>
                </button>
              )}
              <button
                type="button"
                onClick={openAddUserModal}
                className="px-3.5 py-1.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add User</span>
              </button>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-stone-400 space-y-2">
              <span className="text-3xl">👤</span>
              <p className="text-xs">No users or agents found matching search</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-100/70 text-stone-600 font-bold border-b border-stone-200 text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Collector Name</th>
                    <th className="py-3 px-4">Username / Mobile</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Password / PIN</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredUsers.map((user) => {
                    const isRevealed = Boolean(showPasswordMap[user.id]);
                    const isPrimaryAdmin = user.username === 'admin' || user.id === 'usr_admin';
                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-amber-50/40 transition text-stone-800"
                      >
                        <td className="py-3 px-4 font-bold text-stone-900">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs shrink-0 border border-amber-200">
                              {user.role === 'admin' ? (
                                <Shield className="w-4 h-4 text-amber-800" />
                              ) : (
                                <User className="w-4 h-4 text-emerald-800" />
                              )}
                            </div>
                            <div>
                              <div className="font-extrabold text-stone-900">
                                {user.fullName}
                              </div>
                              {user.phone && (
                                <div className="text-[10px] text-stone-500 font-mono">
                                  +91 {user.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-amber-950">
                          <span className="px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200">
                            {user.username}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              user.role === 'admin'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            }`}
                          >
                            {user.role === 'admin' ? '🛡️ Admin' : '👤 Volunteer'}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono">
                          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-stone-50 border border-stone-200 text-stone-700">
                            <Key className="w-3 h-3 text-stone-400" />
                            <span>{isRevealed ? user.password : '••••••••'}</span>
                            <button
                              type="button"
                              onClick={() => toggleShowPassword(user.id)}
                              className="p-0.5 text-stone-400 hover:text-stone-700 cursor-pointer ml-1"
                              title={isRevealed ? 'Hide Password' : 'Reveal Password'}
                            >
                              {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(user)}
                            disabled={isPrimaryAdmin}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                              isPrimaryAdmin ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                            title={isPrimaryAdmin ? 'Primary admin cannot be deactivated' : 'Toggle Active/Inactive'}
                          >
                            {user.active ? (
                              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <ToggleRight className="w-4 h-4 text-emerald-600" /> Active
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-stone-500 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full">
                                <ToggleLeft className="w-4 h-4 text-stone-400" /> Inactive
                              </span>
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditUserModal(user)}
                              className="p-1.5 rounded-lg text-amber-900 bg-amber-50 hover:bg-amber-100 transition cursor-pointer"
                              title="Edit User"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUserClick(user)}
                              disabled={isPrimaryAdmin}
                              className={`p-1.5 rounded-lg transition ${
                                isPrimaryAdmin
                                  ? 'text-stone-300 cursor-not-allowed'
                                  : 'text-red-600 hover:bg-red-50 cursor-pointer'
                              }`}
                              title={isPrimaryAdmin ? 'Primary admin cannot be deleted' : 'Delete User'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
      )}

      {/* ---------------- TAB 3: COMMITTEE MEMBERS ---------------- */}
      {activeTab === 'members' && (
        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
          <div className="p-4 bg-amber-50/60 border-b border-amber-100 flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-sm text-stone-900">
                Committee Members Directory
              </h3>
              <p className="text-[11px] text-stone-500">
                Active members automatically populate the volunteer collector selector on the collection desk.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">
                Active: {committeeMembers.filter((m) => m.active).length} / {committeeMembers.length}
              </span>
              {committeeMembers.length > 0 && onClearAllMembers && (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModalState({
                      isOpen: true,
                      title: 'Delete All Committee Members',
                      itemName: `Total ${committeeMembers.length} committee members`,
                      description: 'Are you sure you want to permanently delete all committee members? This will remove them from Cloud Firestore and local storage.',
                      confirmLabel: 'Delete All Members',
                      onConfirm: () => onClearAllMembers(),
                    });
                  }}
                  className="px-3 py-1 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Delete all committee members"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  <span>Delete All</span>
                </button>
              )}
            </div>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="p-8 text-center text-stone-400 space-y-2">
              <span className="text-3xl">👥</span>
              <p className="text-xs">No committee members found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-100/70 text-stone-600 font-bold border-b border-stone-200 text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Designation</th>
                    <th className="py-3 px-4">Phone Number</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredMembers.map((member) => (
                    <tr
                      key={member.id}
                      className="hover:bg-amber-50/40 transition text-stone-800"
                    >
                      <td className="py-3 px-4 text-stone-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs shrink-0">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold">{member.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                @{member.userId || member.phone}
                              </span>
                              <span
                                className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                  member.role === 'ADMIN'
                                    ? 'bg-amber-200 text-amber-900'
                                    : 'bg-stone-100 text-stone-600'
                                }`}
                              >
                                {member.role || 'USER'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-950 border border-amber-200">
                          {member.designation}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-medium">
                        <div className="flex items-center gap-1.5 text-stone-700">
                          <Phone className="w-3.5 h-3.5 text-stone-400" />
                          <span>+91 {member.phone}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleMemberStatus(member)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition"
                        >
                          {member.active ? (
                            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <ToggleRight className="w-4 h-4 text-emerald-600" /> Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-stone-500 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full">
                              <ToggleLeft className="w-4 h-4 text-stone-400" /> Inactive
                            </span>
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditMemberModal(member)}
                            className="p-1.5 rounded-lg text-amber-900 bg-amber-50 hover:bg-amber-100 transition cursor-pointer"
                            title="Edit Member"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password Action for Admins */}
                          {(canPerformAction('ADMIN_MANAGE') || currentUser.role === 'admin') && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMemberForReset(member);
                                setIsResetPasswordModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-amber-800 bg-amber-50 hover:bg-amber-100 transition cursor-pointer"
                              title="Reset Password (Admin Only)"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setDeleteModalState({
                                isOpen: true,
                                title: 'Delete Committee Member',
                                itemName: `${member.name} (${member.designation})`,
                                description: `Are you sure you want to permanently delete committee member "${member.name}"? This action cannot be undone and changes are instantly updated in Cloud Firestore.`,
                                confirmLabel: 'Permanently Delete Member',
                                onConfirm: () => onDeleteMember(member.id),
                              });
                            }}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition cursor-pointer"
                            title="Delete Member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------------- TAB 4: EXPENSE TYPES ---------------- */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
          <div className="p-4 bg-red-50/60 border-b border-red-100 flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-sm text-stone-900">
                Festival Expense Heads
              </h3>
              <p className="text-[11px] text-stone-500">
                Categories available when recording expenditures in the financial ledger.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-red-900 bg-red-100 px-2.5 py-1 rounded-full border border-red-200">
                Total Heads: {expenseTypes.length}
              </span>
              {expenseTypes.length > 0 && onClearAllExpenseTypes && (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModalState({
                      isOpen: true,
                      title: 'Delete All Expense Heads',
                      itemName: `Total ${expenseTypes.length} expense heads`,
                      description: 'Are you sure you want to permanently delete all expense heads? This will remove them from Cloud Firestore and local storage.',
                      confirmLabel: 'Delete All Heads',
                      onConfirm: () => onClearAllExpenseTypes(),
                    });
                  }}
                  className="px-3 py-1 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Delete all expense heads"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  <span>Delete All</span>
                </button>
              )}
            </div>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="p-8 text-center text-stone-400 space-y-2">
              <span className="text-3xl">📋</span>
              <p className="text-xs">No expense types found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-100/70 text-stone-600 font-bold border-b border-stone-200 text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Expense Head Title (English)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredExpenses.map((exp) => (
                    <tr
                      key={exp.id}
                      className="hover:bg-red-50/30 transition text-stone-800"
                    >
                      <td className="py-3 px-4 font-bold text-stone-900">
                        {exp.nameEnglish || exp.nameMalayalam}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleExpenseStatus(exp)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition"
                        >
                          {exp.active ? (
                            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <ToggleRight className="w-4 h-4 text-emerald-600" /> Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-stone-500 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full">
                              <ToggleLeft className="w-4 h-4 text-stone-400" /> Inactive
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditExpenseModal(exp)}
                            className="p-1.5 rounded-lg text-stone-800 bg-stone-100 hover:bg-stone-200 transition cursor-pointer"
                            title="Edit Expense Head"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteModalState({
                                isOpen: true,
                                title: 'Delete Expense Head',
                                itemName: `${exp.nameEnglish || exp.nameMalayalam}`,
                                description: `Are you sure you want to permanently delete expense category "${exp.nameEnglish || exp.nameMalayalam}"? This head will no longer be available for logging new expenditures.`,
                                confirmLabel: 'Permanently Delete Expense Head',
                                onConfirm: () => onDeleteExpenseType(exp.id),
                              });
                            }}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition cursor-pointer"
                            title="Delete Expense Head"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------------- TAB 5: RECEIPT TYPES ---------------- */}
      {activeTab === 'receipts' && (
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
          <div className="p-4 bg-emerald-50/60 border-b border-emerald-100 flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-sm text-stone-900">
                Collection & Offering Receipt Types
              </h3>
              <p className="text-[11px] text-stone-500">
                Populates receipt category dropdowns and auto-generates voucher serial numbers.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-900 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
                Total Types: {receiptTypes.length}
              </span>
              {receiptTypes.length > 0 && onClearAllReceiptTypes && (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModalState({
                      isOpen: true,
                      title: 'Delete All Receipt Types',
                      itemName: `Total ${receiptTypes.length} receipt types`,
                      description: 'Are you sure you want to permanently delete all collection and offering receipt types? This will remove them from Cloud Firestore and local storage.',
                      confirmLabel: 'Delete All Types',
                      onConfirm: () => onClearAllReceiptTypes(),
                    });
                  }}
                  className="px-3 py-1 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Delete all receipt types"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  <span>Delete All</span>
                </button>
              )}
            </div>
          </div>

          {filteredReceipts.length === 0 ? (
            <div className="p-8 text-center text-stone-400 space-y-2">
              <span className="text-3xl">🧾</span>
              <p className="text-xs">No receipt types found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-100/70 text-stone-600 font-bold border-b border-stone-200 text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Offering Category (English)</th>
                    <th className="py-3 px-4">Prefix / Code</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredReceipts.map((rec) => (
                    <tr
                      key={rec.id}
                      className="hover:bg-emerald-50/30 transition text-stone-800"
                    >
                      <td className="py-3 px-4 font-bold text-stone-900">
                        {rec.nameEnglish || rec.nameMalayalam}
                      </td>
                      <td className="py-3 px-4">
                        {rec.codePrefix ? (
                          <span className="font-mono font-bold text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded border border-stone-200">
                            {rec.codePrefix}
                          </span>
                        ) : (
                          <span className="text-stone-400 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleReceiptStatus(rec)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition"
                        >
                          {rec.active ? (
                            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <ToggleRight className="w-4 h-4 text-emerald-600" /> Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-stone-500 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full">
                              <ToggleLeft className="w-4 h-4 text-stone-400" /> Inactive
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditReceiptModal(rec)}
                            className="p-1.5 rounded-lg text-stone-800 bg-stone-100 hover:bg-stone-200 transition cursor-pointer"
                            title="Edit Receipt Type"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteModalState({
                                isOpen: true,
                                title: 'Delete Receipt Type',
                                itemName: `${rec.nameEnglish || rec.nameMalayalam}`,
                                description: `Are you sure you want to permanently delete receipt type "${rec.nameEnglish || rec.nameMalayalam}"? This type will no longer appear in the collection voucher presets.`,
                                confirmLabel: 'Permanently Delete Receipt Type',
                                onConfirm: () => onDeleteReceiptType(rec.id),
                              });
                            }}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition cursor-pointer"
                            title="Delete Receipt Type"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ---------------- MODAL 1: COMMITTEE MEMBER FORM ---------------- */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-amber-200 overflow-hidden my-auto">
            <div className="bg-amber-950 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-300" />
                <h3 className="font-extrabold text-sm sm:text-base">
                  {editingMember ? 'Edit Committee Member' : 'Add Committee Member'}
                </h3>
              </div>
              <button
                onClick={() => setIsMemberModalOpen(false)}
                className="p-1 rounded-lg text-amber-300 hover:text-white hover:bg-amber-900 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMemberSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
              {memberError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                  {memberError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Member Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="e.g., K. Radhakrishnan Nair"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/30 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Mobile Number (10 Digits) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-stone-400 font-semibold">+91</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={memberPhone}
                    onChange={(e) => setMemberPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9495233833"
                    className="w-full pl-11 pr-3 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/30 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Committee Designation / Role *
                </label>
                <select
                  value={memberDesignation}
                  onChange={(e) => setMemberDesignation(e.target.value as CommitteeDesignation)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/30 font-semibold text-amber-950 bg-stone-50"
                >
                  {COMMITTEE_DESIGNATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Login Handle / User ID Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-stone-700">
                    User ID / Login Handle *
                  </label>
                  {(canPerformAction('ADMIN_MANAGE') || currentUser.role === 'admin') && (
                    <button
                      type="button"
                      onClick={() => setMemberUserId(memberPhone ? memberPhone.toLowerCase() : '')}
                      className="text-[10px] text-amber-800 hover:text-amber-900 font-bold underline cursor-pointer"
                    >
                      Use Phone as User ID
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="memberUserIdInput"
                    type="text"
                    value={memberUserId}
                    onChange={(e) => {
                      if (canPerformAction('ADMIN_MANAGE') || currentUser.role === 'admin') {
                        setMemberUserId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
                      }
                    }}
                    placeholder="e.g. jishnu_kv or 9946809341"
                    disabled={!(canPerformAction('ADMIN_MANAGE') || currentUser.role === 'admin') && !!editingMember}
                    readOnly={!(canPerformAction('ADMIN_MANAGE') || currentUser.role === 'admin') && !!editingMember}
                    required
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold transition ${
                      !(canPerformAction('ADMIN_MANAGE') || currentUser.role === 'admin') && !!editingMember
                        ? 'bg-stone-100 border-stone-200 text-stone-500 cursor-not-allowed'
                        : 'border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/30'
                    }`}
                  />
                </div>
                {!(canPerformAction('ADMIN_MANAGE') || currentUser.role === 'admin') && !!editingMember && (
                  <p className="text-[10px] text-stone-500 mt-1 flex items-center gap-1 font-medium">
                    <Lock className="w-3 h-3 text-stone-400" />
                    User ID is an immutable primary key handle. Only Administrators can alter login handles.
                  </p>
                )}
              </div>

              {/* System Access Role */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  System Access Role *
                </label>
                <select
                  id="memberRoleSelect"
                  value={memberRole}
                  onChange={(e) => {
                    if (canPerformAction('ADMIN_MANAGE') || currentUser.role === 'admin') {
                      setMemberRole(e.target.value as UserRole);
                    }
                  }}
                  disabled={!(canPerformAction('ADMIN_MANAGE') || currentUser.role === 'admin')}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-bold transition ${
                    !(canPerformAction('ADMIN_MANAGE') || currentUser.role === 'admin')
                      ? 'bg-stone-100 border-stone-200 text-stone-500 cursor-not-allowed'
                      : 'border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/30 cursor-pointer bg-white'
                  }`}
                >
                  <option value="USER">USER (Standard Member: View & Data Entry)</option>
                  <option value="ADMIN">ADMIN (Full CRUD, Deletion & Master Controls)</option>
                </select>
              </div>

              {/* Initial Password for New Members */}
              {!editingMember && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Initial Access Password / PIN *
                  </label>
                  <input
                    type="text"
                    value={memberPassword}
                    onChange={(e) => setMemberPassword(e.target.value)}
                    placeholder="welcome123"
                    minLength={4}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono font-bold"
                  />
                  <p className="text-[10px] text-stone-500 mt-0.5">
                    Member can change their password anytime after logging in.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-xs font-bold text-stone-700">
                  Duty Status (Active on Collection Desk)
                </span>
                <button
                  type="button"
                  onClick={() => setMemberActive(!memberActive)}
                  className="cursor-pointer"
                >
                  {memberActive ? (
                    <span className="flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-100 px-3 py-1 rounded-full">
                      <Check className="w-3.5 h-3.5" /> Active
                    </span>
                  ) : (
                    <span className="text-stone-500 font-bold text-xs bg-stone-200 px-3 py-1 rounded-full">
                      Inactive
                    </span>
                  )}
                </button>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 bg-stone-100 rounded-xl hover:bg-stone-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-900 rounded-xl hover:bg-amber-950 flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <CheckCircle className="w-4 h-4 text-amber-300" />
                  <span>Save Member</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      <AdminResetPasswordModal
        isOpen={isResetPasswordModalOpen}
        member={selectedMemberForReset}
        onClose={() => {
          setIsResetPasswordModalOpen(false);
          setSelectedMemberForReset(null);
        }}
      />

      {/* ---------------- MODAL 2: EXPENSE TYPE FORM ---------------- */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-red-200 overflow-hidden my-auto">
            <div className="bg-red-950 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MinusCircle className="w-5 h-5 text-red-300" />
                <h3 className="font-extrabold text-sm sm:text-base">
                  {editingExpenseType ? 'Edit Expense Head' : 'Add Expense Head'}
                </h3>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1 rounded-lg text-red-300 hover:text-white hover:bg-red-900 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpenseSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
              {expenseError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                  {expenseError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Expense Head Title (English) *
                </label>
                <input
                  type="text"
                  required
                  value={expenseEn}
                  onChange={(e) => setExpenseEn(e.target.value)}
                  placeholder="e.g., Panchavadyam & Melam, Stage & Lighting"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-red-600/30 font-medium"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-xs font-bold text-stone-700">
                  Active Status
                </span>
                <button
                  type="button"
                  onClick={() => setExpenseActive(!expenseActive)}
                  className="cursor-pointer"
                >
                  {expenseActive ? (
                    <span className="flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-100 px-3 py-1 rounded-full">
                      <Check className="w-3.5 h-3.5" /> Active
                    </span>
                  ) : (
                    <span className="text-stone-500 font-bold text-xs bg-stone-200 px-3 py-1 rounded-full">
                      Inactive
                    </span>
                  )}
                </button>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 bg-stone-100 rounded-xl hover:bg-stone-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-red-900 rounded-xl hover:bg-red-950 flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <CheckCircle className="w-4 h-4 text-red-300" />
                  <span>Save Expense Head</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL 3: RECEIPT TYPE FORM ---------------- */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-emerald-200 overflow-hidden my-auto">
            <div className="bg-emerald-950 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-300" />
                <h3 className="font-extrabold text-sm sm:text-base">
                  {editingReceiptType ? 'Edit Receipt Type' : 'Add Receipt Type'}
                </h3>
              </div>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="p-1 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-900 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReceiptSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
              {receiptError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                  {receiptError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Receipt Type Title (English) *
                </label>
                <input
                  type="text"
                  required
                  value={receiptEn}
                  onChange={(e) => setReceiptEn(e.target.value)}
                  placeholder="e.g., Public House Collection, Archana, Special Offering"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-600/30 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-stone-400" />
                  <span>Receipt Voucher Prefix (Optional)</span>
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={receiptCode}
                  onChange={(e) => setReceiptCode(e.target.value.toUpperCase())}
                  placeholder="e.g., HC, KO, AN, SP"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-600/30 font-mono font-bold"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-xs font-bold text-stone-700">
                  Active Status
                </span>
                <button
                  type="button"
                  onClick={() => setReceiptActive(!receiptActive)}
                  className="cursor-pointer"
                >
                  {receiptActive ? (
                    <span className="flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-100 px-3 py-1 rounded-full">
                      <Check className="w-3.5 h-3.5" /> Active
                    </span>
                  ) : (
                    <span className="text-stone-500 font-bold text-xs bg-stone-200 px-3 py-1 rounded-full">
                      Inactive
                    </span>
                  )}
                </button>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 bg-stone-100 rounded-xl hover:bg-stone-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-900 rounded-xl hover:bg-emerald-950 flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-300" />
                  <span>Save Receipt Type</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- USER MASTER MODAL (ADD / EDIT) ---------------- */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-amber-200 overflow-hidden my-auto">
            <div className="p-5 bg-linear-to-r from-amber-950 via-amber-900 to-stone-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-sm">
                  {editingUser
                    ? 'Edit User Account / Agent'
                    : 'Add User Account / Agent'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="p-1 rounded-full hover:bg-white/10 text-stone-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserSubmit} className="p-6 space-y-4 text-xs">
              {userError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{userError}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-700" />
                  <span>Full Name *</span>
                </label>
                <input
                  type="text"
                  required
                  value={userFullName}
                  onChange={(e) => setUserFullName(e.target.value)}
                  placeholder="e.g., Harikrishnan, Sujith Kumar"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/30 font-medium"
                />
              </div>

              {/* Username / Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Username / Login ID (or Mobile Number) *</span>
                </label>
                <input
                  type="text"
                  required
                  value={userUsername}
                  onChange={(e) => setUserUsername(e.target.value)}
                  placeholder="e.g., 9400112233 or harikrishnan"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/30 font-mono font-bold"
                />
                <span className="text-[10px] text-stone-400 mt-0.5 block">
                  Used by volunteer or admin to log in
                </span>
              </div>

              {/* Password / PIN */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-700" />
                  <span>Password / PIN *</span>
                </label>
                <input
                  type="text"
                  required
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  placeholder="e.g., 1234 or secure password"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/30 font-mono font-bold"
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-700" />
                  <span>Role & Permissions *</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUserRole('volunteer')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition cursor-pointer ${
                      userRole === 'volunteer'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <div className="text-sm">👤 Volunteer</div>
                    <div className="text-[10px] font-normal text-stone-500 mt-0.5">
                      Collection desk only
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUserRole('admin')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition cursor-pointer ${
                      userRole === 'admin'
                        ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-xs'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <div className="text-sm">🛡️ Admin</div>
                    <div className="text-[10px] font-normal text-stone-500 mt-0.5">
                      Full control & settings
                    </div>
                  </button>
                </div>
              </div>

              {/* Contact Mobile (Optional) */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-700" />
                  <span>Contact Phone (Optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-stone-400 font-semibold">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9495233833"
                    className="w-full pl-11 pr-3 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/30 font-mono font-medium"
                  />
                </div>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-xs font-bold text-stone-700">
                  Account Active Status
                </span>
                <button
                  type="button"
                  onClick={() => setUserActive(!userActive)}
                  className="cursor-pointer"
                >
                  {userActive ? (
                    <span className="flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-100 px-3 py-1 rounded-full">
                      <Check className="w-3.5 h-3.5" /> Active
                    </span>
                  ) : (
                    <span className="text-stone-500 font-bold text-xs bg-stone-200 px-3 py-1 rounded-full">
                      Inactive
                    </span>
                  )}
                </button>
              </div>

              {/* Actions */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 bg-stone-100 rounded-xl hover:bg-stone-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-900 rounded-xl hover:bg-amber-950 flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <CheckCircle className="w-4 h-4 text-amber-300" />
                  <span>Save User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test QR Modal */}
      {showTestQrModal && (
        <UpiPaymentModal
          isOpen={showTestQrModal}
          amount={501}
          note="Test Kavadi Offering"
          transactionRef="TEST-SAMPLE-001"
          setting={setting}
          onClose={() => setShowTestQrModal(false)}
        />
      )}

      {/* Admin Master Data Safety Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        title={deleteModalState.title}
        itemName={deleteModalState.itemName}
        description={deleteModalState.description}
        confirmLabel={deleteModalState.confirmLabel}
        onConfirm={deleteModalState.onConfirm}
        onClose={() =>
          setDeleteModalState((prev) => ({ ...prev, isOpen: false }))
        }
      />
    </div>
  );
};
