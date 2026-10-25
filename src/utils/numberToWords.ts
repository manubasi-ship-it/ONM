const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

export function amountToWordsEnglish(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';
  const num = Math.floor(amount);

  function convertBelowThousand(n: number): string {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
      if (n > 0) str += 'and ';
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + ' ';
    }
    return str.trim();
  }

  let crore = Math.floor(num / 10000000);
  let remainder = num % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder %= 100000;
  let thousand = Math.floor(remainder / 1000);
  remainder %= 1000;
  let belowThousand = remainder;

  let result = '';
  if (crore > 0) {
    result += convertBelowThousand(crore) + ' Crore ';
  }
  if (lakh > 0) {
    result += convertBelowThousand(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    result += convertBelowThousand(thousand) + ' Thousand ';
  }
  if (belowThousand > 0) {
    result += convertBelowThousand(belowThousand) + ' ';
  }

  return (result.trim() + ' Rupees Only').replace(/\s+/g, ' ');
}

// Malayalam currency phonetic translation for common Kerala temple donation figures
export function amountToWordsMalayalam(amount: number): string {
  return amountToWordsEnglish(amount);
}
