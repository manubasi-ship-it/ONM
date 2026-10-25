import React, { useRef } from 'react';
import { ReceiptVoucher, Setting } from '../types';
import { amountToWordsEnglish } from '../utils/numberToWords';
import { generateWhatsAppLink, formatReceiptVoucherWhatsAppMessage } from '../utils/whatsapp';
import { Printer, Share2, Copy, Check, X, ShieldCheck } from 'lucide-react';

interface ReceiptSlipModalProps {
  voucher: ReceiptVoucher | null;
  setting: Setting;
  onClose: () => void;
}

export const ReceiptSlipModal: React.FC<ReceiptSlipModalProps> = ({
  voucher,
  setting,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [recipientPhone, setRecipientPhone] = React.useState<string>(() => {
    return (voucher as any)?.phone || (voucher as any)?.mobile || '';
  });
  const [isProcessingCombo, setIsProcessingCombo] = React.useState(false);
  const [lastSentUrl, setLastSentUrl] = React.useState<string | null>(null);
  const slipRef = useRef<HTMLDivElement>(null);

  if (!voucher) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(voucher.date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const openWhatsAppTab = (url?: string) => {
    const targetUrl = url || generateWhatsAppLink(voucher, setting, recipientPhone);
    setLastSentUrl(targetUrl);
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
    setIsProcessingCombo(true);

    // 1. Trigger window.print() for the receipt slip
    try {
      window.print();
    } catch (err) {
      console.warn('Print invocation note:', err);
    }

    // 2. Use generateWhatsAppLink to open a new tab with the pre-filled message
    const targetUrl = generateWhatsAppLink(voucher, setting, recipientPhone);
    openWhatsAppTab(targetUrl);

    setTimeout(() => {
      setIsProcessingCombo(false);
    }, 1500);
  };

  const handleCopy = () => {
    const message = formatReceiptVoucherWhatsAppMessage(voucher, setting);
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappUrl = generateWhatsAppLink(voucher, setting, recipientPhone);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-amber-200 overflow-hidden my-auto flex flex-col">
        {/* Modal Top Bar (hidden on print) */}
        <div className="no-print bg-amber-950 text-amber-50 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🧾</span>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide">
                Official Receipt Voucher
              </h3>
              <p className="text-xs text-amber-300 font-mono">
                {voucher.transaction_no} • Receipt #{voucher.receipt_no}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-amber-900 text-amber-200 hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Paper */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh]">
          <div
            ref={slipRef}
            className="receipt-container bg-amber-50/40 border-2 border-amber-800/40 rounded-xl p-5 sm:p-6 relative text-stone-800"
          >
            {/* Watermark Emblem */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
              <span className="text-9xl select-none">🔱</span>
            </div>

            {/* Header */}
            <div className="text-center border-b border-amber-800/20 pb-3">
              <div className="text-amber-800 font-bold text-xs tracking-widest uppercase mb-0.5">
                Om Saravana Bhavaya Namaha
              </div>
              <h1 className="text-lg sm:text-xl font-black text-amber-950 tracking-tight">
                {setting.sangamNameEnglish}
              </h1>
              <div className="inline-block mt-1 bg-amber-100 text-amber-900 text-xs font-bold px-3 py-0.5 rounded-full border border-amber-300">
                Thaipooyam Festival {setting.festivalYear} • Collection Voucher
              </div>
            </div>

            {/* Receipt Meta Bar */}
            <div className="mt-3 grid grid-cols-2 text-xs text-stone-600 bg-white/80 p-2.5 rounded-lg border border-amber-100 gap-2">
              <div>
                <span className="font-medium text-stone-500">Receipt Book No: </span>
                <span className="font-mono font-bold text-amber-950 text-sm">
                  {voucher.receipt_no}
                </span>
              </div>
              <div className="text-right">
                <span className="font-medium text-stone-500">Date: </span>
                <span className="font-bold text-stone-800">
                  {formattedDate}
                </span>
              </div>
              <div className="col-span-2 text-[11px] text-stone-400 font-mono">
                System Voucher No: {voucher.transaction_no}
              </div>
            </div>

            {/* Payee Details */}
            <div className="mt-4 space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between border-b border-dashed border-amber-200 pb-1.5">
                <span className="text-stone-600 font-medium">Payee / Donor Name:</span>
                <span className="font-bold text-stone-900 text-right">
                  {voucher.name}
                </span>
              </div>

              <div className="flex justify-between border-b border-dashed border-amber-200 pb-1.5">
                <span className="text-stone-600 font-medium">House / Residence:</span>
                <span className="font-medium text-stone-800 text-right">
                  {voucher.house_name}
                </span>
              </div>

              <div className="flex justify-between border-b border-dashed border-amber-200 pb-1.5">
                <span className="text-stone-600 font-medium">Place:</span>
                <span className="font-medium text-stone-800 text-right">
                  {voucher.place}
                </span>
              </div>

              <div className="flex justify-between border-b border-dashed border-amber-200 pb-1.5">
                <span className="text-stone-600 font-medium">Payment Mode:</span>
                <span className="font-bold text-stone-900 px-2 py-0.5 bg-stone-100 rounded text-xs">
                  {voucher.payment_mode}
                </span>
              </div>

              {voucher.amount_committed > 0 && (
                <div className="flex justify-between border-b border-dashed border-amber-200 pb-1.5 text-stone-600">
                  <span>Pledged Target:</span>
                  <span className="font-mono font-semibold">
                    ₹{voucher.amount_committed.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>

            {/* Amount Paid Box */}
            <div className="mt-4 bg-linear-to-r from-amber-950 to-amber-900 text-white p-3.5 rounded-xl flex items-center justify-between shadow-xs">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-amber-200 font-bold">
                  Amount Received
                </div>
                <div className="text-xs text-amber-200 italic mt-0.5 font-medium">
                  {amountToWordsEnglish(voucher.amount_received)}
                </div>
              </div>
              <div className="text-right font-black text-2xl text-amber-300 font-mono">
                ₹{voucher.amount_received.toLocaleString('en-IN')}/-
              </div>
            </div>

            {/* Outstanding Balance Banner */}
            <div className="mt-3 p-2.5 rounded-lg bg-stone-100/90 border border-stone-200 flex items-center justify-between text-xs">
              <span className="font-medium text-stone-600">Remaining Balance:</span>
              <span className={`font-mono font-extrabold ${voucher.balance > 0 ? 'text-amber-800 text-sm' : 'text-emerald-700'}`}>
                {voucher.balance > 0 ? `₹${voucher.balance.toLocaleString('en-IN')}` : '₹0 (Pledge Fully Settled)'}
              </span>
            </div>

            {/* Footer Signatures */}
            <div className="mt-4 pt-3 border-t border-amber-800/20 text-center text-xs text-stone-600 space-y-1">
              <p className="text-amber-950 font-medium text-[11px]">
                {setting.welcomeMessage}
              </p>
              <div className="flex justify-between items-end pt-3 text-[11px] text-stone-500">
                <div className="text-left">
                  <div>Collected By:</div>
                  <div className="font-bold text-stone-800">
                    {voucher.collectedByMemberName
                      ? `${voucher.collectedByMemberName} (${voucher.collectedByMemberRole || 'Member'})`
                      : voucher.amount_collected_by || 'Direct / Unassigned Counter Collection'}
                  </div>
                  <div className="text-[10px] font-medium text-stone-500">
                    Settlement: <span className={voucher.settlementStatus === 'Settled' ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>{voucher.settlementStatus || 'In-Hand'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center text-emerald-700 font-semibold gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified Voucher</span>
                  </div>
                  <div className="text-[10px] text-stone-400">{setting.sangamNameEnglish}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Optional WhatsApp Recipient Phone */}
        <div className="no-print bg-amber-50/70 border-t border-amber-200/70 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-stone-700 font-semibold">
            <span className="text-emerald-700 font-bold">WhatsApp Direct:</span>
            <span className="text-stone-500 font-normal text-[11px]">(Optional recipient number)</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs select-none">
                +91
              </span>
              <input
                type="tel"
                placeholder="10-digit mobile"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                maxLength={10}
                className="w-full pl-9 pr-2 py-1 text-xs border border-amber-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
              />
            </div>
            {recipientPhone && (
              <button
                type="button"
                onClick={() => setRecipientPhone('')}
                className="text-stone-400 hover:text-stone-600 text-xs px-1 cursor-pointer"
                title="Clear"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Processing / Success Banner */}
        {isProcessingCombo && (
          <div className="no-print px-4 py-2 bg-emerald-50 border-t border-emerald-200 text-xs text-emerald-800 flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="animate-spin text-emerald-600">⏳</span>
              <span>Print dialog opened. Launching WhatsApp chat link with receipt details...</span>
            </div>
            {lastSentUrl && (
              <a
                href={lastSentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline text-emerald-700 hover:text-emerald-900 ml-2"
              >
                Open WhatsApp
              </a>
            )}
          </div>
        )}

        {/* Modal Bottom Actions */}
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
              title="Print Receipt Slip"
            >
              <Printer className="w-4 h-4" />
              Print Receipt
            </button>

            <button
              onClick={() => openWhatsAppTab()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded-lg hover:bg-emerald-200 transition cursor-pointer shadow-xs"
              title="Share via WhatsApp"
            >
              <Share2 className="w-4 h-4 text-emerald-700" />
              WhatsApp Slip
            </button>

            <button
              onClick={handlePrintAndSendWhatsApp}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-linear-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer active:scale-95"
              title="Trigger Print dialog and launch WhatsApp chat link"
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
