/**
 * update-prices.js — PRODUZIONE
 * Prezzi azioni con fallback automatico:
 * - Twelve Data (primary)
 * - Yahoo Finance (fallback)
 */

const axios = require("axios");
const admin = require("firebase-admin");

// ================= FIREBASE =================
function initFirestore() {
  const serviceAccount = JSON.parse(process.env.FIREBASE_KEY_JSON);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  return admin.firestore();
}

// ================= SYMBOL NORMALIZATION =================

// Twelve Data NON vuole NASDAQ:
function normalizeForTwelve(symbol) {
  if (!symbol) return null;
  return symbol.includes(":") ? symbol.split(":")[1] : symbol;
}

// Yahoo VUOLE ticker realistico (OL, -A, ecc.)
function normalizeForYahoo(symbol) {
  if (!symbol) return null;
  return symbol.replace(/^NASDAQ:|^NYSE:|^OSE:/, "");
}

// ================= TWELVE DATA =================
async function getPriceFromTwelve(symbol) {
  try {
    const resp = await axios.get("https://api.twelvedata.com/price", {
      params: {
        symbol,
        apikey: process.env.TWELVE_DATA_API_KEY,
      },
      timeout: 15000,
    });

    if (resp.data?.price) {
      return parseFloat(resp.data.price);
    }
  } catch (_) {}

  return null;
}

// ================= YAHOO =================
async function getPriceFromYahoo(symbol) {
  try {
    const resp = await axios.get(
      "https://query1.finance.yahoo.com/v7/finance/quote",
      {
        params: { symbols: symbol },
        timeout: 15000,
      }
    );

    const q = resp.data?.quoteResponse?.result?.[0];
    if (q?.regularMarketPrice != null) {
      return parseFloat(q.regularMarketPrice);
    }
  } catch (_) {}

  return null;
}

// ================= MAIN =================
async function run() {
  console.log("🚀 Avvio aggiornamento prezzi (azioni)");

  const db = initFirestore();
  const snap = await db.collection("azioni").get();

  console.log(`📊 ${snap.size} azioni trovate`);

  for (const doc of snap.docs) {
    const data = doc.data();
    const rawSymbol = data.symbol_api || doc.id;

    const symbolTwelve = normalizeForTwelve(rawSymbol);
    const symbolYahoo = normalizeForYahoo(rawSymbol);

    let price = await getPriceFromTwelve(symbolTwelve);
    let source = "TwelveData";

    if (!price) {
      price = await getPriceFromYahoo(symbolYahoo);
      source = "Yahoo";
    }

    if (!price) {
      console.log(`⚠️ Prezzo NON trovato per ${doc.id}`);
      continue;
    }

    await db.collection("azioni").doc(doc.id).set(
      {
        prezzo_corrente: price,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        price_source: source,
      },
      { merge: true }
    );

    console.log(`💰 ${doc.id} → ${price} (${source})`);
  }

  console.log("✅ Aggiornamento completato!");
}

run().catch((err) => {
  console.error("❌ ERRORE:", err.message);
  process.exit(1);
});
