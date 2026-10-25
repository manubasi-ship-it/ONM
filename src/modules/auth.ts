/**
 * Authentication & Role-Based Access Control (RBAC) Module
 * Handles Firebase Auth, Firestore /users collection synchronization,
 * role resolution ('ADMIN' vs 'USER'), and permission guards.
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInAnonymously,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  where,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { ActiveMemberSession, CommitteeMember } from '../types';

export type UserRole = 'ADMIN' | 'TREASURER' | 'VOLUNTEER' | 'USER';
export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface UserRecord {
  userId: string;          // Unique login handle or email
  name: string;            // Full member/staff name
  role: UserRole;          // RBAC permission role: 'ADMIN' | 'TREASURER' | 'VOLUNTEER' | 'USER'
  phone: string;
  status: UserStatus;      // 'ACTIVE' | 'INACTIVE'
  createdAt: string;
  updatedAt: string;
  password?: string;       // Default / initial password hint
  uid?: string;
  email?: string;
}

export interface AuthUser {
  uid: string;
  userId: string;
  name: string;
  role: UserRole;
  phone?: string;
  status: UserStatus;
  email?: string;
}

const STORAGE_KEY = 'APP_CURRENT_USER';
export const ACTIVE_MEMBER_STORAGE_KEY = 'activeMember';

// Predefined multi-role RBAC users: Admin, Treasurer, Volunteer
export const DEFAULT_USERS: UserRecord[] = [
  {
    userId: 'admin',
    name: 'Chief Administrator',
    role: 'ADMIN',
    phone: '9495233833',
    status: 'ACTIVE',
    password: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    userId: 'treasurer',
    name: 'K. S. Narayanan (Treasurer)',
    role: 'TREASURER',
    phone: '9447112233',
    status: 'ACTIVE',
    password: 'treasurer123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    userId: 'volunteer1',
    name: 'Harikrishnan (Collection Desk)',
    role: 'VOLUNTEER',
    phone: '9847123456',
    status: 'ACTIVE',
    password: 'user123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    userId: 'volunteer2',
    name: 'Sujith Kumar (Field Agent)',
    role: 'VOLUNTEER',
    phone: '9447654321',
    status: 'ACTIVE',
    password: 'user123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let inMemoryUser: AuthUser | null = null;

/**
 * -------------------------------------------------------------
 * 1. Current User State & Storage Helpers
 * -------------------------------------------------------------
 */

export function getActiveSession(): ActiveMemberSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw =
      sessionStorage.getItem(ACTIVE_MEMBER_STORAGE_KEY) ||
      localStorage.getItem(ACTIVE_MEMBER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.memberId || parsed.userId)) {
        return parsed as ActiveMemberSession;
      }
    }
  } catch (e) {
    console.error('Error loading activeMember from storage:', e);
  }

  // Fallback to active AuthUser mapped to member session
  const current = getCurrentUser();
  if (current) {
    return {
      memberId: current.uid || `mem_${current.userId}`,
      userId: current.userId,
      name: current.name,
      designation: current.role === 'ADMIN' ? 'Chief Administrator' : 'Committee Member',
      phone: current.phone || '',
      role: current.role,
      password: '',
      status: current.status,
    };
  }
  return null;
}

export function setActiveMemberSession(session: ActiveMemberSession | null): void {
  if (typeof window === 'undefined') return;
  if (session) {
    sessionStorage.setItem(ACTIVE_MEMBER_STORAGE_KEY, JSON.stringify(session));
    localStorage.setItem(ACTIVE_MEMBER_STORAGE_KEY, JSON.stringify(session));
    // Keep APP_CURRENT_USER in sync
    setCurrentUser({
      uid: session.memberId,
      userId: session.userId,
      name: session.name,
      role: session.role,
      phone: session.phone,
      status: (session.status as UserStatus) || 'ACTIVE',
    });
  } else {
    sessionStorage.removeItem(ACTIVE_MEMBER_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_MEMBER_STORAGE_KEY);
  }
  window.dispatchEvent(new CustomEvent('active_member_changed', { detail: session }));
}

