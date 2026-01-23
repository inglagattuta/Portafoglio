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
const fmtItPct = new Intl.NumberFormat("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtItInt = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 });
const fmtItEur0 = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 });

function fmtPct(value) {
  const num = Number(value);
  if (!isFinite(num)) return "-";
  return fmtItPct.format(num) + "%";
}

function fmtEuro0(value) {
  const num = Number(value);
  if (!isFinite(num)) return fmtItEur0.format(0);
  return fmtItEur0.format(num);
}

function colorPercInline(value) {
  const num = Number(value);
  if (!isFinite(num)) return "-";
  const text = fmtItPct.format(num) + "%";
  if (num > 0) return `<span style="color:#00b894;font-weight:600;">${text}</span>`;
  if (num < 0) return `<span style="color:#d63031;font-weight:600;">${text}</span>`;
  return text;
}

function colorEuroInline0(value) {
  const num = Number(value);
  const text = fmtEuro0(num);
  if (!isFinite(num) || num === 0) return text;
  return `<span style="font-weight:700;">${text}</span>`;
}

// perc_portafoglio su Firestore è frazione (0..1) -> converti in %
function normalizePctForDisplay(v) {
  const n = Number(v);
  if (!isFinite(n)) return 0;
  return n <= 1 ? n * 100 : n;
}

// 🎯 COLORE PERSONALIZZATO PER SCORE
function colorScore(value) {
  if (value === null || value === undefined || value === "-") return "-";
  const num = Number(value);
  if (!isFinite(num)) return value;

  let color = "#d63031"; // rosso < 8
  if (num >= 12) color = "#00b894"; // verde
  else if (num >= 8) color = "#b59d00"; // giallo scuro

  return `<span style="color:${color};font-weight:800;">${fmtItPct.format(num)}</span>`;
}

// ✅ COLORE % TICKER NEL BLOCCO (soglie diverse per blocchi A e blocchi B)
function colorPctTickerNelBlocco(value, blocco) {
  const num = Number(value);
  if (!isFinite(num)) return "-";

  const b = String(blocco || "").trim().toUpperCase();

  // palette coerente
  const GREEN = "#00b894";
  const YELLOW = "#b59d00";
  const RED = "#d63031";

  const blocchiA = ["A1", "A2", "A3"];
  const blocchiB = ["A4", "B1", "B2"];

  let color = GREEN;

  if (blocchiA.includes(b)) {
    // Verde <7, Giallo 7-10, Rosso >10
    if (num > 10) color = RED;
    else if (num >= 7) color = YELLOW;
    else color = GREEN;
  } else if (blocchiB.includes(b)) {
    // Verde <40, Giallo 40-50, Rosso >50
    if (num > 50) color = RED;
    else if (num >= 40) color = YELLOW;
    else color = GREEN;
  } else {
    // fallback (es. C)
    if (num > 50) color = RED;
    else if (num >= 40) color = YELLOW;
    else color = GREEN;
  }

  return `<span style="color:${color};font-weight:800;">${fmtItPct.format(num)}%</span>`;
}

// ===============================
// CONFIG BLOCCHI (target e bande fisse)
// ===============================
const blocchiConfig = {
  A1: { target: 18, bandInf: 15, bandSup: 22 },
  A2: { target: 15, bandInf: 12, bandSup: 19 },
  A3: { target: 25, bandInf: 22, bandSup: 30 },
  A4: { target: 15, bandInf: 12, bandSup: 20 },
  B1: { target: 17, bandInf: 14, bandSup: 22 },
  B2: { target: 7,  bandInf: 4,  bandSup: 10 },
  C:  { target: 3,  bandInf: 1,  bandSup: 5  }
};

const bloccoOrder = { A1: 1, A2: 2, A3: 3, A4: 4, B1: 5, B2: 6, C: 7 };

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
  "perc",               // % (da perc_portafoglio -> %)
  "score",
  "valore_attuale",     // da portafoglio.prezzo_corrente
  "perc_blocco",        // calcolata su prezzo_corrente
  "perc_ticker_blocco"  // % ticker nel blocco
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

