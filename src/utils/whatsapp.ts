import { Transaction, ReceiptVoucher, Setting } from '../types';

export function isReceiptVoucher(item: unknown): item is ReceiptVoucher {
  return (
    typeof item === 'object' &&
    item !== null &&
    'receipt_no' in item &&
    'amount_received' in item
  );
}

export function formatReceiptVoucherWhatsAppMessage(
  voucher: ReceiptVoucher,
  setting: Setting
): string {
  const formattedDate = new Date(voucher.date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return `🙏 *${setting.sangamNameEnglish}* 🙏
Thaipooyam Festival ${setting.festivalYear}

Dear *${voucher.name}* (${voucher.house_name}, ${voucher.place || 'ONAMPILLY'}),
Thank you for your valuable contribution towards Onampilly Kavadi Sangam.

━━━━━━━━━━━━━━━━━━━
🧾 *Receipt Book No:* *${voucher.receipt_no}*
🔖 *Voucher ID:* *${voucher.transaction_no}*
💰 *Amount Received:* *₹${voucher.amount_received.toLocaleString('en-IN')}/-*
💳 *Payment Mode:* ${voucher.payment_mode}
${voucher.amount_committed ? `📋 *Total Committed:* ₹${voucher.amount_committed.toLocaleString('en-IN')}/-\n` : ''}📉 *Remaining Balance:* ₹${(voucher.balance ?? 0).toLocaleString('en-IN')}/-
📅 *Date:* ${formattedDate}
👤 *Collected By:* ${voucher.amount_collected_by}
━━━━━━━━━━━━━━━━━━━

${setting.welcomeMessage || 'May Lord Muruga shower divine blessings upon you and your family.'}

Om Saravana Bhavaya Namaha
Inquiries: ${setting.contactPhone}`;
}

export function formatWhatsAppMessage(tx: Transaction, setting: Setting): string {
  const isIncome = tx.type === 'income';
  const formattedDate = new Date(tx.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = new Date(tx.createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const paymentModeLabel =
    tx.paymentMode === 'upi' ? 'UPI (Google Pay / PhonePe / Paytm)' :
    tx.paymentMode === 'cash' ? 'Cash' : 'Bank Transfer';

  if (isIncome) {
    return `🙏 *${setting.sangamNameEnglish}* 🙏
Thaipooyam Festival ${setting.festivalYear}

Dear *${tx.donorOrPayee}*${tx.location ? ` (${tx.location})` : ''},
Thank you for your generous offering and contribution to Onampilly Kavadi Sangam Thaipooyam Festival.

━━━━━━━━━━━━━━━━━━━
🧾 *Receipt No:* *${tx.receiptNo}*
💰 *Amount:* *₹${tx.amount.toLocaleString('en-IN')}/-*
🏷️ *Offering / Category:* ${tx.category}
💳 *Payment Mode:* ${paymentModeLabel}
📅 *Date:* ${formattedDate} (${formattedTime})
👤 *Received By:* ${tx.collectedBy}
━━━━━━━━━━━━━━━━━━━

${setting.welcomeMessage || 'May Lord Muruga shower divine blessings, peace, and prosperity upon you and your family.'}

🔱 *Om Saravana Bhavaya Namaha* 🔱
For inquiries: ${setting.contactPhone}`;
  } else {
    return `📋 *${setting.sangamNameEnglish}*
Festival Expense Voucher
Receipt No: ${tx.receiptNo}
Amount: ₹${tx.amount.toLocaleString('en-IN')}/-
Category: ${tx.category}
Payee: ${tx.donorOrPayee}
Date: ${formattedDate}
Recorded By: ${tx.collectedBy}`;
  }
}

export function generateWhatsAppLink(
  item: Transaction | ReceiptVoucher,
  setting: Setting,
  overridePhone?: string
): string {
  const isVoucher = isReceiptVoucher(item);
  const phoneVal = overridePhone ?? (item as { phone?: string; mobile?: string }).phone ?? (item as { phone?: string; mobile?: string }).mobile ?? '';
  const cleanPhone = String(phoneVal).replace(/\D/g, '');
  
  const message = isVoucher
    ? formatReceiptVoucherWhatsAppMessage(item, setting)
    : formatWhatsAppMessage(item, setting);
  const encodedText = encodeURIComponent(message);

  if (cleanPhone.length >= 10) {
    // Add 91 country code if 10-digit Indian mobile number
    const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    return `https://wa.me/${finalPhone}?text=${encodedText}`;
  }

  // If no phone number provided, allow direct sharing link
  return `https://wa.me/?text=${encodedText}`;
}
