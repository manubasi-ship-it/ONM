import React, { useState, useEffect } from 'react';
import { Setting } from '../types';
import { generateUPIQRCode, generateUPIUri, validateUPIId } from '../utils/upi';
import {
  QrCode,
  Smartphone,
  Copy,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

interface UpiPaymentModalProps {
  isOpen: boolean;
  amount: number;
  note?: string;
  transactionRef?: string;
  setting: Setting;
  onClose: () => void;
  onPaymentConfirmed?: () => void;
  onOpenSettings?: () => void;
}

export const UpiPaymentModal: React.FC<UpiPaymentModalProps> = ({
  isOpen,
  amount,
  note = 'Offering Payment',
  transactionRef,
  setting,
  onClose,
  onPaymentConfirmed,
  onOpenSettings,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [loadingQr, setLoadingQr] = useState<boolean>(false);
  const [copiedVpa, setCopiedVpa] = useState<boolean>(false);

  const isValidVpa = Boolean(setting.upiId && validateUPIId(setting.upiId));

  useEffect(() => {
    if (!isOpen || !isValidVpa || amount <= 0) return;

    let isCancelled = false;
    async function loadQR() {
      setLoadingQr(true);
      try {
        const url = await generateUPIQRCode({
          vpa: setting.upiId,
          name: setting.merchantName,
          amount: amount,
          note: note,
          transactionRef: transactionRef,
          mcc: setting.mcc,
        });
        if (!isCancelled) {
          setQrCodeDataUrl(url);
        }
      } catch (err) {
        console.error('Error rendering dynamic UPI QR:', err);
      } finally {
        if (!isCancelled) setLoadingQr(false);
      }
    }

    loadQR();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, amount, note, transactionRef, setting.upiId, setting.merchantName, setting.mcc, isValidVpa]);

  if (!isOpen) return null;

  const handleCopyVpa = () => {
    if (!setting.upiId) return;
    navigator.clipboard.writeText(setting.upiId);
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 2000);
  };

  const upiDeepLink = isValidVpa
    ? generateUPIUri({
        vpa: setting.upiId,
        name: setting.merchantName,
        amount: amount,
        note: note,
        transactionRef: transactionRef,
        mcc: setting.mcc,
      })
    : '';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-amber-200 overflow-hidden my-auto flex flex-col">
        {/* Modal Top Header */}
        <div className="bg-linear-to-r from-amber-950 via-amber-900 to-stone-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-800/80 rounded-xl text-amber-200">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base">
                Dynamic UPI Payment QR
              </h3>
              <p className="text-[11px] text-amber-200/90 font-mono">
                {transactionRef ? `Ref: ${transactionRef}` : 'Instant Checkout'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-amber-200 hover:text-white hover:bg-amber-800 transition cursor-pointer"
            title="Close / Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {!isValidVpa ? (
            /* Graceful Fallback Banner */
            <div className="p-5 bg-amber-50 border-2 border-dashed border-amber-300 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-stone-900 text-sm">
                  UPI VPA Not Configured
                </h4>
                <p className="text-xs text-stone-600 mt-1">
                  Please configure your Master Merchant Name and valid UPI ID (e.g. <span className="font-mono">store@upi</span>) before generating payment QR codes.
                </p>
              </div>
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  className="px-4 py-2 bg-amber-900 hover:bg-amber-950 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  Configure Master UPI Data Now
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Amount Display Card */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-center">
                <span className="text-[11px] uppercase font-bold tracking-wider text-stone-500">
                  Total Payable Amount
                </span>
                <div className="text-3xl font-black text-amber-950 font-mono tracking-tight mt-0.5">
                  ₹{amount.toLocaleString('en-IN')}/-
                </div>
                <div className="text-xs text-stone-600 font-medium mt-1">
                  Payee: <strong className="text-stone-900">{setting.merchantName}</strong>
                </div>
              </div>

              {/* Dynamic QR Code Frame */}
              <div className="relative mx-auto w-64 h-64 p-3 bg-white border-2 border-dashed border-amber-300 rounded-2xl shadow-inner flex items-center justify-center">
                {loadingQr ? (
                  <div className="flex flex-col items-center gap-2 text-stone-400">
                    <RefreshCw className="w-7 h-7 animate-spin text-amber-700" />
                    <span className="text-xs font-medium">Generating UPI QR...</span>
                  </div>
                ) : qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="UPI Payment QR Code"
                    className="w-full h-full object-contain rounded-xl"
                  />
                ) : (
                  <span className="text-xs text-stone-400">QR Code Error</span>
                )}
              </div>

              {/* UPI ID & Quick Copy Button */}
              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                <div className="truncate mr-2">
                  <div className="text-[10px] text-stone-400 uppercase font-semibold">
                    Merchant UPI ID (VPA)
                  </div>
                  <div className="font-mono font-bold text-stone-800 truncate">
                    {setting.upiId}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyVpa}
                  className="px-3 py-1.5 rounded-lg bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer text-xs"
                >
                  {copiedVpa ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy UPI</span>
                    </>
                  )}
                </button>
              </div>

              {/* Direct UPI Mobile Link */}
              <a
                href={upiDeepLink}
                className="w-full py-2.5 px-3 rounded-xl font-bold text-xs text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-amber-800" />
                <span>Open in UPI App (GPay / PhonePe / Paytm / BHIM)</span>
                <ExternalLink className="w-3 h-3 text-amber-700" />
              </a>
            </>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="bg-stone-50 border-t border-stone-200 px-6 py-3.5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-stone-600 bg-white border border-stone-300 rounded-xl hover:bg-stone-100 transition cursor-pointer"
          >
            Cancel / Close
          </button>

          {isValidVpa && onPaymentConfirmed && (
            <button
              type="button"
              onClick={() => {
                onPaymentConfirmed();
                onClose();
              }}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-200" />
              <span>Confirm & Issue Receipt</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
