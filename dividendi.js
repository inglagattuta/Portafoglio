// dividendi.js
import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

console.log("dividendi.js loaded");

let rows = [];
let viewRows = [];
let currentSort = { column: "nome", asc: true };

// helper
const fmtEuro = v => Number(v || 0).toFixed(2) + " €";

// colori per tipologia
function getTypeColor(tip) {
  if (!tip) return "#8884";
  const t = String(tip).toLowerCase();
  if (t.includes("etf")) return "#0095ff";
  if (t.includes("bond") || t.includes("obbl")) return "#9c27b0";
  if (t.includes("reit")) return "#ff9800";
  if (t.includes("stock") || t.includes("azione")) return "#4caf50";
  return "#8884";
}

// ---------------------------
// PARTE A: DATI PORTAFOGLIO
// ---------------------------
async function loadDividendiData() {
  try {
    const qsnap = await getDocs(collection(db, "portafoglio"));
    // Firestore v11: qsnap.docs exists
    rows = qsnap.docs.map(d => ({ id: d.id, ...d.data() }));

    console.log("portafoglio rows fetched:", rows.length, rows);
    // protezione: assicurati campo 'dividendi' numerico
    rows = rows.map(r => ({ ...r, dividendi: Number(r.dividendi || 0) }));
    rows = rows.filter(r => Number(r.dividendi) > 0);
    viewRows = [...rows];

    renderAll();
  } catch (err) {
    console.error("Errore caricamento portafoglio:", err);
  }
}

function renderAll() {
  renderStats(viewRows);
  renderCards(viewRows);
  renderTopChart(viewRows);
}

// CARDS
function renderCards(data) {
  const container = document.getElementById("cardsContainer");
  if (!container) return;

  if (!data.length) {
    container.innerHTML = `<div class="card-item"><div class="card-name">Nessun titolo a dividendo trovato</div></div>`;
    return;
  }

  container.innerHTML = data.map(r => {
    const tip = r.tipologia || "-";
    const bgcolor = getTypeColor(tip);
    const perc = (Number(r.percentuale_portafoglio || 0) * 100).toFixed(2);
    const profitto = (Number(r.prezzo_corrente || 0) - Number(r.prezzo_acquisto || 0))
      + Number(r.dividendi || 0) + Number(r.prelevato || 0);
    const yieldPerc = ((Number(r.dividendi || 0) / (Number(r.prezzo_acquisto || 1))) * 100).toFixed(2);

    return `
      <article class="card-item" role="article" tabindex="0">
        <div class="card-header">
          <h3 class="card-title">${r.nome || r.id || "N/A"}</h3>
          <span class="card-badge" style="background:${bgcolor}; color:white; font-weight:600; padding:3px 8px; border-radius:999px;">
            ${tip}
          </span>
        </div>
        <div class="card-body">
          <div class="card-row"><span>Dividendo:</span><strong>${fmtEuro(r.dividendi)}</strong></div>
          <div class="card-row"><span>Prezzo:</span><strong>${fmtEuro(r.prezzo_corrente || r.prezzo_acquisto)}</strong></div>
          <div class="card-row"><span>% Portafoglio:</span><strong>${perc}%</strong></div>
        </div>
        <div class="card-footer">
          <span>Profitto: <b>${fmtEuro(profitto)}</b></span>
          <span>Yield: <b>${yieldPerc}%</b></span>
        </div>
      </article>`;
  }).join("");
}

// STATISTICHE
function renderStats(data) {
  const totale = data.reduce((s, x) => s + Number(x.dividendi || 0), 0);
  const media = data.length ? totale / 12 : 0;
  const totaleInvestito = data.reduce((s, x) => s + Number(x.prezzo_acquisto || 0), 0);
  const totaleValore = data.reduce((s, x) => s + Number(x.prezzo_corrente || 0), 0);
  const yieldPerc = totaleValore ? (totale / totaleValore * 100) : 0;

  safeSetText("totaleDividendi", fmtEuro(totale));
  safeSetText("mediaDividendi", fmtEuro(media));
  safeSetText("totaleInvestito", fmtEuro(totaleInvestito));
  safeSetText("divYield", `${yieldPerc.toFixed(2)}%`);
}

function safeSetText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

