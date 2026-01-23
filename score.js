// score.js
// ===============================
// IMPORT FIREBASE
// ===============================
import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

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
  if (num > 0) return `<span style="color:#00b894;font-weight:700;">${text}</span>`;
  if (num < 0) return `<span style="color:#d63031;font-weight:700;">${text}</span>`;
  return text;
}

function colorEuroInline0(value) {
  const num = Number(value);
  const text = fmtEuro0(num);
  if (!isFinite(num) || num === 0) return text;
  return `<span style="font-weight:800;">${text}</span>`;
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

  return `<span style="color:${color};font-weight:900;">${fmtItPct.format(num)}</span>`;
}

// ✅ COLORE % TICKER NEL BLOCCO (soglie diverse per blocchi A e blocchi B)
function colorPctTickerNelBlocco(value, blocco) {
  const num = Number(value);
  if (!isFinite(num)) return "-";

  const b = String(blocco || "").trim().toUpperCase();

  const GREEN = "#00b894";
  const YELLOW = "#b59d00";
  const RED = "#d63031";

  const blocchiA = ["A1", "A2", "A3"];
  const blocchiB = ["A4", "B1", "B2"];

  let color = GREEN;

  if (blocchiA.includes(b)) {
    if (num > 10) color = RED;
    else if (num >= 7) color = YELLOW;
    else color = GREEN;
  } else if (blocchiB.includes(b)) {
    if (num > 50) color = RED;
    else if (num >= 40) color = YELLOW;
    else color = GREEN;
  } else {
    if (num > 50) color = RED;
    else if (num >= 40) color = YELLOW;
    else color = GREEN;
  }

  return `<span style="color:${color};font-weight:900;">${fmtItPct.format(num)}%</span>`;
}

