import { Transaction } from '../types';

export function generateNextReceiptNumber(
  transactions: Transaction[],
  festivalYear: string = '2026'
): string {
  const prefix = `OKS-${festivalYear}-`;
  
  // Find highest serial number among existing transactions
  let maxSeq = 0;
  for (const t of transactions) {
    if (t.receiptNo && t.receiptNo.startsWith(prefix)) {
      const part = t.receiptNo.substring(prefix.length);
      const parsed = parseInt(part, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
}
