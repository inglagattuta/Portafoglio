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
function fmtPct(value) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (!isFinite(num)) return "-";
  return num.toFixed(2) + "%"; // i tuoi valori in Firestore sono già "percentuali" (es. 6.55)
}

function fmtEuro(value) {
  const num = Number(value);
  if (!isFinite(num)) return "0.00 €";
  return num.toFixed(2) + " €";
}

function colorPercInline(value) {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (!isFinite(num)) return "-";
  const text = num.toFixed(2) + "%";
  if (num > 0) return `<span style="color:#00b894;font-weight:600;">${text}</span>`;
  if (num < 0) return `<span style="color:#d63031;font-weight:600;">${text}</span>`;
  return text;
}

function colorEuroInline(value) {
  const num = Number(value);
  const text = fmtEuro(num);
  if (!isFinite(num) || num === 0) return text;
  return `<span style="font-weight:600;">${text}</span>`;
}

// 🎯 COLORE PERSONALIZZATO PER SCORE
function colorScore(value) {
  if (value === null || value === undefined || value === "-") return "-";
  const num = Number(value);
  if (!isFinite(num)) return value;

  let color = "#d63031"; // rosso < 8
  if (num >= 12) color = "#00b894"; // verde
  else if (num >= 8) color = "#b59d00"; // giallo scuro

  return `<span style="color:${color};font-weight:700;">${num.toFixed(2)}</span>`;
}

// ===============================
// ORDINAMENTO
// ===============================
let sortDirection = "desc";
let sortColumn = "score";

// colonne visibili e ordinabili (in ordine tabella)
const visibleColumns = [
  "blocco",
  "ticker",
  "perf_12m",
  "rendimento",
  "payback",
  "perc",            // %
  "score",
  "valore_attuale",  // da portafoglio.prezzo_corrente
  "perc_blocco"      // calcolata
];

function sortData(data, column) {
  if (sortColumn === column) {
    sortDirection = sortDirection === "asc" ? "desc" : "asc";
  } else {
    sortColumn = column;
    sortDirection = "desc";
  }

  const copy = [...data];

  copy.sort((a, b) => {
    const vA = a[column];
    const vB = b[column];

    const nA = Number(vA);
    const nB = Number(vB);

    // numerico
    if (isFinite(nA) && isFinite(nB)) {
      return sortDirection === "asc" ? nA - nB : nB - nA;
    }

    // stringhe
    const sA = vA == null ? "" : String(vA);
    const sB = vB == null ? "" : String(vB);
    return sortDirection === "asc" ? sA.localeCompare(sB) : sB.localeCompare(sA);
  });

  return copy;
}

// ===============================
// CARICA DATI (score + portafoglio join) + calcoli
// ===============================
async function loadScoreData() {
  try {
    // 1) PORTAFOGLIO (per prezzo_corrente)
    const snapPtf = await getDocs(collection(db, "portafoglio"));
    const ptfMap = new Map();

    snapPtf.forEach(docSnap => {
      const d = docSnap.data() || {};
      const key = String(d.nome || docSnap.id || "").trim().toUpperCase();
      if (!key) return;
      ptfMap.set(key, d);
    });

    // 2) SCORE
    const snapScore = await getDocs(collection(db, "score"));
    let rows = [];
    snapScore.forEach(docSnap => {
      const s = docSnap.data() || {};
      const ticker = String(s.ticker || docSnap.id || "").trim().toUpperCase();
      if (!ticker) return;

      const ptf = ptfMap.get(ticker) || {};
      const valoreAttuale = Number(ptf.prezzo_corrente || 0);

      rows.push({
        blocco: String(s.blocco || "").trim().toUpperCase(),
        ticker,

        // valori dal documento score (nel tuo excel sono già “percentuali” tipo 6.55)
        perf_12m: Number(s.perf_12m ?? 0),
        rendimento: Number(s.rendimento ?? 0),
        payback: Number(s.payback ?? 0),

        // nel tuo DB può chiamarsi perc o perc_portafoglio
        perc: Number((s.perc_portafoglio ?? s.perc) ?? 0),

        score: Number(s.score ?? 0),

        // join
        valore_attuale: valoreAttuale,

        // calcolata dopo
        perc_blocco: 0
      });
    });

    // 3) calcolo %blocco su somma prezzo_corrente
    const totale = rows.reduce((acc, r) => acc + (Number(r.valore_attuale) || 0), 0);

    const sumByBlocco = new Map();
    rows.forEach(r => {
      const b = r.blocco || "";
      const v = Number(r.valore_attuale) || 0;
      sumByBlocco.set(b, (sumByBlocco.get(b) || 0) + v);
    });

    rows.forEach(r => {
      const bloccoSum = sumByBlocco.get(r.blocco || "") || 0;
      r.perc_blocco = totale > 0 ? (bloccoSum / totale) * 100 : 0;
    });

    // ordinamento iniziale
    rows = sortData(rows, "score");

    renderTable(rows);
    computeSummary(rows);
    enableSorting(rows);

  } catch (err) {
    console.error("Errore caricamento score:", err);
  }
}

// ===============================
// RENDER TABELLA (SOLO colonne richieste)
// ===============================
function renderTable(rows) {
  tableBody.innerHTML = "";

  rows.forEach(r => {
    const tr = document.createElement("tr");

    if (r.blocco) {
    tr.classList.add("blocco-" + r.blocco);
  }
    const blocco = r.blocco || "-";
    const ticker = r.ticker || "-";
    const perf12 = colorPercInline(r.perf_12m);
    const rendimento = colorPercInline(r.rendimento);
    const payback = colorPercInline(r.payback);
    const perc = colorPercInline(r.perc);
    const score = colorScore(r.score);
    const valoreAttuale = colorEuroInline(r.valore_attuale);
    const percBlocco = colorPercInline(r.perc_blocco);

    tr.innerHTML = `
      <td>${blocco}</td>
      <td>${ticker}</td>
      <td>${perf12}</td>
      <td>${rendimento}</td>
      <td>${payback}</td>
      <td>${perc}</td>
      <td>${score}</td>
      <td>${valoreAttuale}</td>
      <td>${percBlocco}</td>
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
  document.querySelector("#topTicker").innerText = sorted[0]?.ticker || "-";
  document.querySelector("#worstTicker").innerText = sorted[sorted.length - 1]?.ticker || "-";
}

// ===============================
// ABILITA ORDINAMENTO CLICK COLONNE
// ===============================
function enableSorting(rows) {
  const headers = document.querySelectorAll("#scoreTable th");

  headers.forEach((th, index) => {
    th.style.cursor = "pointer";

    th.addEventListener("click", () => {
      const columnName = visibleColumns[index] || "score";
      const sorted = sortData(rows, columnName);
      renderTable(sorted);
    });
  });
}

// ===============================
// AVVIO
// ===============================
loadScoreData();
