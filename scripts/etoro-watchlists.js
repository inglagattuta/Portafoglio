const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const BASE = "https://public-api.etoro.com/api/v1";

const headers = () => ({
  "x-api-key": process.env.ETORO_PUBLIC_API_KEY,
  "x-user-key": process.env.ETORO_USER_KEY,
  "x-request-id": uuidv4(),
});

if (!process.env.ETORO_PUBLIC_API_KEY || !process.env.ETORO_USER_KEY) {
  console.error("❌ Chiavi eToro mancanti");
  process.exit(1);
}

// 1️⃣ GET WATCHLISTS
async function getWatchlists() {
  const res = await axios.get(`${BASE}/watchlists`, {
    headers: headers(),
  });
  return res.data;
}

// 2️⃣ CREA WATCHLIST
async function createWatchlist(name) {
  const res = await axios.post(
    `${BASE}/watchlists`,
    null,
    {
      params: { name },
      headers: headers(),
    }
  );
  return res.data;
}

// 3️⃣ AGGIUNGI STRUMENTI
async function addItems(watchlistId, instrumentIds) {
  await axios.post(
    `${BASE}/watchlists/${watchlistId}/items`,
    instrumentIds,
    {
      headers: {
        ...headers(),
        "Content-Type": "application/json",
      },
    }
  );
}

// MAIN
(async () => {
  console.log("🚀 Gestione watchlist eToro");

  const lists = await getWatchlists();
  console.log("📋 Watchlist trovate:", lists.map(l => `${l.id} - ${l.name}`));

  const myList = lists.find(l => l.name === "My AI Picks");

  let watchlistId;
  if (!myList) {
    console.log("➕ Creo watchlist My AI Picks");
    const created = await createWatchlist("My AI Picks");
    watchlistId = created.id;
  } else {
    watchlistId = myList.id;
  }

  // ⚠️ InstrumentId, NON ticker
  const instrumentIds = [1001, 1002]; // esempio

  await addItems(watchlistId, instrumentIds);
  console.log("✅ Strumenti aggiunti alla watchlist");
})();
