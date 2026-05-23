// Local NLP parser for voice transcription -> Transaction Form in Indonesian

export interface ParsedTransaction {
  type: 'pemasukan' | 'pengeluaran';
  amount: number;
  category: string;
  note: string;
}

export const CATEGORIES = [
  { id: 'makan', name: 'Makan & Minum', icon: '🍔', type: 'pengeluaran', keywords: ['makan', 'minum', 'kopi', 'resto', 'warung', 'nasi', 'bakso', 'mie', 'sate', 'jajan', 'cemilan', 'burger', 'pizza', 'kuliner', 'sarapan', 'lunch', 'dinner', 'teh', 'es', 'susu', 'cafe', 'kafe', 'starbucks', 'gacoan'] },
  { id: 'transport', name: 'Transport', icon: '🚗', type: 'pengeluaran', keywords: ['grab', 'gojek', 'bensin', 'parkir', 'busway', 'toll', 'tol', 'ojek', 'taxi', 'taksi', 'kereta', 'tiket', 'commuter', 'mrt', 'lrt', 'pertalite', 'pertamax', 'shell', 'angkot', 'travel'] },
  { id: 'belanja', name: 'Belanja', icon: '🛒', type: 'pengeluaran', keywords: ['alfamart', 'indomaret', 'beli', 'shopee', 'tokopedia', 'belanja', 'supermarket', 'mall', 'kaos', 'baju', 'celana', 'sepatu', 'tas', 'superindo', 'tokopedia', 'lazada', 'tiktok shop', 'hijab'] },
  { id: 'kesehatan', name: 'Kesehatan', icon: '💊', type: 'pengeluaran', keywords: ['obat', 'apotek', 'dokter', 'sakit', 'klinik', 'vitamin', 'rs', 'rumah sakit', 'sehat', 'paracetamol', 'panadol', 'saraf', 'gigi', 'periksa'] },
  { id: 'tagihan', name: 'Rumah & Tagihan', icon: '🏠', type: 'pengeluaran', keywords: ['listrik', 'pln', 'air', 'pdam', 'internet', 'wifi', 'sewa', 'kontrakan', 'kos', 'indihome', 'bpjs', 'token', 'pajak', 'ipl'] },
  { id: 'digital', name: 'Digital & Langganan', icon: '📱', type: 'pengeluaran', keywords: ['netflix', 'spotify', 'youtube', 'premium', 'cloud', 'langganan', 'pulsa', 'kuota', 'game', 'topup', 'steam', 'mobile legend', 'google play', 'apple'] },
  { id: 'hiburan', name: 'Hiburan', icon: '🎮', type: 'pengeluaran', keywords: ['nonton', 'bioskop', 'cinema', 'liburan', 'jalanjalan', 'karaoke', 'game', 'playstation', 'steam', 'rekreasi', 'wisata', 'dufan', 'pantai'] },
  { id: 'pendidikan', name: 'Pendidikan', icon: '📚', type: 'pengeluaran', keywords: ['buku', 'kuliah', 'spp', 'kursus', 'seminar', 'alat tulis', 'sekolah', 'les', 'udemy', 'skripsi', 'fotokopi'] },
  { id: 'gaji', name: 'Gaji', icon: '💰', type: 'pemasukan', keywords: ['gaji', 'salary', 'upah', 'transfer masuk', 'kantor', 'bulanan', 'payroll'] },
  { id: 'freelance', name: 'Freelance', icon: '💸', type: 'pemasukan', keywords: ['freelance', 'proyek', 'project', 'sampingan', 'klien', 'client', 'nulis', 'desain', 'coding', 'komisi', 'jasa'] },
  { id: 'hadiah', name: 'Hadiah', icon: '🎁', type: 'pemasukan', keywords: ['hadiah', 'gift', 'giveaway', 'angpao', 'thr', 'kado', 'give away', 'sedekah masuk'] },
  { id: 'investasi', name: 'Investasi', icon: '📈', type: 'pemasukan', keywords: ['investasi', 'saham', 'reksadana', 'crypto', 'kripto', 'dividen', 'untung', 'profit', 'cuan', 'emas', 'bibit'] }
];

const INDO_NUMBERS: Record<string, number> = {
  'nol': 0, 'kosong': 0,
  'satu': 1, 'se': 1,
  'dua': 2,
  'tiga': 3,
  'empat': 4,
  'lima': 5,
  'enam': 6,
  'tujuh': 7,
  'delapan': 8,
  'sembilan': 9,
  'sepuluh': 10,
  'sebelas': 11,
  'belas': 10,
  'puluh': 10,
  'ratus': 100,
  'ribu': 1000, 'rb': 1000,
  'juta': 1000000, 'jt': 1000000,
  'rupiah': 1, 'rp': 1
};

