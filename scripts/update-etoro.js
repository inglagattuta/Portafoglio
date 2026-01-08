/**
 * update-etoro.js — versione finale PRODUZIONE
 * Aggiorna prezzo_corrente su Firestore usando eToro /Live
 * Collection: portafoglio
 */

const axios = require("axios");
const admin = require("firebase-admin");

// ================= CONFIG =================
const ETORO_BASE = "https://api.etoro.com";
const LIVE_ENDPOINT = (ids) =>
  `${ETORO_BASE}/Live?InstrumentIds=${ids.join(",")}`;

// ================= FIREBASE =================
function initFirestore() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error("❌ FIREBASE_SERVICE_ACCOUNT mancante");
  }

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIRESTORE_PROJECT_ID || serviceAccount.project_id,
  });

  return admin.firestore();
}

// ================= ETORO =================
function etoroHeaders() {
  if (!process.env.ETORO_SUBSCRIPTION_KEY) {
    throw new Error("❌ ETORO_SUBSCRIPTION_KEY mancante");
  }

  return {
    "Ocp-Apim-Subscription-Key": process.env.ETORO_SUBSCRIPTION_KEY,
    Accept: "application/json",
  };
}

// ================= LIVE PRICES =================
async function loadLivePrices(instrumentIds) {
  const resp = await axios.get(LIVE_ENDPOINT(instrumentIds), {
    headers: etoroHeaders(),
    timeout: 20000,
  });

  const prices = {};
  for (const r of resp.data) {
    prices[r.instrumentId] = (r.bid + r.ask) / 2;
  }

  return prices;
}

// ================= MAIN =================
async function run() {
  console.log("🚀 Avvio aggiornamento portafoglio eToro");

  const db = initFirestore();
  const snap = await db.collection("portafoglio").get();

  console.log(`📊 ${snap.size} strumenti in portafoglio`);

  const instrumentIds = [];
  const docById = {};

  for (const doc of snap.docs) {
    const data = doc.data();
    const id = data.instrumentId;

    if (!id) {
      console.log(`⚠️ Nessun instrumentId per ${data.nome}`);
      continue;
    }

    instrumentIds.push(id);
    docById[id] = doc;
  }

  if (!instrumentIds.length) {
    console.log("⚠️ Nessun instrumentId valido, uscita");
    return;
  }

  console.log(`📡 Carico prezzi live (${instrumentIds.length})`);
  const prices = await loadLivePrices(instrumentIds);

  for (const id of instrumentIds) {
    const price = prices[id];
    if (!price) {
      console.log(`⚠️ Prezzo non disponibile per ${id}`);
      continue;
    }

    const doc = docById[id];
    console.log(`💰 ${doc.data().nome}: ${price}`);

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
