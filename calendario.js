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
  console.log("Caricamento dati calendario...");

  // ⚠️ Raccolta corretta
  const ref = collection(db, "dividendi_annual");
  const snapshot = await getDocs(ref);

  const rows = [];
  snapshot.forEach(doc => rows.push(doc.data()));

  console.log("Dati caricati calendario:", rows);

  // Popola statistiche
  updateStats(rows);

  // Popola tabella prima volta (mese corrente)
  renderTable(rows, new Date().getMonth() + 1);

  // Listener select mese
  document.getElementById("selectMese").addEventListener("change", e => {
    const meseSel = parseInt(e.target.value);
    renderTable(rows, meseSel);
  });
}

// ===============================
// AGGIORNA I 3 BOX SUPERIORI
// ===============================
function updateStats(rows) {
  let totaleAnnuale = 0;
  let tickers = new Set();

  rows.forEach(r => {
    totaleAnnuale += Number(r.dividendo_annuo || 0);
    tickers.add(r.ticker);
  });

  document.getElementById("dividendiAnnui").textContent =
    totaleAnnuale.toFixed(2) + " €";

  document.getElementById("totTitoli").textContent = tickers.size;
  document.getElementById("totEventi").textContent = rows.length;
}

// ===============================
// RENDER TABELLA
// ===============================
function renderTable(rows, mese) {
  const body = document.getElementById("calBody");
  body.innerHTML = "";

  const filtrati = rows.filter(r => Number(r.mese_pagamento) === mese);

  filtrati.forEach(r => {
    const tr = document.createElement("tr");

    const importo = Number(r.importo || 0);
    const prezzo = Number(r.prezzo_acquisto || 1);
    const quote = Number(r.quantita || 1);
    const annuale = Number(r.dividendo_annuo || 0);

    // Yield mensile = importo * 12 / (prezzo * quantita) * 100
    const yieldMensile = prezzo * quote > 0
      ? (importo * 12 / (prezzo * quote)) * 100
      : 0;

    // Yield annuale = dividendo_annuo / (prezzo * quantita) * 100
    const yieldAnnuale = annuale && prezzo * quote > 0
      ? (annuale / (prezzo * quote)) * 100
      : 0;

    tr.innerHTML = `
      <td>${r.ticker}</td>
      <td>${r.nome}</td>
      <td>${r.data_pagamento}</td>
      <td>${importo.toFixed(2)} €</td>

      <td>${yieldAnnuale.toFixed(2)}%</td>
      <td>${yieldMensile.toFixed(2)}%</td>
    `;

    body.appendChild(tr);
  });
}

// Avvio
loadCalendario();
