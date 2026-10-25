import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { CommitteeMember } from '../types';
import { isMemberMatch } from './advanceExpense';

export interface MemberValidationResult {
  isValid: boolean;
  memberId?: string;
  memberName?: string;
  matchedMember?: CommitteeMember;
  errorReason?: string;
}

/**
 * Synchronously validates whether a given member ID or name exists in the committee_members master list.
 */
export function validateMemberExistsInCommittee(
  memberId?: string,
  memberName?: string,
  committeeMembers: CommitteeMember[] = []
): MemberValidationResult {
  if (!memberId && !memberName) {
    return {
      isValid: false,
      errorReason: 'No member ID or member name provided',
    };
  }

  if (!committeeMembers || committeeMembers.length === 0) {
    return {
      isValid: false,
      memberId,
      memberName,
      errorReason: 'Committee members master list is empty or unpopulated',
    };
  }

  // 1. Direct ID match
  if (memberId && memberId.trim()) {
    const cleanId = memberId.trim().toLowerCase();
    const matchedById = committeeMembers.find(
      (m) => m.id && m.id.trim().toLowerCase() === cleanId
    );
    if (matchedById) {
      return {
        isValid: true,
        memberId: matchedById.id,
        memberName: matchedById.name,
        matchedMember: matchedById,
      };
    }
  }

  // 2. Name or robust fuzzy matcher match
  if (memberName && memberName.trim()) {
    const matchedByName = committeeMembers.find((m) =>
      isMemberMatch(m, memberId, memberName)
    );
    if (matchedByName) {
      return {
        isValid: true,
        memberId: matchedByName.id,
        memberName: matchedByName.name,
        matchedMember: matchedByName,
      };
    }
  }

  return {
    isValid: false,
    memberId,
    memberName,
    errorReason: `Member "${memberName || memberId}" does not exist in 'committee_members' Master Data`,
  };
}

/**
 * Asynchronously verifies whether a member exists directly in the Firestore 'committee_members' collection.
 */
export async function verifyMemberExistsInFirestore(
  memberId?: string,
  memberName?: string
): Promise<MemberValidationResult> {
  try {
    if (!memberId && !memberName) {
      return {
        isValid: false,
        errorReason: 'No member ID or member name provided',
      };
    }

    // 1. Check direct document ID in 'committee_members' collection
    if (memberId && memberId.trim()) {
      const cleanId = memberId.trim();
      const docRef = doc(db, 'committee_members', cleanId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as CommitteeMember;
        return {
          isValid: true,
          memberId: snap.id,
          memberName: data.name,
          matchedMember: { ...data, id: snap.id },
        };
      }

      // Check mirrored /members collection as secondary fallback
      const altRef = doc(db, 'members', cleanId);
      const altSnap = await getDoc(altRef);
      if (altSnap.exists()) {
        const data = altSnap.data() as CommitteeMember;
        return {
          isValid: true,
          memberId: altSnap.id,
          memberName: data.name,
          matchedMember: { ...data, id: altSnap.id },
        };
      }
    }

    // 2. Query 'committee_members' collection
    const colRef = collection(db, 'committee_members');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const members: CommitteeMember[] = [];
      snap.forEach((d) => members.push({ ...(d.data() as CommitteeMember), id: d.id }));
      const syncResult = validateMemberExistsInCommittee(memberId, memberName, members);
      if (syncResult.isValid) {
        return syncResult;
      }
    }

    // 3. Fallback scan on /members
    const membersColRef = collection(db, 'members');
    const membersSnap = await getDocs(membersColRef);
    if (!membersSnap.empty) {
      const members: CommitteeMember[] = [];
      membersSnap.forEach((d) => members.push({ ...(d.data() as CommitteeMember), id: d.id }));
      return validateMemberExistsInCommittee(memberId, memberName, members);
    }

    return {
      isValid: false,
      memberId,
      memberName,
      errorReason: `Member "${memberName || memberId}" does not exist in 'committee_members' Firestore collection`,
    };
  } catch (error: any) {
    console.warn('verifyMemberExistsInFirestore error:', error);
    return {
      isValid: false,
      memberId,
      memberName,
      errorReason: error?.message || 'Firestore query error while validating committee member',
    };
  }
}

/**
 * Validates any financial record (Advance, Expense, Receipt, or Booking)
 * to verify if its referenced member exists in the committee_members master list.
 */
export function validateFinancialRecordMember(
  record: {
    member_id?: string;
    member_name?: string;
    claimed_by?: string;
    amount_collected_by?: string;
    advancePaidById?: string;
    advancePaidBy?: string;
    settledByMember?: string;
    [key: string]: any;
  },
  committeeMembers: CommitteeMember[] = []
): MemberValidationResult {
  const candidateId = record.member_id || record.advancePaidById;
  const candidateName =
    record.member_name ||
    record.claimed_by ||
    record.amount_collected_by ||
    record.advancePaidBy ||
    record.settledByMember;

  return validateMemberExistsInCommittee(candidateId, candidateName, committeeMembers);
}

/**
 * Quick boolean check if a member reference is valid in committee_members
 */
export function isMemberValidInCommittee(
  memberId?: string,
  memberName?: string,
  committeeMembers: CommitteeMember[] = []
): boolean {
  return validateMemberExistsInCommittee(memberId, memberName, committeeMembers).isValid;
}
