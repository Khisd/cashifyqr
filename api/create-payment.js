// api/create-payment.js
// POST  → generate QRIS baru
// GET   → cek status transaksi (?transactionId=xxx)

import { createClient } from "@supabase/supabase-js";

const LICENSE_KEY   = process.env.CASHIFY_LICENSE_KEY;
const QR_ID         = process.env.CASHIFY_QR_ID;
const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_KEY;

const PRODUCTS = [
  { id: "prod_129", name: "Paket Starter",  price: 129000, emoji: "🚀", desc: "Cocok untuk pemula" },
  { id: "prod_200", name: "Paket Pro",       price: 200000, emoji: "⚡", desc: "Untuk kebutuhan profesional" },
  { id: "prod_500", name: "Paket Ultimate",  price: 500000, emoji: "👑", desc: "Fitur lengkap tanpa batas" },
];

function supabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// ─── GET: cek status ──────────────────────────────────────────────────────────
async function handleGet(req, res) {
  const { transactionId } = req.query;
  if (!transactionId) return res.status(400).json({ error: "transactionId diperlukan" });

  try {
    // Cek status langsung ke Cashify
    const cashifyRes = await fetch("https://cashify.my.id/api/generate/check-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-license-key": LICENSE_KEY,
      },
      body: JSON.stringify({ transactionId }),
    });
    const data = await cashifyRes.json();

    // Update Supabase jika paid
    if (data?.data?.status === "paid" || data?.data?.status === "success") {
      const db = supabase();
      await db
        .from("transactions")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("transaction_id", transactionId);
    }

    return res.status(200).json({
      transactionId,
      status: data?.data?.status ?? "unknown",
      amount: data?.data?.amount,
      expiredAt: data?.data?.expiredAt,
    });
  } catch (err) {
    return res.status(500).json({ error: "Gagal cek status", detail: err.message });
  }
}

// ─── POST: buat transaksi baru ────────────────────────────────────────────────
async function handlePost(req, res) {
  const { product_id, buyer_name, buyer_email } = req.body || {};

  const product = PRODUCTS.find((p) => p.id === product_id);
  if (!product) {
    return res.status(400).json({ error: "Produk tidak ditemukan", available: PRODUCTS.map(p => p.id) });
  }

  if (!QR_ID || QR_ID === "GANTI_DENGAN_ID_QRIS_DARI_DASHBOARD") {
    return res.status(500).json({ error: "CASHIFY_QR_ID belum diisi di environment variable!" });
  }

  try {
    // Generate QRIS via Cashify v1
    const cashifyRes = await fetch("https://cashify.my.id/api/generate/qris", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-license-key": LICENSE_KEY,
      },
      body: JSON.stringify({
        id: QR_ID,
        amount: product.price,
        useUniqueCode: true,
        packageIds: ["id.dana"],      // sesuaikan e-wallet kamu
        expiredInMinutes: 15,
      }),
    });

    const cashifyData = await cashifyRes.json();

    if (!cashifyData?.data?.transactionId) {
      return res.status(502).json({
        error: "Cashify gagal generate transaksi",
        detail: cashifyData,
      });
    }

    const {
      transactionId,
      qr_string,
      originalAmount,
      totalAmount,
      uniqueNominal,
    } = cashifyData.data;

    // Simpan ke Supabase
    const db = supabase();
    await db.from("transactions").insert({
      transaction_id: transactionId,
      product_id: product.id,
      product_name: product.name,
      original_amount: originalAmount,
      total_amount: totalAmount,
      unique_nominal: uniqueNominal,
      qr_string,
      buyer_name: buyer_name || null,
      buyer_email: buyer_email || null,
      status: "pending",
      expired_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });

    return res.status(200).json({
      success: true,
      transactionId,
      product: {
        id: product.id,
        name: product.name,
        emoji: product.emoji,
      },
      originalAmount,
      totalAmount,
      uniqueNominal,
      qr_string,
      expiredInMinutes: 15,
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error", detail: err.message });
  }
}

// ─── Handler utama ────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method === "GET")  return handleGet(req, res);
  if (req.method === "POST") return handlePost(req, res);
  return res.status(405).json({ error: "Method not allowed" });
}
