/**
 * update-etoro.js — versione Public API
 * Aggiorna prezzi strumenti eToro in Firestore
 */

const axios = require("axios");
const admin = require("firebase-admin");
const crypto = require("crypto");

// ENDPOINTS PUBLIC API
const ETORO_BASE = "https://public-api.etoro.com/api/v1";
const ENDPOINT_INSTRUMENTS = `${ETORO_BASE}/instruments`;
const ENDPOINT_QUOTES = (ids) =>
  `${ETORO_BASE}/quotes?instrumentIds=${ids.join(",")}`;

// HEADER BUILDER
function etoroHeaders() {
  return {
    "x-api-key": process.env.ETORO_PUBLIC_API_KEY,
    "x-user-key": process.env.ETORO_USER_KEY,
    "x-request-id": crypto.randomUUID(),
    "Accept": "application/json",
  };
}

// FIREBASE INIT
function initFirestore() {
  const serviceAccount = process.env.FIREBASE_KEY_BASE64
    ? JSON.parse(
        Buffer.from(process.env.FIREBASE_KEY_BASE64, "base64").toString("utf8")
      )
    : JSON.parse(process.env.FIREBASE_KEY_JSON);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });

  return admin.firestore();
}

// SCARICA STRUMENTI
async function loadInstruments() {
  console.log("📥 Scarico strumenti eToro...");

  const resp = await axios.get(ENDPOINT_INSTRUMENTS, {
    headers: etoroHeaders(),
  });

  const map = {};
  for (const it of resp.data) {
    if (it.ticker) map[it.ticker.toUpperCase()] = it.instrumentId;
  }

  console.log(`📦 ${Object.keys(map).length} strumenti caricati`);
  return map;
}

// PREZZI LIVE
async function loadQuotes(instrumentIds) {
  const resp = await axios.get(ENDPOINT_QUOTES(instrumentIds), {
    headers: etoroHeaders(),
  });

  const map = {};
  for (const q of resp.data) {
    map[q.instrumentId] = (q.bid + q.ask) / 2;
  }

  return map;
}

// MAIN
async function run() {
  console.log("🚀 Avvio aggiornamento portafoglio eToro");

  const db = initFirestore();
  const instruments = await loadInstruments();

  const snap = await db.collection("portafoglio").get();
  console.log(`📊 ${snap.size} strumenti in portafoglio`);

  const ids = [];
  const docById = {};

  for (const doc of snap.docs) {
    const ticker = (doc.data().nome || "").toUpperCase();
    const id = instruments[ticker];

    if (!id) {
      console.log(`❌ Ticker non trovato: ${ticker}`);
      continue;
    }

    ids.push(id);
    docById[id] = doc;
  }

  if (!ids.length) {
    console.log("⚠️ Nessun ID valido, uscita");
    return;
  }

  console.log(`📡 Carico prezzi (${ids.length})`);
  const prices = await loadQuotes(ids);

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

  console.log("✅ Aggiornamento completato!");
}

run().catch((err) => {
  console.error("❌ ERRORE:", err.response?.data || err.message);
  process.exit(1);
});
