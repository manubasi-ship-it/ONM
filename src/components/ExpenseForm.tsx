import React, { useState, useEffect } from 'react';
import {
  Transaction,
  Setting,
  UserProfile,
  ExpenseType,
  CommitteeMember,
} from '../types';
import { generateNextReceiptNumber } from '../utils/receiptGenerator';
import { MinusCircle, CheckCircle, FileText, User, IndianRupee, UserCheck } from 'lucide-react';

interface ExpenseFormProps {
  transactions: Transaction[];
  setting: Setting;
  currentUser: UserProfile;
  expenseTypes: ExpenseType[];
  committeeMembers: CommitteeMember[];
  onSaveTransaction: (tx: Transaction) => void;
  onSelectReceipt: (tx: Transaction) => void;
  onCancel: () => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  transactions,
  setting,
  currentUser,
  expenseTypes,
  committeeMembers,
  onSaveTransaction,
  onSelectReceipt,
  onCancel,
}) => {
  const [payee, setPayee] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');

  // Active expense types
  const activeExpenseTypes = expenseTypes.filter((e) => e.active);
  const defaultCategory =
    activeExpenseTypes.length > 0
      ? `${activeExpenseTypes[0].nameMalayalam} (${activeExpenseTypes[0].nameEnglish})`
      : '';
  const [category, setCategory] = useState(defaultCategory);

  useEffect(() => {
    if (activeExpenseTypes.length > 0 && !category) {
      setCategory(`${activeExpenseTypes[0].nameMalayalam} (${activeExpenseTypes[0].nameEnglish})`);
    }
  }, [activeExpenseTypes, category]);


  // Active committee members


  const [amount, setAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'bank_transfer'>('cash');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedAmount = parseFloat(amount);
    if (!payee.trim()) {
      setErrorMsg('Please enter payee or vendor name');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid expense amount');
      return;
    }

    const nextReceipt = generateNextReceiptNumber(transactions, setting.festivalYear);
    const nowIso = new Date().toISOString();

    const newTx: Transaction = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      receiptNo: nextReceipt,
      type: 'expense',
      category: category,
      amount: parsedAmount,
      donorOrPayee: payee.trim(),
      phone: phone.trim(),
      location: location.trim(),
      paymentMode: paymentMode,
      status: 'completed',
      notes: notes.trim(),
      collectedBy: currentUser.displayName ? `${currentUser.displayName} (${currentUser.role})` : 'Sangam Committee',
      collectedByRole: currentUser.role,
      createdAt: nowIso,
      updatedAt: nowIso,
      synced: true,
    };

    onSaveTransaction(newTx);
    onSelectReceipt(newTx);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-md border border-red-100 overflow-hidden">
      <div className="bg-linear-to-r from-red-950 via-red-900 to-amber-950 px-6 py-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <MinusCircle className="w-6 h-6 text-red-300" />
          <div>
            <h2 className="font-extrabold text-lg">
              Record Festival Expense
            </h2>
            <p className="text-xs text-red-200">
              Pooja items, Kavadi decor, Melam artists, Annadanam, Lighting, Stage
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-red-700" />
            <span>Payee or Vendor Name *</span>
          </label>
          <input
            type="text"
            required
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
            placeholder="e.g. Velayudhan Crafts / Sri Krishna Stores"
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-red-600/40 text-sm font-medium"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
              <span>Expense Head *</span>
              <span className="text-[10px] text-red-700 font-medium">
                {activeExpenseTypes.length > 0 ? 'Master Category' : 'Custom Category'}
              </span>
            </label>
            {activeExpenseTypes.length > 0 ? (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-red-600/40 text-xs font-bold text-stone-800 bg-stone-50"
              >
                <option value="">-- Select Expense Type --</option>
                {activeExpenseTypes.map((exp) => {
                  const val = exp.nameEnglish || exp.nameMalayalam;
                  return (
                    <option key={exp.id} value={val}>
                      {val}
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
                placeholder="Enter expense head (e.g. Pooja Items, Lighting, Annadanam)"
                className="w-full px-3 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-red-600/40 text-xs font-bold text-stone-800 bg-white"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
              <IndianRupee className="w-3.5 h-3.5 text-red-700" />
              <span>Amount (₹) *</span>
            </label>
            <input
              type="number"
              required
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-red-600/40 text-base font-bold font-mono text-stone-900"
            />
          </div>
        </div>

        {/* Authorized by Currently Logged-in User (Auto-attributed) */}
        <div className="p-3 bg-red-50/70 rounded-xl border border-red-200/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-red-100 text-red-900 shrink-0">
              <UserCheck className="w-4 h-4 text-red-800" />
            </div>
            <div>
              <div className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">
                Authorized by User
              </div>
              <div className="font-extrabold text-stone-900 flex items-center gap-2">
                <span>{currentUser.displayName}</span>
                <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded-md bg-red-200 text-red-950 font-bold border border-red-300">
                  {currentUser.role}
                </span>
              </div>
            </div>
          </div>
          <span className="text-[10px] text-red-800 bg-red-100/60 border border-red-200 px-2 py-0.5 rounded-full font-bold">
            ✓ Logged-in
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Contact Phone Number (Optional)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Vendor Phone"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-red-600/40 text-xs font-medium font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Shop / Vendor Location (Optional)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Near Temple East Gate"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-red-600/40 text-xs font-medium"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1.5">
            Payment Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['cash', 'upi', 'bank_transfer'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPaymentMode(mode)}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  paymentMode === mode
                    ? 'bg-red-900 text-white border-red-900 shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
                }`}
              >
                {mode === 'cash' ? 'Cash' : mode === 'upi' ? 'UPI' : 'Bank Transfer'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-stone-500" />
            <span>Description & Bill Reference (Optional)</span>
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Item details, bill reference number..."
            className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-red-600/40 text-xs"
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-linear-to-r from-red-800 to-red-950 hover:from-red-900 hover:to-stone-900 transition shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4 text-red-300" />
            <span>Save Expense Record</span>
          </button>
        </div>
      </form>
    </div>
  );
};
