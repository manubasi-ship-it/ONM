import React, { useState, useEffect } from 'react';
import { CommitteeMember, ExpenseType } from '../types';
import {
  canPerformAction,
  getCurrentUser,
  getAllUsers,
  registerUser,
  updateUserRole,
  updateUserStatus,
  checkDuplicateUserId,
  deleteUser,
  UserRecord,
  UserRole,
} from '../modules/auth';
import {
  Users,
  Tag,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  RotateCcw,
  Shield,
  Phone,
  Briefcase,
  AlertCircle,
  X,
  Check,
  UserCheck,
  Lock,
  KeyRound,
  ShieldAlert,
  UserPlus,
  AlertOctagon,
  AlertTriangle,
} from 'lucide-react';

interface MasterDataManagementViewProps {
  committeeMembers: CommitteeMember[];
  expenseTypes: ExpenseType[];
  onSaveMember: (member: CommitteeMember) => void;
  onDeleteMember: (id: string) => void;
  onToggleMemberStatus: (id: string) => void;
  onSaveExpenseType: (type: ExpenseType) => void;
  onDeleteExpenseType: (id: string) => void;
  onToggleExpenseTypeStatus: (id: string) => void;
  onResetSeedData?: () => void;
  onPurgeAllTransactions?: () => void;
}