// Converts Indonesian number words like "dua puluh lima ribu" or "satu juta lima ratus ribu" to numbers
export const parseIndonesianNumberWords = (text: string): number => {
  const cleanText = text.toLowerCase()
    .replace(/[,.]/g, '') // Remove thousands separators
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Try to find direct digit strings (e.g. "25000", "150000")
  const digitMatch = cleanText.match(/\b\d+\b/);
  if (digitMatch && !cleanText.includes('juta') && !cleanText.includes('ribu') && !cleanText.includes('ratus') && !cleanText.includes('jt') && !cleanText.includes('rb')) {
    return parseInt(digitMatch[0], 10);
  }

  // 2. Handle hybrid numbers like "25 ribu", "1.5 juta", "2,5jt", "50rb"
  const hybridMatch = cleanText.match(/(\d+([.,]\d+)?)\s*(ribu|juta|rb|jt)/gi);
  if (hybridMatch) {
    let total = 0;
    const regex = /(\d+([.,]\d+)?)\s*(ribu|juta|rb|jt)/gi;
    let match;
    while ((match = regex.exec(cleanText)) !== null) {
      const numStr = match[1].replace(',', '.');
      const val = parseFloat(numStr);
      const unit = match[3].toLowerCase();
      
      let multiplier = 1;
      if (unit === 'ribu' || unit === 'rb') multiplier = 1000;
      if (unit === 'juta' || unit === 'jt') multiplier = 1000000;
      
      total += val * multiplier;
    }
    return total;
  }

  // 3. Process fully written Indonesian number words
  const words = cleanText.split(' ');
  let totalAmount = 0;
  let currentTemp = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Check if the word is in our number map or starts with 'se'
    let val = INDO_NUMBERS[word];
    let isSePrefix = false;

    if (val === undefined) {
      if (word.startsWith('se') && word.length > 2) {
        const root = word.slice(2);
        if (INDO_NUMBERS[root] !== undefined) {
          val = INDO_NUMBERS[root];
          isSePrefix = true;
        } else if (root === 'puluh' || root === 'ratus' || root === 'ribu' || root === 'juta') {
          // e.g. "sepuluh", "seratus", "seribu", "sejuta"
          val = root === 'puluh' ? 10 : root === 'ratus' ? 100 : root === 'ribu' ? 1000 : 1000000;
          isSePrefix = true;
        }
      }
    }

    if (val === undefined) continue;

    if (word === 'rupiah' || word === 'rp') {
      continue;
    }

    if (word === 'puluh' || (isSePrefix && word === 'sepuluh')) {
      if (currentTemp === 0) currentTemp = 1;
      currentTemp = currentTemp * 10;
    } else if (word === 'belas' || word === 'sebelas') {
      if (currentTemp === 0) currentTemp = 1;
      currentTemp = currentTemp + 10;
    } else if (word === 'ratus' || (isSePrefix && word === 'seratus')) {
      if (currentTemp === 0) currentTemp = 1;
      currentTemp = currentTemp * 100;
    } else if (word === 'ribu' || word === 'rb' || (isSePrefix && word === 'seribu')) {
      if (currentTemp === 0) currentTemp = 1;
      totalAmount += currentTemp * 1000;
      currentTemp = 0;
    } else if (word === 'juta' || word === 'jt' || (isSePrefix && word === 'sejuta')) {
      if (currentTemp === 0) currentTemp = 1;
      totalAmount += currentTemp * 1000000;
      currentTemp = 0;
    } else {
      // It's a digit word (satu, dua, tiga, etc.)
      if (isSePrefix) {
        currentTemp = val;
      } else {
        currentTemp = val;
      }
    }
  }

  totalAmount += currentTemp;
  return totalAmount;
};

// Main NLP Parser function
export const parseVoiceInput = (transcript: string): ParsedTransaction => {
  const cleanTranscript = transcript.toLowerCase();

  // 1. Detect Amount
  const amount = parseIndonesianNumberWords(cleanTranscript);

  // 2. Detect Type (default to 'pengeluaran' unless 'pemasukan' indicators are found)
  let type: 'pemasukan' | 'pengeluaran' = 'pengeluaran';
  const incomeKeywords = [
    'gaji', 'terima', 'dapat', 'masuk', 'upah', 'freelance', 'project masuk', 'proyek', 
    'hadiah', 'thr', 'angpao', 'transfer masuk', 'cuan', 'untung', 'dividen', 'dibayar'
  ];
  
  const hasIncomeKeyword = incomeKeywords.some(keyword => cleanTranscript.includes(keyword));
  if (hasIncomeKeyword) {
    type = 'pemasukan';
  }

  // 3. Detect Category
  let detectedCategory = type === 'pemasukan' ? 'Gaji' : 'Makan & Minum'; // standard defaults
  let bestScore = 0;

  for (const category of CATEGORIES) {
    let score = 0;
    for (const keyword of category.keywords) {
      if (cleanTranscript.includes(keyword)) {
        score += keyword.length; // score based on match length to prefer longer exact matches
      }
    }
    if (score > bestScore) {
      bestScore = score;
      detectedCategory = category.name;
    }
  }

  // 4. Extract Description / Note
  // We want to extract what the transaction was. E.g. "beli makan siang dua puluh ribu" -> "makan siang"
  // Let's strip out numbers, currency terms, filler words, and action verbs.
  let note = transcript;
  
  // List of words to strip from the note
  const stopwords = [
    'beli', 'bayar', 'terima', 'dapat', 'masuk', 'keluar', 'buat', 'untuk', 'rupiah', 'rp',
    'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh',
    'sebelas', 'dua belas', 'puluh', 'ratus', 'ribu', 'juta', 'rb', 'jt', 'nominal', 'sebesar',
    'sebanyak', 'harga', 'harganya'
  ];

  // Also remove exact number patterns
  note = note.replace(/\b\d+\s*(ribu|juta|rb|jt|rupiah|rp)?\b/gi, '');
  note = note.replace(/\b\d+([.,]\d+)?\b/g, '');

  // Strip stopwords
  let noteWords = note.toLowerCase().split(/\s+/);
  noteWords = noteWords.filter(w => !stopwords.includes(w) && w.length > 1);

  if (noteWords.length > 0) {
    // Capitalize first letter of note
    const cleanNote = noteWords.join(' ');
    note = cleanNote.charAt(0).toUpperCase() + cleanNote.slice(1);
  } else {
    // Fallback note if everything is stripped
    note = type === 'pemasukan' ? `Pemasukan ${detectedCategory}` : `Pengeluaran ${detectedCategory}`;
  }

  return {
    type,
    amount: amount || 0,
    category: detectedCategory,
    note
  };
};
