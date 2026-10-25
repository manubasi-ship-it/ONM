import React, { useState, useEffect, useMemo } from 'react';
import {
  CommitteeMember,
  ReceiptVoucher,
  SettlementRecord,
} from '../types';
import { generateSettlementNo } from '../utils/storage';
import { validateMemberExistsInCommittee } from '../utils/memberValidation';
import { MemberValidationBadge } from './MemberValidationBadge';
import {
  X,
  ShieldCheck,
  Coins,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Banknote,
  Calendar,
  User,
  ArrowRight,
  Receipt,
  Building,
} from 'lucide-react';

interface TreasurerSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  committeeMembers: CommitteeMember[];
  receiptVouchers: ReceiptVoucher[];
  settlements: SettlementRecord[];
  initialSelectedMemberId?: string;
  treasurerName: string;
  onSaveSettlement: (settlement: SettlementRecord, updatedVoucherIds: string[]) => Promise<void>;
}

export const TreasurerSettlementModal: React.FC<TreasurerSettlementModalProps> = ({
  isOpen,
  onClose,
  committeeMembers,
  receiptVouchers,
  settlements,
  initialSelectedMemberId,
  treasurerName,
  onSaveSettlement,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedMemberId, setSelectedMemberId] = useState<string>(initialSelectedMemberId || '');
  const [date, setDate] = useState(todayStr);
  const [settlementNo, setSettlementNo] = useState(() => generateSettlementNo(todayStr));
  const [amount, setAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI / Direct Bank Transfer'>('Cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sync initialSelectedMemberId if provided
  useEffect(() => {
    if (initialSelectedMemberId) {
      setSelectedMemberId(initialSelectedMemberId);
    } else if (!selectedMemberId && committeeMembers.length > 0) {
      // Find first member with pending in-hand balance
      const memberWithBalance = committeeMembers.find((m) => {
        const collections = receiptVouchers
          .filter((r) => r.collectedByMemberId === m.id || (m.name && r.collectedByMemberName === m.name))
          .reduce((sum, r) => sum + (Number(r.amount_received) || 0), 0);
        const settled = settlements
          .filter((s) => s.memberId === m.id || (m.name && s.memberName === m.name))
          .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
        return collections - settled > 0;
      });
      if (memberWithBalance) {
        setSelectedMemberId(memberWithBalance.id);
      }
    }
  }, [initialSelectedMemberId, committeeMembers, isOpen]);

  // Selected Member Details & Floating Balance Calculation
  const selectedMemberData = useMemo(() => {
    if (!selectedMemberId) return null;
    const member = committeeMembers.find((m) => m.id === selectedMemberId);
    if (!member) return null;

    const memberReceipts = receiptVouchers.filter((r) => {
      if (r.collectedByMemberId && r.collectedByMemberId === member.id) return true;
      if (member.name && r.collectedByMemberName && r.collectedByMemberName.toLowerCase() === member.name.toLowerCase()) return true;
      return false;
    });

    const totalCollected = memberReceipts.reduce(
      (sum, r) => sum + (Number(r.amount_received) || 0),
      0
    );

    const totalSettled = settlements
      .filter((s) => s.memberId === member.id || (member.name && s.memberName.toLowerCase() === member.name.toLowerCase()))
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    const inHandBalance = Math.max(0, totalCollected - totalSettled);
    const unsettledVouchers = memberReceipts.filter((r) => r.settlementStatus !== 'Settled');

    return {
      member,
      totalCollected,
      totalSettled,
      inHandBalance,
      unsettledVouchers,
    };
  }, [selectedMemberId, committeeMembers, receiptVouchers, settlements]);

  // Auto-fill amount when member selected
  useEffect(() => {
    if (selectedMemberData && selectedMemberData.inHandBalance > 0 && !amount) {
      setAmount(String(selectedMemberData.inHandBalance));
    }
  }, [selectedMemberData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedMemberData) {
      setErrorMsg('Please select a Committee Member to settle funds from.');
      return;
    }

    // Verify member exists in committee_members collection
    const validation = validateMemberExistsInCommittee(
      selectedMemberData.member.id,
      selectedMemberData.member.name,
      committeeMembers
    );
    if (!validation.isValid) {
      setErrorMsg(
        `Invalid Member Reference: "${selectedMemberData.member.name}" does not exist in 'committee_members' collection in Master Data.`
      );
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Settlement amount must be a valid positive number greater than 0.');
      return;
    }

    if (parsedAmount > selectedMemberData.inHandBalance && selectedMemberData.inHandBalance > 0) {
      const confirmExcess = window.confirm(
        `Note: Entered amount (₹${parsedAmount.toLocaleString('en-IN')}) exceeds currently tracked in-hand balance (₹${selectedMemberData.inHandBalance.toLocaleString('en-IN')}). Do you want to proceed with recording this turnover to the vault?`
      );
      if (!confirmExcess) return;
    }

    setIsSubmitting(true);
    try {
      const voucherIdsToMark = selectedMemberData.unsettledVouchers.map((v) => v.id);

      const settlementRecord: SettlementRecord = {
        id: `stl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        settlementNo: settlementNo.trim() || generateSettlementNo(date),
        date,
        memberId: selectedMemberData.member.id,
        memberName: selectedMemberData.member.name,
        memberRole:
          selectedMemberData.member.designationRole ||
          selectedMemberData.member.designation ||
          'Member',
        amount: parsedAmount,
        paymentMode,
        referenceNo: referenceNo.trim() || undefined,
        remarks: remarks.trim() || undefined,
        receivedByTreasurer: treasurerName || 'Treasurer Central Vault',
        voucherIds: voucherIdsToMark,
        createdAt: new Date().toISOString(),
      };

      await onSaveSettlement(settlementRecord, voucherIdsToMark);

      setSuccessMsg(`₹${parsedAmount.toLocaleString('en-IN')} successfully settled to Treasurer Central Vault.`);
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'Failed to save settlement record. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in select-none">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-emerald-900/20 overflow-hidden my-auto flex flex-col">
        {/* Header: Dark Forest Green Accent */}
        <div className="bg-linear-to-r from-[#022c22] via-[#064e3b] to-[#022c22] text-white px-6 py-5 flex items-center justify-between border-b border-emerald-700/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shadow-inner">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
                Double-Entry Central Vault
              </div>
              <h3 className="font-black text-base sm:text-lg tracking-tight text-white">
                Treasurer Central Settlement Desk
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-emerald-200 hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5 text-xs sm:text-sm">
          {/* Error & Success Banners */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-200 flex items-start gap-2.5 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 text-emerald-900 text-xs rounded-xl border border-emerald-200 flex items-center gap-2.5 font-bold">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Member Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider">
                Select Collecting Member <span className="text-red-500">*</span>
              </label>
              {selectedMemberData && (
                <MemberValidationBadge
                  memberId={selectedMemberData.member.id}
                  memberName={selectedMemberData.member.name}
                  committeeMembers={committeeMembers}
                />
              )}
            </div>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3 pointer-events-none" />
              <select
                value={selectedMemberId}
                onChange={(e) => {
                  setSelectedMemberId(e.target.value);
                  setAmount('');
                }}
                required
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-stone-300 text-xs font-bold bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none cursor-pointer"
              >
                <option value="">-- Select Committee Member --</option>
                {committeeMembers
                  .filter((m) => m.active)
                  .map((m) => {
                    const coll = receiptVouchers
                      .filter((r) => r.collectedByMemberId === m.id || (m.name && r.collectedByMemberName === m.name))
                      .reduce((sum, r) => sum + (Number(r.amount_received) || 0), 0);
                    const stl = settlements
                      .filter((s) => s.memberId === m.id || (m.name && s.memberName === m.name))
                      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
                    const floating = Math.max(0, coll - stl);

                    return (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.designationRole || m.designation}) — In-Hand: ₹{floating.toLocaleString('en-IN')}
                      </option>
                    );
                  })}
              </select>
            </div>
          </div>

          {/* Member Floating Balance Card */}
          {selectedMemberData && (
            <div className="p-4 rounded-2xl bg-linear-to-br from-emerald-50 via-stone-50 to-amber-50/40 border border-emerald-200/80 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-stone-900 text-sm">
                    {selectedMemberData.member.name}
                  </div>
                  <div className="text-[11px] text-stone-500">
                    {selectedMemberData.member.designationRole || selectedMemberData.member.designation} • +91 {selectedMemberData.member.phone}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-stone-500 uppercase font-bold">In-Hand Cash</div>
                  <div className="font-mono font-black text-amber-900 text-base">
                    ₹{selectedMemberData.inHandBalance.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-100 text-xs">
                <div>
                  <span className="text-stone-500">Total Public Collections: </span>
                  <span className="font-bold font-mono text-stone-800">
                    ₹{selectedMemberData.totalCollected.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500">Previously Turned Over: </span>
                  <span className="font-bold font-mono text-emerald-800">
                    ₹{selectedMemberData.totalSettled.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {selectedMemberData.inHandBalance > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(selectedMemberData.inHandBalance))}
                  className="w-full py-1.5 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Coins className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Settle Full In-Hand Balance (₹{selectedMemberData.inHandBalance.toLocaleString('en-IN')})</span>
                </button>
              )}
            </div>
          )}

          {/* Amount to Settle & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Settlement Amount (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="font-bold text-stone-400 absolute left-3.5 top-2.5">₹</span>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  required
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-stone-300 text-xs font-mono font-black focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Settlement Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setSettlementNo(generateSettlementNo(e.target.value));
                  }}
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Transfer Mode: Cash vs Bank/UPI */}
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1.5">
              Handover Transfer Mode <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMode('Cash')}
                className={`py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                  paymentMode === 'Cash'
                    ? 'bg-amber-100 border-amber-400 text-amber-950 shadow-xs'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Banknote className="w-4 h-4 text-amber-700" />
                <span>💵 Physical Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('UPI / Direct Bank Transfer')}
                className={`py-2.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                  paymentMode === 'UPI / Direct Bank Transfer'
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-950 shadow-xs'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-700" />
                <span>📱 UPI / Bank Transfer</span>
              </button>
            </div>
          </div>

          {/* Reference / Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Ref / Txn ID (Optional)
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="e.g. UTR / Receipt book batch"
                className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Settlement Serial No
              </label>
              <input
                type="text"
                readOnly
                value={settlementNo}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 bg-stone-100 text-stone-500 font-mono text-xs cursor-not-allowed"
              />
            </div>
          </div>

          {/* Received by Treasurer Stamp */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
            <span className="text-stone-600">Vault Receiver:</span>
            <span className="font-bold text-emerald-900">{treasurerName || 'Chief Treasurer'}</span>
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl border border-stone-300 text-stone-700 font-bold hover:bg-stone-100 transition cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-2 py-3 px-4 rounded-xl bg-linear-to-r from-emerald-900 to-emerald-800 hover:from-emerald-950 hover:to-emerald-900 text-white font-black text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Writing to Vault...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>Confirm Settlement to Central Vault</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