// TOP CHART (titoli)
let chartTop = null;
function renderTopChart(data) {
  const top10 = [...data].sort((a,b) => Number(b.dividendi)-Number(a.dividendi)).slice(0,10);
  const canvas = document.getElementById("chartTopDiv");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const labels = top10.map(x => x.nome || x.id || "N/A");
  const values = top10.map(x => Number(x.dividendi || 0));
  const colors = ["#4caf50","#81c784","#43a047","#66bb6a","#388e3c","#aed581","#2e7d32","#9ccc65","#1b5e20","#c5e1a5"];

  if (chartTop) chartTop.destroy();
  chartTop = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ label: "Dividendi €", data: values, backgroundColor: colors }] },
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}} }
  });
}

// ---------------------------
// PARTE B: DIVIDENDI MENSILI
// ---------------------------
const tbody = () => document.getElementById("tbodyDividendiMese");
const addMonthBtn = () => document.getElementById("addMonthBtn");
const modalEl = () => document.getElementById("modalEditMonth");
const detailListEl = () => document.getElementById("detailList");
const ctxMensile = () => document.getElementById("dividendiChart");
let chartMensile = null;

async function loadMonths() {
  const tbodyEl = tbody();
  if (!tbodyEl) {
    console.warn("tbodyDividendiMese non trovato nel DOM.");
    return;
  }
  tbodyEl.innerHTML = "";

  try {
    const snap = await getDocs(collection(db, "dividendi_mensili"));
    const mesi = [];
    snap.forEach(d => mesi.push({ id: d.id, ...d.data() }));

    // ordinamento
    mesi.sort((a, b) => a.anno === b.anno ? String(a.mese).localeCompare(String(b.mese)) : a.anno - b.anno);

    // aggiorna grafico mensile
    buildBarChart(mesi);

    // render tabella
    mesi.forEach(m => {
      const totale = (m.dettaglio || []).reduce((sum, r) => sum + Number(r.importo || 0), 0).toFixed(2);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${m.anno}</td>
        <td>${m.mese}</td>
        <td>${totale} €</td>
        <td>${(m.dettaglio || []).length} titoli</td>
        <td><button class="dashboard-btn" data-id="${m.id}">✏️ Modifica</button></td>
      `;
      tbodyEl.appendChild(tr);
    });

    // bind pulsanti modifica
    document.querySelectorAll("button[data-id]").forEach(btn => btn.addEventListener("click", () => openEdit(btn.dataset.id)));
  } catch (err) {
    console.error("Errore loadMonths:", err);
  }
}

function buildBarChart(mesi) {
  const canvas = ctxMensile();
  if (!canvas) {
    console.warn("Canvas dividendiChart non trovato.");
    return;
  }
  const labels = mesi.map(m => `${m.anno}-${String(m.mese).padStart(2,"0")}`);
  const values = mesi.map(m => (m.dettaglio || []).reduce((s,r) => s + Number(r.importo || 0), 0));

  if (chartMensile) chartMensile.destroy();
  const ctx = canvas.getContext("2d");
  chartMensile = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ label: "Dividendi €", data: values }] },
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{ beginAtZero:true } } }
  });
}

// Modal / edit helpers
let editId = null;
let editData = null;

async function openEdit(id) {
  try {
    const snap = await getDocs(collection(db, "dividendi_mensili"));
    snap.forEach(d => { if (d.id === id) editData = { id: d.id, ...d.data() }; });

    if (!editData) {
      console.warn("record mese non trovato:", id);
      return;
    }
    editId = id;
    const modal = modalEl();
    if (!modal) return;
    document.getElementById("modalTitle").textContent = `Modifica ${editData.anno}-${editData.mese}`;
    document.getElementById("editYear").value = editData.anno;
    document.getElementById("editMonth").value = editData.mese;
    renderRows();
    modal.style.display = "flex";
  } catch (err) {
    console.error("Errore openEdit:", err);
  }
}

function renderRows() {
  const detailList = detailListEl();
  if (!detailList) return;
  detailList.innerHTML = "";

  (editData.dettaglio || []).forEach((row, idx) => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.gap = "10px";
    div.style.marginBottom = "6px";
    div.innerHTML = `
      <input type="text" placeholder="Ticker" value="${row.ticker || ""}" data-row="${idx}" data-field="ticker">
      <input type="number" placeholder="Importo" value="${row.importo || 0}" data-row="${idx}" data-field="importo">
      <button class="dashboard-btn" data-del="${idx}">🗑</button>
    `;
    detailList.appendChild(div);
  });

  // input listener
  detailList.querySelectorAll("input").forEach(inp => {
    inp.addEventListener("input", e => {
      const row = Number(e.target.dataset.row);
      const field = e.target.dataset.field;
      if (Number.isInteger(row)) editData.dettaglio[row][field] = e.target.value;
    });
  });

  // delete buttons bind
  detailList.querySelectorAll("button[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      editData.dettaglio.splice(Number(btn.dataset.del), 1);
      renderRows();
    });
  });
}

// ADD row, SAVE, CLOSE
function bindMonthControls() {
  const addRowBtn = document.getElementById("addRow");
  addRowBtn?.addEventListener("click", () => {
    if (!editData) return;
    editData.dettaglio.push({ ticker: "", importo: 0 });
    renderRows();
  });

  document.getElementById("saveMonth")?.addEventListener("click", async () => {
    try {
      if (!editId || !editData) return;
      const ref = doc(db, "dividendi_mensili", editId);
      await updateDoc(ref, {
        anno: Number(document.getElementById("editYear").value),
        mese: String(document.getElementById("editMonth").value).padStart(2, "0"),
        dettaglio: editData.dettaglio
      });
      document.getElementById("modalEditMonth").style.display = "none";
      await loadMonths();
      // anche ricarica portafoglio-derived stats se vuoi
    } catch (err) {
      console.error("Errore saveMonth:", err);
    }
  });

  document.getElementById("closeModal")?.addEventListener("click", () => {
    document.getElementById("modalEditMonth").style.display = "none";
  });

  addMonthBtn()?.addEventListener("click", async () => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      await addDoc(collection(db, "dividendi_mensili"), { anno: year, mese: month, dettaglio: [] });
      await loadMonths();
    } catch (err) {
      console.error("Errore addMonth:", err);
    }
  });
}

// ---------------
// SORT/SEARCH UI
// ---------------
let currentSortBtn = currentSort;
function sortView(column) {
  if (currentSort.column === column) currentSort.asc = !currentSort.asc;
  else { currentSort.column = column; currentSort.asc = true; }

  viewRows.sort((a,b) => {
    let A,B;
    if (column === "yield") {
      A = Number(a.dividendi || 0) / (Number(a.prezzo_acquisto || 1));
      B = Number(b.dividendi || 0) / (Number(b.prezzo_acquisto || 1));
    } else {
      A = a[column] ?? "";
      B = b[column] ?? "";
      const nA = Number(A), nB = Number(B);
      if (!isNaN(nA) && !isNaN(nB)) return currentSort.asc ? nA-nB : nB-nA;
    }
    return currentSort.asc ? String(A).localeCompare(String(B)) : String(B).localeCompare(String(A));
  });

  updateSortButtonsUI();
  renderAll();
}
function updateSortButtonsUI() {
  document.querySelectorAll(".sort-btn").forEach(btn => {
    const col = btn.dataset.column;
    btn.classList.toggle("active", col === currentSort.column);
    const ind = btn.querySelector(".sort-indicator");
    if (ind) ind.textContent = col === currentSort.column ? (currentSort.asc ? "↑" : "↓") : "↕";
  });
}
function applySearchAndFilter() {
  const q = (document.getElementById("searchCard")?.value || "").trim().toLowerCase();
  const typ = (document.getElementById("filterType")?.value || "").trim();
  viewRows = rows.filter(r => {
    if (typ && String(r.tipologia || "").toLowerCase() !== typ.toLowerCase()) return false;
    if (q && !(String(r.nome || "").toLowerCase().includes(q))) return false;
    return true;
  });
  sortView(currentSort.column);
}

function bindControls() {
  document.querySelectorAll(".sort-btn").forEach(btn => btn.addEventListener("click", () => sortView(btn.dataset.column)));
  document.getElementById("searchCard")?.addEventListener("input", applySearchAndFilter);
  document.getElementById("filterType")?.addEventListener("change", applySearchAndFilter);
}

// -------------------
// STARTUP
// -------------------
document.addEventListener("DOMContentLoaded", () => {
  bindControls();
  bindMonthControls();
  loadDividendiData(); // portafooglio -> cards + top chart + stats
  loadMonths();        // dividendi_mensili -> tabella + grafico mensile
});
