// score.js
// ===============================
// IMPORT FIREBASE
// ===============================
import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// ===============================
// ELEMENTI PAGINA
// ===============================
const tableBody = document.querySelector("#scoreTable tbody");

// BOX RIEPILOGATIVI
const container = document.querySelector(".container");

const summaryBox = document.createElement("div");
summaryBox.className = "mini-cards";
summaryBox.innerHTML = `
  <div class="mini-card"><h3>Media Score</h3><p id="mediaScore">0</p></div>
  <div class="mini-card"><h3>Top Titolo</h3><p id="topTicker">-</p></div>
  <div class="mini-card"><h3>Titolo Peggiore</h3><p id="worstTicker">-</p></div>
  <div class="mini-card"><h3>Media Rendimento</h3><p id="mediaRend">0%</p></div>
`;
container.insertBefore(summaryBox, container.children[2]);

// ===============================
// UTILS: formattazioni & colori
// ===============================
function toPerc(value) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (isNaN(num)) return "-";
  return (num * 100).toFixed(2) + "%";
}

function colorValueInline(value) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (isNaN(num)) return value;
  if (num > 0) return `<span style="color:#00b894;font-weight:600;">${num}</span>`;
  if (num < 0) return `<span style="color:#d63031;font-weight:600;">${num}</span>`;
  return `${num}`;
}

function colorPercInline(value) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (isNaN(num)) return "-";
  const text = (num * 100).toFixed(2) + "%";
  if (num > 0) return `<span style="color:#00b894;font-weight:600;">${text}</span>`;
  if (num < 0) return `<span style="color:#d63031;font-weight:600;">${text}</span>`;
  return text;
}

// ===============================
// ORDINAMENTO
// ===============================
let sortDirection = "desc";
let sortColumn = "score";

function sortData(data, column) {
  if (sortColumn === column) {
    sortDirection = sortDirection === "asc" ? "desc" : "asc";
  } else {
    sortColumn = column;
    sortDirection = "desc";
  }

  // copy before sort to avoid mutating original array elsewhere
  const copy = [...data];

  copy.sort((a, b) => {
    const vA = a[column];
    const vB = b[column];

    const nA = Number(vA);
    const nB = Number(vB);

    // if both are numbers -> numeric sort
    if (!isNaN(nA) && !isNaN(nB)) {
      return sortDirection === "asc" ? nA - nB : nB - nA;
    }

    // fallback string compare
    const sA = (vA === null || vA === undefined) ? "" : String(vA);
    const sB = (vB === null || vB === undefined) ? "" : String(vB);
    return sortDirection === "asc" ? sA.localeCompare(sB) : sB.localeCompare(sA);
  });

  return copy;
}

// ===============================
// CARICA DATI
// ===============================
async function loadScoreData() {
  try {
    const snap = await getDocs(collection(db, "score"));
    let rows = [];
    snap.forEach(doc => rows.push(doc.data()));

    // iniziale: ordina per score desc (se presente)
    rows = sortData(rows, "score");

    renderTable(rows);
    computeSummary(rows);
    enableSorting(rows);
  } catch (err) {
    console.error("Errore caricamento score:", err);
  }
}

// ===============================
// RENDER TABELLA
// ===============================
function renderTable(rows) {
  tableBody.innerHTML = "";

  rows.forEach(r => {
    const tr = document.createElement("tr");

    // usiamo i campi esatti presenti in Firestore:
    // perf_12m, rendimento, payback, perc, score, esito, tipologia, incremento, valore_euro
    const perf12 = colorPercInline(r.perf_12m);
    const rendimento = colorPercInline(r.rendimento);
    const payback = colorPercInline(r.payback);
    const perc = colorPercInline(r.perc);
    const score = (r.score === null || r.score === undefined)
  ? "-"
  : colorValueInline(Number(r.score).toFixed(2));

    const esito = r.esito || "-";
    const tipologia = r.tipologia || "-";
    const incremento = (r.incremento === null || r.incremento === undefined) ? "-" : colorValueInline(r.incremento);
    const valore_euro = (r.valore_euro === null || r.valore_euro === undefined) ? "-" : colorValueInline(r.valore_euro);

    tr.innerHTML = `
      <td>${r.ticker || "-"}</td>
      <td>${perf12}</td>
      <td>${rendimento}</td>
      <td>${payback}</td>
      <td>${perc}</td>
      <td>${score}</td>
      <td>${esito}</td>
      <td>${tipologia}</td>
      <td>${incremento}</td>
      <td>${valore_euro}</td>
    `;

    tableBody.appendChild(tr);
  });
}

// ===============================
// BOX RIEPILOGATIVI
// ===============================
function computeSummary(rows) {
  if (!rows || rows.length === 0) {
    document.querySelector("#mediaScore").innerText = "0";
    document.querySelector("#mediaRend").innerText = "0%";
    document.querySelector("#topTicker").innerText = "-";
    document.querySelector("#worstTicker").innerText = "-";
    return;
  }

  const avgScore =
    rows.reduce((acc, r) => acc + (Number(r.score) || 0), 0) / rows.length;

  const avgRend =
    rows.reduce((acc, r) => acc + (Number(r.rendimento) || 0), 0) / rows.length;

  const sorted = [...rows].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));

  document.querySelector("#mediaScore").innerText = avgScore.toFixed(2);
  document.querySelector("#mediaRend").innerText = avgRend.toFixed(2) + "%";
  document.querySelector("#topTicker").innerText = (sorted[0] && sorted[0].ticker) || "-";
  document.querySelector("#worstTicker").innerText = (sorted[sorted.length - 1] && sorted[sorted.length - 1].ticker) || "-";
}

// ===============================
// ABILITA ORDINAMENTO CLICK COLONNE
// ===============================
function enableSorting(rows) {
  const headers = document.querySelectorAll("#scoreTable th");

  headers.forEach((th, index) => {
    th.style.cursor = "pointer";

    th.addEventListener("click", () => {
      // mapping index -> field name in Firestore
      const columns = [
        "ticker",
        "perf_12m",
        "rendimento",
        "payback",
        "perc",
        "score",
        "esito",
        "tipologia",
        "incremento",
        "valore_euro"
      ];

      const columnName = columns[index] || "score";
      const sorted = sortData(rows, columnName);
      renderTable(sorted);
    });
  });
}

// ===============================
// AVVIO
// ===============================
loadScoreData();
