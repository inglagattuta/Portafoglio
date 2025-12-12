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

  return data.sort((a, b) => {
    const v1 = a[column];
    const v2 = b[column];

    if (!isNaN(v1) && !isNaN(v2)) {
      return sortDirection === "asc" ? v1 - v2 : v2 - v1;
    }
    return sortDirection === "asc"
      ? String(v1).localeCompare(String(v2))
      : String(v2).localeCompare(String(v1));
  });
}

// ===============================
// CARICA DATI
// ===============================
async function loadScoreData() {
  const snap = await getDocs(collection(db, "score"));
  let rows = [];

  snap.forEach(doc => rows.push(doc.data()));

  // ordinamento iniziale
  rows = sortData(rows, "score");

  renderTable(rows);
  computeSummary(rows);
  enableSorting(rows);
}

// ===============================
// FORMATTAZIONE %
–===============================
function toPerc(value) {
  if (value === null || value === undefined || value === "") return "-";
  return (value * 100).toFixed(2) + "%";
}

// ===============================
// RENDER TABELLA
// ===============================
function renderTable(rows) {
  tableBody.innerHTML = "";

  rows.forEach(r => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${r.ticker}</td>
      <td>${toPerc(r.m12)}</td>
      <td>${toPerc(r.rendimento)}</td>
      <td>${toPerc(r.payback)}</td>
      <td>${toPerc(r.percentuale)}</td>
      <td>${r.score}</td>
    `;

    tableBody.appendChild(tr);
  });
}

// ===============================
// BOX RIEPILOGATIVI
// ===============================
function computeSummary(rows) {
  if (rows.length === 0) return;

  const avgScore =
    rows.reduce((acc, r) => acc + (parseFloat(r.score) || 0), 0) / rows.length;

  const avgRend =
    rows.reduce((acc, r) => acc + (parseFloat(r.rendimento) || 0), 0) /
    rows.length;

  const sorted = [...rows].sort((a, b) => b.score - a.score);

  document.querySelector("#mediaScore").innerText = avgScore.toFixed(2);
  document.querySelector("#mediaRend").innerText = avgRend.toFixed(2) + "%";
  document.querySelector("#topTicker").innerText = sorted[0].ticker;
  document.querySelector("#worstTicker").innerText = sorted[sorted.length - 1].ticker;
}

// ===============================
// ORDINAMENTO CLIC COLONNE
// ===============================
function enableSorting(rows) {
  const headers = document.querySelectorAll("#scoreTable th");

  headers.forEach((th, index) => {
    th.style.cursor = "pointer";

    th.addEventListener("click", () => {
      const columnName = ["ticker", "m12", "rendimento", "payback", "percentuale", "score"][index];

      const sorted = sortData(rows, columnName);
      renderTable(sorted);
    });
  });
}

// ===============================
// AVVIO
// ===============================
loadScoreData();
