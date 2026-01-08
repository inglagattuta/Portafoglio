/**
 * update-etoro.js — versione finale corretta
 * Collection: portafoglio
 * Ticker nel campo: nome (es. AAPL)
 */

const axios = require("axios");
const admin = require("firebase-admin");

// =======================
// CONFIG ETORO
// =======================
const ETORO_BASE = "https://api.etoro.com";
const ENDPOINT_INSTRUMENTS = `${ETORO_BASE}/Metadata/V1/Instruments`;
const ENDPOINT_LIVE = (ids) =>
  `${ETORO_BASE}/Live?InstrumentIds=${ids}`;

const ETORO_SUBSCRIPTION_KEY = process.env.ETORO_SUBSCRIPTION_KEY;

// =======================
// FIREBASE INIT
// =======================
function initFirestore() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT mancante");
  }

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId:
        process.env.FIRESTORE_PROJECT_ID || serviceAccount.project_id,
    });
  }

  return admin.firestore();
}

// =======================
// ETORO FETCH
// =======================
async function etoroGet(url) {
  const resp = await axios.get(url, {
    headers: {
      "Ocp-Apim-Subscription-Key": ETORO_SUBSCRIPTION_KEY,
    },
    timeout: 20000,
  });

  return resp.data;
}

// =======================
// LOAD INSTRUMENTS
// =======================
async function loadInstruments() {
  console.log("📥 Scarico lista strumenti eToro...");

  const instruments = await etoroGet(ENDPOINT_INSTRUMENTS);
  console.log(`📦 ${instruments.length} strumenti ricevuti.`);

  const map = {};
  for (const it of instruments) {
    if (it.ticker) {
      map[it.ticker.toUpperCase()] = it.instrumentId;
    }
  }

  return map;
}

// =======================
// LOAD LIVE PRICES
// =======================
async function loadLivePrices(instrumentIds) {
  const live = await etoroGet(
    ENDPOINT_LIVE(instrumentIds.join(","))
  );

  const map = {};
  for (const r of live) {
    // media bid / ask
    map[r.instrumentId] = (r.bid + r.ask) / 2;
  }

  return map;
}

// =======================
// MAIN
// =======================
async function run() {
  console.log("🚀 Avvio aggiornamento portafoglio eToro");

  if (!ETORO_SUBSCRIPTION_KEY) {
    throw new Error("ETORO_SUBSCRIPTION_KEY mancante");
  }

  const db = initFirestore();

  // 1️⃣ Strumenti
  const instrumentsMap = await loadInstruments();

  // 2️⃣ Leggi portafoglio
  const snap = await db.collection("portafoglio").get();
  console.log(`📊 ${snap.size} documenti trovati.`);

  if (snap.empty) {
    console.log("⚠️ Portafoglio vuoto");
    return;
  }

  const idList = [];
  const docByInstrumentId = {};

  for (const doc of snap.docs) {
    const ticker = (doc.data().nome || "").toUpperCase();
    const instrumentId = instrumentsMap[ticker];

    if (!instrumentId) {
      console.log(`❌ InstrumentId non trovato per ${ticker}`);
      continue;
    }

    idList.push(instrumentId);
    docByInstrumentId[instrumentId] = doc;
  }

  if (idList.length === 0) {
    console.log("⚠️ Nessun instrumentId valido, uscita.");
    return;
  }

  // 3️⃣ Prezzi live
  console.log(`📡 Carico prezzi live (${idList.length} strumenti)...`);
  const livePrices = await loadLivePrices(idList);

  // 4️⃣ Aggiorna Firestore
  for (const instrumentId of idList) {
    const doc = docByInstrumentId[instrumentId];
    const price = livePrices[instrumentId];

    if (!price) {
      console.log(`⚠️ Prezzo mancante per instrumentId ${instrumentId}`);
      continue;
    }

    console.log(`💰 ${doc.data().nome} → ${price}`);

    await doc.ref.update({
      prezzo_corrente: price,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  console.log("✅ Aggiornamento completato!");
}

run().catch((err) => {
  console.error("❌ ERRORE:", err.message);
  process.exit(1);
});
