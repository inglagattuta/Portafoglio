/**
 * update-etoro.js — versione DEFINITIVA
 * Usa la Watchlist Default eToro
 * Aggiorna prezzi strumenti in Firestore
 */

const axios = require("axios");
const admin = require("firebase-admin");
const crypto = require("crypto");

// ===== eToro Public API =====
const ETORO_BASE = "https://public-api.etoro.com/api/v1";
const WATCHLISTS_ENDPOINT = `${ETORO_BASE}/watchlists`;
const QUOTES_ENDPOINT = (ids) =>
  `${ETORO_BASE}/quotes?instrumentIds=${ids.join(",")}`;

// ===== HEADERS =====
function etoroHeaders() {
  return {
    "x-api-key": process.env.ETORO_PUBLIC_API_KEY,
    "x-user-key": process.env.ETORO_USER_KEY,
    "x-request-id": crypto.randomUUID(),
    Accept: "application/json",
  };
}

// ===== FIREBASE INIT =====
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
    projectId: serviceAccount.project_id,
  });

  return admin.firestore();
}

// ===== DEFAULT WATCHLIST =====
async function getDefaultWatchlistInstrumentIds() {
  const resp = await axios.get(WATCHLISTS_ENDPOINT, {
    headers: etoroHeaders(),
  });

  if (!resp.data?.watchlists) {
    throw new Error("❌ Formato watchlists non valido");
  }

  const defaultList = resp.data.watchlists.find((w) => w.isDefault === true);
  if (!defaultList) {
    throw new Error("❌ Watchlist Default non trovata");
  }

  const instrumentIds = defaultList.items
    .filter((i) => i.itemType === "Instrument")
    .map((i) => i.itemId);

  if (!instrumentIds.length) {
    throw new Error("❌ Nessuno strumento nella watchlist Default");
  }

  console.log(`📌 ${instrumentIds.length} strumenti dalla watchlist Default`);
  return instrumentIds;
}

// ===== QUOTES =====
async function loadQuotes(instrumentIds) {
  const resp = await axios.get(QUOTES_ENDPOINT(instrumentIds), {
    headers: etoroHeaders(),
  });

  const map = {};
  for (const q of resp.data) {
    map[q.instrumentId] = (q.bid + q.ask) / 2;
  }
  return map;
}

// ===== MAIN =====
async function run() {
  console.log("🚀 Avvio aggiornamento portafoglio eToro");

  const db = initFirestore();

  const instrumentIds = await getDefaultWatchlistInstrumentIds();
  const prices = await loadQuotes(instrumentIds);

  const snap = await db.collection("portafoglio").get();
  console.log(`📊 ${snap.size} documenti Firestore`);

  for (const doc of snap.docs) {
    const id = doc.data().instrumentId;
    if (!id || !prices[id]) continue;

    console.log(`💰 ${doc.data().nome} → ${prices[id]}`);

    await doc.ref.update({
      prezzo_corrente: prices[id],
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  console.log("✅ Aggiornamento completato!");
}

run().catch((err) => {
  console.error("❌ ERRORE:", err.response?.data || err.message);
  process.exit(1);
});
