# 💰 FinanceVoice — Personal Finance PWA

## Project Overview

**FinanceVoice** adalah aplikasi manajemen keuangan pribadi berbasis web yang dapat diinstall di smartphone (PWA) dan berjalan sepenuhnya offline. Keunggulan utama: input transaksi menggunakan **suara** — cukup bicara, otomatis tercatat.

---

## 🎯 Problem Statement

Kebanyakan orang malas catat keuangan karena:
- Ribet buka aplikasi & ngetik manual
- Lupa detail transaksi setelah beberapa waktu
- Aplikasi terlalu kompleks untuk kebutuhan harian

**Solusi:** App yang semudah ngobrol. Buka → tekan mic → ngomong → selesai.

---

## 👤 Target Pengguna

- Mahasiswa & fresh graduate yang mulai manage keuangan
- Pekerja yang ingin tracking pengeluaran harian
- Siapapun yang butuh catatan keuangan simpel di HP

---

## 🧩 Fitur Detail

### 📌 1. Dashboard (`/`)
```
┌─────────────────────────┐
│  Halo, Put 👋           │
│  Mei 2026               │
│                         │
│  ┌───────────────────┐  │
│  │  Saldo Bersih     │  │
│  │  Rp 4.250.000     │  │
│  └───────────────────┘  │
│                         │
│  [+ Pemasukan] [- Keluar]│
│                         │
│  Grafik Mingguan        │
│  ▇▇▁▃▅▇▂               │
│                         │
│  Transaksi Terbaru      │
│  • Gaji      +3.5jt     │
│  • Makan     -25rb      │
└─────────────────────────┘
```

**Komponen:**
- Header greeting + tanggal
- Card saldo total (besar, prominent)
- Summary card: total pemasukan & pengeluaran bulan ini
- Bar chart mingguan (Recharts)
- List 5 transaksi terakhir dengan icon kategori
- Quick action button: tambah pemasukan / pengeluaran

---

### 📌 2. Input Transaksi (`/add`)
```
┌─────────────────────────┐
│  Tambah Transaksi       │
│                         │
│  [PEMASUKAN] [PENGELUARAN]│
│                         │
│  Nominal                │
│  Rp _______________     │
│                         │
│  Kategori               │
│  🍔 🚗 🛒 💊 🏠 ✈️    │
│                         │
│  Catatan (opsional)     │
│  _______________        │
│                         │
│  Tanggal                │
│  23 Mei 2026            │
│                         │
│  ┌─────────────────┐    │
│  │  🎤  Tekan Mic  │    │
│  └─────────────────┘    │
│                         │
│  [SIMPAN TRANSAKSI]     │
└─────────────────────────┘
```

**Komponen:**
- Toggle Pemasukan / Pengeluaran
- Input nominal (angka, format Rupiah otomatis)
- Grid kategori dengan emoji & label
- Input catatan
- Date picker
- **Tombol Mic (fitur utama):**
  - Tekan → animasi pulse merah
  - Bicara → transkripsi real-time muncul di layar
  - Selesai → NLP parse → form terisi otomatis
  - User review & konfirmasi
- Button simpan

**Kategori tersedia:**
| Icon | Nama | Tipe Default |
|------|------|-------------|
| 🍔 | Makan & Minum | Pengeluaran |
| 🚗 | Transport | Pengeluaran |
| 🛒 | Belanja | Pengeluaran |
| 💊 | Kesehatan | Pengeluaran |
| 🏠 | Rumah & Tagihan | Pengeluaran |
| 📱 | Digital & Langganan | Pengeluaran |
| 🎮 | Hiburan | Pengeluaran |
| 📚 | Pendidikan | Pengeluaran |
| 💰 | Gaji | Pemasukan |
| 💸 | Freelance | Pemasukan |
| 🎁 | Hadiah | Pemasukan |
| 📈 | Investasi | Pemasukan |

---

### 📌 3. Riwayat Transaksi (`/history`)
```
┌─────────────────────────┐
│  Riwayat                │
│  🔍 [Cari transaksi...] │
│                         │
│  Filter: [Semua▼][Mei▼] │
│                         │
│  — 23 Mei 2026 ——————  │
│  🍔 Makan Siang  -25rb  │
│  🚗 Grab         -18rb  │
│                         │
│  — 22 Mei 2026 ——————  │
│  💰 Gaji      +3.500rb  │
│  🛒 Alfamart     -85rb  │
│                         │
│  [Muat lebih banyak]    │
└─────────────────────────┘
```

