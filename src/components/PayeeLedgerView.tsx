import React, { useState, useMemo } from 'react';
import { Commitment, ReceiptVoucher, Setting } from '../types';
import { computeCommitmentStats } from '../utils/storage';
import {
  BookOpen,
  Search,
  Printer,
  Download,
  User,
  Home,
  MapPin,
  Calendar,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Receipt,
  FileText,
  ShieldCheck,
} from 'lucide-react';

interface PayeeLedgerViewProps {
  commitments: Commitment[];
  receiptVouchers: ReceiptVoucher[];
  setting: Setting;
  initialSelectedPayee?: string;
  onOpenReceiptSlip?: (voucher: ReceiptVoucher) => void;
}

export const PayeeLedgerView: React.FC<PayeeLedgerViewProps> = ({
  commitments,
  receiptVouchers,
  setting,
  initialSelectedPayee,
  onOpenReceiptSlip,
}) => {
  // Collect all unique payee names from commitments and vouchers
  const allPayeeNames = useMemo(() => {
    const set = new Set<string>();
    commitments.forEach((c) => set.add(c.name.trim()));
    receiptVouchers.forEach((v) => set.add(v.name.trim()));
    return Array.from(set).sort();
  }, [commitments, receiptVouchers]);

  const [selectedPayee, setSelectedPayee] = useState<string>(() => {
    if (initialSelectedPayee && allPayeeNames.includes(initialSelectedPayee)) {
      return initialSelectedPayee;
    }
    return allPayeeNames[0] || '';
  });

  const [searchTerm, setSearchTerm] = useState('');

  // Update selection if prop changes
  React.useEffect(() => {
    if (initialSelectedPayee) {
      setSelectedPayee(initialSelectedPayee);
    }
  }, [initialSelectedPayee]);

  // Filtered payee names list for sidebar search
  const filteredPayeeNames = useMemo(() => {
    if (!searchTerm.trim()) return allPayeeNames;
    return allPayeeNames.filter((name) =>
      name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allPayeeNames, searchTerm]);

  // Find commitments for currently selected payee
  const payeeCommitments = useMemo(() => {
    if (!selectedPayee) return [];
    return commitments.filter(
      (c) => c.name.trim().toLowerCase() === selectedPayee.toLowerCase()
    );
  }, [commitments, selectedPayee]);

  // Find receipts for currently selected payee
  const payeeReceipts = useMemo(() => {
    if (!selectedPayee) return [];
    return receiptVouchers
      .filter((v) => v.name.trim().toLowerCase() === selectedPayee.toLowerCase())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [receiptVouchers, selectedPayee]);

  // Representative house and place
  const houseName =
    payeeCommitments[0]?.house_name || payeeReceipts[0]?.house_name || 'N/A';
  const place = payeeCommitments[0]?.place || payeeReceipts[0]?.place || 'ONAMPILLY';

  // Aggregate stats
  const totalCommitted = payeeCommitments.reduce((sum, c) => sum + c.amount_committed, 0);
  const totalPaid = payeeReceipts.reduce((sum, v) => sum + v.amount_received, 0);
  const cashPaid = payeeReceipts
    .filter((v) => v.payment_mode === 'Cash')
    .reduce((sum, v) => sum + v.amount_received, 0);
  const upiPaid = payeeReceipts
    .filter((v) => v.payment_mode === 'UPI')
    .reduce((sum, v) => sum + v.amount_received, 0);

  const rawBalance = totalCommitted - totalPaid;
  const netBalance = rawBalance < 0 ? 0 : rawBalance;

  let status: 'Pending' | 'Partially Paid' | 'Completed' | 'Direct/Uncommitted' = 'Pending';
  if (totalCommitted === 0 && totalPaid > 0) {
    status = 'Direct/Uncommitted';
  } else if (totalPaid >= totalCommitted && totalCommitted > 0) {
    status = 'Completed';
  } else if (totalPaid > 0) {
    status = 'Partially Paid';
  } else {
    status = 'Pending';
  }

  // Combined Chronological Ledger Entries
  const ledgerEntries = useMemo(() => {
    type LedgerRow = {
      id: string;
      date: string;
      type: 'Commitment Pledge' | 'Receipt Voucher';
      refNo: string;
      paymentMode?: string;
      collectedBy: string;
      debit: number; // Pledged
      credit: number; // Paid
      runningBalance: number;
      voucherRaw?: ReceiptVoucher;
    };

    const rows: LedgerRow[] = [];

    // Add commitment pledges
    payeeCommitments.forEach((c) => {
      rows.push({
        id: c.id,
        date: c.date,
        type: 'Commitment Pledge',
        refNo: c.transaction_no,
        collectedBy: c.data_entry_user,
        debit: c.amount_committed,
        credit: 0,
        runningBalance: 0, // calculated below
      });
    });

    // Add receipt vouchers
    payeeReceipts.forEach((v) => {
      rows.push({
        id: v.id,
        date: v.date,
        type: 'Receipt Voucher',
        refNo: `RCP #${v.receipt_no}`,
        paymentMode: v.payment_mode,
        collectedBy: v.amount_collected_by,
        debit: 0,
        credit: v.amount_received,
        runningBalance: 0,
        voucherRaw: v,
      });
    });

    // Sort chronologically
    rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let curBal = 0;
    rows.forEach((r) => {
      curBal = curBal + r.debit - r.credit;
      r.runningBalance = curBal < 0 ? 0 : curBal;
    });

    return rows;
  }, [payeeCommitments, payeeReceipts]);

  // Print friendly handler
  const handlePrint = () => {
    window.print();
  };

  // CSV Export for this Payee Ledger
  const handleExportCSV = () => {
    const headers = [
      'Date',
      'Entry Type',
      'Reference / Receipt No',
      'Payment Mode',
      'Collected / Entered By',
      'Debit - Pledged (INR)',
      'Credit - Paid (INR)',
      'Running Balance (INR)',
    ];

    const rows = ledgerEntries.map((r) => [
      r.date,
      `"${r.type}"`,
      `"${r.refNo}"`,
      r.paymentMode || '-',
      `"${r.collectedBy}"`,
      r.debit,
      r.credit,
      r.runningBalance,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        `"Payee Statement: ${selectedPayee}"`,
        `"House: ${houseName}, Place: ${place}"`,
        `"Total Committed: INR ${totalCommitted}, Total Paid: INR ${totalPaid}, Net Balance: INR ${netBalance}"`,
        '',
        headers.join(','),
        ...rows.map((e) => e.join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ledger_statement_${selectedPayee.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title Header (hidden in print) */}
      <div className="no-print bg-white rounded-2xl p-3 sm:p-5 border border-amber-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-amber-800 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-0.5">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Tab 3 • Individual Payee Statement</span>
          </div>
          <h2 className="text-sm sm:text-xl md:text-2xl font-black text-stone-900 tracking-tight">
            Payee Ledger & Audit Statement
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={!selectedPayee}
            className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Statement CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={!selectedPayee}
            className="px-4 py-2 rounded-xl bg-amber-900 hover:bg-amber-950 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Statement</span>
          </button>
        </div>
      </div>

      {/* Grid: Payee Selector List on Left, Ledger Statement on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Payee Picker (hidden in print) */}
        <div className="no-print lg:col-span-1 bg-white rounded-2xl border border-stone-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-stone-700">
              Select Payee ({allPayeeNames.length})
            </h3>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search devotee name..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-amber-600/30"
            />
          </div>

          <div className="max-h-[500px] overflow-y-auto space-y-1 divide-y divide-stone-100">
            {filteredPayeeNames.length === 0 ? (
              <div className="p-4 text-center text-xs text-stone-400">
                No payees found
              </div>
            ) : (
              filteredPayeeNames.map((pName) => {
                const isSelected = selectedPayee === pName;
                const cCount = commitments.filter((c) => c.name.trim() === pName).length;
                const rCount = receiptVouchers.filter((v) => v.name.trim() === pName).length;
                return (
                  <button
                    key={pName}
                    type="button"
                    onClick={() => setSelectedPayee(pName)}
                    className={`w-full text-left p-2.5 rounded-xl transition text-xs cursor-pointer ${
                      isSelected
                        ? 'bg-amber-100 text-amber-950 font-extrabold border border-amber-300 shadow-xs'
                        : 'hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <div className="truncate font-bold">{pName}</div>
                    <div className="text-[10px] text-stone-400 mt-0.5 flex gap-2">
                      <span>{cCount} {cCount === 1 ? 'pledge' : 'pledges'}</span>
                      <span>•</span>
                      <span>{rCount} {rCount === 1 ? 'receipt' : 'receipts'}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Complete Statement Card */}
        <div className="lg:col-span-3">
          {!selectedPayee ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400 space-y-2">
              <BookOpen className="w-12 h-12 mx-auto text-stone-300" />
              <h4 className="text-sm font-bold text-stone-700">No Payee Selected</h4>
              <p className="text-xs">
                Select a payee from the list on the left to view their detailed financial statement and installment history.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden p-6 space-y-6">
              {/* Printable Header */}
              <div className="border-b border-stone-200 pb-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-bold text-amber-800 uppercase tracking-widest">
                      {setting.sangamNameEnglish} • Festival {setting.festivalYear}
                    </div>
                    <h2 className="text-2xl font-black text-stone-900 mt-1">
                      {selectedPayee}
                    </h2>
                    <div className="text-xs text-stone-600 mt-1 flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1 font-medium">
                        <Home className="w-3.5 h-3.5 text-stone-400" />
                        {houseName}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-stone-400" />
                        {place}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase ${
                        status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : status === 'Partially Paid'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : status === 'Direct/Uncommitted'
                          ? 'bg-purple-100 text-purple-800 border border-purple-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {status}
                    </span>
                    <span className="text-[11px] text-stone-400">
                      Statement as of {new Date().toLocaleDateString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                  <div className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">
                    Total Committed
                  </div>
                  <div className="font-mono font-black text-lg text-stone-900 mt-0.5">
                    ₹{totalCommitted.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5">
                    {payeeCommitments.length} {payeeCommitments.length === 1 ? 'pledge' : 'pledges'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">
                    Total Collected
                  </div>
                  <div className="font-mono font-black text-lg text-emerald-900 mt-0.5">
                    ₹{totalPaid.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-emerald-700/80 mt-0.5 font-medium">
                    Cash: ₹{cashPaid} • UPI: ₹{upiPaid}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">
                    Net Outstanding
                  </div>
                  <div className="font-mono font-black text-lg text-amber-950 mt-0.5">
                    ₹{netBalance.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-amber-700/80 mt-0.5 font-medium">
                    {netBalance === 0 && totalCommitted > 0 ? 'Pledge Settled' : 'Pending Payment'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                  <div className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">
                    Total Vouchers
                  </div>
                  <div className="font-mono font-black text-lg text-stone-900 mt-0.5">
                    {payeeReceipts.length}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5">
                    Installments issued
                  </div>
                </div>
              </div>

              {/* Detailed Chronological Audit Table */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <h4 className="font-extrabold text-stone-900">
                    Chronological Transaction Statement ({ledgerEntries.length} records)
                  </h4>
                  <span className="text-[11px] text-stone-400 italic">
                    Debits (Pledges) & Credits (Receipt Payments)
                  </span>
                </div>

                {ledgerEntries.length === 0 ? (
                  <div className="p-8 text-center text-xs text-stone-400 bg-stone-50 rounded-xl">
                    No transactions recorded for this payee yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-stone-200 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-stone-100 text-stone-600 font-bold border-b border-stone-200 text-[11px] uppercase tracking-wider">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Transaction / Type</th>
                          <th className="py-2.5 px-3">Reference / Slip</th>
                          <th className="py-2.5 px-3">Mode</th>
                          <th className="py-2.5 px-3">Recorded By</th>
                          <th className="py-2.5 px-3 text-right">Debit (Pledged)</th>
                          <th className="py-2.5 px-3 text-right">Credit (Paid)</th>
                          <th className="py-2.5 px-3 text-right">Balance</th>
                          <th className="no-print py-2.5 px-2 text-center">Slip</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {ledgerEntries.map((row) => (
                          <tr key={row.id} className="hover:bg-amber-50/20 transition">
                            <td className="py-2.5 px-3 font-medium text-stone-700">
                              {row.date}
                            </td>

                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  row.type === 'Commitment Pledge'
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-emerald-100 text-emerald-900'
                                }`}
                              >
                                {row.type}
                              </span>
                            </td>

                            <td className="py-2.5 px-3 font-mono font-bold text-stone-800">
                              {row.refNo}
                            </td>

                            <td className="py-2.5 px-3 text-stone-600 font-medium">
                              {row.paymentMode || '-'}
                            </td>

                            <td className="py-2.5 px-3 text-stone-600 text-[11px]">
                              {row.collectedBy}
                            </td>

                            <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900">
                              {row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN')}` : '-'}
                            </td>

                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                              {row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN')}` : '-'}
                            </td>

                            <td className="py-2.5 px-3 text-right font-mono font-extrabold text-stone-900">
                              ₹{row.runningBalance.toLocaleString('en-IN')}
                            </td>

                            <td className="no-print py-2.5 px-2 text-center">
                              {row.voucherRaw && onOpenReceiptSlip && (
                                <button
                                  type="button"
                                  onClick={() => onOpenReceiptSlip(row.voucherRaw!)}
                                  className="p-1 rounded text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                                  title="View/Print Voucher"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-stone-50 font-bold border-t-2 border-stone-300 text-stone-900">
                          <td colSpan={5} className="py-3 px-3 text-right font-black uppercase text-[11px]">
                            Net Ledger Balance:
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black">
                            ₹{totalCommitted.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-emerald-800">
                            ₹{totalPaid.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-amber-900 text-sm">
                            ₹{netBalance.toLocaleString('en-IN')}
                          </td>
                          <td className="no-print"></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Audit Certification Stamp (for print) */}
              <div className="pt-6 border-t border-stone-200 flex justify-between items-end text-xs text-stone-500">
                <div>
                  <div>Verified By:</div>
                  <div className="font-extrabold text-stone-800 mt-1">Audit Desk & Accounts</div>
                  <div className="text-[10px] text-stone-400">Onampilly Kavadi Sangam</div>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center text-emerald-700 font-bold gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Official Certified Festival Ledger</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
