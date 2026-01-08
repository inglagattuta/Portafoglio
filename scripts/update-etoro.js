/**
 * update-etoro.js — eToro Public API
 * Aggiorna prezzo_corrente nella collection "portafoglio"
 * Campo ticker: nome
 */

const axios = require("axios");
const admin = require("firebase-admin");
const crypto = require("crypto");

// ===============================
// CONFIG
// ===============================
const ETORO_BASE = "https://public-api.etoro.com/api/v1";
const ENDPOINT_INSTRUMENTS = `${ETORO_BASE}/instruments`;
const ENDPOINT_LIVE = (ids) =>
  `${ETORO_BASE}/live/prices?instrumentIds=${ids.join(",")}`;

// ===============================
// HEADER BUILDER
// ===============================
function etoroHeaders() {
  if (!process.env.ETORO_PUBLIC_API_KEY || !process.env.ETORO_USER_KEY) {
    throw new Error("❌ ETORO_PUBLIC_API_KEY o ETORO_USER_KEY mancanti");
  }

  return {
    "x-api-key": process.env.ETORO_PUBLIC_API_KEY,
    "x-user-key": process.env.ETORO_USER_KEY,
    "x-request-id": crypto.randomUUID(),
    Accept: "application/json",
  };
}

// ===============================
// FIREBASE INIT
// ===============================
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

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  }

  return admin.firestore();
}

// ===============================
// LOAD INSTRUMENTS
// ===============================
async function loadInstruments() {
  console.log("📥 Scarico strumenti eToro...");

  const resp = await axios.get(ENDPOINT_INSTRUMENTS, {
    headers: etoroHeaders(),
    timeout: 20000,
  });

  const map = {};
  for (const it of resp.data) {
    if (it.ticker) {
      map[it.ticker.toUpperCase()] = it.instrumentId;
    }
  }

  console.log(`📦 ${Object.keys(map).length} strumenti caricati`);
  return map;
}

// ===============================
// LOAD LIVE PRICES
// ===============================
async function loadLivePrices(instrumentIds) {
  const resp = await axios.get(ENDPOINT_LIVE(instrumentIds), {
    headers: etoroHeaders(),
    timeout: 20000,
  });

  const map = {};
  for (const r of resp.data) {
    map[r.instrumentId] = (r.bid + r.ask) / 2;
  }

  return map;
}

// ===============================
// MAIN
// ===============================
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
    const instrumentId = instruments[ticker];

    if (!instrumentId) {
      console.log(`⚠️ InstrumentId non trovato per ${ticker}`);
      continue;
    }

    ids.push(instrumentId);
    docById[instrumentId] = doc;
  }

  if (!ids.length) {
    console.log("⚠️ Nessun instrumentId valido, uscita");
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

  console.log("✅ Aggiornamento completato!");
}

run().catch((err) => {
  console.error("❌ ERRORE:", err.response?.data || err.message);
  process.exit(1);
});