**Komponen:**
- Search bar full-text
- Filter dropdown: kategori, bulan, tipe (in/out)
- List grouped by tanggal
- Tiap item: icon, nama, nominal, waktu
- **Swipe kiri → delete** (mobile gesture)
- Tap item → modal edit
- Infinite scroll / load more
- Empty state kalau tidak ada data

---

### 📌 4. Laporan (`/report`)
```
┌─────────────────────────┐
│  Laporan  [Mei 2026 ▼]  │
│                         │
│  Pemasukan  Rp 3.500.000│
│  Pengeluaran Rp 1.250.000│
│  Tabungan   Rp 2.250.000│
│                         │
│  Pengeluaran per Kategori│
│     🍔 35%              │
│    ╭───╮  🚗 20%        │
│    │ ● │  🛒 18%        │
│    ╰───╯  🏠 15%        │
│           lainnya 12%   │
│                         │
│  Tren 6 Bulan           │
│  ╱╲  ╱╲ ╱              │
│ ╱  ╲╱  ╲╱              │
└─────────────────────────┘
```

**Komponen:**
- Dropdown pilih bulan/tahun
- Summary card 3 kolom: in/out/net
- Donut chart pengeluaran per kategori (Recharts)
- Line chart tren 6 bulan (pemasukan vs pengeluaran)
- Tabel ranking kategori tertinggi
- Insight otomatis: "Bulan ini belanja naik 20% dari bulan lalu"

---

### 📌 5. Budget (`/budget`)
```
┌─────────────────────────┐
│  Budget  Mei 2026       │
│  [+ Tambah Budget]      │
│                         │
│  🍔 Makan & Minum       │
│  Rp 450rb / Rp 500rb    │
│  ████████████░░  90%    │
│  ⚠️ Hampir habis!       │
│                         │
│  🚗 Transport           │
│  Rp 120rb / Rp 300rb    │
│  ████░░░░░░░░░░  40%    │
│                         │
│  🛒 Belanja             │
│  Rp 85rb / Rp 200rb     │
│  ██░░░░░░░░░░░░  42%    │
└─────────────────────────┘
```

**Komponen:**
- Card per kategori dengan progress bar
- Warna progress: hijau (< 70%) → kuning (70-90%) → merah (> 90%)
- Status label: Aman / Hampir Habis / Melebihi Budget
- Tombol tambah / edit budget
- Modal set budget: pilih kategori, input nominal

---

### 📌 6. Pengaturan (`/settings`)
```
┌─────────────────────────┐
│  Pengaturan             │
│                         │
│  Profil                 │
│  Nama: Put              │
│  Mata Uang: IDR (Rp)    │
│                         │
│  Data                   │
│  [Export JSON]          │
│  [Import JSON]          │
│  [Reset Semua Data]     │
│                         │
│  Tentang                │
│  FinanceVoice v1.0      │
│  PWA: Terinstall ✅     │
│  Offline: Aktif ✅      │
│                         │
│  [Install ke HP]        │
└─────────────────────────┘
```

---

## 🗣️ Voice Input — Cara Kerja

### Flow Diagram
```
Tekan Tombol Mic
       │
       ▼
Web Speech API aktif
(bahasa: id-ID)
       │
       ▼
User berbicara...
"beli makan siang dua puluh lima ribu"
       │
       ▼
Transkripsi real-time → tampil di layar
       │
       ▼
NLP Parser (lokal, tanpa API)
       │
  ┌────┴────┐
  │         │
Deteksi   Deteksi
Nominal   Kategori
"25.000"  "Makan"
  │         │
  └────┬────┘
       │
       ▼
Form terisi otomatis
Tipe: Pengeluaran
Nominal: 25.000
Kategori: Makan & Minum
Catatan: "makan siang"
       │
       ▼
User review & tekan Simpan
```

### Kamus Angka (NLP)
```javascript
// Contoh mapping teks → angka
"satu"        → 1
"sepuluh"     → 10
"dua puluh"   → 20
"seratus"     → 100
"seribu"      → 1000
"dua juta"    → 2.000.000
"lima ratus ribu" → 500.000
```

### Keyword Kategori
```javascript
{
  "Makan": ["makan", "minum", "kopi", "resto", "warung", "nasi", "bakso"],
  "Transport": ["grab", "gojek", "bensin", "parkir", "busway", "toll"],
  "Belanja": ["alfamart", "indomaret", "beli", "shopee", "tokopedia"],
  "Gaji": ["gaji", "salary", "upah", "transfer masuk"],
  "Tagihan": ["listrik", "pln", "air", "pdam", "internet"],
  ...
}
```

---

## 🎨 Desain System

