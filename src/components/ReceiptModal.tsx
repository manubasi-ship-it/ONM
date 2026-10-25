import React, { useRef } from 'react';
import { Transaction, Setting } from '../types';
import { amountToWordsEnglish } from '../utils/numberToWords';
import { generateWhatsAppLink, formatWhatsAppMessage } from '../utils/whatsapp';
import { Printer, Share2, Copy, Check, X, ShieldCheck } from 'lucide-react';

interface ReceiptModalProps {
  transaction: Transaction | null;
  setting: Setting;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  setting,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const text = formatWhatsAppMessage(transaction, setting);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappUrl = generateWhatsAppLink(transaction, setting);
  const isIncome = transaction.type === 'income';

  const launchWhatsApp = (url?: string) => {
    const targetUrl = url || whatsappUrl;
    const link = document.createElement('a');
    link.href = targetUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
      } catch {}
    }, 250);
  };

  const handlePrintAndSendWhatsApp = () => {
    // 1. Trigger window.print() for the receipt
    try {
      window.print();
    } catch (err) {
      console.warn('Print invocation note:', err);
    }

    // 2. Open WhatsApp in a new tab with pre-filled message
    launchWhatsApp();
  };

  const formattedDate = new Date(transaction.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = new Date(transaction.createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-amber-200 overflow-hidden my-auto flex flex-col">
        {/* Modal Top Actions (no-print) */}
        <div className="no-print bg-amber-900 text-amber-50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🧾</span>
            <div>
              <h3 className="font-bold text-sm tracking-wide">
                Digital Receipt Voucher
              </h3>
              <p className="text-xs text-amber-200">
                Serial No: {transaction.receiptNo}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-amber-800 text-amber-200 hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Paper */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh]">
          <div
            ref={receiptRef}
            className="receipt-container bg-amber-50/40 border-2 border-amber-800/40 rounded-xl p-5 sm:p-6 relative text-stone-800"
          >
            {/* Watermark / Vel Emblem */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
              <span className="text-9xl select-none">🔱</span>
            </div>

            {/* Invocations */}
            <div className="text-center border-b border-amber-800/20 pb-3">
              <div className="text-amber-800 font-bold text-xs tracking-widest uppercase mb-0.5">
                Om Saravana Bhavaya Namaha
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-amber-950 tracking-tight">
                {setting.sangamNameEnglish}
              </h1>
              <div className="inline-block mt-1 bg-amber-100 text-amber-900 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-300">
                Thaipooyam Festival {setting.festivalYear}
              </div>
            </div>

            {/* Receipt Meta Bar */}
            <div className="mt-3 flex flex-wrap justify-between items-center text-xs text-stone-600 bg-white/80 p-2 rounded-lg border border-amber-100 gap-2">
              <div>
                <span className="font-semibold text-stone-500">Receipt No: </span>
                <span className="font-mono font-bold text-amber-900 text-sm">
                  {transaction.receiptNo}
                </span>
              </div>
              <div>
                <span className="font-semibold text-stone-500">Date: </span>
                <span className="font-semibold text-stone-800">
                  {formattedDate} {formattedTime}
                </span>
              </div>
            </div>

            {/* Main Donor & Offering Details */}
            <div className="mt-4 space-y-2.5 text-xs sm:text-sm">
              <div className="flex justify-between border-b border-dashed border-amber-200 pb-1.5">
                <span className="text-stone-600 font-medium">
                  {isIncome ? 'Devotee / Donor:' : 'Payee / Vendor:'}
                </span>
                <span className="font-bold text-stone-900 text-right">
                  {transaction.donorOrPayee}
                </span>
              </div>

              {transaction.phone && (
                <div className="flex justify-between border-b border-dashed border-amber-200 pb-1.5">
                  <span className="text-stone-600 font-medium">Phone:</span>
                  <span className="font-mono font-medium text-stone-800">
                    +91 {transaction.phone}
                  </span>
                </div>
              )}

              {transaction.location && (
                <div className="flex justify-between border-b border-dashed border-amber-200 pb-1.5">
                  <span className="text-stone-600 font-medium">Location / Place:</span>
                  <span className="font-medium text-stone-800 text-right">
                    {transaction.location}
                  </span>
                </div>
              )}

              <div className="flex justify-between border-b border-dashed border-amber-200 pb-1.5">
                <span className="text-stone-600 font-medium">Offering / Category:</span>
                <span className="font-semibold text-amber-900 text-right">
                  {transaction.category}
                </span>
              </div>

              <div className="flex justify-between border-b border-dashed border-amber-200 pb-1.5">
                <span className="text-stone-600 font-medium">Payment Mode:</span>
                <span className="capitalize font-semibold text-stone-800">
                  {transaction.paymentMode === 'upi' ? 'UPI (PhonePe / GPay / Paytm)' :
                   transaction.paymentMode === 'cash' ? 'Cash' : 'Bank Transfer'}
                </span>
              </div>

              {transaction.notes && (
                <div className="flex justify-between border-b border-dashed border-amber-200 pb-1.5 text-xs text-stone-600 italic">
                  <span>Prayer / Notes:</span>
                  <span className="text-right">{transaction.notes}</span>
                </div>
              )}
            </div>

            {/* Total Amount Box */}
            <div className="mt-4 bg-amber-900 text-white p-3 rounded-xl flex items-center justify-between shadow-xs">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-amber-200 font-medium">
                  {isIncome ? 'Total Donation Received' : 'Amount Paid'}
                </div>
                <div className="text-xs text-amber-200 italic mt-0.5 font-medium">
                  {amountToWordsEnglish(transaction.amount)}
                </div>
              </div>
              <div className="text-right font-extrabold text-xl sm:text-2xl text-amber-300 font-mono">
                ₹{transaction.amount.toLocaleString('en-IN')}/-
              </div>
            </div>

            {/* Blessing & Seal Footnotes */}
            <div className="mt-4 pt-3 border-t border-amber-800/20 text-center text-xs text-stone-600 space-y-1">
              <p className="text-amber-950 font-medium">
                {setting.welcomeMessage}
              </p>
              <div className="flex justify-between items-end pt-3 text-[11px] text-stone-500">
                <div className="text-left">
                  <div>Recorded By:</div>
                  <div className="font-semibold text-stone-800">{transaction.collectedBy}</div>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center text-emerald-700 font-semibold gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Official Verified Voucher</span>
                  </div>
                  <div className="text-[10px] text-stone-400">{setting.sangamNameEnglish}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons (no-print) */}
        <div className="no-print bg-stone-50 border-t border-amber-100 p-3 sm:p-4 flex flex-wrap gap-2 justify-between items-center">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 transition cursor-pointer shadow-xs"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied Details' : 'Copy Text'}
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 rounded-lg hover:bg-amber-200 transition cursor-pointer shadow-xs"
              title="Print Receipt"
            >
              <Printer className="w-4 h-4" />
              Print Receipt
            </button>

            <button
              onClick={() => launchWhatsApp()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded-lg hover:bg-emerald-200 transition cursor-pointer shadow-xs"
              title="Share on WhatsApp"
            >
              <Share2 className="w-4 h-4 text-emerald-700" />
              WhatsApp Slip
            </button>

            <button
              onClick={handlePrintAndSendWhatsApp}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-linear-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer active:scale-95"
              title="First print receipt, then open WhatsApp chat"
            >
              <Printer className="w-4 h-4" />
              <span className="opacity-80">+</span>
              <Share2 className="w-4 h-4" />
              <span>Print & Send via WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