// ✅ COLORE TESTO % BLOCCO (in tabella titoli): confronto con bande del blocco
function colorPctBlocco(value, blocco) {
  const num = Number(value);
  if (!isFinite(num)) return "-";

  const cfg = blocchiConfig[String(blocco || "").trim().toUpperCase()];
  if (!cfg) return `<span style="font-weight:900;">${fmtItPct.format(num)}%</span>`;

  const GREEN = "#00b894";
  const YELLOW = "#b59d00";
  const RED = "#d63031";

  let color = GREEN;
  if (num < cfg.bandInf) color = YELLOW;
  else if (num > cfg.bandSup) color = RED;

  return `<span style="color:${color};font-weight:900;">${fmtItPct.format(num)}%</span>`;
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

// soglie % (colonna "%", cioè perc_portafoglio convertita in %)
const percMaxByBlocco = {
  A1: 2.25,
  A2: 2.25,
  A3: 3.25,
  A4: 4.50,
  B1: 4.25,
  B2: 1.25,
  C:  3.00
};

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
  "perc",
  "score",
  "valore_attuale",
  "perc_blocco",
  "perc_ticker_blocco",
  "valutazione"
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

    if (column === "blocco") {
      const ba = bloccoOrder[String(vA || "").toUpperCase()] ?? 99;
      const bb = bloccoOrder[String(vB || "").toUpperCase()] ?? 99;
      return sortDirection === "asc" ? (ba - bb) : (bb - ba);
    }

    const nA = Number(vA);
    const nB = Number(vB);

    if (isFinite(nA) && isFinite(nB)) {
      return sortDirection === "asc" ? nA - nB : nB - nA;
    }

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
// FILTRO BLOCCO (UI)
// ===============================
let allRows = [];
let currentRows = [];
let selectedBlocco = "ALL";
let filterBar = null;
let bloccoSelect = null;

function ensureFilterUI() {
  if (filterBar) return;

  // trova la card della tabella score
  const scoreCard = container.querySelector(".table-card");
  if (!scoreCard) return;

  filterBar = document.createElement("div");
  filterBar.style.display = "flex";
  filterBar.style.gap = "10px";
  filterBar.style.alignItems = "center";
  filterBar.style.margin = "10px 0 14px 0";

  const lbl = document.createElement("label");
  lbl.textContent = "Filtro Blocco:";
  lbl.style.fontWeight = "700";

  bloccoSelect = document.createElement("select");
  bloccoSelect.style.padding = "8px 10px";
  bloccoSelect.style.borderRadius = "10px";
  bloccoSelect.style.border = "1px solid rgba(0,0,0,0.15)";
  bloccoSelect.style.fontWeight = "700";
  bloccoSelect.innerHTML = `
    <option value="ALL">Tutti</option>
    <option value="A1">A1</option>
    <option value="A2">A2</option>
    <option value="A3">A3</option>
    <option value="A4">A4</option>
    <option value="B1">B1</option>
    <option value="B2">B2</option>
    <option value="C">C</option>
  `;

  bloccoSelect.addEventListener("change", () => {
    selectedBlocco = bloccoSelect.value;
    applyFilterAndRender();
  });

  const btnReset = document.createElement("button");
  btnReset.textContent = "Reset";
  btnReset.style.padding = "8px 12px";
  btnReset.style.borderRadius = "10px";
  btnReset.style.border = "1px solid rgba(0,0,0,0.15)";
  btnReset.style.fontWeight = "800";
  btnReset.style.cursor = "pointer";
  btnReset.addEventListener("click", () => {
    selectedBlocco = "ALL";
    if (bloccoSelect) bloccoSelect.value = "ALL";
    applyFilterAndRender();
  });

  filterBar.appendChild(lbl);
  filterBar.appendChild(bloccoSelect);
  filterBar.appendChild(btnReset);

  // inserisci la barra filtro sotto il titolo h2 della card
  const h2 = scoreCard.querySelector("h2");
  if (h2 && h2.parentNode) h2.parentNode.insertBefore(filterBar, h2.nextSibling);
  else scoreCard.insertBefore(filterBar, scoreCard.firstChild);
}

function applyFilterAndRender() {
  // 1) filtro
  let filtered = allRows;
  if (selectedBlocco && selectedBlocco !== "ALL") {
    filtered = allRows.filter(r => String(r.blocco || "").toUpperCase() === selectedBlocco);
  }

  // 2) mantieni ordinamento corrente (se l'utente ha cliccato su un header)
  // se non ha mai cliccato nulla, il sortColumn rimane "score" ma noi vogliamo default blocco+score:
  if (sortColumn === "score" && sortDirection === "desc") {
    // ok, ma non vogliamo perdere il default: blocco poi score
    // se l'utente ha cliccato almeno una volta su un header, può cambiare sortColumn
    // qui usiamo un trucco: se non è mai stato impostato "hasUserSorted", usiamo default
  }

  currentRows = [...filtered];

  // se l'utente ha fatto sorting (hasUserSorted true), ordiniamo con sortData
  if (hasUserSorted) {
    currentRows = sortData(currentRows, sortColumn);
  } else {
    currentRows = sortByBloccoThenScore(currentRows);
  }

  renderTable(currentRows);

  // Riepilogo blocchi SEMPRE sul totale, non filtrato (così non “mente”)
  renderBlocchiSummary(allRows);

  // summary: sul filtro (più utile mentre filtri)
  computeSummary(currentRows);
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

  const cards = container.querySelectorAll(".table-card");
  const lastCard = cards[cards.length - 1] || null;
  if (lastCard && lastCard.parentNode) lastCard.parentNode.insertBefore(blocchiCard, lastCard.nextSibling);
  else container.appendChild(blocchiCard);

  blocchiBody = blocchiCard.querySelector("tbody");
}

function getBloccoRowClass(pct, bandInf, bandSup) {
  const p = Number(pct);
  if (!isFinite(p)) return "";

  if (p < bandInf) return "blocco-warning"; // giallo
  if (p > bandSup) return "blocco-danger";  // rosso
  return "blocco-ok";                       // verde
}

function buildBlocchiStats(rows) {
  const totale = rows.reduce((acc, r) => acc + (Number(r.valore_attuale) || 0), 0);

  const sumByBlocco = new Map();
  rows.forEach(r => {
    const b = String(r.blocco || "").trim().toUpperCase();
    const v = Number(r.valore_attuale) || 0;
    sumByBlocco.set(b, (sumByBlocco.get(b) || 0) + v);
  });

  const blocchiRows = Object.keys(blocchiConfig).map(b => {
    const curr = sumByBlocco.get(b) || 0;
    const pct = totale > 0 ? (curr / totale) * 100 : 0;
    const cfg = blocchiConfig[b];

    const targetValue = (totale * (cfg.target / 100));
    const delta = Math.round(targetValue - curr);

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

  const sortedForPriority = [...blocchiRows].sort((a, b) => {
    if (b.delta !== a.delta) return b.delta - a.delta; // desc
    return (bloccoOrder[a.blocco] ?? 99) - (bloccoOrder[b.blocco] ?? 99);
  });

  const priorityMap = new Map();
  sortedForPriority.forEach((r, idx) => priorityMap.set(r.blocco, idx + 1));

  return { totale, sumByBlocco, blocchiRows, priorityMap };
}

function renderBlocchiSummary(rows) {
  ensureBlocchiTable();
  blocchiBody.innerHTML = "";

  const { blocchiRows, priorityMap } = buildBlocchiStats(rows);

  blocchiRows.sort((a, b) => (bloccoOrder[a.blocco] ?? 99) - (bloccoOrder[b.blocco] ?? 99));

  blocchiRows.forEach(r => {
    const tr = document.createElement("tr");

    const rowClass = getBloccoRowClass(r.pct, r.bandInf, r.bandSup);
    if (rowClass) tr.classList.add(rowClass);

    tr.innerHTML = `
      <td>${r.blocco}</td>
      <td>${fmtEuro0(r.attuali)}</td>
      <td>${fmtPct(r.pct)}</td>
      <td>${fmtPct(r.target)}</td>
      <td>${fmtPct(r.bandInf)}</td>
      <td>${fmtPct(r.bandSup)}</td>
      <td>${fmtItInt.format(r.delta)}</td>
      <td>${priorityMap.get(r.blocco) ?? "-"}</td>
    `;

    blocchiBody.appendChild(tr);
  });
}

// ===============================
// VALUTAZIONE: regole colore cella
// ===============================
function shouldValutazioneBeRed(row) {
  const blocco = String(row.blocco || "").trim().toUpperCase();

  // (1) priorità blocco
  const prio = Number(row.blocco_priority);
  const condPriority = !(prio === 1 || prio === 2);

  // (2) % ticker nel blocco
  const ptb = Number(row.perc_ticker_blocco);
  const blocchiA = ["A1", "A2", "A3"];
  const blocchiB = ["A4", "B1", "B2"];
  let condTickerNelBlocco = false;
  if (isFinite(ptb)) {
    if (blocchiA.includes(blocco)) condTickerNelBlocco = ptb > 10;
    else if (blocchiB.includes(blocco)) condTickerNelBlocco = ptb > 50;
    else condTickerNelBlocco = ptb > 50;
  }

  // (3) % portafoglio (colonna %)
  const p = Number(row.perc); // già in %
  const thr = percMaxByBlocco[blocco];
  const condPerc = isFinite(p) && isFinite(thr) ? (p > thr) : false;

  return condPriority || condTickerNelBlocco || condPerc;
}

function applyValutazioneStyle(inputEl, isRed) {
  const GREEN_BG = "rgba(46, 204, 113, 0.65)";
  const RED_BG = "rgba(255, 118, 117, 0.75)";

  inputEl.style.background = isRed ? RED_BG : GREEN_BG;
  inputEl.style.border = "1px solid rgba(0,0,0,0.15)";
  inputEl.style.borderRadius = "8px";
  inputEl.style.padding = "6px 10px";
  inputEl.style.fontWeight = "800";
  inputEl.style.textAlign = "center";
  inputEl.style.width = "100%";
  inputEl.style.maxWidth = "160px";
  inputEl.style.outline = "none";
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

        perf_12m: Number(s.perf_12m ?? 0),
        rendimento: Number(s.rendimento ?? 0),
        payback: Number(s.payback ?? 0),

        // % portafoglio (frazione -> %)
        perc: normalizePctForDisplay(s.perc_portafoglio ?? 0),

        score: Number(s.score ?? 0),

        valore_attuale: valoreAttuale,

        perc_blocco: 0,
        perc_ticker_blocco: 0,

        valutazione: String(s.valutazione || "").slice(0, 10),

        blocco_priority: null
      });
    });

    // 3) calcoli
    const totale = rows.reduce((acc, r) => acc + (Number(r.valore_attuale) || 0), 0);

    const sumByBlocco = new Map();
    rows.forEach(r => {
      const b = r.blocco || "";
      const v = Number(r.valore_attuale) || 0;
      sumByBlocco.set(b, (sumByBlocco.get(b) || 0) + v);
    });

    rows.forEach(r => {
      const bloccoSum = sumByBlocco.get(r.blocco || "") || 0;
      const v = Number(r.valore_attuale) || 0;

      r.perc_blocco = totale > 0 ? (bloccoSum / totale) * 100 : 0;
      r.perc_ticker_blocco = bloccoSum > 0 ? (v / bloccoSum) * 100 : 0;
    });

    // 4) priorità blocchi
    const { priorityMap } = buildBlocchiStats(rows);
    rows.forEach(r => {
      r.blocco_priority = priorityMap.get(r.blocco) ?? null;
    });

    // salva global e render iniziale
    allRows = sortByBloccoThenScore(rows);

    // UI filtro
    ensureFilterUI();

    // prima render: rispettando filtro corrente (di default ALL)
    applyFilterAndRender();

    // riepilogo blocchi sul totale
    renderBlocchiSummary(allRows);

    // sorting click
    enableSorting();

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

    const perf12 = colorPercInline(r.perf_12m);
    const rendimento = colorPercInline(r.rendimento);
    const payback = colorPercInline(r.payback);
    const perc = colorPercInline(r.perc);
    const score = colorScore(r.score);
    const valoreAttuale = colorEuroInline0(r.valore_attuale);

    const percBlocco = colorPctBlocco(r.perc_blocco, r.blocco);
    const percTickerBlocco = colorPctTickerNelBlocco(r.perc_ticker_blocco, r.blocco);

    const valutazioneTxt = String(r.valutazione || "").slice(0, 10);
    const valutazioneIsRed = shouldValutazioneBeRed(r);

    tr.innerHTML = `
      <td>${r.blocco || "-"}</td>
      <td>${r.ticker || "-"}</td>
      <td>${perf12}</td>
      <td>${rendimento}</td>
      <td>${payback}</td>
      <td>${perc}</td>
      <td>${score}</td>
      <td>${valoreAttuale}</td>
      <td>${percBlocco}</td>
      <td>${percTickerBlocco}</td>
      <td></td>
    `;

    // VALUTAZIONE input
    const tdVal = tr.querySelectorAll("td")[10];
    const inp = document.createElement("input");
    inp.type = "text";
    inp.maxLength = 10;
    inp.value = valutazioneTxt;
    inp.placeholder = "VALUT...";
    applyValutazioneStyle(inp, valutazioneIsRed);

    const save = async () => {
      const newVal = String(inp.value || "").trim().slice(0, 10);
      if (newVal === String(r.valutazione || "")) return;

      r.valutazione = newVal;

      try {
        await updateDoc(doc(db, "score", r.ticker), { valutazione: newVal });
      } catch (e) {
        console.error("Errore salvataggio valutazione:", r.ticker, e);
      }
    };

    inp.addEventListener("blur", save);
    inp.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        inp.blur();
      }
    });

    tdVal.appendChild(inp);

    tableBody.appendChild(tr);
  });
}

// ===============================
// BOX RIEPILOGATIVI (sul set passato)
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
let hasUserSorted = false;

function enableSorting() {
  const headers = document.querySelectorAll("#scoreTable th");

  headers.forEach((th, index) => {
    th.style.cursor = "pointer";

    th.addEventListener("click", () => {
      hasUserSorted = true;
      const columnName = visibleColumns[index] || "score";
      sortColumn = columnName;

      // alterna direzione come prima
      // (manteniamo la stessa logica dentro sortData)
      currentRows = sortData(currentRows, columnName);

      renderTable(currentRows);

      // riepilogo blocchi sul totale non filtrato
      renderBlocchiSummary(allRows);

      // summary sul filtrato
      computeSummary(currentRows);
    });
  });
}

// ===============================
// AVVIO
// ===============================
loadScoreData();
