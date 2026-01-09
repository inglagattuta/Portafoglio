/**
 * update-prices.js — PRODUZIONE
 * Aggiorna prezzo_corrente su Firestore (collezione: azioni)
 * Fonte ticker: azioni (symbol_api || doc.id)
 * Provider prezzi: Twelve Data
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
async function loadPrices(symbols) {
  if (!process.env.TWELVE_DATA_API_KEY) {
    throw new Error("❌ TWELVE_DATA_API_KEY mancante");
  }

  const prices = {};

  for (const symbol of symbols) {
    try {
      const resp = await axios.get("https://api.twelvedata.com/price", {
        params: {
          symbol,
          apikey: process.env.TWELVE_DATA_API_KEY,
        },
        timeout: 15000,
      });

      if (resp.data?.price) {
        prices[symbol] = parseFloat(resp.data.price);
      } else {
        console.log(`⚠️ Prezzo non disponibile per ${symbol}`);
      }
    } catch (err) {
      console.log(`❌ Errore API per ${symbol}`);
    }
  }

  return prices;
}

// ================= MAIN =================
async function run() {
  console.log("🚀 Avvio aggiornamento prezzi (azioni)");

  const db = initFirestore();
  const snap = await db.collection("azioni").get();

  console.log(`📊 ${snap.size} azioni trovate`);

  if (snap.empty) {
    console.log("⚠️ Nessuna azione trovata, uscita");
    return;
  }

  // Mappa: docId ↔ symbol API normalizzato
  const symbolMap = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const rawSymbol = data.symbol_api || doc.id;
    const apiSymbol = normalizeSymbol(rawSymbol);

    if (!apiSymbol) {
      console.log(`⚠️ Symbol non valido per ${doc.id}`);
      continue;
    }

    symbolMap.push({
      docId: doc.id,
      apiSymbol,
    });
  }

  const apiSymbols = symbolMap.map((s) => s.apiSymbol);

  console.log(`📡 Carico prezzi (${apiSymbols.join(", ")})`);
  const prices = await loadPrices(apiSymbols);

  for (const { docId, apiSymbol } of symbolMap) {
    const price = prices[apiSymbol];
    if (!price) continue;

    await db
      .collection("azioni")
      .doc(docId)
      .set(
        {
          prezzo_corrente: price,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    console.log(`💰 ${docId} → ${price}`);
  }

  console.log("✅ Aggiornamento completato!");
}

run().catch((err) => {
  console.error("❌ ERRORE:", err.response?.data || err.message);
  process.exit(1);
});
