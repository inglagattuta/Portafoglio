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

  updateStats(rows);

  const meseCorrente = new Date().getMonth() + 1;
  renderTable(rows, meseCorrente);

  document.getElementById("selectMese").addEventListener("change", e => {
    renderTable(rows, Number(e.target.value));
  });
}

// ===============================
// POPOLA I BOX
// ===============================
function updateStats(rows) {
  let totaleAnnuale = 0;
  let tickers = new Set();
  let eventi = 0;

  rows.forEach(r => {
    const div = Number(r.ultimo_dividendo || 0);
    const arr = Array.isArray(r.date_pagamento) ? r.date_pagamento : [];

    totaleAnnuale += div * arr.length;
    tickers.add(r.ticker);
    eventi += arr.length;
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
    const datePag = Array.isArray(r.date_pagamento) ? r.date_pagamento : [];

    const yieldSingolo = prezzo > 0 ? (importo / prezzo) * 100 : 0;
    const yieldAnnuale = yieldSingolo * datePag.length;

    datePag.forEach(data => {
      const mese = new Date(data).getMonth() + 1;
      if (mese !== meseFiltrato) return;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.ticker}</td>
        <td>${data}</td>
        <td>${importo.toFixed(4)} €</td>
        <td>${yieldSingolo.toFixed(2)}%</td>
        <td>${yieldAnnuale.toFixed(2)}%</td>
      `;
      body.appendChild(tr);
    });
  });
}

loadCalendario();
