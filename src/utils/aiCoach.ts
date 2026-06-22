import type { Transaction } from '../hooks/useTransactions';
import type { Wallet } from './db';
import { formatRupiah } from './formatter';
import { parseIndonesianNumberWords, CATEGORIES } from './nlpParser';

export interface CoachResponse {
  answer: string;
  speechText: string;
  highlightedData?: any;
}

// Browser Text-To-Speech Synthesis helper in Indonesian
export const speakIndonesian = (text: string, onStart?: () => void, onEnd?: () => void): void => {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported in this browser.');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const cleanText = text
    .replace(/Rp\s*([\d.]+)/g, '$1 Rupiah') // Change "Rp 50.000" to "50.000 Rupiah" for natural speech
    .replace(/%/g, ' Persen');

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'id-ID';
  utterance.rate = 1.0;
  utterance.pitch = 1.05; // Friendly warm pitch

  // Try to find native Indonesian voice
  const voices = window.speechSynthesis.getVoices();
  const idVoice = voices.find(v => v.lang.includes('id') || v.lang.includes('ID'));
  if (idVoice) {
    utterance.voice = idVoice;
  }

  if (onStart) utterance.onstart = onStart;
  if (onEnd) utterance.onend = onEnd;

  window.speechSynthesis.speak(utterance);
};

// Stop any active speaking
export const stopSpeaking = (): void => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

