import type { Wallet } from './db';

interface ParsedNotification {
  type: 'pemasukan' | 'pengeluaran';
  amount: number;
  note: string;
  walletId: string;
  category: string;
}

export const parseNotificationText = (text: string, wallets: Wallet[]): ParsedNotification | null => {
  if (!text) return null;
  const lowercaseText = text.toLowerCase();
  
  // 1. Detect Amount
  // Matches "Rp 50.000", "Rp.50.000", "Rp50000", "50,000", etc.
  const rpRegex = /(?:rp|rp\.|idr)?\s*(\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+)/i;
  const matchAmount = lowercaseText.match(rpRegex);
  let amount = 0;
  if (matchAmount && matchAmount[1]) {
    // Clean up dots and commas. E.g. "50.000" -> 50000
    const rawVal = matchAmount[1].replace(/\./g, '').replace(/,/g, '.');
    amount = parseFloat(rawVal) || 0;
  }

  if (amount === 0) {
    // Try generic number sequence
    const numRegex = /\b(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d{4,})\b/;
    const altMatch = lowercaseText.match(numRegex);
    if (altMatch && altMatch[1]) {
      const rawVal = altMatch[1].replace(/\./g, '').replace(/,/g, '.');
      amount = parseFloat(rawVal) || 0;
    }
  }

  if (amount === 0) return null;

  // 2. Detect Type (Pemasukan / Pengeluaran)
  let type: 'pemasukan' | 'pengeluaran' = 'pengeluaran'; // Default to expense
  const incomeKeywords = [
    'masuk', 'kredit', 'tambah', 'terima', 'diterima', 'dr', 'dari', 'received', 'credited', 'inbound', 'deposit'
  ];
  const expenseKeywords = [
    'debet', 'debit', 'bayar', 'dibayar', 'transfer keluar', 'ke', 'kirim', 'sent', 'debited', 'payment', 'pembayaran', 'belanja'
  ];

  let incomeScore = 0;
  let expenseScore = 0;

  incomeKeywords.forEach(kw => {
    if (lowercaseText.includes(kw)) incomeScore++;
  });

  expenseKeywords.forEach(kw => {
    if (lowercaseText.includes(kw)) expenseScore++;
  });

  if (incomeScore > expenseScore) {
    type = 'pemasukan';
  }

  // 3. Detect Wallet/Account
  let matchedWallet = wallets[0]; // Default to first wallet (Cash)
  
  for (const w of wallets) {
    const wName = w.name.toLowerCase();
    // E.g. if text contains "mandiri", choose Bank Mandiri wallet
    if (lowercaseText.includes(wName) || wName.includes(lowercaseText)) {
      matchedWallet = w;
      break;
    }
  }

  // If no direct name match, try detecting general wallet types in the text
  if (matchedWallet === wallets[0]) {
    if (lowercaseText.includes('gopay') || lowercaseText.includes('go-pay')) {
      const gopayWallet = wallets.find(w => w.name.toLowerCase().includes('gopay'));
      if (gopayWallet) matchedWallet = gopayWallet;
    } else if (lowercaseText.includes('shopee') || lowercaseText.includes('spay')) {
      const shopeeWallet = wallets.find(w => w.name.toLowerCase().includes('shopee') || w.name.toLowerCase().includes('spay'));
      if (shopeeWallet) matchedWallet = shopeeWallet;
    } else if (lowercaseText.includes('mandiri') || lowercaseText.includes('livin')) {
      const mandiriWallet = wallets.find(w => w.name.toLowerCase().includes('mandiri'));
      if (mandiriWallet) matchedWallet = mandiriWallet;
    } else if (lowercaseText.includes('rekening') || lowercaseText.includes('bank') || lowercaseText.includes('transfer')) {
      const bankWallet = wallets.find(w => w.type === 'bank');
      if (bankWallet) matchedWallet = bankWallet;
    }
  }

  // 4. Parse Note/Recipient
  let note = '';
  // Look for patterns like "ke [Vendor]", "dr [Sender]", "pembayaran [Item]"
  const keRegex = /(?:ke|untuk|bayar|payment to)\s+([a-z0-9\s\-]+?)(?:\s+berhasil|\s+sebesar|\.|$)/i;
  const drRegex = /(?:dari|dr|from)\s+([a-z0-9\s\-]+?)(?:\s+sebesar|\.|$)/i;
  
  const matchKe = text.match(keRegex);
  const matchDr = text.match(drRegex);

  if (type === 'pengeluaran' && matchKe && matchKe[1]) {
    note = matchKe[1].trim();
  } else if (type === 'pemasukan' && matchDr && matchDr[1]) {
    note = matchDr[1].trim();
  }

  // Fallback notes
  if (!note) {
    if (lowercaseText.includes('tokopedia')) note = 'Tokopedia';
    else if (lowercaseText.includes('shopee')) note = 'Shopee';
    else if (lowercaseText.includes('alfamart')) note = 'Alfamart';
    else if (lowercaseText.includes('indomaret')) note = 'Indomaret';
    else if (lowercaseText.includes('gojek') || lowercaseText.includes('gofood')) note = 'Gojek';
    else if (lowercaseText.includes('grab')) note = 'Grab';
    else {
      // Just extract a segment of text
      note = type === 'pemasukan' ? 'Transfer Masuk' : 'Transaksi Keluar';
    }
  }

  // Limit note length and capitalize
  note = note.substring(0, 30);
  note = note.charAt(0).toUpperCase() + note.slice(1);

  // 5. Deduce category
  let category = type === 'pemasukan' ? 'Gaji & Pendapatan' : 'Lain-lain';
  if (type === 'pengeluaran') {
    const foodKeywords = ['food', 'makan', 'kopi', 'kenangan', 'cafe', 'resto', 'warung', 'indomaret', 'alfamart'];
    const transportKeywords = ['gojek', 'grab', 'ojek', 'transport', 'taxi', 'bensin', 'pertamina'];
    const billKeywords = ['listrik', 'pln', 'wifi', 'pulsa', 'telepon', 'subscription', 'netflix', 'spotify'];
    const shoppingKeywords = ['tokopedia', 'shopee', 'lazada', 'belanja', 'mall', 'baju'];

    const lowerNote = note.toLowerCase();
    if (foodKeywords.some(k => lowercaseText.includes(k) || lowerNote.includes(k))) category = 'Makanan & Minuman';
    else if (transportKeywords.some(k => lowercaseText.includes(k) || lowerNote.includes(k))) category = 'Transportasi';
    else if (billKeywords.some(k => lowercaseText.includes(k) || lowerNote.includes(k))) category = 'Tagihan & Utilitas';
    else if (shoppingKeywords.some(k => lowercaseText.includes(k) || lowerNote.includes(k))) category = 'Belanja';
  }

  return {
    type,
    amount,
    note,
    walletId: matchedWallet.id,
    category
  };
};