### Warna (Single Color: Emerald Green)
```
Primary-950: #052e16  → teks gelap
Primary-800: #166534  → card header
Primary-600: #16a34a  → elemen aktif
Primary-500: #22c55e  → brand utama / CTA
Primary-400: #4ade80  → highlight
Primary-100: #dcfce7  → background card
Primary-50:  #f0fdf4  → background app
White:       #ffffff  → surface card
```

### Tipografi
```
Font: Plus Jakarta Sans (Google Fonts)

Display (saldo):  700 weight, 2.5rem
Heading:          600 weight, 1.25rem  
Body:             400 weight, 0.875rem
Caption:          400 weight, 0.75rem
```

### Spacing & Layout
```
Max width:     430px (mobile frame)
Bottom nav:    64px height + safe area
Corner radius: 16px (card), 12px (button), 50% (icon)
Shadow:        0 4px 24px rgba(0,0,0,0.08)
```

### Komponen Reusable
- `<Card />` — container putih rounded
- `<CategoryIcon />` — emoji dalam circle berwarna
- `<AmountText />` — format Rupiah
- `<ProgressBar />` — animated, warna dinamis
- `<MicButton />` — animated pulse saat aktif
- `<BottomNav />` — 5 tab navigasi
- `<Modal />` — slide-up dari bawah

---

## 🛠️ Tech Stack Detail

### Dependencies
```json
{
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "recharts": "^2.x",
  "lucide-react": "^0.x"
}
```

### Dev Dependencies
```json
{
  "vite": "^6.x",
  "@vitejs/plugin-react": "^4.x",
  "@tailwindcss/vite": "^4.x",
  "tailwindcss": "^4.x"
}
```

### Struktur File
```
finance-app/
├── public/
│   ├── manifest.json          ← PWA manifest
│   ├── sw.js                  ← Service Worker
│   ├── icon-192.png           ← App icon
│   └── icon-512.png           ← App icon
├── src/
│   ├── components/
│   │   ├── BottomNav.jsx
│   │   ├── MicButton.jsx
│   │   ├── TransactionItem.jsx
│   │   ├── CategoryGrid.jsx
│   │   ├── BudgetCard.jsx
│   │   └── Modal.jsx
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── AddTransaction.jsx
│   │   ├── History.jsx
│   │   ├── Report.jsx
│   │   ├── Budget.jsx
│   │   └── Settings.jsx
│   ├── hooks/
│   │   ├── useVoiceInput.js   ← Web Speech API hook
│   │   ├── useTransactions.js ← CRUD + localStorage
│   │   └── useBudget.js
│   ├── utils/
│   │   ├── nlpParser.js       ← Voice → transaksi
│   │   ├── formatter.js       ← Format Rupiah, tanggal
│   │   └── storage.js         ← localStorage helpers
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── vite.config.js
└── package.json
```

---

## 📱 PWA Spec

### manifest.json
```json
{
  "name": "FinanceVoice",
  "short_name": "Finance",
  "start_url": "./",
  "display": "standalone",
  "theme_color": "#22c55e",
  "background_color": "#f0fdf4",
  "orientation": "portrait"
}
```

### Service Worker Strategy
```
App Shell:     Cache-first (HTML, CSS, JS)
Data:          localStorage (no network needed)
Icons/Fonts:   Cache-first
```

### Offline Behavior
- ✅ Semua fitur jalan tanpa internet
- ✅ Data tersimpan di device
- ✅ Grafik & laporan tetap muncul
- ✅ Voice input tetap jalan (Web Speech API = browser-native)

---

## 🚀 Build & Deploy

```bash
# Development
npm run dev

# Build production
npm run build

# Preview build
npm run preview

# Deploy ke Vercel / Netlify / GitHub Pages
# → upload folder dist/
```

---

## 📋 Development Checklist

### Phase 1 — Core
- [ ] Setup Vite + React + Tailwind v4
- [ ] Layout & BottomNav
- [ ] localStorage CRUD
- [ ] Dashboard + dummy data

### Phase 2 — Fitur Utama
- [ ] Form tambah transaksi manual
- [ ] Voice input + NLP parser
- [ ] Riwayat + filter + search

### Phase 3 — Analitik
- [ ] Recharts: bar, donut, line
- [ ] Budget tracker
- [ ] Laporan bulanan

### Phase 4 — PWA
- [ ] manifest.json
- [ ] Service Worker
- [ ] Offline fallback
- [ ] Install prompt

### Phase 5 — Polish
- [ ] Animasi & transisi
- [ ] Empty states
- [ ] Error handling voice
- [ ] Export/import data

---

> **Estimasi kode:** ~2.500–3.500 baris  
> **Estimasi waktu build:** 15–20 menit  
> **Kompatibilitas voice:** Chrome Android, Edge, Safari iOS 15+

---

