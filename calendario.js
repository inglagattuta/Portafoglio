// calendario.js
// ===============================
// IMPORT FIREBASE
// ===============================
import { db } from "./firebase-config.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// ===============================
// CARICA DATI
// ===============================
async function loadCalendario() {
  const ref = collection(db, "dividendi_annual");
  const snapshot = await getDocs(ref);

  const rows = [];
  snapshot.forEach(doc => rows.push(doc.data()));

  console.log("Dati caricati calendario:", rows);

  // Popola statistiche
  updateStats(rows);

  // Popola tabella (mese corrente default)
  const meseCorrente = new Date().getMonth() + 1;
  renderTable(rows, meseCorrente);

  // Listener select mese
  document.getElementById("selectMese").addEventListener("change", e => {
    const meseSel = parseInt(e.target.value);
    renderTable(rows, meseSel);
  });
}

// ===============================
// POPOLA I 3 BOX SUPERIORI
// ===============================
function updateStats(rows) {
  let totaleAnnuale = 0;
  let tickers = new Set();
  let eventi = 0;

  rows.forEach(r => {
    const div = Number(r.ultimo_dividendo || 0);
    const arr = Array.isArray(r.date_pagamento) ? r.date_pagamento : [];

    // Calcolo dividendo annualizzato
    totaleAnnuale += div * (arr.length > 0 ? arr.length : 1);

    tickers.add(r.ticker);

    // Numero eventi
    eventi += arr.length > 0 ? arr.length : 1;
  });

  document.getElementById("dividendiAnnui").textContent =
    totaleAnnuale.toFixed(2) + " €";

  document.getElementById("totTitoli").textContent = tickers.size;
  document.getElementById("totEventi").textContent = eventi;
}

// ===============================
// RENDER TABELLA
// ===============================
function renderTable(rows, meseFiltrato) {
  const body = document.getElementById("calBody");
  body.innerHTML = "";

  rows.forEach(r => {
    const prezzo = Number(r.prezzo_acquisto || 1);
    const importo = Number(r.ultimo_dividendo || 0);
    const arrDate = Array.isArray(r.date_pagamento) ? r.date_pagamento : [];

    // Quante volte paga in un anno
    const mensilita = arrDate.length > 0 ? arrDate.length : 1;

    // Yield singolo
    const yieldSingolo = prezzo > 0 ? (importo / prezzo) * 100 : 0;

    // Yield annuale
    const yieldAnnuale = yieldSingolo * mensilita;

    // Se non ci sono mesi → riga neutra
    const mesi = arrDate.length > 0 ? arrDate : [0];

    mesi.forEach(m => {
      if (meseFiltrato !== m) return;

      const dataPag = m === 0 ? "—" : `01/${String(m).padStart(2, "0")}`;

      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${r.ticker}</td>
        <td>${dataPag}</td>
        <td>${importo.toFixed(4)} €</td>
        <td>${yieldSingolo.toFixed(2)}%</td>
        <td>${yieldAnnuale.toFixed(2)}%</td>
      `;

      body.appendChild(tr);
    });
  });
}

// ===============================
// AVVIO SCRIPT
// ===============================
loadCalendario();