export const MasterDataManagementView: React.FC<MasterDataManagementViewProps> = ({
  committeeMembers,
  expenseTypes,
  onSaveMember,
  onDeleteMember,
  onToggleMemberStatus,
  onSaveExpenseType,
  onDeleteExpenseType,
  onToggleExpenseTypeStatus,
  onPurgeAllTransactions,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'expenses' | 'users' | 'danger'>('members');

  // RBAC permissions state
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'ADMIN';

  // Search State
  const [memberSearch, setMemberSearch] = useState('');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Member Modal State
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<CommitteeMember | null>(null);
  const [memberName, setMemberName] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberDesignation, setMemberDesignation] = useState('');
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
  const [expenseTypeName, setExpenseTypeName] = useState('');
  const [expenseTypeActive, setExpenseTypeActive] = useState(true);
  const [expenseError, setExpenseError] = useState('');

  // User Master (RBAC) State
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('welcome123');
  const [newUserRole, setNewUserRole] = useState<UserRole>('USER');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Load User Master list when tab opens
  const loadUsers = async () => {
    setLoadingUsers(true);
    const list = await getAllUsers();
    setUsersList(list);
    setLoadingUsers(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Open Member Modal for Add/Edit
  const handleOpenMemberModal = (member?: CommitteeMember) => {
    if (member) {
      setEditingMember(member);
      setMemberName(member.name);
      setMemberPhone(member.phone);
      setMemberDesignation(member.designation);
      setMemberUserId(member.userId || member.phone || '');
      setMemberRole((member.role as UserRole) || 'USER');
      setMemberPassword(member.password || '');
      setMemberActive(member.active);
    } else {
      setEditingMember(null);
      setMemberName('');
      setMemberPhone('');
      setMemberDesignation('');
      setMemberUserId('');
      setMemberRole('USER');
      setMemberPassword('welcome123');
      setMemberActive(true);
    }
    setMemberError('');
    setIsMemberModalOpen(true);
  };

  // Save Member
  const handleSaveMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberError('');

    if (!memberName.trim()) {
      setMemberError('Full Name is required');
      return;
    }
    if (!memberPhone.trim() || !/^\d{10}$/.test(memberPhone.trim())) {
      setMemberError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!memberDesignation.trim()) {
      setMemberError('Role / Designation is required');
      return;
    }

    const targetUserId = isAdmin
      ? (memberUserId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || memberPhone.trim())
      : (editingMember?.userId || memberPhone.trim());

    // Duplicate User ID check across all members (Admin only)
    if (isAdmin && targetUserId) {
      const dup = await checkDuplicateUserId(targetUserId, editingMember?.id);
      if (dup.isDuplicate) {
        setMemberError(
          `User ID "${targetUserId}" is already assigned to ${dup.existingMemberName || 'another member'}. Please choose a unique User ID.`
        );
        return;
      }
    }

    const memberId = editingMember?.memberId || editingMember?.id || `cm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const memberToSave: CommitteeMember = {
      id: editingMember ? editingMember.id : memberId,
      memberId: memberId,
      name: memberName.trim(),
      fullName: memberName.trim(),
      phone: memberPhone.trim(),
      designation: memberDesignation.trim(),
      designationRole: memberDesignation.trim(),
      active: memberActive,
      status: memberActive ? 'Active' : 'Inactive',
      userId: targetUserId,
      role: isAdmin ? memberRole : ((editingMember?.role as UserRole) || 'VOLUNTEER'),
      password: editingMember?.password || memberPassword.trim() || 'welcome123',
      createdAt: editingMember ? editingMember.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveMember(memberToSave);
    setIsMemberModalOpen(false);
  };

  // Open Expense Modal for Add/Edit
  const handleOpenExpenseModal = (type?: ExpenseType) => {
    if (type) {
      setEditingExpenseType(type);
      setExpenseTypeName(type.nameEnglish);
      setExpenseTypeActive(type.active);
    } else {
      setEditingExpenseType(null);
      setExpenseTypeName('');
      setExpenseTypeActive(true);
    }
    setExpenseError('');
    setIsExpenseModalOpen(true);
  };

  // Save Expense Type
  const handleSaveExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTypeName.trim()) {
      setExpenseError('Expense Category / Type Name is required');
      return;
    }

    const typeToSave: ExpenseType = {
      id: editingExpenseType ? editingExpenseType.id : `exp_type_${Date.now()}`,
      nameEnglish: expenseTypeName.trim(),
      nameMalayalam: '',
      active: expenseTypeActive,
      createdAt: editingExpenseType ? editingExpenseType.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveExpenseType(typeToSave);
    setIsExpenseModalOpen(false);
  };

  // Handle Add New User Submission (Admin Only)
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    setUserSuccess('');

    if (!newUserId.trim()) {
      setUserError('User ID / Handle is required');
      return;
    }
    if (!newUserName.trim()) {
      setUserError('Staff Name is required');
      return;
    }

    const res = await registerUser({
      userId: newUserId,
      name: newUserName,
      password: newUserPassword,
      role: newUserRole,
      phone: newUserPhone,
    });

    if (!res.success) {
      setUserError(res.error || 'Failed to create user record.');
      return;
    }

    setUserSuccess(`User "${res.data?.name}" provisioned with role ${res.data?.role}`);
    setIsAddUserModalOpen(false);
    setNewUserId('');
    setNewUserName('');
    setNewUserPhone('');
    setNewUserPassword('welcome123');
    setNewUserRole('USER');
    loadUsers();
    setTimeout(() => setUserSuccess(''), 4000);
  };

  // Toggle User Active Status (Admin Only)
  const handleToggleUserStatus = async (user: UserRecord) => {
    if (!canPerformAction('ADMIN_MANAGE')) {
      alert('Only administrators can update user statuses.');
      return;
    }
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await updateUserStatus(user.userId, newStatus);
    loadUsers();
  };

  // Toggle User Role (Admin Only)
  const handleToggleUserRole = async (user: UserRecord) => {
    if (!canPerformAction('ADMIN_MANAGE')) {
      alert('Only administrators can alter user roles.');
      return;
    }
    if (user.userId === currentUser?.userId) {
      alert('You cannot change your own administrator role while active.');
      return;
    }
    const newRole: UserRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    if (confirm(`Change ${user.name}'s role from ${user.role} to ${newRole}?`)) {
      await updateUserRole(user.userId, newRole);
      loadUsers();
    }
  };

  // Delete User (Admin Only)
  const handleDeleteUser = async (user: UserRecord) => {
    if (!canPerformAction('DELETE')) {
      alert('Only administrators have delete privileges.');
      return;
    }
    if (confirm(`Permanently delete user "${user.name}" (${user.userId}) from Firestore?`)) {
      const res = await deleteUser(user.userId);
      if (!res.success) {
        alert(res.error || 'Failed to delete user.');
      } else {
        loadUsers();
      }
    }
  };

  // Filter lists
  const filteredMembers = committeeMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.designation.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.phone.includes(memberSearch)
  );

  const filteredExpenses = expenseTypes.filter((e) =>
    e.nameEnglish.toLowerCase().includes(expenseSearch.toLowerCase())
  );

  const filteredUsers = usersList.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.userId.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.phone && u.phone.includes(userSearch))
  );

  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-stone-200 shadow-sm max-w-lg mx-auto my-12">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-stone-900">Access Restricted</h3>
        <p className="text-xs text-stone-600 mt-1">
          Master Data management (Members, Expense Types & System Configurations) is restricted to Chief Administrators only.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-linear-to-r from-stone-900 via-amber-950 to-stone-900 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-xl border border-amber-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-amber-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-0.5">
              <Shield className="w-3.5 h-3.5" />
              <span>Master Configuration & RBAC Authorization</span>
            </div>
            <h1 className="text-sm sm:text-xl md:text-2xl font-black text-white tracking-tight">
              Master Data & User Roles
            </h1>
          </div>

          {/* Active Role Indicator Badge */}
          <div className="flex items-center gap-2 p-2 rounded-2xl bg-black/40 border border-white/10 self-start sm:self-auto">
            <div
              className={`p-2 rounded-xl text-white ${
                isAdmin ? 'bg-amber-600' : 'bg-emerald-600'
              }`}
            >
              {isAdmin ? <Shield className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
            </div>
            <div className="pr-3 text-xs">
              <div className="text-[10px] text-stone-400 uppercase font-semibold">Active Mode</div>
              <div className="font-extrabold text-white">
                {currentUser?.name || 'Administrator'} ({currentUser?.role || 'ADMIN'})
              </div>
            </div>
          </div>
        </div>

        {/* Standard User Notice Banner if non-admin */}
        {!isAdmin && (
          <div className="mt-4 p-3 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Standard User Privileges:</strong> You have authorization to create, read, and edit draft master records. Record deletion and user administration require Administrator privileges.
            </span>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-stone-100 p-1.5 rounded-2xl border border-stone-200 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'members'
              ? 'bg-white text-stone-900 shadow-sm border border-stone-200/80'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Users className="w-4 h-4 text-amber-600" />
          <span>Committee Members</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-200 font-bold">
            {committeeMembers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'expenses'
              ? 'bg-white text-stone-900 shadow-sm border border-stone-200/80'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Tag className="w-4 h-4 text-amber-600" />
          <span>Expense Categories</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-200 font-bold">
            {expenseTypes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'users'
              ? 'bg-white text-stone-900 shadow-sm border border-stone-200/80'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <KeyRound className="w-4 h-4 text-indigo-600" />
          <span>User Master & RBAC</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800 font-bold">
            {usersList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('danger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
            activeTab === 'danger'
              ? 'bg-red-50 text-red-900 shadow-sm border border-red-300'
              : 'text-stone-600 hover:text-red-700'
          }`}
        >
          <AlertOctagon className="w-4 h-4 text-red-600" />
          <span>Danger Zone / Reset Transactions</span>
        </button>
      </div>

      {userSuccess && (
        <div className="p-4 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{userSuccess}</span>
        </div>
      )}

      {/* TAB 1: COMMITTEE MEMBERS MASTER */}
      {activeTab === 'members' && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-600" />
                <span>Festival Committee Members</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Authorized festival office bearers for float disbursements and advances.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search name, phone..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 w-44 sm:w-56"
                />
              </div>

              <button
                type="button"
                onClick={() => handleOpenMemberModal()}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Member</span>
              </button>
            </div>
          </div>

          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-300 space-y-2">
              <Users className="w-8 h-8 text-stone-400 mx-auto" />
              <p className="text-xs font-bold text-stone-700">No members found</p>
              <p className="text-[11px] text-stone-500">Click "Add Member" above to record committee members.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-stone-200">
              <table className="w-full text-left text-xs text-stone-800">
                <thead className="bg-stone-100/90 text-stone-700 uppercase text-[10px] font-black tracking-wider border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-3">Member ID</th>
                    <th className="py-3 px-3">Full Name</th>
                    <th className="py-3 px-3">Role / Designation</th>
                    <th className="py-3 px-3">Phone Number</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-amber-50/20 transition">
                      <td className="py-3 px-3 font-mono text-stone-500 font-bold whitespace-nowrap">
                        {m.id}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-extrabold text-stone-900">{m.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            @{m.userId || m.phone}
                          </span>
                          <span
                            className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                              m.role === 'ADMIN'
                                ? 'bg-amber-200 text-amber-900'
                                : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {m.role || 'USER'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-stone-700">
                        {m.designation}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap font-mono text-stone-600">
                        +91 {m.phone}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onToggleMemberStatus(m.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black cursor-pointer transition ${
                            m.active
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                              : 'bg-stone-100 text-stone-500 border border-stone-300 hover:bg-stone-200'
                          }`}
                          title="Click to toggle status"
                        >
                          {m.active ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-stone-400" />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenMemberModal(m)}
                            className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-100 transition cursor-pointer"
                            title="Edit Member"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* RBAC Delete Guard: Only rendered for ADMIN */}
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Delete member ${m.name}?`)) {
                                  onDeleteMember(m.id);
                                }
                              }}
                              className="btn-delete p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition cursor-pointer"
                              title="Delete Member (Admin Only)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span
                              className="p-1.5 text-stone-300 cursor-not-allowed"
                              title="Delete action restricted to Admins"
                            >
                              <Lock className="w-3 h-3" />
                            </span>
                          )}
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

      {/* TAB 2: EXPENSE TYPES MASTER */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-600" />
                <span>Expense Category Heads</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Categories for festival operational claims (Melam, Annadanam, Lighting, Stage, etc.).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search category..."
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 w-44 sm:w-56"
                />
              </div>

              <button
                type="button"
                onClick={() => handleOpenExpenseModal()}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
              </button>
            </div>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-300 space-y-2">
              <Tag className="w-8 h-8 text-stone-400 mx-auto" />
              <p className="text-xs font-bold text-stone-700">No expense categories found</p>
              <p className="text-[11px] text-stone-500">Click "Add Category" above to create expense heads.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-stone-200">
              <table className="w-full text-left text-xs text-stone-800">
                <thead className="bg-stone-100/90 text-stone-700 uppercase text-[10px] font-black tracking-wider border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-3">Category Code</th>
                    <th className="py-3 px-3">English Head Name</th>
                    <th className="py-3 px-3 text-center">Active Status</th>
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-amber-50/20 transition">
                      <td className="py-3 px-3 font-mono text-stone-500 font-bold whitespace-nowrap">
                        {e.id}
                      </td>
                      <td className="py-3 px-3 font-extrabold text-stone-900 whitespace-nowrap">
                        {e.nameEnglish}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onToggleExpenseTypeStatus(e.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black cursor-pointer transition ${
                            e.active
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                              : 'bg-stone-100 text-stone-500 border border-stone-300 hover:bg-stone-200'
                          }`}
                          title="Click to toggle status"
                        >
                          {e.active ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-stone-400" />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenExpenseModal(e)}
                            className="p-1.5 rounded-lg text-amber-700 hover:bg-amber-100 transition cursor-pointer"
                            title="Edit Category"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* RBAC Delete Guard: Only rendered for ADMIN */}
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Delete category ${e.nameEnglish}?`)) {
                                  onDeleteExpenseType(e.id);
                                }
                              }}
                              className="btn-delete p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition cursor-pointer"
                              title="Delete Category (Admin Only)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span
                              className="p-1.5 text-stone-300 cursor-not-allowed"
                              title="Delete action restricted to Admins"
                            >
                              <Lock className="w-3 h-3" />
                            </span>
                          )}
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

      {/* TAB 3: USER MASTER & RBAC (ADMIN-ONLY CONTROLS) */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-indigo-600" />
                  <span>User Master Data & Role-Based Access Control</span>
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Firestore /users
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Administer user profiles, provisioning in Firebase Auth, and RBAC rights (ADMIN full rights vs USER data-entry only).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search user, role..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 w-44 sm:w-56"
                />
              </div>

              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register New User</span>
                </button>
              ) : (
                <div className="px-3 py-1.5 rounded-xl bg-stone-100 text-stone-500 text-xs font-bold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Admin Mode Required to Add</span>
                </div>
              )}
            </div>
          </div>

          {/* User Master Table */}
          {loadingUsers ? (
            <div className="py-12 text-center text-xs text-stone-500">Loading user profiles...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-300 space-y-2">
              <KeyRound className="w-8 h-8 text-stone-400 mx-auto" />
              <p className="text-xs font-bold text-stone-700">No users found</p>
              <p className="text-[11px] text-stone-500">Click "Register New User" to provision users in Firestore.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-stone-200">
              <table className="w-full text-left text-xs text-stone-800">
                <thead className="bg-stone-100/90 text-stone-700 uppercase text-[10px] font-black tracking-wider border-b border-stone-200">
                  <tr>
                    <th className="py-3 px-3">User ID (Login)</th>
                    <th className="py-3 px-3">Full Member Name</th>
                    <th className="py-3 px-3">Phone</th>
                    <th className="py-3 px-3 text-center">RBAC Role</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Permissions</th>
                    <th className="py-3 px-3 text-center">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredUsers.map((u) => {
                    const isUserAdmin = u.role === 'ADMIN';
                    const isSelf = currentUser?.userId === u.userId;

                    return (
                      <tr key={u.userId} className="hover:bg-indigo-50/20 transition">
                        <td className="py-3 px-3 font-mono font-bold text-stone-900 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-indigo-600 font-extrabold">{u.userId}</span>
                            {isSelf && (
                              <span className="text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-extrabold">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-extrabold text-stone-900 whitespace-nowrap">
                          {u.name}
                        </td>
                        <td className="py-3 px-3 font-mono text-stone-600 whitespace-nowrap">
                          {u.phone ? `+91 ${u.phone}` : '—'}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              isUserAdmin
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            }`}
                          >
                            {isUserAdmin ? (
                              <Shield className="w-3 h-3 text-amber-700" />
                            ) : (
                              <UserCheck className="w-3 h-3 text-emerald-700" />
                            )}
                            <span>{u.role}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(u)}
                              disabled={isSelf}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black cursor-pointer transition ${
                                u.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                  : 'bg-stone-100 text-stone-500 border border-stone-300 hover:bg-stone-200'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                              title={isSelf ? 'Cannot deactivate active session' : 'Click to toggle status'}
                            >
                              {u.status === 'ACTIVE' ? (
                                <>
                                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                                  <span>Active</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3 text-stone-400" />
                                  <span>Inactive</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-stone-600">
                              {u.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="text-[10px] text-stone-500 font-medium">
                            {isUserAdmin ? 'Full CRUD & Delete' : 'Create, Read, Edit Draft'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {isAdmin ? (
                            <div className="inline-flex items-center gap-1.5">
                              {/* Switch Role Button */}
                              <button
                                type="button"
                                onClick={() => handleToggleUserRole(u)}
                                disabled={isSelf}
                                className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-extrabold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                title={isSelf ? 'Cannot change own role' : `Switch to ${isUserAdmin ? 'USER' : 'ADMIN'}`}
                              >
                                {isUserAdmin ? 'Demote to User' : 'Promote to Admin'}
                              </button>

                              {/* Delete User */}
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                disabled={isSelf}
                                className="btn-delete p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                title={isSelf ? 'Cannot delete logged in user' : 'Delete user'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-stone-400">Locked</span>
                          )}
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

      {/* TAB 4: DANGER ZONE & PURGE TRANSACTIONS */}
      {activeTab === 'danger' && (
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-red-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-red-100 pb-4">
            <div className="p-3 bg-red-100 text-red-700 rounded-2xl shrink-0">
              <AlertOctagon className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-stone-900 flex items-center gap-2">
                <span>Danger Zone / Reset Transactions</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                  Permanent Delete Guarantee
                </span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Admin-level controls to permanently delete transactions while preserving Master Data.
              </p>
            </div>
          </div>

          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-950 space-y-2">
            <div className="font-extrabold flex items-center gap-1.5 text-red-800 text-sm">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Warning: Irreversible Cloud Database Operation</span>
            </div>
            <p className="leading-relaxed">
              This will permanently delete all transaction vouchers, expense claims, and float audit logs from the cloud database (<code className="font-mono bg-red-100 px-1 py-0.5 rounded">/transactions</code>, <code className="font-mono bg-red-100 px-1 py-0.5 rounded">/advance_payments</code>, <code className="font-mono bg-red-100 px-1 py-0.5 rounded">/direct_expenses</code>, <code className="font-mono bg-red-100 px-1 py-0.5 rounded">/receipt_vouchers</code>, and <code className="font-mono bg-red-100 px-1 py-0.5 rounded">/commitments</code>).
            </p>
            <div className="pt-1 flex items-center gap-2 text-emerald-800 font-bold bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Master Data Guarantee: Members, Programs, Categories, and System Settings will remain completely intact.</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-stone-50 border border-stone-200 rounded-2xl">
            <div>
              <h3 className="font-black text-stone-900 text-sm">Purge All Transaction Records</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Requires typing <span className="font-mono font-bold text-red-700 bg-red-100 px-1 rounded">CONFIRM</span> in the safety verification prompt.
              </p>
            </div>
            <button
              type="button"
              onClick={onPurgeAllTransactions}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2 border border-red-700 shrink-0"
              title="Permanently delete all transaction records from cloud database"
            >
              <Trash2 className="w-4 h-4" />
              <span>Purge All Transactions</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT COMMITTEE MEMBER */}
      {isMemberModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden my-auto">
            <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>{editingMember ? 'Edit Committee Member' : 'Add Committee Member'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsMemberModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMemberSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
              {memberError && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 font-medium">
                  {memberError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="e.g., Harikrishnan K."
                  required
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Mobile Phone (10 digits) <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={memberPhone}
                  onChange={(e) => setMemberPhone(e.target.value)}
                  placeholder="9495233833"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Designation Role Hierarchy <span className="text-red-500">*</span>
                </label>
                <select
                  value={memberDesignation}
                  onChange={(e) => setMemberDesignation(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs font-bold bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none cursor-pointer"
                >
                  <option value="">-- Select Committee Designation Role --</option>
                  <option value="Member">1. Member</option>
                  <option value="Convenor">2. Convenor</option>
                  <option value="Joint Convenor">3. Joint Convenor</option>
                  <option value="Treasurer">4. Treasurer</option>
                  <option value="Rakshadhikari">5. Rakshadhikari</option>
                  <option value="Additional Member">6. Additional Member</option>
                  {/* Keep current designation as option if legacy */}
                  {memberDesignation &&
                    !['Member', 'Convenor', 'Joint Convenor', 'Treasurer', 'Rakshadhikari', 'Additional Member'].includes(memberDesignation) && (
                      <option value={memberDesignation}>{memberDesignation} (Custom)</option>
                    )}
                </select>

                {/* Quick Selection Role Chips */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[
                    'Member',
                    'Convenor',
                    'Joint Convenor',
                    'Treasurer',
                    'Rakshadhikari',
                    'Additional Member',
                  ].map((roleName) => (
                    <button
                      key={roleName}
                      type="button"
                      onClick={() => setMemberDesignation(roleName)}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition cursor-pointer font-bold ${
                        memberDesignation === roleName
                          ? 'bg-emerald-900 text-white border-emerald-950 shadow-2xs'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-300'
                      }`}
                    >
                      {roleName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Login Handle / User ID Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-stone-700">
                    User ID / Login Handle <span className="text-red-500">*</span>
                  </label>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setMemberUserId(memberPhone ? memberPhone.toLowerCase() : '')}
                      className="text-[10px] text-amber-700 hover:text-amber-800 font-bold underline cursor-pointer"
                    >
                      Use Mobile as User ID
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="memberUserIdInput"
                    type="text"
                    value={memberUserId}
                    onChange={(e) => {
                      if (isAdmin) setMemberUserId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
                    }}
                    placeholder="e.g. jishnu_kv or 9946809341"
                    disabled={!isAdmin && !!editingMember}
                    readOnly={!isAdmin && !!editingMember}
                    required
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold transition ${
                      !isAdmin && !!editingMember
                        ? 'bg-stone-100 border-stone-200 text-stone-500 cursor-not-allowed'
                        : 'border-stone-300 focus:ring-2 focus:ring-amber-500'
                    }`}
                  />
                </div>
                {!isAdmin && !!editingMember && (
                  <p className="text-[10px] text-stone-500 mt-1 flex items-center gap-1 font-medium">
                    <Lock className="w-3 h-3 text-stone-400" />
                    User ID is an immutable primary key handle. Only Administrators can alter login handles.
                  </p>
                )}
              </div>

              {/* System Access Role */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  System Access Role (RBAC) <span className="text-red-500">*</span>
                </label>
                <select
                  id="memberRoleSelect"
                  value={memberRole}
                  onChange={(e) => {
                    if (isAdmin) setMemberRole(e.target.value as UserRole);
                  }}
                  disabled={!isAdmin}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-bold transition ${
                    !isAdmin
                      ? 'bg-stone-100 border-stone-200 text-stone-500 cursor-not-allowed'
                      : 'border-stone-300 focus:ring-2 focus:ring-amber-500 cursor-pointer bg-white'
                  }`}
                >
                  <option value="ADMIN">ADMIN (Full Access, User Management & Master Controls)</option>
                  <option value="TREASURER">TREASURER (Financial Transactions, Central Settlements & Reports)</option>
                  <option value="VOLUNTEER">VOLUNTEER (Collection Desk Receipts & Public Programs)</option>
                  <option value="USER">USER (Standard Member: View & Collection Desk)</option>
                </select>
                {!isAdmin && (
                  <p className="text-[10px] text-stone-400 mt-0.5">Role modifications require Administrator privileges.</p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="memberActiveToggle"
                  checked={memberActive}
                  onChange={(e) => setMemberActive(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="memberActiveToggle" className="text-xs font-bold text-stone-700 cursor-pointer">
                  Active for On-Ground Collection Duty
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold shadow-sm transition cursor-pointer"
                >
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT EXPENSE TYPE */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden my-auto">
            <div className="bg-stone-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" />
                <span>{editingExpenseType ? 'Edit Expense Category' : 'Add Expense Category'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpenseSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
              {expenseError && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 font-medium">
                  {expenseError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Category / Type Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={expenseTypeName}
                  onChange={(e) => setExpenseTypeName(e.target.value)}
                  placeholder="e.g., Catering, Travel, Venue, Logistics"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="expenseActiveToggle"
                  checked={expenseTypeActive}
                  onChange={(e) => setExpenseTypeActive(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <label htmlFor="expenseActiveToggle" className="text-xs font-bold text-stone-700 cursor-pointer">
                  Active Category (Visible on Expense Entry form)
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold shadow-sm"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REGISTER NEW USER (ADMIN-ONLY) */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-indigo-200 overflow-hidden my-auto">
            <div className="bg-indigo-950 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-300" />
                <span>Register User (Firestore /users)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-1 rounded-lg text-indigo-200 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
              {userError && (
                <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 font-medium">
                  {userError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  User ID (Login Handle) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  placeholder="e.g. suresh or desk_agent"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono font-bold"
                />
                <p className="text-[10px] text-stone-400 mt-1">Alphanumeric login identifier</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Full Member / Staff Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g., Suresh Kumar"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Role Dropdown <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold bg-white"
                  >
                    <option value="USER">USER (Data Entry / View)</option>
                    <option value="ADMIN">ADMIN (Full CRUD & Delete)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Default Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  placeholder="10 digits optional"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-sm cursor-pointer"
                >
                  Provision User Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
