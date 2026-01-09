/**
 * update-prices.js — PRODUZIONE
 * Aggiorna prezzo_corrente su Firestore (collezione: azioni)
 * Provider:
 *  - Primary: Twelve Data
 *  - Fallback: Yahoo Finance
 */

const axios = require("axios");
const admin = require("firebase-admin");

// ================= FIREBASE =================
function initFirestore() {
  if (!process.env.FIREBASE_KEY_JSON) {
    throw new Error("❌ FIREBASE_KEY_JSON mancante");
  }

  const serviceAccount = JSON.parse(process.env.FIREBASE_KEY_JSON);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  return admin.firestore();
}

// ================= UTILS =================
function normalizeSymbol(symbol) {
  if (!symbol) return null;

  // NASDAQ:AAPL → AAPL
  if (symbol.includes(":")) {
    return symbol.split(":")[1];
  }

  return symbol;
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
  } catch (err) {
    // silenzioso → fallback
  }

  return null;
}

// ================= YAHOO FINANCE =================
async function getPriceFromYahoo(symbol) {
  try {
    const resp = await axios.get(
      `https://query1.finance.yahoo.com/v7/finance/quote`,
      {
        params: { symbols: symbol },
        timeout: 15000,
      }
    );

    const result = resp.data?.quoteResponse?.result?.[0];
    if (result?.regularMarketPrice != null) {
      return parseFloat(result.regularMarketPrice);
    }
  } catch (err) {
    // silenzioso
  }

  return null;
}

// ================= MAIN =================
async function run() {
  console.log("🚀 Avvio aggiornamento prezzi (azioni)");

  const db = initFirestore();
  const snap = await db.collection("azioni").get();

  console.log(`📊 ${snap.size} azioni trovate`);

  if (snap.empty) {
    console.log("⚠️ Nessuna azione trovata");
    return;
  }

  for (const doc of snap.docs) {
    const data = doc.data();
    const rawSymbol = data.symbol_api || doc.id;
    const symbol = normalizeSymbol(rawSymbol);

    if (!symbol) {
      console.log(`⚠️ Symbol non valido per ${doc.id}`);
      continue;
    }

    let price = await getPriceFromTwelve(symbol);
    let source = "TwelveData";

    if (!price) {
      price = await getPriceFromYahoo(symbol);
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
