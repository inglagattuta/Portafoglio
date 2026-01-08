/**
 * update-etoro.js — eToro Public API (watchlist Default)
 * Aggiorna prezzo_corrente nella collection "portafoglio"
 * Match su campo: nome (ticker)
 */

const axios = require("axios");
const admin = require("firebase-admin");
const crypto = require("crypto");

// ===============================
// CONFIG
// ===============================
const ETORO_BASE = "https://public-api.etoro.com/api/v1";

// ===============================
// HEADER BUILDER
// ===============================
function etoroHeaders() {
  if (!process.env.ETORO_PUBLIC_API_KEY || !process.env.ETORO_USER_KEY) {
    throw new Error("ETORO_PUBLIC_API_KEY o ETORO_USER_KEY mancanti");
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
    throw new Error("Nessuna chiave Firebase trovata");
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
// GET DEFAULT WATCHLIST
// ===============================
async function getDefaultWatchlist() {
  const resp = await axios.get(`${ETORO_BASE}/watchlists`, {
    headers: etoroHeaders(),
  });

  if (!resp.data.items || !Array.isArray(resp.data.items)) {
    throw new Error("Formato risposta watchlists non valido");
  }

  const list = resp.data.items.find((w) => w.isDefault === true);

  if (!list) {
    throw new Error("Watchlist Default non trovata");
  }

  console.log(`📌 Watchlist Default trovata (ID: ${list.watchlistId})`);
  return list.watchlistId;
}


// ===============================
// GET WATCHLIST ITEMS
// ===============================
async function getWatchlistItems(watchlistId) {
  const resp = await axios.get(
    `${ETORO_BASE}/watchlists/${watchlistId}`,
    { headers: etoroHeaders() }
  );

  return resp.data.items || [];
}

// ===============================
// GET LIVE PRICES
// ===============================
async function getLivePrices(instrumentIds) {
  const resp = await axios.get(
    `${ETORO_BASE}/live/prices?instrumentIds=${instrumentIds.join(",")}`,
    { headers: etoroHeaders() }
  );

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

  // 1. Watchlist Default
  const watchlistId = await getDefaultWatchlist();

  // 2. Items watchlist
  const items = await getWatchlistItems(watchlistId);
  console.log(`📋 ${items.length} strumenti nella watchlist Default`);

  if (!items.length) {
    console.log("⚠️ Watchlist vuota");
    return;
  }

  // 3. Mappa ticker -> instrumentId
  const instrumentByTicker = {};
  const instrumentIds = [];

  for (const it of items) {
    if (it.symbol && it.instrumentId) {
      const ticker = it.symbol.toUpperCase();
      instrumentByTicker[ticker] = it.instrumentId;
      instrumentIds.push(it.instrumentId);
    }
  }

  // 4. Prezzi live
  console.log(`📡 Carico prezzi live (${instrumentIds.length})`);
  const prices = await getLivePrices(instrumentIds);

  // 5. Firestore
  const snap = await db.collection("portafoglio").get();
  console.log(`📊 ${snap.size} strumenti in Firestore`);

  for (const doc of snap.docs) {
    const ticker = (doc.data().nome || "").toUpperCase();
    const instrumentId = instrumentByTicker[ticker];

    if (!instrumentId) {
      console.log(`⚠️ ${ticker} non presente nella watchlist`);
      continue;
    }

    const price = prices[instrumentId];
    if (!price) continue;

    console.log(`💰 ${ticker}: ${price}`);

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
