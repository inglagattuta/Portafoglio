// calendario.js
// ===============================
// IMPORT FIREBASE
// ===============================
import { db } from "./firebase-config.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

let sortState = {}; // Stato ordinamento colonne

// ===============================
// CARICA DATI
// ===============================
async function loadCalendario() {
  const ref = collection(db, "dividendi_annual");
  const snapshot = await getDocs(ref);

  const rows = [];
  snapshot.forEach(doc => rows.push(doc.data()));

  updateStats(rows);

  const meseCorrente = new Date().getMonth() + 1;
  renderTable(rows, meseCorrente);

  document.getElementById("selectMese").addEventListener("change", e => {
    renderTable(rows, Number(e.target.value));
  });

  setupSorting();
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
// RENDER TABELLA PRINCIPALE
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

    const divAnnuale = importo * mensilita;

    const tipo = calcolaTipoFrequenza(mensilita);

    const yieldSingolo = prezzo > 0 ? (importo / prezzo) * 100 : 0;
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
          divAnnuale,
          tipo,
          yieldSingolo,
          yieldAnnuale,
          dataOrd: dataString ? new Date(dataString) : new Date("2100-01-01")
        });
      }
    });
  });

  // Ordina per data default
  righe.sort((a, b) => a.dataOrd - b.dataOrd);

  // Render
  righe.forEach(r => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${r.ticker}</td>
      <td>${r.data}</td>
      <td>${r.importo.toFixed(4)} €</td>
      <td>${r.divAnnuale.toFixed(4)} €</td>
      <td>${r.tipo}</td>
      <td>${r.yieldSingolo.toFixed(2)}%</td>
      <td class="yieldCell">${r.yieldAnnuale.toFixed(2)}%</td>
    `;

    body.appendChild(tr);
  });

  aplicaColoriYield(body, 6);
}

// ===============================
// CALCOLA FREQUENZA
// ===============================
function calcolaTipoFrequenza(count) {
  if (count >= 12) return "Mensile";
  if (count === 4) return "Trimestrale";
  if (count === 2) return "Semestrale";
  if (count === 1) return "Annuale";
  return "—";
}

// ===============================
// 🎨 SCALA COLORE YIELD
// ===============================
function aplicaColoriYield(body, colIndex) {
  const cells = [...body.querySelectorAll(`td:nth-child(${colIndex + 1})`)];

  const values = cells
    .map(cell => Number(cell.textContent.replace("%", "")))
    .filter(n => !isNaN(n));

  const min = Math.min(...values);
  const max = Math.max(...values);

  cells.forEach(cell => {
    const val = Number(cell.textContent.replace("%", ""));
    if (isNaN(val)) return;

    const ratio = (val - min) / (max - min || 1);

    const r = Math.round(255 - 180 * ratio);
    const g = Math.round(80 + 150 * ratio);

    cell.style.backgroundColor = `rgba(${r}, ${g}, 80, 0.25)`;
  });
}

// ===============================
// ORDINAMENTO CLICK COLONNE
// ===============================
function setupSorting() {
  const thead = document.querySelector("#calHead");
  const tbody = document.querySelector("#calBody");

  [...thead.querySelectorAll("th")].forEach((th, colIndex) => {
    th.style.cursor = "pointer";
    th.addEventListener("click", () => {
      ordinaTabella(tbody, colIndex);
    });
  });
}

function ordinaTabella(tbody, colIndex) {
  const rows = [...tbody.querySelectorAll("tr")];
  const key = tbody.id + "-" + colIndex;

  const asc = !sortState[key];
  sortState[key] = asc;

  const sorted = rows.sort((a, b) => {
    const A = a.children[colIndex].innerText.replace("€", "").replace("%", "").trim();
    const B = b.children[colIndex].innerText.replace("€", "").replace("%", "").trim();

    const numA = parseFloat(A);
    const numB = parseFloat(B);

    if (!isNaN(numA) && !isNaN(numB)) {
      return asc ? numA - numB : numB - numA;
    }
    return asc ? A.localeCompare(B) : B.localeCompare(A);
  });

  sorted.forEach(r => tbody.appendChild(r));
}

// ===============================
// AVVIO
// ===============================
loadCalendario();