// ✅ ordinamento default: blocco (A1..C) poi score desc
function sortByBloccoThenScore(rows) {
  return [...rows].sort((a, b) => {
    const ba = bloccoOrder[a.blocco] ?? 99;
    const bb = bloccoOrder[b.blocco] ?? 99;
    if (ba !== bb) return ba - bb;

    const sa = Number(a.score) || 0;
    const sb = Number(b.score) || 0;
    return sb - sa;
  });
}

// ===============================
// RIEPILOGO BLOCCHI (DOM + render)
// ===============================
let blocchiCard = null;
let blocchiBody = null;

function ensureBlocchiTable() {
  if (blocchiCard && blocchiBody) return;

  blocchiCard = document.createElement("div");
  blocchiCard.className = "table-card";
  blocchiCard.innerHTML = `
    <h2>Riepilogo Blocchi</h2>
    <table id="blocchiTable">
      <thead>
        <tr>
          <th>Blocco</th>
          <th>€ attuali</th>
          <th>%</th>
          <th>% Target</th>
          <th>Banda Inferiore</th>
          <th>Banda Superiore</th>
          <th>Delta</th>
          <th>Priorità</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  `;

  // la mettiamo sotto la tabella score (prima table-card presente = quella score)
  const cards = container.querySelectorAll(".table-card");
  const lastCard = cards[cards.length - 1] || null;
  if (lastCard && lastCard.parentNode) lastCard.parentNode.insertBefore(blocchiCard, lastCard.nextSibling);
  else container.appendChild(blocchiCard);

  blocchiBody = blocchiCard.querySelector("tbody");
}

