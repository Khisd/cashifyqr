# ⚡ Cashify QRIS Payment Gateway

Website pembayaran QRIS dinamis menggunakan **Cashify API**, siap deploy ke **GitHub + Vercel + Supabase**.

---

## 🗂 Struktur File

```
cashify-qr/
├── api/
│   ├── create-payment.js   → Generate QRIS & cek status
│   ├── webhook.js          → Terima notifikasi dari Cashify
│   └── products.js         → List produk (GET)
├── public/
│   └── index.html          → Frontend halaman bayar
├── supabase-schema.sql     → SQL untuk setup database
├── .env.example            → Template environment variables
├── package.json
├── vercel.json
└── README.md
```

---

## 🚀 Cara Deploy (Step by Step)

### 1️⃣ Siapkan Cashify

1. Login ke [cashify.my.id](https://cashify.my.id)
2. **Upload QRIS statis** kamu (DANA/OVO/ShopeePay/dll) → tunggu verifikasi
3. Salin **ID QRIS** yang muncul setelah verifikasi (format UUID)
4. Salin **License Key** dan **Webhook Secret** dari menu API Keys

### 2️⃣ Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com)
2. Buka **SQL Editor** → klik **New Query**
3. Copy-paste isi file `supabase-schema.sql` → klik **Run**
4. Buka **Settings → API** → salin:
   - `Project URL` → isi ke `SUPABASE_URL`
   - `service_role` key → isi ke `SUPABASE_SERVICE_KEY` (**bukan anon key!**)

### 3️⃣ Deploy ke Vercel via GitHub

```bash
# Clone / buat repo baru
git init
git add .
git commit -m "init cashify qr payment"

# Push ke GitHub
git remote add origin https://github.com/USERNAME/cashify-qr.git
git push -u origin main
```

1. Buka [vercel.com/new](https://vercel.com/new)
2. Import repo GitHub kamu
3. Di bagian **Environment Variables**, isi:

| Key | Value |
|-----|-------|
| `CASHIFY_LICENSE_KEY` | `cashify_1eda2268...` |
| `CASHIFY_WEBHOOK_SECRET` | `cashify_e729f8...` |
| `CASHIFY_QR_ID` | UUID QRIS dari dashboard Cashify |
| `SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | `eyJhbGci...` (service_role) |

4. Klik **Deploy** ✅

### 4️⃣ Daftarkan Webhook URL ke Cashify

Setelah deploy, masukkan URL ini ke dashboard Cashify:
```
https://NAMA_PROJECT.vercel.app/api/webhook
```

---

## 🔌 API Endpoints

| Method | URL | Fungsi |
|--------|-----|--------|
| `POST` | `/api/create-payment` | Generate QRIS baru |
| `GET`  | `/api/create-payment?transactionId=xxx` | Cek status transaksi |
| `POST` | `/api/webhook` | Menerima notifikasi Cashify |
| `GET`  | `/api/products` | List produk |

### POST `/api/create-payment`

**Request:**
```json
{
  "product_id": "prod_129",
  "buyer_name": "Budi Santoso",
  "buyer_email": "budi@email.com"
}
```

**product_id yang tersedia:**
- `prod_129` → Paket Starter (Rp 129.000)
- `prod_200` → Paket Pro (Rp 200.000)
- `prod_500` → Paket Ultimate (Rp 500.000)

**Response:**
```json
{
  "success": true,
  "transactionId": "5fd73e8b-...",
  "product": { "id": "prod_129", "name": "Paket Starter", "emoji": "🚀" },
  "originalAmount": 129000,
  "totalAmount": 129003,
  "uniqueNominal": 3,
  "qr_string": "000201010211...",
  "expiredInMinutes": 15
}
```

---

## 💡 Cara Kerja

```
User pilih produk
     ↓
POST /api/create-payment
     ↓
Cashify generate QRIS string (unik per transaksi)
     ↓
Frontend render QR dari qr_string (pakai qrcode.js)
     ↓
Polling GET /api/create-payment?transactionId=xxx setiap 4 detik
     ↓
User scan & bayar via e-wallet
     ↓
Cashify kirim webhook ke POST /api/webhook
     ↓
Status update di Supabase → frontend tampil "Berhasil"
```

---

## ⚠️ Penting

- `totalAmount` (bukan `originalAmount`) yang harus customer bayar
- `useUniqueCode: true` mencegah transaksi dengan nominal sama saling tubrukan
- Webhook Secret **jangan pernah** taruh di frontend / publik
- Gunakan **service_role** Supabase (bukan anon key) untuk API
- QR kedaluwarsa setelah 15 menit (bisa ubah `expiredInMinutes` di `api/create-payment.js`)

---

## 📦 Produk (Bisa Diubah)

Edit array `PRODUCTS` di `api/create-payment.js` dan `api/products.js`:

```js
const PRODUCTS = [
  { id: "prod_129", name: "Paket Starter",  price: 129000, emoji: "🚀" },
  { id: "prod_200", name: "Paket Pro",       price: 200000, emoji: "⚡" },
  { id: "prod_500", name: "Paket Ultimate",  price: 500000, emoji: "👑" },
];
```

---

Made with ❤️ using [Cashify](https://cashify.my.id) × Vercel × Supabase
