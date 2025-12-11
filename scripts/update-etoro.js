/**
 * update-etoro.js — versione finale per Francesco
 * Collection: portafoglio
 * Ticker nel campo: nome
 */

const axios = require("axios");
const admin = require("firebase-admin");

const ETORO_BASE = "https://api.etoro.com";
const ENDPOINT_INSTRUMENTS = `${ETORO_BASE}/Metadata/V1/Instruments`;
const ENDPOINT_LIVE = (ids) => `${ETORO_BASE}/Live?InstrumentIds=${ids}`;

// FIREBASE INIT
function initFirestore() {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIRESTORE_PROJECT_ID || serviceAccount.project_id,
  });

  return admin.firestore();
}

// TOKEN
async function getAccessToken() {
  if (process.env.ETORO_ACCESS_TOKEN) return process.env.ETORO_ACCESS_TOKEN;

  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", process.env.ETORO_REFRESH_TOKEN);
  params.append("client_id", process.env.ETORO_CLIENT_ID);
  params.append("client_secret", process.env.ETORO_CLIENT_SECRET);

  const resp = await axios.post(
    `${ETORO_BASE}/oauth/token`,
    params.toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  return resp.data.access_token;
}

// SCARICA TUTTI GLI STRUMENTI
async function loadInstruments(token) {
  console.log("📥 Scarico lista strumenti eToro...");

  const resp = await axios.get(ENDPOINT_INSTRUMENTS, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 20000,
  });

  const instruments = resp.data;
  console.log(`📦 ${instruments.length} strumenti ricevuti.`);

  const map = {};
  for (const it of instruments) {
    if (it.ticker) map[it.ticker.toUpperCase()] = it.instrumentId;
  }

  return map;
}

// PREZZI LIVE (batch)
async function loadLivePrices(token, instrumentIds) {
  const resp = await axios.get(ENDPOINT_LIVE(instrumentIds.join(",")), {
    headers: { Authorization: `Bearer ${token}` },
  });

  const live = resp.data;

  const map = {};
  for (const r of live) {
    const price = (r.bid + r.ask) / 2; // media bid/ask
    map[r.instrumentId] = price;
  }

  return map;
}

// MAIN
async function run() {
  const db = initFirestore();
  const token = await getAccessToken();

  const instrumentsMap = await loadInstruments(token);

  const snap = await db.collection("portafoglio").get();
  console.log(`📊 ${snap.size} documenti trovati.`);

  const docs = snap.docs;

  // Prepara lista instrumentId
  const idList = [];
  const docByTicker = {};

  for (const doc of docs) {
    const ticker = (doc.data().nome || "").toUpperCase();

    const instrumentId = instrumentsMap[ticker];
    if (!instrumentId) {
      console.log(`❌ Nessun instrumentId trovato per ${ticker}`);
      continue;
    }

    idList.push(instrumentId);
    docByTicker[instrumentId] = doc;
  }

  if (idList.length === 0) {
    console.log("⚠️ Nessun instrumentId trovato, uscita.");
    return;
  }

  console.log(`📡 Carico prezzi live (${idList.length} strumenti)...`);
  const livePrices = await loadLivePrices(token, idList);

  // Aggiorna Firestore
  for (const instrumentId of idList) {
    const doc = docByTicker[instrumentId];
    const price = livePrices[instrumentId];

    if (!price) {
      console.log(`⚠️ Nessun prezzo per instrumentId ${instrumentId}`);
      continue;
    }

    console.log(`💰 Aggiorno ${doc.data().nome}: ${price}`);

    await doc.ref.update({
      prezzo_corrente: price,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  console.log("✅ Aggiornamento completato!");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
