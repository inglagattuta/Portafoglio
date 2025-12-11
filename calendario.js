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

  aggiornaDettaglioTitoli(rows);

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
// RENDER TABELLA MENSILE
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

  // ORDINA PER DATA
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

// ===============================
// 🔥 NUOVA TABELLA: DETTAGLIO TITOLI
// ===============================
function aggiornaDettaglioTitoli(rows) {
  const body = document.getElementById("dettaglioTitoliBody");
  if (!body) return;
  body.innerHTML = "";

  rows.forEach(r => {
    const prezzo = Number(r.prezzo_acquisto || 0);
    const ultimo = Number(r.ultimo_dividendo || 0);
    const arr = Array.isArray(r.date_pagamento) ? r.date_pagamento : [];

    const mensilita = arr.length > 0 ? arr.length : 1;
    const divAnnuale = ultimo * mensilita;

    // prossima data → la minima futura
    const oggi = new Date();
    let prossima = arr
      .map(d => new Date(d))
      .filter(d => d >= oggi)
      .sort((a, b) => a - b)[0];

    const prossimaData = prossima
      ? prossima.toISOString().substring(0, 10)
      : "—";

    const yieldAnnuale =
      prezzo > 0 ? ((divAnnuale / prezzo) * 100).toFixed(2) : "0.00";

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${r.ticker}</td>
      <td>${prezzo ? prezzo.toFixed(2) + " €" : "-"}</td>
      <td>${ultimo.toFixed(4)} €</td>
      <td>${divAnnuale.toFixed(4)} €</td>
      <td>${prossimaData}</td>
      <td>${yieldAnnuale}%</td>
    `;

    body.appendChild(tr);
  });
}

// ===============================
// AVVIO
// ===============================
loadCalendario();