export function getCurrentUser(): AuthUser | null {
  if (inMemoryUser) return inMemoryUser;
  if (typeof window === 'undefined') return null;

  // If user explicitly logged out, do not auto-login
  if (localStorage.getItem('oks_logged_out') === 'true') {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.userId && parsed.role) {
        inMemoryUser = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading current user from storage:', e);
  }

  // Check activeMember if available
  try {
    const memRaw =
      sessionStorage.getItem(ACTIVE_MEMBER_STORAGE_KEY) ||
      localStorage.getItem(ACTIVE_MEMBER_STORAGE_KEY);
    if (memRaw) {
      const mem = JSON.parse(memRaw);
      if (mem && (mem.userId || mem.name)) {
        const mappedUser: AuthUser = {
          uid: mem.memberId || `usr_${mem.userId}`,
          userId: mem.userId || mem.phone,
          name: mem.name,
          role: mem.role || 'USER',
          phone: mem.phone,
          status: 'ACTIVE',
        };
        inMemoryUser = mappedUser;
        return mappedUser;
      }
    }
  } catch {
    // ignore
  }

  // Do not auto-login as default admin on initial load.
  // Unauthenticated users will be presented with the standalone login screen.
  return null;
}

export function setCurrentUser(user: AuthUser | null): void {
  inMemoryUser = user;
  if (typeof window !== 'undefined') {
    if (user) {
      localStorage.removeItem('oks_logged_out');
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      // Auto-set activeMember if not already stored
      if (!sessionStorage.getItem(ACTIVE_MEMBER_STORAGE_KEY)) {
        const memSession: ActiveMemberSession = {
          memberId: user.uid || `mem_${user.userId}`,
          userId: user.userId,
          name: user.name,
          designation: user.role === 'ADMIN' ? 'Chief Administrator' : 'Committee Member',
          phone: user.phone || '',
          role: user.role,
          status: user.status,
        };
        sessionStorage.setItem(ACTIVE_MEMBER_STORAGE_KEY, JSON.stringify(memSession));
      }
    } else {
      localStorage.setItem('oks_logged_out', 'true');
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(ACTIVE_MEMBER_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_MEMBER_STORAGE_KEY);
      sessionStorage.removeItem('oks_active_session');
      localStorage.removeItem('oks_active_session');
    }
    // Broadcast event for live UI reactivity
    window.dispatchEvent(new CustomEvent('auth_state_changed', { detail: user }));
    // Also apply DOM level guards
    if (user) {
      applyRBACDOMGuards(user.role);
    }
  }
}

/**
 * -------------------------------------------------------------
 * 2. Role-Based Access Control (RBAC) Permission Guard
 * -------------------------------------------------------------
 * Actions allowed for USER:
 * - 'VIEW'
 * - 'ENTRY_CREATE'
 * - 'ENTRY_EDIT_DRAFT'
 *
 * Actions strictly restricted to ADMIN:
 */
export function isCurrentUserAdmin(): boolean {
  const current = getCurrentUser();
  return current?.role === 'ADMIN';
}

export function isCurrentUserTreasurer(): boolean {
  const current = getCurrentUser();
  return current?.role === 'ADMIN' || current?.role === 'TREASURER';
}

