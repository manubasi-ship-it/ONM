import React, { useState, useMemo } from 'react';
import {
  ProgramBooking,
  ProgramBookingModule,
  ReportPeriod,
} from '../modules/ProgramBookingModule';
import {
  Calendar,
  FileSpreadsheet,
  Printer,
  Download,
  Filter,
  DollarSign,
  Coins,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Phone,
  User,
  Clock,
  Layers,
  Wallet,
} from 'lucide-react';

interface ProgramReportsViewProps {
  onNavigateToBookings: () => void;
  onNavigateToWallets?: () => void;
}

export const ProgramReportsView: React.FC<ProgramReportsViewProps> = ({
  onNavigateToBookings,
  onNavigateToWallets,
}) => {
  const [period, setPeriod] = useState<ReportPeriod>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Always read latest bookings from dedicated storage key
  const bookings = useMemo(() => ProgramBookingModule.getBookings(), []);

  // Filtered bookings based on selected period
  const filteredBookings = useMemo(() => {
    return ProgramBookingModule.filterByPeriod(bookings, period, customFrom, customTo);
  }, [bookings, period, customFrom, customTo]);

  // Aggregated KPI Metrics
  const metrics = useMemo(() => {
    return ProgramBookingModule.calculateMetrics(filteredBookings);
  }, [filteredBookings]);

  // Currency Formatter
  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amt);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const filename = `Program_Bookings_Report_${period}_${new Date().toISOString().split('T')[0]}.csv`;
    ProgramBookingModule.exportToCSV(filteredBookings, filename);
  };

  // Trigger Print dialog
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Banner / Header */}
      <div className="no-print bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 md:p-8 shadow-xl border border-amber-900/60 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] sm:text-xs font-bold border border-amber-400/30 mb-1 sm:mb-2">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Financial Analytics & Audit Statement</span>
            </div>
            <h1 className="text-sm sm:text-2xl md:text-3xl font-black text-amber-100 tracking-tight">
              Reports & Financial Summary
            </h1>
          </div>

          {/* Module Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 bg-black/30 p-2 rounded-2xl border border-white/10 shrink-0">
            <button
              type="button"
              onClick={onNavigateToBookings}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition border border-white/10 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Bookings</span>
            </button>

            {onNavigateToWallets && (
              <button
                type="button"
                onClick={onNavigateToWallets}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition border border-white/10 cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Wallets & Ledger</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-md cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition shadow-md cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* FILTER BAR (Today, This Month, Last Month, Custom Date Range) */}
      <div className="no-print bg-white rounded-3xl p-5 border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-amber-700" />
          <span className="text-xs font-black text-stone-900 uppercase tracking-wider">Report Period Filter:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPeriod('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              period === 'all'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            All Time ({bookings.length})
          </button>
          <button
            type="button"
            onClick={() => setPeriod('today')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              period === 'today'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setPeriod('this_month')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              period === 'this_month'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            This Month
          </button>
          <button
            type="button"
            onClick={() => setPeriod('last_month')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              period === 'last_month'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            Last Month
          </button>
          <button
            type="button"
            onClick={() => setPeriod('custom')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
              period === 'custom'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            Custom Range
          </button>
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2 pt-2 md:pt-0">
            <span className="text-[11px] font-bold text-stone-500">From:</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-2.5 py-1 rounded-xl border border-stone-300 text-xs font-semibold focus:outline-hidden"
            />
            <span className="text-[11px] font-bold text-stone-500">To:</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-2.5 py-1 rounded-xl border border-stone-300 text-xs font-semibold focus:outline-hidden"
            />
          </div>
        )}
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* KPI 1: Total Programs Count */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm relative overflow-hidden group hover:border-amber-400 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-stone-500 uppercase tracking-wider">
              Total Programs
            </span>
            <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-stone-900 mt-2 font-mono">
            {metrics.totalPrograms}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-stone-500">
            <span className="text-emerald-700 font-bold">{metrics.fullySettledCount} Settled</span>
            <span>•</span>
            <span className="text-rose-700 font-bold">{metrics.pendingCount} Pending</span>
          </div>
        </div>

        {/* KPI 2: Total Contract Value */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm relative overflow-hidden group hover:border-amber-400 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-stone-500 uppercase tracking-wider">
              Contract Value
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-amber-900 mt-2 font-mono truncate" title={formatCurrency(metrics.totalContractValue)}>
            {formatCurrency(metrics.totalContractValue)}
          </div>
          <p className="text-[10px] text-stone-400 mt-2">Sum of TOTAL AMOUNT</p>
        </div>

        {/* KPI 3: Total Advance Paid / Floated */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm relative overflow-hidden group hover:border-rose-400 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-stone-500 uppercase tracking-wider">
              Advance Paid
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-rose-800 mt-2 font-mono truncate" title={formatCurrency(metrics.totalAdvanceCollected)}>
            {formatCurrency(metrics.totalAdvanceCollected)}
          </div>
          <p className="text-[10px] text-stone-400 mt-2">Sum of ADVANCE AMOUNT</p>
        </div>

        {/* KPI 4: Total Settled Amount */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm relative overflow-hidden group hover:border-indigo-400 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-stone-500 uppercase tracking-wider">
              Settled Amount
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-indigo-900 mt-2 font-mono truncate" title={formatCurrency(metrics.totalSettledAmount)}>
            {formatCurrency(metrics.totalSettledAmount)}
          </div>
          <p className="text-[10px] text-stone-400 mt-2">Sum of SETTLED AMOUNT</p>
        </div>

        {/* KPI 5: Outstanding Balance / Total Difference */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm relative overflow-hidden group hover:border-red-400 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-stone-500 uppercase tracking-wider">
              Outstanding Diff
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-rose-800 mt-2 font-mono truncate" title={formatCurrency(metrics.totalDifference)}>
            {formatCurrency(metrics.totalDifference)}
          </div>
          <p className="text-[10px] text-stone-400 mt-2">Sum of (Balance - Settled)</p>
        </div>

        {/* KPI 6: Member Advance Pool Remaining */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm relative overflow-hidden group hover:border-emerald-400 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-stone-500 uppercase tracking-wider">
              Remaining Pool
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-800 mt-2 font-mono truncate" title={formatCurrency(metrics.remainingAdvancePool)}>
            {formatCurrency(metrics.remainingAdvancePool)}
          </div>
          <p className="text-[10px] text-stone-400 mt-2">
            Pool: {formatCurrency(metrics.totalAdvancePool)}
          </p>
        </div>
      </div>

      {/* PRINT-ONLY HEADER */}
      <div className="hidden print:block mb-6 text-center border-b pb-4">
        <h1 className="text-2xl font-black text-stone-900">Onampilly Kavadisangam Temple Festival</h1>
        <h2 className="text-base font-bold text-stone-700">Program Booking & Financial Statement Report</h2>
        <p className="text-xs text-stone-500 mt-1">
          Period: <span className="font-bold uppercase">{period.replace('_', ' ')}</span> • Generated on:{' '}
          {new Date().toLocaleString('en-IN')}
        </p>
      </div>

      {/* DETAILED FINANCIAL TABLE & AUDIT STATEMENT */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-stone-900">Program Financial Breakdown & Settlement Status</h2>
            <p className="text-xs text-stone-500">
              Showing {filteredBookings.length} records for the selected period
            </p>
          </div>
          <div className="text-xs font-mono font-bold text-stone-500">
            Total Net Diff: <span className="text-rose-700">{formatCurrency(metrics.totalDifference)}</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-stone-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-900 text-stone-200 uppercase font-extrabold tracking-wider text-[11px] border-b border-stone-800">
                <th className="py-3 px-3 w-12 text-center">SL NO</th>
                <th className="py-3 px-4">PROGRAME NAME</th>
                <th className="py-3 px-3">DATE & TIME</th>
                <th className="py-3 px-3">CO ORDINATOR</th>
                <th className="py-3 px-3">MOBILE</th>
                <th className="py-3 px-3 text-right">TOTAL AMOUNT</th>
                <th className="py-3 px-3 text-right">ADVANCE (CR)</th>
                <th className="py-3 px-3 text-right">BALANCE</th>
                <th className="py-3 px-3 text-right">SETTLED</th>
                <th className="py-3 px-3 text-right">DIFFERENCE</th>
                <th className="py-3 px-3 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-stone-400">
                    <p className="text-sm font-bold text-stone-600">No records found for this period.</p>
                    <p className="text-xs text-stone-400 mt-1">Try switching to "All Time" or adjusting the date filter.</p>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b, idx) => {
                  const isSettled = b.difference === 0;
                  const isPending = b.difference > 0;

                  return (
                    <tr key={b.id} className="hover:bg-amber-50/30 transition">
                      <td className="py-3 px-3 text-center font-mono font-bold text-stone-500 bg-stone-50/60">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-black text-stone-900">
                        {b.programeName}
                        <div className="text-[10px] text-stone-400 font-normal">
                          {b.noOfArtist} Artists ({b.reportingTime} - {b.endTime})
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-stone-700 whitespace-nowrap">
                        {b.programeDate}
                        <div className="text-[10px] text-stone-400 font-mono">{b.programeTime}</div>
                      </td>
                      <td className="py-3 px-3 font-bold text-stone-800">{b.coordinatorName}</td>
                      <td className="py-3 px-3 font-mono font-bold text-stone-700">{b.mobileNumber1}</td>
                      <td className="py-3 px-3 font-mono font-bold text-right text-stone-900">
                        {formatCurrency(b.totalAmount)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-right text-rose-700 bg-rose-50/30">
                        <div>{formatCurrency(b.advanceAmount)}</div>
                        <div className="text-[9px] text-stone-400">By {b.advancePaidBy}</div>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-right text-stone-800 bg-stone-50/30">
                        {formatCurrency(b.balanceAmount)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-right text-emerald-700">
                        {formatCurrency(b.settledAmount)}
                      </td>
                      <td className="py-3 px-3 font-mono font-black text-right">
                        <span className={isSettled ? 'text-emerald-700' : 'text-rose-700'}>
                          {formatCurrency(b.difference)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isSettled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle className="w-3 h-3" />
                            <span>Settled</span>
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                            <AlertCircle className="w-3 h-3" />
                            <span>Pending</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800">
                            <span>Overpaid</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Total Footer Summary */}
            {filteredBookings.length > 0 && (
              <tfoot>
                <tr className="bg-stone-900 text-white font-mono font-black text-xs">
                  <td colSpan={5} className="py-3 px-4 text-right uppercase tracking-wider font-sans">
                    Grand Totals:
                  </td>
                  <td className="py-3 px-3 text-right">{formatCurrency(metrics.totalContractValue)}</td>
                  <td className="py-3 px-3 text-right text-rose-300">{formatCurrency(metrics.totalAdvanceCollected)}</td>
                  <td className="py-3 px-3 text-right text-amber-300">
                    {formatCurrency(metrics.totalContractValue - metrics.totalAdvanceCollected)}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-300">{formatCurrency(metrics.totalSettledAmount)}</td>
                  <td className="py-3 px-3 text-right text-rose-300">{formatCurrency(metrics.totalDifference)}</td>
                  <td className="py-3 px-3 text-center font-sans text-[10px]">
                    {metrics.fullySettledCount} / {metrics.totalPrograms} Settled
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