function renderBlocchiSummary(rows) {
  ensureBlocchiTable();
  blocchiBody.innerHTML = "";

  // totale e somme per blocco
  const totale = rows.reduce((acc, r) => acc + (Number(r.valore_attuale) || 0), 0);

  const sumByBlocco = new Map();
  rows.forEach(r => {
    const b = String(r.blocco || "").trim().toUpperCase();
    const v = Number(r.valore_attuale) || 0;
    sumByBlocco.set(b, (sumByBlocco.get(b) || 0) + v);
  });

  // costruisco record per tutti i blocchi del config (anche se vuoti)
  let blocchiRows = Object.keys(blocchiConfig).map(b => {
    const curr = sumByBlocco.get(b) || 0;
    const pct = totale > 0 ? (curr / totale) * 100 : 0;
    const cfg = blocchiConfig[b];

    // ✅ Delta in €: (totale * target%) - valore attuale blocco
    const targetValue = (totale * (cfg.target / 100));
    const delta = Math.round(targetValue - curr); // senza decimali

    return {
      blocco: b,
      attuali: curr,
      pct,
      target: cfg.target,
      bandInf: cfg.bandInf,
      bandSup: cfg.bandSup,
      delta
    };
  });

  // priorità: delta più alto = 1, più basso = 7 (stabile per ordine blocchi)
  const sortedForPriority = [...blocchiRows].sort((a, b) => {
    if (b.delta !== a.delta) return b.delta - a.delta; // desc
    return (bloccoOrder[a.blocco] ?? 99) - (bloccoOrder[b.blocco] ?? 99);
  });
  const priorityMap = new Map();
  sortedForPriority.forEach((r, idx) => priorityMap.set(r.blocco, idx + 1));

  // rendering in ordine blocchi A1..C
  blocchiRows.sort((a, b) => (bloccoOrder[a.blocco] ?? 99) - (bloccoOrder[b.blocco] ?? 99));

  blocchiRows.forEach(r => {
    const tr = document.createElement("tr");

    const euro = fmtEuro0(r.attuali);
    const pct = fmtPct(r.pct);
    const target = fmtPct(r.target);
    const bandInf = fmtPct(r.bandInf);
    const bandSup = fmtPct(r.bandSup);

    const deltaTxt = fmtItInt.format(r.delta); // numero senza decimali (anche negativo)
    const prio = priorityMap.get(r.blocco) ?? "-";

    tr.innerHTML = `
      <td>${r.blocco}</td>
      <td>${euro}</td>
      <td>${pct}</td>
      <td>${target}</td>
      <td>${bandInf}</td>
      <td>${bandSup}</td>
      <td>${deltaTxt}</td>
      <td>${prio}</td>
    `;

    blocchiBody.appendChild(tr);
  });
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

        // valori già in "punti percentuali" (es. 6.55) dal tuo import Excel
        perf_12m: Number(s.perf_12m ?? 0),
        rendimento: Number(s.rendimento ?? 0),
        payback: Number(s.payback ?? 0),

        // ✅ % portafoglio: in Firestore è frazione (0..1), la mostriamo in %
        perc: normalizePctForDisplay(s.perc_portafoglio ?? 0),

        score: Number(s.score ?? 0),

        // join
        valore_attuale: valoreAttuale,

        // calcolate dopo
        perc_blocco: 0,
        perc_ticker_blocco: 0
      });
    });

    // 3) calcoli su prezzo_corrente
    const totale = rows.reduce((acc, r) => acc + (Number(r.valore_attuale) || 0), 0);

    // somma valore attuale per blocco
    const sumByBlocco = new Map();
    rows.forEach(r => {
      const b = r.blocco || "";
      const v = Number(r.valore_attuale) || 0;
      sumByBlocco.set(b, (sumByBlocco.get(b) || 0) + v);
    });

    // assegna % blocco e % ticker nel blocco
    rows.forEach(r => {
      const bloccoSum = sumByBlocco.get(r.blocco || "") || 0;
      const v = Number(r.valore_attuale) || 0;

      // % blocco su totale portafoglio
      r.perc_blocco = totale > 0 ? (bloccoSum / totale) * 100 : 0;

      // % ticker nel blocco (valore ticker / totale blocco)
      r.perc_ticker_blocco = bloccoSum > 0 ? (v / bloccoSum) * 100 : 0;
    });

    // ✅ ordinamento iniziale: blocco poi score (desc)
    rows = sortByBloccoThenScore(rows);

    renderTable(rows);
    renderBlocchiSummary(rows); // ✅ nuova tabella sotto
    computeSummary(rows);
    enableSorting(rows);

  } catch (err) {
    console.error("Errore caricamento score:", err);
  }
}

// ===============================
// RENDER TABELLA SCORE
// ===============================
function renderTable(rows) {
  tableBody.innerHTML = "";

  rows.forEach(r => {
    const tr = document.createElement("tr");

    // colore riga per blocco (se hai le classi CSS)
    if (r.blocco) tr.classList.add("blocco-" + r.blocco);

    const blocco = r.blocco || "-";
    const ticker = r.ticker || "-";
    const perf12 = colorPercInline(r.perf_12m);
    const rendimento = colorPercInline(r.rendimento);
    const payback = colorPercInline(r.payback);
    const perc = colorPercInline(r.perc);
    const score = colorScore(r.score);
    const valoreAttuale = colorEuroInline0(r.valore_attuale);
    const percBlocco = colorPercInline(r.perc_blocco);

    // ✅ colori soglia per % ticker nel blocco
    const percTickerBlocco = colorPctTickerNelBlocco(r.perc_ticker_blocco, r.blocco);

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
      <td>${percTickerBlocco}</td>
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

  document.querySelector("#mediaScore").innerText = fmtItPct.format(avgScore);
  document.querySelector("#mediaRend").innerText = fmtItPct.format(avgRend) + "%";
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

      // ricalcolo riepilogo blocchi (non cambia, ma rimane consistente)
      renderBlocchiSummary(sorted);
    });
  });
}

// ===============================
// AVVIO
// ===============================
loadScoreData();
