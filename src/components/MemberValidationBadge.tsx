import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { CommitteeMember } from '../types';
import { validateMemberExistsInCommittee } from '../utils/memberValidation';

interface MemberValidationBadgeProps {
  memberId?: string;
  memberName?: string;
  committeeMembers: CommitteeMember[];
  showValidState?: boolean;
  className?: string;
}

export const MemberValidationBadge: React.FC<MemberValidationBadgeProps> = ({
  memberId,
  memberName,
  committeeMembers,
  showValidState = false,
  className = '',
}) => {
  const result = validateMemberExistsInCommittee(memberId, memberName, committeeMembers);

  if (!result.isValid) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold shadow-2xs ${className}`}
        title={`Invalid Member Reference: "${memberName || memberId}" does not exist in the committee_members collection in Master Data.`}
      >
        <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
        <span>Not in Master Data</span>
      </span>
    );
  }

  if (showValidState) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-medium ${className}`}
        title="Verified: Exists in committee_members Master Data"
      >
        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
        <span>Verified Member</span>
      </span>
    );
  }

  return null;
};
