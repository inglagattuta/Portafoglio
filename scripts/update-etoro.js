/**
 * update-etoro.js — eToro Public API (versione corretta)
 */

const axios = require("axios");
const admin = require("firebase-admin");
const crypto = require("crypto");

const ETORO_BASE = "https://public-api.etoro.com/api/v1";

// HEADERS
function etoroHeaders() {
  return {
    "x-api-key": process.env.ETORO_PUBLIC_API_KEY,
    "x-user-key": process.env.ETORO_USER_KEY,
    "x-request-id": crypto.randomUUID(),
    Accept: "application/json",
  };
}

// FIREBASE INIT
function initFirestore() {
  if (!process.env.FIREBASE_KEY_JSON && !process.env.FIREBASE_KEY_BASE64) {
    throw new Error("❌ Nessuna chiave Firebase trovata");
  }

  const serviceAccount = process.env.FIREBASE_KEY_BASE64
    ? JSON.parse(
        Buffer.from(process.env.FIREBASE_KEY_BASE64, "base64").toString("utf8")
      )
    : JSON.parse(process.env.FIREBASE_KEY_JSON);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return admin.firestore();
}

// 🔍 RISOLVI TICKER → instrumentId
async function resolveInstrumentId(ticker) {
  const resp = await axios.get(
    `${ETORO_BASE}/market-data/search`,
    {
      params: { internalSymbolFull: ticker },
      headers: etoroHeaders(),
    }
  );

  const results = resp.data?.data;

  if (!Array.isArray(results) || results.length === 0) return null;

  const exact = results.find(
    (r) => r.internalSymbolFull?.toUpperCase() === ticker
  );

  return exact?.instrumentId ?? null;
}

// 📡 PREZZI LIVE
async function loadLivePrices(ids) {
  const resp = await axios.get(
    `${ETORO_BASE}/live`,
    {
      params: { instrumentIds: ids.join(",") },
      headers: etoroHeaders(),
    }
  );

  const map = {};
  for (const r of resp.data) {
    if (r.instrumentId && r.bid && r.ask) {
      map[r.instrumentId] = (r.bid + r.ask) / 2;
    }
  }

  return map;
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
    const data = doc.data();
    const ticker = (data.nome || "").toUpperCase();

    let instrumentId = data.instrumentId;

    if (!instrumentId) {
      console.log(`🔍 Risolvo ${ticker}...`);
      instrumentId = await resolveInstrumentId(ticker);

      if (!instrumentId) {
        console.log(`⚠️ InstrumentId non trovato per ${ticker}`);
        continue;
      }

      await doc.ref.update({ instrumentId });
      console.log(`✅ ${ticker} → ${instrumentId}`);
    }

    ids.push(instrumentId);
    docById[instrumentId] = doc;
  }

  if (!ids.length) {
    console.log("⚠️ Nessun instrumentId valido");
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
