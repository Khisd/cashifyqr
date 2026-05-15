// api/products.js
// GET → list semua produk yang tersedia

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const products = [
    {
      id: "prod_129",
      name: "Paket Starter",
      price: 129000,
      priceFormatted: "Rp 129.000",
      emoji: "🚀",
      desc: "Cocok untuk pemula",
      features: ["Akses 30 hari", "1 pengguna", "Support email"],
    },
    {
      id: "prod_200",
      name: "Paket Pro",
      price: 200000,
      priceFormatted: "Rp 200.000",
      emoji: "⚡",
      desc: "Untuk kebutuhan profesional",
      features: ["Akses 60 hari", "3 pengguna", "Priority support", "Analytics"],
    },
    {
      id: "prod_500",
      name: "Paket Ultimate",
      price: 500000,
      priceFormatted: "Rp 500.000",
      emoji: "👑",
      desc: "Fitur lengkap tanpa batas",
      features: ["Akses 1 tahun", "Unlimited pengguna", "Dedicated support", "API access", "Custom domain"],
    },
  ];

  return res.status(200).json({ success: true, products });
}
