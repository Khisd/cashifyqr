-- ============================================================
-- CASHIFY QR PAYMENT — Supabase SQL Schema
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Buat tabel utama transaksi
CREATE TABLE IF NOT EXISTS transactions (
  id               BIGSERIAL PRIMARY KEY,
  transaction_id   TEXT UNIQUE NOT NULL,
  product_id       TEXT NOT NULL,
  product_name     TEXT NOT NULL,
  original_amount  INTEGER NOT NULL,
  total_amount     INTEGER NOT NULL,
  unique_nominal   INTEGER DEFAULT 0,
  qr_string        TEXT,
  buyer_name       TEXT,
  buyer_email      TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',
  -- status bisa: pending | paid | expired | cancel
  paid_at          TIMESTAMPTZ,
  expired_at       TIMESTAMPTZ,
  webhook_payload  JSONB,
  updated_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Index untuk performa lookup
CREATE INDEX IF NOT EXISTS idx_txn_transaction_id ON transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_txn_status         ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_txn_created_at     ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_txn_buyer_email    ON transactions(buyer_email);

-- 3. Row Level Security — hanya bisa diakses oleh service_role
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Blokir semua akses publik (anon key)
DROP POLICY IF EXISTS "deny_public" ON transactions;
CREATE POLICY "deny_public" ON transactions
  AS RESTRICTIVE
  USING (false)
  WITH CHECK (false);

-- 4. Fungsi otomatis update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- VERIFIKASI: Jalankan query ini untuk pastikan tabel siap
-- ============================================================
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'transactions' ORDER BY ordinal_position;

-- ============================================================
-- CONTOH DATA MANUAL (untuk testing)
-- ============================================================
-- INSERT INTO transactions (transaction_id, product_id, product_name, original_amount, total_amount, unique_nominal, qr_string, buyer_name, status, expired_at)
-- VALUES ('TEST-001', 'prod_129', 'Paket Starter', 129000, 129003, 3, 'DUMMY_QR_STRING', 'Budi Test', 'pending', NOW() + INTERVAL '15 minutes');

-- ============================================================
-- LIHAT SEMUA TRANSAKSI
-- ============================================================
-- SELECT transaction_id, product_name, total_amount, status, buyer_name, created_at
-- FROM transactions ORDER BY created_at DESC LIMIT 50;
