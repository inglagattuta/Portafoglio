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

  let righe = [];

  rows.forEach(r => {
    const prezzo = Number(r.prezzo_acquisto || 1);
    const importo = Number(r.ultimo_dividendo || 0);
    const arrDate = Array.isArray(r.date_pagamento) ? r.date_pagamento : [];

    const mensilita = arrDate.length > 0 ? arrDate.length : 1;

    // Yield singolo dividendo
    const yieldSingolo = prezzo > 0 ? (importo / prezzo) * 100 : 0;

    // Yield annuale
    const yieldAnnuale = yieldSingolo * mensilita;

    // Se non ci sono date → use empty row con mese = 0
    const dateList = arrDate.length > 0 ? arrDate : [""];

    dateList.forEach(dataString => {
      let mesePagamento = 0;
      let dataDisplay = "—";

      if (dataString) {
        const d = new Date(dataString);
        mesePagamento = d.getMonth() + 1;
        dataDisplay = dataString;
      }

      if (mesePagamento === meseFiltrato) {
        righe.push({
          ticker: r.ticker,
          data: dataDisplay,
          importo,
          yieldSingolo,
          yieldAnnuale,
          dataOrd: dataString ? new Date(dataString) : new Date("2100-01-01")
        });
      }
    });
  });

  // ORDINA LE RIGHE PER DATA (dataOrd)
  righe.sort((a, b) => a.dataOrd - b.dataOrd);

  // RENDER
  righe.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.ticker}</td>
      <td>${r.data}</td>
      <td>${r.importo.toFixed(4)} €</td>
      <td>${r.yieldSingolo.toFixed(2)}%</td>
      <td>${r.yieldAnnuale.toFixed(2)}%</td>
    `;
    body.appendChild(tr);
  });
}

loadCalendario();