export function canPerformAction(action?: string, _context?: unknown): boolean {
  const current = getCurrentUser();
  if (!current) return false;
  if (current.role === 'ADMIN') return true;

  if (!action) return false;
  const upper = action.toUpperCase();

  // Deny destructive operations for non-admins
  if (
    upper.includes('DELETE') ||
    upper.includes('RESET') ||
    upper.includes('PURGE') ||
    upper.includes('ADMIN') ||
    upper.includes('MANAGE_USERS') ||
    upper.includes('MASTER')
  ) {
    return false;
  }

  // Treasurer permissions: can record transactions, settlements, and view ledgers/reports
  if (current.role === 'TREASURER') {
    return (
      upper.includes('VIEW') ||
      upper.includes('CREATE') ||
      upper.includes('ENTRY') ||
      upper.includes('SETTLE') ||
      upper.includes('RECORD') ||
      upper.includes('FINANCIAL') ||
      upper.includes('REPORT') ||
      upper.includes('LEDGER')
    );
  }

  // Volunteer permissions: can record receipt desk entries and view public events
  if (current.role === 'VOLUNTEER' || current.role === 'USER') {
    if (upper.includes('SETTLE') || upper.includes('EDIT')) return false;
    return upper.includes('VIEW') || upper.includes('CREATE') || upper.includes('ENTRY') || upper.includes('RECEIPT');
  }

  return false;
}

/**
 * -------------------------------------------------------------
 * 3. DOM Update Utility: Dynamically toggle delete & admin controls
 * -------------------------------------------------------------
 */
export function applyRBACDOMGuards(role: UserRole): void {
  if (typeof document === 'undefined') return;

  const isAdmin = role === 'ADMIN';

  // 1. Selector for delete buttons
  const deleteButtons = document.querySelectorAll<HTMLElement>(
    '.btn-delete, [data-action="delete"], [data-rbac-delete]'
  );

  deleteButtons.forEach((el) => {
    if (!isAdmin) {
      el.style.display = 'none';
      el.setAttribute('disabled', 'true');
      el.setAttribute('aria-hidden', 'true');
      el.setAttribute('title', 'Admin permissions required to delete');
    } else {
      el.style.display = '';
      el.removeAttribute('disabled');
      el.removeAttribute('aria-hidden');
      el.removeAttribute('title');
    }
  });

  // 2. Selector for edit buttons
  const editButtons = document.querySelectorAll<HTMLElement>(
    '.btn-edit, [data-action="edit"], [data-rbac-edit]'
  );

  editButtons.forEach((el) => {
    if (!isAdmin) {
      el.style.display = 'none';
      el.setAttribute('disabled', 'true');
      el.setAttribute('aria-hidden', 'true');
      el.setAttribute('title', 'Admin permissions required to edit');
    } else {
      el.style.display = '';
      el.removeAttribute('disabled');
      el.removeAttribute('aria-hidden');
      el.removeAttribute('title');
    }
  });

  // 3. Selector for reset & purge buttons
  const resetButtons = document.querySelectorAll<HTMLElement>(
    '.btn-reset, [data-action="reset"], [data-action="purge"], [data-rbac-reset]'
  );

  resetButtons.forEach((el) => {
    if (!isAdmin) {
      el.style.display = 'none';
      el.setAttribute('disabled', 'true');
      el.setAttribute('aria-hidden', 'true');
      el.setAttribute('title', 'Admin permissions required to reset');
    } else {
      el.style.display = '';
      el.removeAttribute('disabled');
      el.removeAttribute('aria-hidden');
      el.removeAttribute('title');
    }
  });

  // 4. Selector for admin-only management elements
  const adminOnlyElements = document.querySelectorAll<HTMLElement>(
    '.admin-only, [data-rbac="admin-only"]'
  );

  adminOnlyElements.forEach((el) => {
    if (!isAdmin) {
      el.style.display = 'none';
    } else {
      el.style.display = '';
    }
  });
}

/**
 * Helper: Map clean email from userId
 */
