import React, { useState, useEffect } from 'react';
import {
  Transaction,
  Setting,
  UserProfile,
  CommitteeMember,
  ReceiptType,
} from '../types';
import { generateNextReceiptNumber } from '../utils/receiptGenerator';
import { generateUPIQRCode, generateUPIUri, validateUPIId } from '../utils/upi';
import { generateWhatsAppLink } from '../utils/whatsapp';
import confetti from 'canvas-confetti';
import {
  QrCode,
  Smartphone,
  Banknote,
  CheckCircle,
  RefreshCw,
  User,
  Phone,
  MapPin,
  Sparkles,
  UserCheck,
  Share2,
  Copy,
  Check,
  X,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Settings,
  CreditCard,
} from 'lucide-react';

interface QuickCollectionProps {
  transactions: Transaction[];
  setting: Setting;
  currentUser: UserProfile;
  committeeMembers: CommitteeMember[];
  receiptTypes: ReceiptType[];
  onSaveTransaction: (tx: Transaction) => void;
  onSelectReceipt: (tx: Transaction) => void;
  onOpenMasterSettings?: () => void;
}

const PRESET_AMOUNTS = [51, 101, 251, 501, 1001, 2001, 2501, 5001];

export const QuickCollection: React.FC<QuickCollectionProps> = ({
  transactions,
  setting,
  currentUser,
  committeeMembers,
  receiptTypes,
  onSaveTransaction,
  onSelectReceipt,
  onOpenMasterSettings,
}) => {
  const [donorName, setDonorName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');

  // Active receipt types for offering category
  const activeReceiptTypes = receiptTypes.filter((r) => r.active);
  const defaultCategory =
    activeReceiptTypes.length > 0
      ? `${activeReceiptTypes[0].nameMalayalam} (${activeReceiptTypes[0].nameEnglish})`
      : '';
  const [category, setCategory] = useState(defaultCategory);

  // Offering amount and payment states

  const [amount, setAmount] = useState<number>(501);
  const [customAmount, setCustomAmount] = useState<string>('501');
  const [paymentMode, setPaymentMode] = useState<'upi' | 'cash' | 'bank_transfer'>('upi');
  const [notes, setNotes] = useState('');

  // Auto-send WhatsApp state with localStorage persistence
  const [autoSendWhatsApp, setAutoSendWhatsApp] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('oks_auto_send_whatsapp');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleToggleAutoSend = (val: boolean) => {
    setAutoSendWhatsApp(val);
    try {
      localStorage.setItem('oks_auto_send_whatsapp', String(val));
    } catch {}
  };

  // On-demand dynamic QR code states (Do NOT show by default!)
  const [showOnDemandQr, setShowOnDemandQr] = useState<boolean>(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const isUpiConfigured = Boolean(setting.upiId && validateUPIId(setting.upiId));

  // Update default category if receipt types change
  useEffect(() => {
    if (activeReceiptTypes.length > 0 && !category) {
      setCategory(`${activeReceiptTypes[0].nameMalayalam} (${activeReceiptTypes[0].nameEnglish})`);
    }
  }, [activeReceiptTypes, category]);

  // Generate UPI QR Code strictly on demand when requested
  useEffect(() => {
    if (!showOnDemandQr || amount <= 0 || !isUpiConfigured) return;

    let isCancelled = false;
    async function updateQR() {
      setIsGeneratingQr(true);
      try {
        const nextReceipt = generateNextReceiptNumber(transactions, setting.festivalYear);
        const qrUrl = await generateUPIQRCode({
          vpa: setting.upiId,
          name: setting.merchantName,
          amount: amount,
          note: `Kavadi Offering ${nextReceipt}`,
          transactionRef: nextReceipt,
          mcc: setting.mcc,
        });
        if (!isCancelled) {
          setQrCodeDataUrl(qrUrl);
        }
      } catch (e) {
        console.error('Error generating QR code:', e);
      } finally {
        if (!isCancelled) setIsGeneratingQr(false);
      }
    }

    updateQR();
    return () => {
      isCancelled = true;
    };
  }, [showOnDemandQr, amount, setting.upiId, setting.merchantName, setting.mcc, transactions, setting.festivalYear, isUpiConfigured]);

  const handlePresetSelect = (val: number) => {
    setAmount(val);
    setCustomAmount(val.toString());
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setCustomAmount(val);
    const parsed = parseInt(val, 10);
    setAmount(isNaN(parsed) ? 0 : parsed);
  };

  const handleCopyUpiId = () => {
    if (!setting.upiId) return;
    navigator.clipboard.writeText(setting.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!donorName.trim()) {
      setErrorMsg('Please enter devotee/donor name');
      return;
    }

    if (!category.trim()) {
      setErrorMsg('Please enter or select offering category');
      return;
    }

    if (amount <= 0) {
      setErrorMsg('Please enter a valid amount');
      return;
    }

    const nextReceipt = generateNextReceiptNumber(transactions, setting.festivalYear);
    const nowIso = new Date().toISOString();

    const newTx: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      receiptNo: nextReceipt,
      type: 'income',
      category: category,
      amount: amount,
      donorOrPayee: donorName.trim(),
      phone: phone.trim(),
      location: location.trim(),
      paymentMode: paymentMode,
      status: 'completed',
      notes: notes.trim(),
      collectedBy: currentUser.displayName ? `${currentUser.displayName} (${currentUser.role})` : 'Sangam Collector',
      collectedByRole: currentUser.role,
      createdAt: nowIso,
      updatedAt: nowIso,
      synced: true,
    };

    onSaveTransaction(newTx);

    // Confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#d97706', '#dc2626', '#10b981'],
      });
    } catch {}

    // Auto-trigger WhatsApp if enabled and phone number is provided
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (autoSendWhatsApp && cleanPhone.length >= 10) {
      try {
        const waUrl = generateWhatsAppLink(newTx, setting);
        const a = document.createElement('a');
        a.href = waUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (e) {
        console.warn('Auto WhatsApp launch note:', e);
      }
    }

    // Open receipt modal immediately
    onSelectReceipt(newTx);

    // Dismiss QR view and reset fields for next devotee
    setShowOnDemandQr(false);
    setDonorName('');
    setPhone('');
    setNotes('');
  };

  const nextReceiptPreview = generateNextReceiptNumber(transactions, setting.festivalYear);
  const upiIntentUri = isUpiConfigured
    ? generateUPIUri({
        vpa: setting.upiId,
        name: setting.merchantName,
        amount: amount,
        note: `Kavadi Offering ${nextReceiptPreview}`,
        mcc: setting.mcc,
      })
    : '';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-linear-to-r from-amber-900 via-amber-800 to-red-900 rounded-2xl p-3.5 sm:p-5 text-white shadow-lg border border-amber-700/50 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-2xl">🔱</span>
            <span className="text-[10px] sm:text-xs uppercase tracking-widest text-amber-300 font-semibold">
              Checkout & Collection Desk
            </span>
          </div>
          <h2 className="text-sm sm:text-xl md:text-2xl font-black mt-0.5 sm:mt-1">
            Real-Time Devotee Offerings & Digital Receipts
          </h2>
        </div>

        <div className="bg-amber-950/70 border border-amber-600/40 rounded-xl px-4 py-2.5 text-center min-w-[170px]">
          <div className="text-[10px] text-amber-300 uppercase font-semibold">
            Next Receipt No
          </div>
          <div className="font-mono text-lg font-bold text-amber-100">
            {nextReceiptPreview}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Collection Form (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-amber-100">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Automated Collector Attribution (Read-Only Status Badge) */}
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-900 shrink-0">
                  <UserCheck className="w-4 h-4 text-amber-800" />
                </div>
                <div>
                  <div className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">
                    Amount Collected By
                  </div>
                  <div className="font-extrabold text-stone-900 flex items-center gap-2">
                    <span>{currentUser.displayName}</span>
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded-md bg-amber-200 text-amber-950 font-bold border border-amber-300">
                      {currentUser.role}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  ✓ Auto-attributed
                </span>
              </div>
            </div>

            {/* Devotee Name */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-700" />
                <span>Devotee or Donor Name *</span>
              </label>
              <input
                type="text"
                required
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="e.g. Suresh Babu / Anand Kumar"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/40 text-sm font-medium"
              />
            </div>

            {/* Phone & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-700" />
                  <span>Phone Number (WhatsApp)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-stone-400 font-semibold">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="9495233833"
                    className="w-full pl-11 pr-3 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/40 text-sm font-medium font-mono"
                  />
                </div>
                {autoSendWhatsApp && phone.trim().length === 10 && (
                  <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-1">
                    <Share2 className="w-2.5 h-2.5" />
                    <span>WhatsApp message auto-send ready</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-700" />
                  <span>House / Location (Optional)</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Vadakkedath House, Onampilly"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/40 text-sm font-medium"
                />
              </div>
            </div>

            {/* Offering Category (Master Receipt Types Integration) */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
                <span>Offering / Receipt Category *</span>
                <span className="text-[10px] text-emerald-800 font-medium">
                  {activeReceiptTypes.length > 0 ? 'Master Categories' : 'Custom Offering'}
                </span>
              </label>
              {activeReceiptTypes.length > 0 ? (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/40 text-xs font-bold text-amber-950 bg-stone-50/50"
                >
                  <option value="">-- Select Offering Type --</option>
                  {activeReceiptTypes.map((rec) => {
                    const val = rec.nameEnglish || rec.nameMalayalam;
                    return (
                      <option key={rec.id} value={val}>
                        {val} {rec.codePrefix ? `[${rec.codePrefix}]` : ''}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Enter offering type (e.g. General Offering / Kavadi Donation)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/40 text-xs font-bold text-amber-950 bg-white"
                />
              )}
            </div>

            {/* Amount Selection & Presets */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center justify-between">
                <span>Offering Amount (₹) *</span>
                <span className="text-[11px] text-amber-800 font-semibold">
                  Dakshina / Contribution
                </span>
              </label>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-2.5">
                {PRESET_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handlePresetSelect(val)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      amount === val
                        ? 'bg-amber-800 text-white border-amber-800 shadow-xs'
                        : 'bg-amber-50/60 text-amber-950 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    ₹{val}
                  </button>
                ))}
              </div>

              {/* Custom Input */}
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-base font-bold text-stone-500">₹</span>
                <input
                  type="text"
                  required
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  placeholder="Enter custom amount"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/40 text-lg font-bold font-mono text-amber-950"
                />
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Payment Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode('upi')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    paymentMode === 'upi'
                      ? 'bg-amber-900 text-white border-amber-900 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>UPI Payment</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMode('cash');
                    setShowOnDemandQr(false);
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    paymentMode === 'cash'
                      ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>Cash Desk</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMode('bank_transfer');
                    setShowOnDemandQr(false);
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    paymentMode === 'bank_transfer'
                      ? 'bg-indigo-900 text-white border-indigo-900 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Bank Transfer</span>
                </button>
              </div>
            </div>

            {/* Prayer Note */}
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Special Prayer Note (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. For family prosperity and health"
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600/40 text-xs"
              />
            </div>

            {/* Auto-send WhatsApp Toggle Switch */}
            <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/90 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-stone-900 flex items-center gap-2">
                    <span>Auto-send WhatsApp Receipt</span>
                  </div>
                  <p className="text-[10px] text-stone-600 mt-0.5">
                    Automatically opens WhatsApp with receipt details upon save
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={autoSendWhatsApp}
                onClick={() => handleToggleAutoSend(!autoSendWhatsApp)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  autoSendWhatsApp ? 'bg-emerald-600' : 'bg-stone-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    autoSendWhatsApp ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-white bg-linear-to-r from-amber-800 to-amber-900 hover:from-amber-900 hover:to-red-950 transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <CheckCircle className="w-5 h-5 text-amber-300" />
              <span>Confirm & Issue Receipt</span>
            </button>
          </form>
        </div>

        {/* Right Column: On-Demand UPI QR Code / Payment Desk (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-amber-100">
          <div>
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-100 text-amber-900 rounded-lg">
                  <CreditCard className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-stone-900">
                    Payment & Checkout Card
                  </h3>
                  <span className="text-[11px] text-stone-500 font-mono">
                    Mode: {paymentMode.toUpperCase()}
                  </span>
                </div>
              </div>

              {showOnDemandQr && (
                <button
                  type="button"
                  onClick={() => setShowOnDemandQr(false)}
                  className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition cursor-pointer"
                  title="Close QR Code View"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* CONDITIONAL RENDERING LOGIC */}
            {paymentMode === 'upi' ? (
              !isUpiConfigured ? (
                /* Fallback Banner when UPI is not configured */
                <div className="p-5 bg-amber-50 border-2 border-dashed border-amber-300 rounded-2xl text-center space-y-3">
                  <div className="w-10 h-10 mx-auto rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-xs">
                      Master UPI ID Not Configured
                    </h4>
                    <p className="text-[11px] text-stone-600 mt-1">
                      Please configure your official merchant UPI ID (e.g., <code className="font-mono bg-amber-100/70 px-1 py-0.5 rounded">store@upi</code>) in Master Settings before generating payment QR codes.
                    </p>
                  </div>
                  {onOpenMasterSettings && (
                    <button
                      type="button"
                      onClick={onOpenMasterSettings}
                      className="px-3.5 py-2 bg-amber-900 hover:bg-amber-950 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 mx-auto cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-amber-300" />
                      <span>Configure Master Settings</span>
                    </button>
                  )}
                </div>
              ) : !showOnDemandQr ? (
                /* Default State: No QR displayed by default! */
                <div className="p-6 text-center space-y-4 bg-stone-50/70 rounded-2xl border border-stone-200">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center shadow-inner">
                    <QrCode className="w-7 h-7" />
                  </div>

                  <div>
                    <h4 className="font-extrabold text-sm text-stone-900">
                      On-Demand UPI Payment QR
                    </h4>
                    <p className="text-xs text-stone-500 mt-1">
                      QR code is rendered strictly on-demand. Click below to generate dynamic payment QR for ₹{amount.toLocaleString('en-IN')}.
                    </p>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-stone-200 text-left text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-stone-500 font-medium">Merchant:</span>
                      <span className="font-bold text-stone-800 truncate">{setting.merchantName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500 font-medium">UPI VPA:</span>
                      <span className="font-mono font-bold text-amber-950">{setting.upiId}</span>
                    </div>
                    <div className="flex justify-between border-t border-stone-100 pt-1 mt-1 font-bold">
                      <span className="text-stone-700">Amount:</span>
                      <span className="text-amber-900 font-mono text-sm">₹{amount.toLocaleString('en-IN')}/-</span>
                    </div>
                  </div>

                  {/* On-Demand Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setShowOnDemandQr(true)}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-linear-to-r from-amber-800 to-amber-900 hover:from-amber-900 hover:to-amber-950 shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>⚡ Generate Payment QR</span>
                  </button>
                </div>
              ) : (
                /* On-Demand QR Active State */
                <div className="space-y-3.5 text-center">
                  <div className="flex items-center justify-between bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                    <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      Dynamic Payment QR Active
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowOnDemandQr(false)}
                      className="text-[10px] text-stone-600 hover:text-stone-900 underline font-semibold cursor-pointer"
                    >
                      Hide QR
                    </button>
                  </div>

                  {/* QR Image Frame */}
                  <div className="relative mx-auto w-52 h-52 p-2 bg-white border-2 border-dashed border-amber-400 rounded-2xl shadow-inner flex items-center justify-center">
                    {isGeneratingQr ? (
                      <div className="flex flex-col items-center gap-2 text-stone-400">
                        <RefreshCw className="w-6 h-6 animate-spin text-amber-700" />
                        <span className="text-xs">Generating QR...</span>
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

                  {/* Amount and Merchant Details */}
                  <div className="bg-amber-50/80 rounded-xl p-3 border border-amber-200 text-center">
                    <div className="text-[10px] text-stone-500 uppercase font-semibold">Payable Amount</div>
                    <div className="text-2xl font-black text-amber-950 font-mono">
                      ₹{amount.toLocaleString('en-IN')}/-
                    </div>
                    <div className="text-xs font-semibold text-stone-800 mt-0.5">
                      {setting.merchantName}
                    </div>
                  </div>

                  {/* UPI ID with Copy Button */}
                  <div className="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                    <div className="truncate mr-2 text-left">
                      <div className="text-[9px] text-stone-400 uppercase font-bold">UPI ID (VPA)</div>
                      <div className="font-mono font-bold text-stone-800 text-[11px] truncate">
                        {setting.upiId}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyUpiId}
                      className="px-2.5 py-1 rounded-lg bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold transition flex items-center gap-1 shrink-0 cursor-pointer text-[11px]"
                    >
                      {copiedUpi ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Mobile Direct Pay Link */}
                  <a
                    href={upiIntentUri}
                    className="w-full py-2.5 px-3 rounded-xl font-bold text-xs text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-amber-800" />
                    <span>Pay via UPI Phone App</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  {/* Close / Dismiss QR Button */}
                  <button
                    type="button"
                    onClick={() => setShowOnDemandQr(false)}
                    className="w-full py-1.5 text-xs text-stone-500 hover:text-stone-800 font-medium transition cursor-pointer"
                  >
                    Dismiss / Close QR View
                  </button>
                </div>
              )
            ) : (
              /* Cash / Bank Transfer view */
              <div className="p-6 text-center space-y-4 bg-stone-50/70 rounded-2xl border border-stone-200">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center">
                  {paymentMode === 'cash' ? <Banknote className="w-7 h-7" /> : <Smartphone className="w-7 h-7" />}
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-stone-900">
                    {paymentMode === 'cash' ? 'Cash Collection Desk' : 'Bank Transfer Desk'}
                  </h4>
                  <p className="text-xs text-stone-500 mt-1">
                    {paymentMode === 'cash'
                      ? 'Collect ₹' + amount.toLocaleString('en-IN') + ' in cash and issue digital receipt.'
                      : 'Verify direct bank credit before confirming voucher.'}
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-stone-200 text-left text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-medium">Receipt No:</span>
                    <span className="font-mono font-bold text-amber-900">{nextReceiptPreview}</span>
                  </div>
                  <div className="flex justify-between border-t border-stone-100 pt-1 mt-1 font-bold">
                    <span className="text-stone-700">Payable Amount:</span>
                    <span className="text-emerald-800 font-mono text-sm">₹{amount.toLocaleString('en-IN')}/-</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-stone-200 text-center">
            <span className="text-[11px] text-stone-400">
              Once devotee has paid, click 'Confirm & Issue Receipt' on the left.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
