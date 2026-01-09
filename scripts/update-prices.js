/**
 * update-prices.js — PRODUZIONE
 * Aggiorna prezzo_corrente su Firestore usando Twelve Data
 * Collection: portafoglio
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
function twelveDataUrl(symbols) {
  return "https://api.twelvedata.com/price";
}

async function loadPrices(symbols) {
  if (!process.env.TWELVE_DATA_API_KEY) {
    throw new Error("❌ TWELVE_DATA_API_KEY mancante");
  }

  const prices = {};

  for (const symbol of symbols) {
    const resp = await axios.get(twelveDataUrl(), {
      params: {
        symbol,
        apikey: process.env.TWELVE_DATA_API_KEY,
      },
      timeout: 15000,
    });

    if (resp.data && resp.data.price) {
      prices[symbol] = parseFloat(resp.data.price);
    }
  }

  return prices;
}

// ================= MAIN =================
async function run() {
  console.log("🚀 Avvio aggiornamento prezzi azioni");

  const db = initFirestore();
  const snap = await db.collection("portafoglio").get();

  console.log(`📊 ${snap.size} strumenti in portafoglio`);

  const symbols = [];
  const docBySymbol = {};

  for (const doc of snap.docs) {
    const data = doc.data();
    const symbol = data.nome; // ⚠️ ticker = nome

    if (!symbol) {
      console.log(`⚠️ Documento senza nome: ${doc.id}`);
      continue;
    }

    symbols.push(symbol);
    docBySymbol[symbol] = doc;
  }

  if (!symbols.length) {
    console.log("⚠️ Nessun ticker valido, uscita");
    return;
  }

  console.log(`📡 Carico prezzi (${symbols.join(", ")})`);
  const prices = await loadPrices(symbols);

  for (const symbol of symbols) {
    const price = prices[symbol];
    if (!price) {
      console.log(`⚠️ Prezzo non disponibile per ${symbol}`);
      continue;
    }

    const doc = docBySymbol[symbol];
    console.log(`💰 ${symbol}: ${price}`);

    await doc.ref.update({
      prezzo_corrente: price,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  console.log("✅ Aggiornamento completato!");
}

run().catch((err) => {
  console.error("❌ ERRORE:", err.response?.data || err.message);
  process.exit(1);
});