// Local AI Coach reasoning engine (runs fully offline on local data)
export const getCoachResponse = (
  query: string,
  transactions: Transaction[],
  wallets: Wallet[],
  userName: string
): CoachResponse => {
  const cleanQuery = query.toLowerCase();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // 1. Calculate active month stats
  let totalIncome = 0;
  let totalExpense = 0;
  const categoryExpensesMap: Record<string, number> = {};

  transactions.forEach((t) => {
    const d = new Date(t.date);
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      if (t.type === 'pemasukan') {
        totalIncome += t.amount;
      } else {
        totalExpense += t.amount;
        categoryExpensesMap[t.category] = (categoryExpensesMap[t.category] || 0) + t.amount;
      }
    }
  });

  const netBalance = totalIncome - totalExpense;

  // 2. QUERY TYPE: Balance & General Stats (Saldo / Uang / Pemasukan / Pengeluaran)
  if (cleanQuery.includes('saldo') || cleanQuery.includes('uang saya') || cleanQuery.includes('sisa uang') || cleanQuery.includes('neraca')) {
    const answer = `Saldo bersih Kak ${userName} saat ini adalah **${formatRupiah(netBalance)}**.\n\nBulan ini Kakak mengantongi pemasukan sebesar **${formatRupiah(totalIncome)}** dan total belanja senilai **${formatRupiah(totalExpense)}**.`;
    const speechText = `Saldo bersih Kak ${userName} saat ini adalah ${formatRupiah(netBalance)}. Bulan ini, Kakak memiliki pemasukan ${formatRupiah(totalIncome)} dan total pengeluaran ${formatRupiah(totalExpense)}.`;
    return { answer, speechText };
  }

  // 3. QUERY TYPE: Tips Hemat & Recommendations (Tips / Hemat / Saran / Potong)
  if (cleanQuery.includes('tips') || cleanQuery.includes('hemat') || cleanQuery.includes('saran') || cleanQuery.includes('rekomendasi')) {
    const sortedExpenses = Object.entries(categoryExpensesMap).sort((a, b) => b[1] - a[1]);
    
    if (sortedExpenses.length === 0) {
      return {
        answer: 'Belum ada pengeluaran belanja tercatat bulan ini Kak, jadi kondisi keuangan Kakak masih aman 100%! Pertahankan gaya hidup hemat ini ya.',
        speechText: 'Belum ada pengeluaran belanja tercatat bulan ini Kak, jadi keuangan Kakak masih aman seratus persen! Pertahankan ya.'
      };
    }

    const [topCategory, topAmount] = sortedExpenses[0];
    const topPercent = totalExpense > 0 ? Math.round((topAmount / totalExpense) * 100) : 0;

    const tipsTemplates = [
      `Pengeluaran belanja terbesar Kak ${userName} ada pada kategori **${topCategory}** yaitu **${formatRupiah(topAmount)}** (${topPercent}% dari total belanja).\n\n💡 **Tips:** Coba batasi belanja di kategori ${topCategory} minggu ini. Membawa bekal sendiri atau menunda belanja non-primer bisa memotong pengeluaran hingga 200 ribu rupiah!`,
      `Kategori **${topCategory}** memakan porsi terbesar pengeluaran Kak ${userName} sebesar **${formatRupiah(topAmount)}**.\n\n💡 **Saran:** Coba gunakan teknik 50/30/20. Alokasikan maksimal 30% untuk keinginan. Kakak bisa hemat lebih banyak dengan membatasi jajan harian di kategori ini.`
    ];

    const randomIndex = Math.floor(Math.random() * tipsTemplates.length);
    return {
      answer: tipsTemplates[randomIndex],
      speechText: `Tips hemat untuk Kak ${userName}. Pengeluaran terbesar Kakak ada pada kategori ${topCategory} sebesar ${formatRupiah(topAmount)}, yaitu sekitar ${topPercent} persen dari seluruh belanja. Rekomendasi saya, coba batasi pengeluaran di kategori ini minggu ini untuk meningkatkan tabungan Anda.`
    };
  }

  // 4. QUERY TYPE: Wallet status / Kantong keuangan
  if (cleanQuery.includes('kantong') || cleanQuery.includes('dompet') || cleanQuery.includes('rekening') || cleanQuery.includes('wallet') || cleanQuery.includes('gopay') || cleanQuery.includes('shopee') || cleanQuery.includes('mandiri') || cleanQuery.includes('tunai')) {
    if (wallets.length === 0) {
      return {
        answer: 'Kakak belum memiliki dompet atau kantong keuangan tercatat. Tambahkan di halaman Kantong Uang!',
        speechText: 'Kakak belum memiliki dompet atau kantong keuangan tercatat.'
      };
    }

    // Check specific wallet queries
    let matchedWallet = null;
    for (const w of wallets) {
      const wName = w.name.toLowerCase();
      if (cleanQuery.includes(wName) || wName.includes(cleanQuery)) {
        matchedWallet = w;
        break;
      }
    }

    if (matchedWallet) {
      const bal = matchedWallet.balance || 0;
      const answer = `Saldo di kantong **${matchedWallet.name}** adalah **${formatRupiah(bal)}**.`;
      const speechText = `Saldo di kantong ${matchedWallet.name} adalah ${formatRupiah(bal)}.`;
      return { answer, speechText };
    }

    // Default: list all wallets
    const walletList = wallets.map(w => `* **${w.name}**: ${formatRupiah(w.balance || 0)}`).join('\n');
    const answer = `Berikut adalah rincian saldo di kantong keuangan Kak ${userName}:\n\n${walletList}\n\n*Total Saldo Bersih: ${formatRupiah(netBalance)}*`;
    const speechText = `Berikut rincian saldo kantong keuangan Anda. Total saldo bersih adalah ${formatRupiah(netBalance)}.`;
    return { answer, speechText };
  }

  // 5. QUERY TYPE: Price Simulation / Buying Advice (Bisa beli / Beli / Cukup / Cukup gak)
  if (cleanQuery.includes('beli') || cleanQuery.includes('cukup') || cleanQuery.includes('harga') || cleanQuery.includes('mampu')) {
    // Attempt to extract item price using number word parser
    const price = parseIndonesianNumberWords(cleanQuery);
    
    // Guess item name: strip standard phrase keywords
    let itemName = query
      .replace(/bisa\s+beli/gi, '')
      .replace(/beli/gi, '')
      .replace(/cukup\s+tidak/gi, '')
      .replace(/apakah\s+uang\s+saya\s+cukup\s+untuk/gi, '')
      .replace(/cukup\s+gak/gi, '')
      .replace(/harga/gi, '')
      .replace(/\b\d+\s*(ribu|juta|rb|jt|rupiah|rp)?\b/gi, '')
      .replace(/\b\d+([.,]\d+)?\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!itemName) itemName = 'barang tersebut';

    if (price <= 0) {
      return {
        answer: 'Kakak ingin membeli barang seharga berapa? Ucapkan harga barang secara spesifik agar saya bisa menghitung kelayakannya (Contoh: "Bisa tidak beli sepatu harga tiga ratus ribu?").',
        speechText: 'Kakak ingin membeli barang seharga berapa? Sebutkan nominal harganya secara spesifik agar saya bisa menghitungnya.'
      };
    }

    const remaining = netBalance - price;

    if (price > netBalance) {
      const diff = price - netBalance;
      const answer = `❌ **Keputusan: Tidak Direkomendasikan!**\n\nHarga **${itemName}** adalah **${formatRupiah(price)}**, sedangkan saldo Kakak saat ini hanya **${formatRupiah(netBalance)}**.\n\nUang Kakak kurang **${formatRupiah(diff)}**! Lebih baik tunda pembelian ini dan tabung sisa dana Kakak terlebih dahulu.`;
      const speechText = `Tidak direkomendasikan Kak ${userName}. Harga ${itemName} adalah ${formatRupiah(price)}, sedangkan saldo Kakak saat ini hanya ${formatRupiah(netBalance)}. Uang Kakak masih kurang sebesar ${formatRupiah(diff)}. Sebaiknya tunda pembelian ini.`;
      return { answer, speechText };
    }

    // Recommendation percentage bounds
    const safeBound = netBalance * 0.3; // Recommend not spending > 30% of total balance on a single discretionary item
    if (price > safeBound) {
      const answer = `⚠️ **Keputusan: Harus Dipertimbangkan!**\n\nHarga **${itemName}** sebesar **${formatRupiah(price)}** cukup untuk dibeli dengan saldo saat ini (**${formatRupiah(netBalance)}**).\n\nNamun, pembelian ini memakan lebih dari **30%** saldo bersih Kakak. Sisa saldo akan menjadi **${formatRupiah(remaining)}**. Pastikan barang ini benar-benar penting sebelum membeli!`;
      const speechText = `Harus dipertimbangkan kembali Kak ${userName}. Saldo Anda memang cukup untuk membeli ${itemName} seharga ${formatRupiah(price)}. Namun pembelian ini memakan lebih dari tiga puluh persen saldo Anda. Sisa saldo Kakak menjadi ${formatRupiah(remaining)}. Pastikan barang ini sangat penting sebelum membelinya.`;
      return { answer, speechText };
    }

    const answer = `✅ **Keputusan: Direkomendasikan!**\n\nHarga **${itemName}** adalah **${formatRupiah(price)}**. Saldo bersih Kakak saat ini **${formatRupiah(netBalance)}** sangat melimpah dan aman untuk membeli barang tersebut.\n\nSetelah membeli, sisa saldo Kakak menjadi **${formatRupiah(remaining)}**. Silakan dibeli Kak!`;
    const speechText = `Sangat direkomendasikan Kak ${userName}. Saldo Anda sangat melimpah untuk membeli ${itemName} seharga ${formatRupiah(price)}. Setelah membeli, sisa saldo Kakak masih aman di angka ${formatRupiah(remaining)}. Silakan dibeli!`;
    return { answer, speechText };
  }

  // 6. QUERY TYPE: Specific Category Expenditure
  for (const cat of CATEGORIES) {
    const isCategoryMatched = cat.keywords.some((kw: string) => cleanQuery.includes(kw));
    if (isCategoryMatched) {
      const spent = categoryExpensesMap[cat.name] || 0;
      const answer = `Untuk kategori **${cat.icon} ${cat.name}**, total belanja belanja Kak ${userName} bulan ini adalah **${formatRupiah(spent)}**.`;
      const speechText = `Untuk kategori ${cat.name}, total pengeluaran belanja Anda bulan ini adalah ${formatRupiah(spent)}.`;
      return { answer, speechText };
    }
  }

  // 7. DEFAULT FALLBACK
  const answer = `Halo Kak ${userName}! Saya adalah **VoiceCoach AI**, asisten keuangan pribadi lokal Anda. 🎙️\n\nKakak bisa bertanya kepada saya melalui suara mengenai hal berikut:\n* 💰 *"Berapa saldo saya?"*\n* 📱 *"Berapa saldo dompet Gopay saya?"*\n* 📈 *"Berapa pengeluaran kategori makan?"*\n* 🛍️ *"Uang saya cukup tidak untuk beli sepatu harga 300 ribu?"*\n* 💡 *"Beri saya tips hemat bulan ini"*`;
  const speechText = `Halo Kak ${userName}! Saya adalah VoiceCoach AI, asisten keuangan suara lokal Anda. Silakan tanya kepada saya mengenai saldo bersih, saldo kantong dompet digital, tips berhemat, atau simulasi kelayakan belanja barang.`;
  
  return { answer, speechText };
};
