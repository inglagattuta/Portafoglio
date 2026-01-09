/**
 * update-prices.js — PRODUZIONE DEFINITIVA
 * Provider:
 *  - Twelve Data (primary)
 *  - Yahoo Finance (fallback)
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

// ================= OVERRIDES =================
const YAHOO_OVERRIDES = {
  GOOG: "GOOGL",
};

// ================= SYMBOL NORMALIZATION =================
function symbolForTwelve(raw) {
  if (!raw) return null;
  return raw.includes(":") ? raw.split(":")[1] : raw;
}

function symbolForYahoo(raw) {
  if (!raw) return null;

  let sym = raw.replace(/^NASDAQ:|^NYSE:|^OSE:/, "");

  if (YAHOO_OVERRIDES[sym]) {
    return YAHOO_OVERRIDES[sym];
  }

  return sym;
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

    const twelveSymbol = symbolForTwelve(rawSymbol);
    const yahooSymbol = symbolForYahoo(rawSymbol);

    let price = await getPriceFromTwelve(twelveSymbol);
    let source = "TwelveData";

    if (!price) {
      price = await getPriceFromYahoo(yahooSymbol);
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
