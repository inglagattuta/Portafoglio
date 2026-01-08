/**
 * bootstrap-etoro-instrumentIds.js
 * Risolve ticker → instrumentId e li salva su Firestore
 * Da eseguire UNA SOLA VOLTA
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

// FIREBASE
function initFirestore() {
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

// 🔍 SEARCH
async function resolveInstrumentId(ticker) {
  const url = `${ETORO_BASE}/market-data/search?internalSymbolFull=${ticker}`;

  const resp = await axios.get(url, { headers: etoroHeaders() });

  const items = resp.data?.items;
  if (!Array.isArray(items)) return null;

  const exact = items.find(
    (i) => i.internalSymbolFull?.toUpperCase() === ticker
  );

  return exact?.instrumentId || null;
}

// MAIN
async function run() {
  console.log("🚀 Bootstrap instrumentId eToro");

  const db = initFirestore();
  const snap = await db.collection("portafoglio").get();

  for (const doc of snap.docs) {
    const data = doc.data();
    const ticker = (data.nome || "").toUpperCase();

    if (!ticker) continue;
    if (data.instrumentId) {
      console.log(`⏭️ ${ticker} già risolto (${data.instrumentId})`);
      continue;
    }

    console.log(`🔍 Risolvo ${ticker}...`);

    try {
      const instrumentId = await resolveInstrumentId(ticker);

      if (!instrumentId) {
        console.log(`❌ NON TROVATO: ${ticker}`);
        continue;
      }

      await doc.ref.update({ instrumentId });
      console.log(`✅ ${ticker} → ${instrumentId}`);

      // anti-rate-limit
      await new Promise((r) => setTimeout(r, 400));
    } catch (err) {
      console.log(`🔥 Errore su ${ticker}`, err.response?.data || err.message);
    }
  }

  console.log("🎉 Bootstrap completato");
}

run().catch((err) => {
  console.error("❌ ERRORE FATALE:", err.message);
  process.exit(1);
});
