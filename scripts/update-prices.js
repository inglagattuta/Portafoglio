/**
 * update-prices.js — PRODUZIONE
 * Aggiorna prezzo_corrente su Firestore (collezione: azioni)
 * Fonte ticker: azioni (doc.id)
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

// ================= TWELVE DATA =================
async function loadPrices(symbols) {
  if (!process.env.TWELVE_DATA_API_KEY) {
    throw new Error("❌ TWELVE_DATA_API_KEY mancante");
  }

  const prices = {};

  for (const symbol of symbols) {
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
  }

  return prices;
}

// ================= MAIN =================
async function run() {
  console.log("🚀 Avvio aggiornamento prezzi (azioni)");

  const db = initFirestore();
  const snap = await db.collection("azioni").get();

  console.log(`📊 ${snap.size} azioni trovate`);

  const symbols = snap.docs.map((doc) => doc.id);

  if (!symbols.length) {
    console.log("⚠️ Nessun ticker trovato, uscita");
    return;
  }

  console.log(`📡 Carico prezzi (${symbols.join(", ")})`);
  const prices = await loadPrices(symbols);

  for (const symbol of symbols) {
    const price = prices[symbol];
    if (!price) continue;

    await db
      .collection("azioni")
      .document(symbol)
      .set(
        {
          ticker: symbol,
          prezzo_corrente: price,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    console.log(`💰 ${symbol} → ${price}`);
  }

  console.log("✅ Aggiornamento completato!");
}

run().catch((err) => {
  console.error("❌ ERRORE:", err.response?.data || err.message);
  process.exit(1);
});
