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
const fmtItEur0 = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

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
  B2: { target: 7, bandInf: 4, bandSup: 10 },
  C: { target: 3, bandInf: 1, bandSup: 5 }
};

const bloccoOrder = { A1: 1, A2: 2, A3: 3, A4: 4, B1: 5, B2: 6, C: 7 };

// ✅ COLORE % BLOCCO NELLA LISTA TITOLI (in base alle bande del blocco)
function colorPercBlocco(value, blocco) {
  const num = Number(value);
  if (!isFinite(num)) return "-";

  const b = String(blocco || "").trim().toUpperCase();
  const cfg = blocchiConfig[b];
  if (!cfg) return `<span style="font-weight:800;">${fmtItPct.format(num)}%</span>`;

  let color = "#00b894"; // verde
  if (num < cfg.bandInf) color = "#b59d00"; // giallo
  else if (num > cfg.bandSup) color = "#d63031"; // rosso

  return `<span style="color:${color};font-weight:800;">${fmtItPct.format(num)}%</span>`;
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
  "perc",
  "score",
  "valore_attuale",
  "perc_blocco",
  "perc_ticker_blocco",
  "valutazione" // ✅ nuova colonna
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
// SALVATAGGIO VALUTAZIONE SU FIREBASE
// ===============================
async function saveValutazioneToFirebase(ticker, valutazione) {
  const t = String(ticker || "").trim().toUpperCase();
  if (!t) return;

  // max 10 char hard-safe
  const v = String(valutazione || "").trim().slice(0, 10);

  try {
    // i tuoi doc score sono già indicizzati per ticker (docId = ticker)
    await updateDoc(doc(db, "score", t), {
      valutazione: v,
      valutazione_updatedAt: new Date()
    });
  } catch (err) {
    console.error("Errore salvataggio valutazione:", t, err);
  }
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

  if (p < bandInf) return "blocco-warning";
  if (p > bandSup) return "blocco-danger";
  return "blocco-ok";
}

function renderBlocchiSummary(rows) {
  ensureBlocchiTable();
  blocchiBody.innerHTML = "";

  const totale = rows.reduce((acc, r) => acc + (Number(r.valore_attuale) || 0), 0);

  const sumByBlocco = new Map();
  rows.forEach(r => {
    const b = String(r.blocco || "").trim().toUpperCase();
    const v = Number(r.valore_attuale) || 0;
    sumByBlocco.set(b, (sumByBlocco.get(b) || 0) + v);
  });

  let blocchiRows = Object.keys(blocchiConfig).map(b => {
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
    if (b.delta !== a.delta) return b.delta - a.delta;
    return (bloccoOrder[a.blocco] ?? 99) - (bloccoOrder[b.blocco] ?? 99);
  });
  const priorityMap = new Map();
  sortedForPriority.forEach((r, idx) => priorityMap.set(r.blocco, idx + 1));

  blocchiRows.sort((a, b) => (bloccoOrder[a.blocco] ?? 99) - (bloccoOrder[b.blocco] ?? 99));

  blocchiRows.forEach(r => {
    const tr = document.createElement("tr");

    const rowClass = getBloccoRowClass(r.pct, r.bandInf, r.bandSup);
    if (rowClass) tr.classList.add(rowClass);

    const euro = fmtEuro0(r.attuali);
    const pct = fmtPct(r.pct);
    const target = fmtPct(r.target);
    const bandInf = fmtPct(r.bandInf);
    const bandSup = fmtPct(r.bandSup);

    const deltaTxt = fmtItInt.format(r.delta);
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

        perf_12m: Number(s.perf_12m ?? 0),
        rendimento: Number(s.rendimento ?? 0),
        payback: Number(s.payback ?? 0),

        perc: normalizePctForDisplay(s.perc_portafoglio ?? 0),
        score: Number(s.score ?? 0),

        valore_attuale: valoreAttuale,

        perc_blocco: 0,
        perc_ticker_blocco: 0,

        // ✅ nuova colonna
        valutazione: String(s.valutazione || "").trim().slice(0, 10)
      });
    });

    // 3) calcoli su prezzo_corrente
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

    rows = sortByBloccoThenScore(rows);

    renderTable(rows);
    renderBlocchiSummary(rows);
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

    if (r.blocco) tr.classList.add("blocco-" + r.blocco);

    const blocco = r.blocco || "-";
    const ticker = r.ticker || "-";
    const perf12 = colorPercInline(r.perf_12m);
    const rendimento = colorPercInline(r.rendimento);
    const payback = colorPercInline(r.payback);
    const perc = colorPercInline(r.perc);
    const score = colorScore(r.score);
    const valoreAttuale = colorEuroInline0(r.valore_attuale);

    const percBlocco = colorPercBlocco(r.perc_blocco, r.blocco);
    const percTickerBlocco = colorPctTickerNelBlocco(r.perc_ticker_blocco, r.blocco);

    // ✅ input valutazione
    const valutazioneValue = String(r.valutazione || "").slice(0, 10);

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
      <td></td>
    `;

    // crea input e aggancialo nell’ultima cella
    const tdVal = tr.lastElementChild;
    const inp = document.createElement("input");
    inp.type = "text";
    inp.maxLength = 10;
    inp.value = valutazioneValue;
    inp.placeholder = "";
    inp.setAttribute("aria-label", `Valutazione ${ticker}`);

    // stile: verde forte ma leggibile
    inp.style.width = "100%";
    inp.style.boxSizing = "border-box";
    inp.style.padding = "6px 8px";
    inp.style.borderRadius = "8px";
    inp.style.border = "1px solid rgba(0,0,0,0.08)";
    inp.style.background = "#34c759";  // verde “forte” non aggressivo
    inp.style.color = "#ffffff";
    inp.style.fontWeight = "800";
    inp.style.textTransform = "uppercase";
    inp.style.outline = "none";

    // focus più chiaro
    inp.addEventListener("focus", () => {
      inp.style.filter = "brightness(1.05)";
    });
    inp.addEventListener("blur", async () => {
      inp.style.filter = "none";

      const newVal = String(inp.value || "").trim().slice(0, 10).toUpperCase();
      inp.value = newVal;

      // evita scritture inutili
      if (newVal === (String(r.valutazione || "").trim().slice(0, 10).toUpperCase())) return;

      // aggiorna cache locale
      r.valutazione = newVal;

      // salva su Firestore
      await saveValutazioneToFirebase(ticker, newVal);
    });

    // Invio = salva e toglie focus (tipo Excel)
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        inp.blur();
      }
    });

    tdVal.appendChild(inp);

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
      renderBlocchiSummary(sorted);
    });
  });
}

// ===============================
// AVVIO
// ===============================
loadScoreData();
