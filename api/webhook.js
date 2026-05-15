// api/webhook.js
// Menerima notifikasi pembayaran dari Cashify
// Verifikasi dengan HMAC-SHA256 menggunakan webhook secret

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const WEBHOOK_SECRET = process.env.CASHIFY_WEBHOOK_SECRET;
const SUPABASE_URL   = process.env.SUPABASE_URL;
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // ── Verifikasi Signature Webhook ──────────────────────────────
  const signature = 
    req.headers["x-cashify-signature"] ||
    req.headers["x-webhook-signature"] ||
    req.headers["x-signature"];

  if (WEBHOOK_SECRET && signature) {
    const rawBody = JSON.stringify(req.body);
    const expected = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (signature !== expected) {
      console.warn("[Webhook] Signature tidak valid!", { received: signature, expected });
      return res.status(401).json({ error: "Invalid signature" });
    }
  }

  // ── Proses Payload ────────────────────────────────────────────
  const body = req.body;
  console.log("[Webhook] Received:", JSON.stringify(body));

  const transactionId = body?.transactionId || body?.transaction_id;
  const rawStatus     = body?.status || body?.payment_status;
  const paid_at       = body?.paid_at || body?.paidAt || new Date().toISOString();

  if (!transactionId) {
    return res.status(400).json({ error: "transactionId tidak ditemukan di payload" });
  }

  const isPaid = ["paid", "success", "completed"].includes(String(rawStatus).toLowerCase());

  try {
    const db = createClient(SUPABASE_URL, SUPABASE_KEY);

    const updateData = {
      status: isPaid ? "paid" : rawStatus,
      webhook_payload: body,
      updated_at: new Date().toISOString(),
    };
    if (isPaid) updateData.paid_at = paid_at;

    const { error } = await db
      .from("transactions")
      .update(updateData)
      .eq("transaction_id", transactionId);

    if (error) {
      console.error("[Webhook] Supabase error:", error);
      return res.status(500).json({ error: "Database error" });
    }

    console.log(`[Webhook] Transaksi ${transactionId} → ${updateData.status}`);
    return res.status(200).json({ received: true, transactionId, status: updateData.status });
  } catch (err) {
    console.error("[Webhook] Error:", err);
    return res.status(500).json({ error: "Server error", detail: err.message });
  }
}
