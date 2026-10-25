import React from 'react';
import { UserProfile, Setting } from '../types';
import { isCurrentUserAdmin } from '../modules/auth';
import {
  TrendingUp,
  FileText,
  Receipt,
  BookOpen,
  Database,
  Wifi,
  WifiOff,
  User,
  Shield,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut,
  Sparkles,
  Coins,
  Scale,
  Calendar,
  FileSpreadsheet,
  Wallet,
} from 'lucide-react';

export type AppNavTab =
  | 'dashboard'
  | 'advances'
  | 'expenses'
  | 'member_ledgers'
  | 'master'
  | 'commitments'
  | 'receipts'
  | 'ledger'
  | 'programs'
  | 'program_wallets'
  | 'program_reports';

interface SidebarProps {
  currentTab: AppNavTab;
  setCurrentTab: (tab: AppNavTab) => void;
  currentUser: UserProfile;
  activeVolunteerName: string;
  onOpenSwitchUser?: () => void;
  setting: Setting;
  isOnline: boolean;
  offlineCount: number;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onOpenAuth?: () => void;
  onOpenSettings?: () => void;
  onSyncOffline: () => void;
  isSyncing: boolean;
  onLogout?: () => void;
  authRole?: 'ADMIN' | 'TREASURER' | 'VOLUNTEER' | 'USER';
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  authRole,
  activeVolunteerName,
  onOpenSwitchUser,
  setting,
  isOnline,
  offlineCount,
  isCollapsed,
  setIsCollapsed,
  onOpenAuth,
  onOpenSettings,
  onSyncOffline,
  isSyncing,
  onLogout,
}) => {
  const allNavItems = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard & Reports',
      sublabel: 'Float & Expense Overview',
      icon: TrendingUp,
      badge: 'Main',
      allowedRoles: ['ADMIN', 'TREASURER', 'VOLUNTEER', 'USER'],
    },
    {
      id: 'advances' as const,
      label: 'Pay Advance',
      sublabel: 'Member Float Disbursement',
      icon: Coins,
      badge: 'Module 2',
      allowedRoles: ['ADMIN', 'TREASURER'],
    },
    {
      id: 'expenses' as const,
      label: 'Expense Entry',
      sublabel: 'Direct Voucher & Live Card',
      icon: Receipt,
      badge: 'Module 3',
      allowedRoles: ['ADMIN', 'TREASURER'],
    },
    {
      id: 'member_ledgers' as const,
      label: 'Member Ledgers',
      sublabel: 'Detailed Statements & Balance',
      icon: BookOpen,
      badge: 'Module 4',
      allowedRoles: ['ADMIN', 'TREASURER'],
    },
    {
      id: 'master' as const,
      label: 'Master Data',
      sublabel: 'Members & Expense Types',
      icon: Database,
      badge: 'Module 1',
      allowedRoles: ['ADMIN'],
    },
    {
      id: 'commitments' as const,
      label: 'Donor Pledges',
      sublabel: 'Festival Collection Register',
      icon: FileText,
      badge: 'Pledges',
      allowedRoles: ['ADMIN', 'TREASURER', 'VOLUNTEER', 'USER'],
    },
    {
      id: 'receipts' as const,
      label: 'Donor Receipts',
      sublabel: 'Collection Desk & Slips',
      icon: Scale,
      badge: 'Receipts',
      allowedRoles: ['ADMIN', 'TREASURER', 'VOLUNTEER', 'USER'],
    },
    {
      id: 'ledger' as const,
      label: 'Payee Ledger',
      sublabel: 'Donor Statements & History',
      icon: BookOpen,
      badge: 'Ledger',
      allowedRoles: ['ADMIN', 'TREASURER', 'VOLUNTEER', 'USER'],
    },
    {
      id: 'programs' as const,
      label: 'Program Bookings',
      sublabel: 'New Booking & Live Overview',
      icon: Calendar,
      badge: 'Programs',
      allowedRoles: ['ADMIN', 'TREASURER', 'VOLUNTEER', 'USER'],
    },
    {
      id: 'program_wallets' as const,
      label: 'Member Wallets & Ledger',
      sublabel: 'Advance Floats & Audit Ledger',
      icon: Wallet,
      badge: 'Wallets',
      allowedRoles: ['ADMIN', 'TREASURER'],
    },
    {
      id: 'program_reports' as const,
      label: 'Program Reports',
      sublabel: 'Financial Summary & Export',
      icon: FileSpreadsheet,
      badge: 'Reports',
      allowedRoles: ['ADMIN', 'TREASURER'],
    },
  ];

  const currentRole = authRole || (currentUser.role === 'admin' ? 'ADMIN' : 'VOLUNTEER');
  const isAdmin = currentRole === 'ADMIN' || isCurrentUserAdmin();

  const navItems = allNavItems.filter((item) => {
    if (isAdmin) return true;
    return item.allowedRoles.includes(currentRole);
  });

  return (
    <aside
      className={`no-print h-screen shrink-0 bg-stone-950/85 backdrop-blur-md border-r border-amber-500/20 text-stone-200 transition-all duration-300 ease-in-out flex flex-col justify-between select-none z-30 shadow-2xl ${
        isCollapsed ? 'w-20' : 'w-64 sm:w-72'
      }`}
    >
      {/* Top Branding Section */}
      <div className="p-4 border-b border-stone-800/80">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-amber-600 via-amber-700 to-red-800 p-0.5 shadow-md flex items-center justify-center shrink-0 border border-amber-400/50">
              <span className="text-2xl select-none">🔱</span>
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <h1 className="text-sm font-black text-amber-200 truncate tracking-tight">
                  {setting.sangamNameEnglish}
                </h1>
                <p className="text-[11px] font-bold text-stone-300 truncate">
                  Festival Management Portal
                </p>
                <div className="text-[10px] text-amber-400 font-semibold uppercase">
                  Festival {setting.festivalYear}
                </div>
              </div>
            )}
          </div>

          {/* Collapse/Expand Toggle Button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-amber-300 transition cursor-pointer"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Network & Offline Status Banner */}
        {!isCollapsed && (
          <div className="mt-3 pt-2.5 border-t border-stone-800 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 font-medium">
              {isOnline ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Wifi className="w-3 h-3" />
                  <span>Cloud Sync Active</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <WifiOff className="w-3 h-3" />
                  <span>Offline Mode</span>
                </span>
              )}
            </div>

            {offlineCount > 0 && (
              <button
                type="button"
                onClick={onSyncOffline}
                disabled={isSyncing || !isOnline}
                className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 hover:bg-amber-500/30 transition cursor-pointer"
              >
                <RotateCw className={`w-2.5 h-2.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{offlineCount} sync</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer animate-btn-flip ${
                isActive
                  ? 'bg-linear-to-r from-amber-700 via-amber-800 to-amber-900 text-white shadow-lg shadow-amber-950/50 border border-amber-500/50 scale-[1.01]'
                  : 'text-stone-300 hover:bg-stone-800/80 hover:text-white'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
              title={item.label}
            >
              <Icon
                className={`w-5 h-5 shrink-0 ${
                  isActive ? 'text-amber-200' : 'text-stone-400'
                }`}
              />

              {!isCollapsed && (
                <div className="flex-1 text-left truncate">
                  <div className="flex items-center justify-between">
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded-md bg-stone-800/90 text-amber-300 border border-stone-700 font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-[10px] truncate font-normal ${
                      isActive ? 'text-amber-200/90' : 'text-stone-400'
                    }`}
                  >
                    {item.sublabel}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile & Footer Actions */}
      <div className="p-3 border-t border-stone-800/90 space-y-2">
        {!isCollapsed ? (
          <div className="flex items-center justify-between p-2 rounded-2xl bg-stone-900 border border-stone-800 text-left">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-400 shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-stone-200 truncate">
                  {currentUser.displayName}
                </div>
                <div className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wide">
                  {authRole || (currentUser.role === 'admin' ? 'ADMIN' : 'USER')}
                </div>
              </div>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-stone-800 transition cursor-pointer"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-full flex items-center justify-center p-2.5 rounded-2xl bg-stone-900 border border-stone-800 text-amber-400"
              title={`${currentUser.displayName} (${authRole || currentUser.role})`}
            >
              <User className="w-4 h-4" />
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 text-stone-400 hover:text-rose-400 transition cursor-pointer"
                title="Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {!isCollapsed && (
          <div className="px-2 pt-1 flex items-center justify-between text-[10px] text-stone-500 font-mono">
            <span className="truncate">VPA: {setting.upiId || 'Not set'}</span>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setCurrentTab('master')}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-sans font-bold"
                title="Master Data & UPI Configuration"
              >
                <Settings className="w-3 h-3" />
                <span>Config</span>
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
