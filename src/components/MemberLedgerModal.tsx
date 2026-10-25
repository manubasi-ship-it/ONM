import React, { useState, useEffect, useMemo } from 'react';
import {
  CommitteeMember,
  AdvancePayment,
  DirectExpense,
  ProgramBooking,
  ReceiptVoucher,
} from '../types';
import {
  formatINR,
  buildMemberLedgerTimeline,
  calculateMemberSummary,
  LedgerTimelineEntry,
  isMemberMatch,
} from '../utils/advanceExpense';
import { ProgramBookingModule } from '../modules/ProgramBookingModule';
import { loadLocalReceiptVouchers } from '../utils/storage';
import {
  X,
  Printer,
  Download,
  BookOpen,
  User,
  Phone,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Scale,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Tag,
  Coins,
} from 'lucide-react';

interface MemberLedgerModalProps {
  isOpen: boolean;
  member: CommitteeMember | null;
  advances: AdvancePayment[];
  expenses: DirectExpense[];
  receipts?: ReceiptVoucher[];
  programBookings?: ProgramBooking[];
  onClose: () => void;
}

export const MemberLedgerModal: React.FC<MemberLedgerModalProps> = ({
  isOpen,
  member,
  advances,
  expenses,
  receipts,
  programBookings,
  onClose,
}) => {
  // Live state of program bookings with reactive event subscription
  const [liveBookings, setLiveBookings] = useState<ProgramBooking[]>(() => {
    return programBookings && programBookings.length > 0
      ? programBookings
      : ProgramBookingModule.getBookings();
  });

  const [liveReceipts, setLiveReceipts] = useState<ReceiptVoucher[]>(() => {
    return receipts && receipts.length > 0 ? receipts : loadLocalReceiptVouchers();
  });

  // Modal voucher slip preview state
  const [selectedBookingForSlip, setSelectedBookingForSlip] = useState<ProgramBooking | null>(null);

  // Sync with prop changes
  useEffect(() => {
    if (programBookings && programBookings.length > 0) {
      setLiveBookings(programBookings);
    } else {
      setLiveBookings(ProgramBookingModule.getBookings());
    }
  }, [programBookings, isOpen]);

  useEffect(() => {
    if (receipts && receipts.length > 0) {
      setLiveReceipts(receipts);
    } else {
      setLiveReceipts(loadLocalReceiptVouchers());
    }
  }, [receipts, isOpen]);

  // Real-time synchronization: subscribe to local storage and custom dispatch events
  useEffect(() => {
    if (!isOpen) return;

    const handleUpdate = () => {
      setLiveBookings(ProgramBookingModule.getBookings());
      setLiveReceipts(loadLocalReceiptVouchers());
    };

    window.addEventListener('program_booking_updated', handleUpdate);
    window.addEventListener('receipt_voucher_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('program_booking_updated', handleUpdate);
      window.removeEventListener('receipt_voucher_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [isOpen]);

  // Real-time dynamic aggregation
  const summary = useMemo(() => {
    if (!member) {
      return {
        member_id: '',
        member_name: '',
        designation: '',
        phone: '',
        active: false,
        total_advances: 0,
        total_expenses: 0,
        balance_in_hand: 0,
        status: 'settled' as const,
        advances_count: 0,
        expenses_count: 0,
      };
    }
    return calculateMemberSummary(member, advances, expenses, liveBookings, liveReceipts);
  }, [member, advances, expenses, liveBookings, liveReceipts]);

  // Real-time chronological timeline & running balance
  const timeline = useMemo<LedgerTimelineEntry[]>(() => {
    if (!member) return [];
    return buildMemberLedgerTimeline(member, advances, expenses, liveBookings, liveReceipts);
  }, [member, advances, expenses, liveBookings, liveReceipts]);

  if (!isOpen || !member) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = [
      'Date & Time',
      'Source / Module',
      'Transaction Type',
      'Direction (Cr/Dr)',
      'Voucher / Bill Ref',
      'Description / Purpose',
      'Amount',
      'Running Balance',
      'Recorded By',
    ];

    const rows = timeline.map((t) => [
      t.date,
      `"${t.sourceModule}"`,
      `"${t.type}"`,
      `"${t.txn_direction}"`,
      `"${(t.voucher_no || t.bill_reference || '').replace(/"/g, '""')}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount,
      t.running_balance,
      `"${t.recorded_by.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        `"Member Ledger Statement - ${member.name.replace(/"/g, '""')}"`,
        `"Designation: ${member.designation} | Phone: ${member.phone}"`,
        `"Total Inflow / Advances: ${summary.total_advances}"`,
        `"Total Outflow / Expenses: ${summary.total_expenses}"`,
        `"Net Balance in Hand: ${summary.balance_in_hand}"`,
        '',
        headers.join(','),
        ...rows.map((e) => e.join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Member_Ledger_${member.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-stone-200 overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="no-print bg-stone-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                Committee Member Ledger & Detailed Statement
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {member.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-stone-700"
              title="Print Statement"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-stone-700"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white transition cursor-pointer ml-1"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content Area */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Member Profile Banner */}
          <div className="bg-stone-50 rounded-2xl p-4 sm:p-5 border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-stone-900">{member.name}</h3>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    member.active
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {member.active ? 'Active Member' : 'Inactive'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600">
                <span className="flex items-center gap-1 font-medium">
                  <Briefcase className="w-3.5 h-3.5 text-stone-400" />
                  {member.designation}
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  +91 {member.phone}
                </span>
                <span className="text-stone-400 font-mono text-[11px]">
                  ID: {member.id}
                </span>
              </div>
            </div>

            {/* Status Badge in Hand */}
            <div>
              {summary.status === 'due_from_member' && (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 shadow-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-700">
                      Surplus in Hand (Pending Return/Spend)
                    </div>
                    <div className="text-base font-black text-emerald-950">
                      {formatINR(summary.balance_in_hand)} Float in Hand
                    </div>
                  </div>
                </div>
              )}

              {summary.status === 'settled' && (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-stone-100 border border-stone-300 text-stone-700 shadow-xs">
                  <Clock className="w-4 h-4 text-stone-500 shrink-0" />
                  <div>
                    <div className="text-[10px] uppercase font-extrabold tracking-wider text-stone-600">
                      Account Status
                    </div>
                    <div className="text-base font-black text-stone-800">
                      Fully Settled
                    </div>
                  </div>
                </div>
              )}

              {summary.status === 'reimbursement_due' && (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 shadow-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <div>
                    <div className="text-[10px] uppercase font-extrabold tracking-wider text-rose-700">
                      Reimbursement Due (Payable to Member)
                    </div>
                    <div className="text-base font-black text-rose-950">
                      {formatINR(Math.abs(summary.balance_in_hand))} Due to Member
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3 KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Total Advances / Inflow (Credit) */}
            <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                  Total Advances (Credit)
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-black text-emerald-950 mt-1">
                {formatINR(summary.total_advances)}
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-0.5 space-y-0.5">
                <div>
                  {summary.advances_count} advance voucher{summary.advances_count === 1 ? '' : 's'}
                  {summary.direct_advances_amount !== undefined && (
                    <span> ({formatINR(summary.direct_advances_amount)})</span>
                  )}
                </div>
                {summary.receipts_count ? (
                  <div className="text-teal-800 font-bold flex items-center gap-1 text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-600 inline-block"></span>
                    <span>
                      + {formatINR(summary.receipts_amount || 0)} across {summary.receipts_count} receipt{summary.receipts_count === 1 ? '' : 's'}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Total Expenses / Outflow (Debit) */}
            <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                  Total Expenses (Debit)
                </span>
                <TrendingDown className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-xl font-black text-amber-950 mt-1">
                {formatINR(summary.total_expenses)}
              </div>
              <div className="text-[11px] text-amber-800 font-medium mt-0.5 space-y-0.5">
                <div>
                  {summary.expenses_count} recorded transaction{summary.expenses_count === 1 ? '' : 's'}
                  {summary.direct_expenses_amount !== undefined && (
                    <span> ({formatINR(summary.direct_expenses_amount)})</span>
                  )}
                </div>
                {summary.program_advances_count ? (
                  <div className="text-indigo-800 font-bold flex items-center gap-1 text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 inline-block"></span>
                    <span>
                      {formatINR(summary.program_advances_amount || 0)} across {summary.program_advances_count} booked advance{summary.program_advances_count === 1 ? '' : 's'}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Net Balance in Hand */}
            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
                  Net Balance in Hand
                </span>
                <Scale className="w-4 h-4 text-stone-600" />
              </div>
              <div
                className={`text-xl font-black mt-1 ${
                  summary.balance_in_hand > 0.001
                    ? 'text-emerald-700'
                    : summary.balance_in_hand < -0.001
                    ? 'text-rose-700'
                    : 'text-stone-800'
                }`}
              >
                {formatINR(summary.balance_in_hand)}
              </div>
              <div className="text-[11px] text-stone-500 font-medium mt-0.5">
                {summary.balance_in_hand < -0.001
                  ? 'Reimbursement due to member'
                  : summary.balance_in_hand > 0.001
                  ? 'Surplus float held by member'
                  : 'Fully Settled (Advances = Expenses)'}
              </div>
            </div>
          </div>

          {/* Chronological Statement Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
                <span>Transaction Timeline & Running Balance</span>
                <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                  {timeline.length} {timeline.length === 1 ? 'record' : 'records'}
                </span>
              </h4>
              <span className="text-[11px] text-stone-500 font-medium hidden sm:inline">
                Click any voucher number to inspect or print official voucher slip
              </span>
            </div>

            {timeline.length === 0 ? (
              <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-300">
                <p className="text-xs text-stone-500">
                  No advance payments, expense claims, receipts, or program booking advances recorded for this member yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-stone-200">
                <table className="w-full text-left text-xs text-stone-800">
                  <thead className="bg-stone-100/90 text-stone-700 uppercase text-[10px] font-black tracking-wider border-b border-stone-200">
                    <tr>
                      <th className="py-3 px-3">Date & Timestamp</th>
                      <th className="py-3 px-3">Source / Module</th>
                      <th className="py-3 px-3">Voucher / Ref</th>
                      <th className="py-3 px-3">Description / Purpose</th>
                      <th className="py-3 px-3 text-center">Type</th>
                      <th className="py-3 px-3 text-right">Amount</th>
                      <th className="py-3 px-3 text-right font-black">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {timeline.map((entry) => (
                      <tr key={entry.id} className="hover:bg-amber-50/30 transition">
                        {/* Date & Timestamp */}
                        <td className="py-3 px-3 font-medium whitespace-nowrap text-stone-700">
                          <div className="font-semibold text-stone-900">{entry.date}</div>
                          {entry.timestamp > 0 && (
                            <div className="text-[10px] text-stone-400 font-mono">
                              {new Date(entry.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          )}
                        </td>

                        {/* Source / Module Tag */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {entry.sourceModule === 'Program Booking' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold text-[10px]">
                              Program Booking
                            </span>
                          ) : entry.sourceModule === 'Receipt' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-900 font-bold text-[10px]">
                              Receipt
                            </span>
                          ) : entry.sourceModule === 'Wallet Inflow' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-[10px]">
                              Wallet Inflow
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 font-bold text-[10px]">
                              Direct Expense
                            </span>
                          )}
                        </td>

                        {/* Voucher / Ref */}
                        <td className="py-3 px-3 font-mono font-bold text-stone-900 whitespace-nowrap">
                          {entry.sourceModule === 'Program Booking' ? (
                            <button
                              type="button"
                              onClick={() => {
                                const cleanId = entry.voucher_no.replace('-SETTLE', '');
                                const found = liveBookings.find((b) => b.id === cleanId);
                                if (found) setSelectedBookingForSlip(found);
                              }}
                              className="text-amber-800 hover:text-amber-950 hover:underline flex items-center gap-1.5 cursor-pointer font-bold"
                              title="Click to view official Program Booking Slip"
                            >
                              <span>{entry.voucher_no}</span>
                              <FileText className="w-3.5 h-3.5 text-amber-600 inline shrink-0" />
                            </button>
                          ) : (
                            entry.voucher_no || entry.bill_reference || '—'
                          )}
                          {entry.payment_mode && (
                            <div className="text-[10px] font-sans font-normal text-stone-500">
                              {entry.payment_mode}
                            </div>
                          )}
                        </td>

                        {/* Description / Purpose */}
                        <td className="py-3 px-3 text-stone-800 max-w-xs">
                          <div className="font-semibold text-stone-900">{entry.description}</div>
                          {entry.remarks && (
                            <div className="text-[11px] text-stone-500 italic mt-0.5">
                              {entry.remarks}
                            </div>
                          )}
                          <div className="text-[10px] text-stone-400 mt-0.5">
                            By {entry.recorded_by}
                          </div>
                        </td>

                        {/* Transaction Type: Credit / Debit */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {entry.txn_direction === 'Credit' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              Credit
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px]">
                              Debit
                            </span>
                          )}
                        </td>

                        {/* Amount */}
                        <td
                          className={`py-3 px-3 text-right font-mono font-bold whitespace-nowrap ${
                            entry.txn_direction === 'Credit'
                              ? 'text-emerald-700'
                              : 'text-rose-700'
                          }`}
                        >
                          {entry.txn_direction === 'Credit'
                            ? `+${formatINR(entry.amount)}`
                            : `-${formatINR(entry.amount)}`}
                        </td>

                        {/* Cumulative Running Balance */}
                        <td
                          className={`py-3 px-3 text-right font-mono font-black whitespace-nowrap ${
                            entry.running_balance > 0.001
                              ? 'text-emerald-700'
                              : entry.running_balance < -0.001
                              ? 'text-rose-700'
                              : 'text-stone-800'
                          }`}
                        >
                          {formatINR(entry.running_balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-stone-50 border-t-2 border-stone-200 text-xs font-black text-stone-900">
                    <tr>
                      <td colSpan={5} className="py-3 px-3 text-right uppercase tracking-wider text-[11px]">
                        Net Balance in Hand (Credit - Debit):
                      </td>
                      <td className="py-3 px-3 text-right text-stone-900 font-mono font-bold">
                        {formatINR(summary.total_advances)} / {formatINR(summary.total_expenses)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-mono font-black ${
                          summary.balance_in_hand > 0.001
                            ? 'text-emerald-700'
                            : summary.balance_in_hand < -0.001
                            ? 'text-rose-700'
                            : 'text-stone-800'
                        }`}
                      >
                        {formatINR(summary.balance_in_hand)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Program Booking Voucher Slip Modal Preview */}
      {selectedBookingForSlip && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden my-auto flex flex-col max-h-[90vh]">
            <div className="no-print bg-stone-900 text-white px-6 py-4 flex items-center justify-between">
              <span className="text-sm font-bold tracking-tight">Program Booking Voucher Slip</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBookingForSlip(null)}
                  className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-black uppercase text-stone-900 tracking-wide">
                  PROGRAM BOOKING VOUCHER
                </h3>
                <p className="text-xs text-stone-500 font-medium">Festival Cultural Committee</p>
                <p className="text-xs font-mono font-bold text-stone-600">
                  ID: {selectedBookingForSlip.id}
                </p>
              </div>

              <div className="border-t border-stone-200 pt-4 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                    PROGRAM NAME
                  </span>
                  <span className="font-extrabold text-stone-900 text-sm">
                    {selectedBookingForSlip.programeName}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                    DATE & TIME
                  </span>
                  <span className="font-semibold text-stone-800">
                    {selectedBookingForSlip.programeDate} at {selectedBookingForSlip.programeTime}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                    COORDINATOR
                  </span>
                  <span className="font-semibold text-stone-800">
                    {selectedBookingForSlip.coordinatorName} ({selectedBookingForSlip.mobileNumber1})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                    TIMING & ARTISTS
                  </span>
                  <span className="font-semibold text-stone-800">
                    {selectedBookingForSlip.noOfArtist} Artists ({selectedBookingForSlip.reportingTime} - {selectedBookingForSlip.endTime})
                  </span>
                </div>
              </div>

              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 space-y-2 text-xs">
                <div className="flex justify-between font-medium text-stone-600">
                  <span>Total Contract Value:</span>
                  <span className="font-bold text-stone-900">
                    {formatINR(selectedBookingForSlip.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between font-semibold text-rose-600">
                  <span>Advance Disbursed to Artist:</span>
                  <span>-{formatINR(selectedBookingForSlip.advanceAmount)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-stone-500 pl-4 border-l-2 border-stone-300">
                  <span>Advance Paid By (Wallet):</span>
                  <span className="font-medium text-stone-800">
                    {selectedBookingForSlip.advancePaidBy}
                  </span>
                </div>
                <div className="border-t border-stone-200 pt-2 flex justify-between font-bold text-stone-900">
                  <span>Balance Payable:</span>
                  <span>{formatINR(selectedBookingForSlip.balanceAmount)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Settled Amount:</span>
                  <span>{formatINR(selectedBookingForSlip.settledAmount)}</span>
                </div>
                <div className="border-t border-stone-200 pt-2 flex justify-between font-black text-rose-700 text-sm">
                  <span>Outstanding Difference:</span>
                  <span>{formatINR(selectedBookingForSlip.difference)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs text-stone-500">
                <div className="border-t border-stone-300 pt-2">
                  <p className="font-semibold text-stone-800">Program Co-ordinator</p>
                  <p className="text-[10px]">Signature & Date</p>
                </div>
                <div className="border-t border-stone-300 pt-2">
                  <p className="font-semibold text-stone-800">Committee Treasurer</p>
                  <p className="text-[10px]">Authorized Signatory</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
