import QRCode from 'qrcode';

export interface UPIPaymentDetails {
  vpa: string;
  name: string;
  amount: number;
  note?: string;
  transactionRef?: string;
  mcc?: string;
}

/**
 * Validates UPI ID format (e.g. username@bank, store@upi, mobile@okaxis)
 */
export function validateUPIId(upiId: string): boolean {
  if (!upiId) return false;
  const regex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9]{2,64}$/;
  return regex.test(upiId.trim());
}

/**
 * Builds valid NPCI standard UPI payment URI
 * Example: upi://pay?pa=onampillykavadi@sbi&pn=ONAMPILLY%20KAVADI%20SANGAM&am=501&cu=INR&tn=Kavadi%20Offering
 */
export function generateUPIUri(details: UPIPaymentDetails): string {
  const params = new URLSearchParams();
  params.append('pa', details.vpa.trim());
  params.append('pn', details.name.trim());
  params.append('am', details.amount.toFixed(2));
  params.append('cu', 'INR');
  if (details.note) {
    params.append('tn', details.note.trim());
  }
  if (details.transactionRef) {
    params.append('tr', details.transactionRef.trim());
  }
  if (details.mcc && details.mcc.trim()) {
    params.append('mc', details.mcc.trim());
  }
  return `upi://pay?${params.toString()}`;
}

/**
 * Generates Base64 Data URL for QR Code using qrcode package
 */
export async function generateUPIQRCode(details: UPIPaymentDetails): Promise<string> {
  const uri = generateUPIUri(details);
  try {
    return await QRCode.toDataURL(uri, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
      color: {
        dark: '#7f1d1d', // Deep Kerala Temple Maroon / Kumkumam color
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate UPI QR Code:', err);
    throw err;
  }
}