function toAuthEmail(userId: string): string {
  if (userId.includes('@')) return userId.trim().toLowerCase();
  const clean = userId.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${clean || 'user'}@onampilly.org`;
}

/**
 * -------------------------------------------------------------
 * 4. User Master Data Fetch & Persistence (Firestore /users)
 * -------------------------------------------------------------
 */

/**
 * Fetch a single user record from Firestore /users/{userId}
 */
export async function fetchUserFromFirestore(userId: string): Promise<UserRecord | null> {
  try {
    const cleanId = userId.trim().toLowerCase();
    const rawInput = userId.trim();

    // 1. Direct document check by ID
    const docRef = doc(db, 'users', cleanId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const d = snap.data();
      return {
        userId: d.username || d.userId || snap.id,
        name: d.fullName || d.name || cleanId,
        role: (d.rbacRole || d.role || 'USER').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER',
        phone: d.phone || '',
        status: (d.status || 'Active').toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
        password: d.password || 'admin',
        createdAt: d.createdAt ? String(d.createdAt) : new Date().toISOString(),
        updatedAt: d.updatedAt ? String(d.updatedAt) : new Date().toISOString(),
      };
    }

    // 2. Query by username, userId, or phone in /users
    const colRef = collection(db, 'users');
    
    // Check username
    const qUsername = query(colRef, where('username', '==', rawInput));
    const sUsername = await getDocs(qUsername);
    if (!sUsername.empty) {
      const d = sUsername.docs[0].data();
      return {
        userId: d.username || d.userId || sUsername.docs[0].id,
        name: d.fullName || d.name || rawInput,
        role: (d.rbacRole || d.role || 'USER').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER',
        phone: d.phone || '',
        status: (d.status || 'Active').toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
        password: d.password || 'admin',
        createdAt: d.createdAt ? String(d.createdAt) : new Date().toISOString(),
        updatedAt: d.updatedAt ? String(d.updatedAt) : new Date().toISOString(),
      };
    }

    // Check userId
    const qUser = query(colRef, where('userId', '==', rawInput));
    const sUser = await getDocs(qUser);
    if (!sUser.empty) {
      const d = sUser.docs[0].data();
      return {
        userId: d.username || d.userId || sUser.docs[0].id,
        name: d.fullName || d.name || rawInput,
        role: (d.rbacRole || d.role || 'USER').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER',
        phone: d.phone || '',
        status: (d.status || 'Active').toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
        password: d.password || 'admin',
        createdAt: d.createdAt ? String(d.createdAt) : new Date().toISOString(),
        updatedAt: d.updatedAt ? String(d.updatedAt) : new Date().toISOString(),
      };
    }

    // Check phone
    const qPhone = query(colRef, where('phone', '==', rawInput));
    const sPhone = await getDocs(qPhone);
    if (!sPhone.empty) {
      const d = sPhone.docs[0].data();
      return {
        userId: d.username || d.userId || sPhone.docs[0].id,
        name: d.fullName || d.name || rawInput,
        role: (d.rbacRole || d.role || 'USER').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER',
        phone: d.phone || '',
        status: (d.status || 'Active').toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
        password: d.password || 'admin',
        createdAt: d.createdAt ? String(d.createdAt) : new Date().toISOString(),
        updatedAt: d.updatedAt ? String(d.updatedAt) : new Date().toISOString(),
      };
    }

    // 3. Fallback check for built-in admin handle
    if (cleanId === 'admin') {
      return {
        userId: 'admin',
        name: 'Chief Administrator',
        role: 'ADMIN',
        phone: '9495233833',
        status: 'ACTIVE',
        password: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    return null;
  } catch (error) {
    console.warn(`Firestore: Error fetching user doc for ${userId}:`, error);
    if (userId.trim().toLowerCase() === 'admin') {
      return {
        userId: 'admin',
        name: 'Chief Administrator',
        role: 'ADMIN',
        phone: '9495233833',
        status: 'ACTIVE',
        password: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return null;
  }
}

const USERS_CACHE_KEY = 'festival_users_master_cache';

export function cacheUserLocally(record: UserRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(USERS_CACHE_KEY);
    const list: UserRecord[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((u) => u.userId.toLowerCase() !== record.userId.toLowerCase());
    filtered.push(record);
    localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Local user cache write warning:', e);
  }
}

export function getLocalUsersCache(): UserRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(USERS_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function removeLocalUserCache(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(USERS_CACHE_KEY);
    if (!raw) return;
    const list: UserRecord[] = JSON.parse(raw);
    const filtered = list.filter((u) => u.userId.toLowerCase() !== userId.toLowerCase());
    localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Local user cache removal warning:', e);
  }
}

/**
 * Fetch all users from Firestore /users collection
 */
export async function getAllUsers(): Promise<UserRecord[]> {
  try {
    const colRef = collection(db, 'users');
    const snap = await getDocs(colRef);
    if (snap.empty) {
      return [];
    }
    const list: UserRecord[] = [];
    snap.forEach((d) => {
      const data = d.data() as UserRecord;
      list.push(data);
      cacheUserLocally(data);
    });
    return list;
  } catch (e) {
    console.warn('Error fetching all users from Firestore:', e);
    return getLocalUsersCache();
  }
}

/**
 * Seed initial admin & standard users into Firestore /users collection
 */
export async function seedDefaultUsers(): Promise<void> {
  try {
    for (const u of DEFAULT_USERS) {
      const docRef = doc(db, 'users', u.userId);
      await setDoc(docRef, u, { merge: true });
      cacheUserLocally(u);
    }
    console.log('Seeded default admin and staff users in /users collection');
  } catch (e) {
    console.warn('Could not seed default users to Firestore:', e);
  }
}

/**
 * -------------------------------------------------------------
 * 5. Multi-User Authentication Flow
 * -------------------------------------------------------------
 */

/**
 * Authenticates user via Firebase Auth & Firestore /members or /users role resolution
 */
export async function loginWithCredentials(
  userIdOrEmail: string,
  password: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  const cleanInput = userIdOrEmail.trim();
  if (!cleanInput) {
    return { success: false, error: 'User ID or Mobile Number is required.' };
  }
  if (!password) {
    return { success: false, error: 'Password is required.' };
  }

  try {
    // 1. Check Committee Members collection (/members) first
    try {
      const memCol = collection(db, 'members');
      const qUser = query(memCol, where('userId', '==', cleanInput));
      let mSnap = await getDocs(qUser);
      if (mSnap.empty) {
        const qPhone = query(memCol, where('phone', '==', cleanInput));
        mSnap = await getDocs(qPhone);
      }

      if (!mSnap.empty) {
        const memDoc = mSnap.docs[0];
        const mData = memDoc.data() as CommitteeMember;

        if (mData.active === false) {
          return {
            success: false,
            error: `Member account "${mData.name}" is currently deactivated. Contact Admin.`,
          };
        }

        const expectedPassword = mData.password || 'welcome123';
        if (expectedPassword !== password) {
          return {
            success: false,
            error: 'Invalid password. Please check your credentials.',
          };
        }

        const memberRole: UserRole = (mData.role as UserRole) || 'USER';
        const memberSession: ActiveMemberSession = {
          memberId: memDoc.id,
          userId: mData.userId || mData.phone,
          name: mData.name,
          designation: mData.designation,
          phone: mData.phone,
          role: memberRole,
          password: mData.password || password,
          status: 'ACTIVE',
        };

        setActiveMemberSession(memberSession);

        const activeAuthUser: AuthUser = {
          uid: memDoc.id,
          userId: mData.userId || mData.phone,
          name: mData.name,
          role: memberRole,
          phone: mData.phone,
          status: 'ACTIVE',
          email: toAuthEmail(mData.userId || mData.phone),
        };

        return {
          success: true,
          user: activeAuthUser,
        };
      }
    } catch (e) {
      console.warn('Member collection query check notice:', e);
    }

    // 2. Fetch user master record from Firestore /users/{userId}
    let userRecord = await fetchUserFromFirestore(cleanInput);

    // If user record not found, check default users
    if (!userRecord) {
      const defaultMatch = DEFAULT_USERS.find(
        (u) =>
          u.userId.toLowerCase() === cleanInput.toLowerCase() ||
          u.phone === cleanInput ||
          (u.email && u.email.toLowerCase() === cleanInput.toLowerCase())
      );
      if (defaultMatch) {
        userRecord = defaultMatch;
        try {
          await setDoc(doc(db, 'users', defaultMatch.userId), defaultMatch, { merge: true });
        } catch {
          // ignore
        }
      }
    }

    if (!userRecord) {
      return {
        success: false,
        error: `User "${cleanInput}" not found. Please verify User ID or register with Admin.`,
      };
    }

    if (userRecord.status === 'INACTIVE') {
      return {
        success: false,
        error: `User account "${cleanInput}" is currently deactivated. Contact Admin.`,
      };
    }

    // Verify password if recorded
    if (userRecord.password && userRecord.password !== password) {
      return { success: false, error: 'Invalid password. Please check your credentials.' };
    }

    // 3. Perform Firebase Auth session sync
    const authEmail = toAuthEmail(userRecord.userId);
    let firebaseUid = userRecord.uid || `uid_${userRecord.userId}`;

    try {
      const credential = await signInWithEmailAndPassword(auth, authEmail, password);
      firebaseUid = credential.user.uid;
    } catch (authErr: any) {
      if (authErr?.code === 'auth/user-not-found' || authErr?.code === 'auth/invalid-credential') {
        try {
          const newCred = await createUserWithEmailAndPassword(auth, authEmail, password);
          firebaseUid = newCred.user.uid;
        } catch {
          if (!auth.currentUser) {
            await signInAnonymously(auth).catch(() => {});
          }
        }
      } else {
        if (!auth.currentUser) {
          await signInAnonymously(auth).catch(() => {});
        }
      }
    }

    // 4. Assemble Active Auth User Profile and Member Session
    const activeAuthUser: AuthUser = {
      uid: firebaseUid,
      userId: userRecord.userId,
      name: userRecord.name,
      role: userRecord.role,
      phone: userRecord.phone,
      status: userRecord.status,
      email: authEmail,
    };

    const memSession: ActiveMemberSession = {
      memberId: firebaseUid,
      userId: userRecord.userId,
      name: userRecord.name,
      designation: userRecord.role === 'ADMIN' ? 'Chief Administrator' : 'Committee Member',
      phone: userRecord.phone,
      role: userRecord.role,
      password: userRecord.password || password,
      status: userRecord.status,
    };

    setActiveMemberSession(memSession);

    return {
      success: true,
      user: activeAuthUser,
    };
  } catch (error: any) {
    console.error('Login error:', error);
    return {
      success: false,
      error: error?.message || 'Authentication failed. Please verify credentials.',
    };
  }
}

/**
 * Log out active user and clear stored session
 */
export async function logout(): Promise<void> {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Sign out warning:', e);
  }
  setActiveMemberSession(null);
  setCurrentUser(null);
}

/**
 * Check if candidate userId already exists on another committee member
 */
export async function checkDuplicateUserId(
  candidateUserId: string,
  excludeMemberId?: string
): Promise<{ isDuplicate: boolean; existingMemberName?: string }> {
  const clean = candidateUserId.trim().toLowerCase();
  if (!clean) return { isDuplicate: false };

  try {
    const memCol = collection(db, 'members');
    const q1 = query(memCol, where('userId', '==', clean));
    const snap1 = await getDocs(q1);
    for (const d of snap1.docs) {
      if (excludeMemberId && d.id === excludeMemberId) continue;
      return { isDuplicate: true, existingMemberName: d.data().name };
    }

    return { isDuplicate: false };
  } catch (e) {
    console.warn('Error checking duplicate userId in Firestore:', e);
    return { isDuplicate: false };
  }
}

/**
 * Self-Service Password Change for Logged-In User
 * Requires current password verification and updates Firestore /members
 */
export async function handleUserPasswordChange(
  currentPass: string,
  newPass: string,
  confirmPass: string
): Promise<{ success: boolean; error?: string }> {
  const session = getActiveSession();
  if (!session) {
    return { success: false, error: 'No active session found. Please log in again.' };
  }

  if (newPass !== confirmPass) {
    return { success: false, error: 'New password and confirmation do not match.' };
  }
  if (!newPass || newPass.trim().length < 4) {
    return { success: false, error: 'Password must be at least 4 characters long.' };
  }

  try {
    let verified = false;

    // 1. Verify against Firestore /members/{memberId}
    if (session.memberId) {
      const memberRef = doc(db, 'members', session.memberId);
      const snap = await getDoc(memberRef);
      if (snap.exists()) {
        const data = snap.data();
        const expected = data.password || 'welcome123';
        if (expected !== currentPass) {
          return { success: false, error: 'Incorrect current password.' };
        }
        verified = true;
      }
    }

    // 2. Fallback verify against /users/{userId}
    if (!verified && session.userId) {
      const userRef = doc(db, 'users', session.userId);
      const uSnap = await getDoc(userRef);
      if (uSnap.exists()) {
        const uData = uSnap.data();
        const expected = uData.password || 'admin';
        if (expected !== currentPass) {
          return { success: false, error: 'Incorrect current password.' };
        }
        verified = true;
      }
    }

    // 3. Fallback verify cached session password
    if (!verified && session.password) {
      if (session.password !== currentPass) {
        return { success: false, error: 'Incorrect current password.' };
      }
      verified = true;
    }

    if (!verified) {
      return { success: false, error: 'Unable to verify current credentials. Please re-login.' };
    }

    const nowIso = new Date().toISOString();
    const updatePayload = {
      password: newPass.trim(),
      passwordLastChangedAt: nowIso,
      updatedAt: nowIso,
    };

    // Save to /members
    if (session.memberId) {
      try {
        await setDoc(doc(db, 'members', session.memberId), updatePayload, { merge: true });
        await setDoc(doc(db, 'committee_members', session.memberId), updatePayload, { merge: true });
      } catch (err) {
        console.warn('Notice saving to /members:', err);
      }
    }

    // Save to /users
    if (session.userId) {
      try {
        await setDoc(doc(db, 'users', session.userId), updatePayload, { merge: true });
      } catch (err) {
        console.warn('Notice saving to /users:', err);
      }
    }

    // Update cached active session
    const updatedSession: ActiveMemberSession = {
      ...session,
      password: newPass.trim(),
    };
    setActiveMemberSession(updatedSession);

    return { success: true };
  } catch (error: any) {
    console.error('Password change error:', error);
    return { success: false, error: error?.message || 'Failed to update password.' };
  }
}

/**
 * Admin Password Reset for any Committee Member
 * Visible and executable ONLY by ADMIN role
 */
export async function handleAdminResetPassword(
  memberId: string,
  newTempPass: string
): Promise<{ success: boolean; error?: string }> {
  if (!canPerformAction('ADMIN_MANAGE')) {
    return {
      success: false,
      error: 'Permission denied: Only Administrators can reset member passwords.',
    };
  }

  if (!newTempPass || newTempPass.trim().length < 4) {
    return { success: false, error: 'Password must be at least 4 characters long.' };
  }

  try {
    const nowIso = new Date().toISOString();
    const updatePayload = {
      password: newTempPass.trim(),
      passwordLastChangedAt: nowIso,
      updatedAt: nowIso,
    };

    // Update in /members
    await setDoc(doc(db, 'members', memberId), updatePayload, { merge: true });
    // Mirror in /committee_members
    await setDoc(doc(db, 'committee_members', memberId), updatePayload, { merge: true });

    // Check if member has a userId recorded
    try {
      const memDoc = await getDoc(doc(db, 'members', memberId));
      if (memDoc.exists()) {
        const uId = memDoc.data()?.userId;
        if (uId) {
          await setDoc(doc(db, 'users', uId), updatePayload, { merge: true });
        }
      }
    } catch {
      // ignore
    }

    return { success: true };
  } catch (error: any) {
    console.error('Admin password reset error:', error);
    return { success: false, error: error?.message || 'Failed to reset password.' };
  }
}

/**
 * -------------------------------------------------------------
 * 6. Admin User Management Operations
 * -------------------------------------------------------------
 */

/**
 * Register a new user profile in Firestore /users and Firebase Auth
 * Requires ADMIN permissions.
 */
export async function registerUser(newUser: {
  userId: string;
  name: string;
  password?: string;
  role: UserRole;
  phone?: string;
}): Promise<{ success: boolean; data?: UserRecord; error?: string }> {
  if (!canPerformAction('ADMIN_MANAGE')) {
    return { success: false, error: 'Only Administrators can register new user profiles.' };
  }

  const cleanUserId = newUser.userId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!cleanUserId) {
    return { success: false, error: 'A valid User ID (alphanumeric) is required.' };
  }
  if (!newUser.name.trim()) {
    return { success: false, error: 'Full Member / Staff Name is required.' };
  }

  const defaultPassword = newUser.password?.trim() || 'welcome123';

  try {
    // 1. Check if user already exists
    const existing = await fetchUserFromFirestore(cleanUserId);
    if (existing) {
      return { success: false, error: `User ID "${cleanUserId}" is already registered.` };
    }

    // 2. Attempt provisioning in Firebase Auth
    const email = toAuthEmail(cleanUserId);
    let uid = `uid_${cleanUserId}_${Date.now()}`;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, defaultPassword);
      uid = cred.user.uid;
    } catch (e) {
      console.log('Firebase Auth provisioning notice (using synthetic UID):', e);
    }

    const now = new Date().toISOString();
    const record: UserRecord = {
      userId: cleanUserId,
      name: newUser.name.trim(),
      role: newUser.role,
      phone: newUser.phone?.trim() || '',
      status: 'ACTIVE',
      password: defaultPassword,
      uid,
      email,
      createdAt: now,
      updatedAt: now,
    };

    // 3. Write document to /users/{userId}
    const docRef = doc(db, 'users', cleanUserId);
    await setDoc(docRef, record);
    cacheUserLocally(record);

    return {
      success: true,
      data: record,
    };
  } catch (e: any) {
    console.error('Error creating user:', e);
    return {
      success: false,
      error: e?.message || 'Failed to save user in Firestore.',
    };
  }
}

/**
 * Update user role (ADMIN / USER)
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  if (!canPerformAction('ADMIN_MANAGE')) {
    return { success: false, error: 'Admin permissions required.' };
  }
  try {
    const docRef = doc(db, 'users', userId);
    await setDoc(docRef, { role: newRole, updatedAt: new Date().toISOString() }, { merge: true });

    // Update local cache
    const cached = getLocalUsersCache().find((u) => u.userId === userId);
    if (cached) {
      cacheUserLocally({ ...cached, role: newRole, updatedAt: new Date().toISOString() });
    }

    // If updating current user, refresh active state
    const current = getCurrentUser();
    if (current && current.userId === userId) {
      setCurrentUser({ ...current, role: newRole });
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to update role.' };
  }
}

/**
 * Toggle user active status (ACTIVE / INACTIVE)
 */
export async function updateUserStatus(
  userId: string,
  newStatus: UserStatus
): Promise<{ success: boolean; error?: string }> {
  if (!canPerformAction('ADMIN_MANAGE')) {
    return { success: false, error: 'Admin permissions required.' };
  }
  try {
    const docRef = doc(db, 'users', userId);
    await setDoc(docRef, { status: newStatus, updatedAt: new Date().toISOString() }, { merge: true });

    // Update local cache
    const cached = getLocalUsersCache().find((u) => u.userId === userId);
    if (cached) {
      cacheUserLocally({ ...cached, status: newStatus, updatedAt: new Date().toISOString() });
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to update status.' };
  }
}

/**
 * Delete a user profile (Admin only)
 */
export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!canPerformAction('DELETE')) {
    return { success: false, error: 'Only Administrators can delete user accounts.' };
  }
  const current = getCurrentUser();
  if (current && current.userId === userId) {
    return { success: false, error: 'Cannot delete the currently active logged-in user.' };
  }

  try {
    const docRef = doc(db, 'users', userId);
    await deleteDoc(docRef);
    removeLocalUserCache(userId);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to delete user.' };
  }
}
