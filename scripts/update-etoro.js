/**
 * update-etoro.js — eToro Live API
 * Aggiorna prezzi strumenti eToro in Firestore
 */

const axios = require("axios");
const admin = require("firebase-admin");

// ENDPOINT LIVE ETORO
const ETORO_LIVE = "https://api.etoro.com/Live";

// FIREBASE INIT
function initFirestore() {
  let serviceAccount;

  if (process.env.FIREBASE_KEY_BASE64) {
    serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_KEY_BASE64, "base64").toString("utf8")
    );
  } else if (process.env.FIREBASE_KEY_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_KEY_JSON);
  } else {
    throw new Error("❌ Nessuna chiave Firebase trovata");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return admin.firestore();
}

// CARICA PREZZI LIVE
async function loadLivePrices(instrumentIds) {
  const resp = await axios.post(ETORO_LIVE, {
    InstrumentIDs: instrumentIds,
    IsGroup: false,
  });

  const prices = {};
  for (const item of resp.data?.Rates || []) {
    if (item.InstrumentID && item.Ask && item.Bid) {
      prices[item.InstrumentID] = (item.Ask + item.Bid) / 2;
    }
  }

  return prices;
}

// MAIN
async function run() {
  console.log("🚀 Avvio aggiornamento portafoglio eToro");

  const db = initFirestore();
  const snap = await db.collection("portafoglio").get();

  console.log(`📊 ${snap.size} strumenti in portafoglio`);

  const ids = [];
  const docById = {};

  for (const doc of snap.docs) {
    const { nome, instrumentId } = doc.data();

    if (!instrumentId) {
      console.log(`⚠️ Nessun instrumentId per ${nome}`);
      continue;
    }

    ids.push(instrumentId);
    docById[instrumentId] = doc;
  }

  if (!ids.length) {
    console.log("❌ Nessun instrumentId valido, uscita");
    return;
  }

  console.log(`📡 Carico prezzi live (${ids.length})`);
  const prices = await loadLivePrices(ids);

  for (const id of ids) {
    const price = prices[id];
    if (!price) continue;

    const doc = docById[id];
    console.log(`💰 ${doc.data().nome}: ${price}`);

    await doc.ref.update({
      prezzo_corrente: price,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  console.log("✅ Aggiornamento completato con successo!");
}

run().catch((err) => {
  console.error("❌ ERRORE:", err.response?.data || err.message);
  process.exit(1);
});
