// dividendi.js — versione pulita (solo portafoglio/cards/stats/top chart)
import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

console.log("dividendi.js loaded");

// ================================
// Stato locale
// ================================
let rows = [];
let viewRows = [];
let currentSort = { column: "nome", asc: true };

// ================================
// Helper
// ================================
const fmtEuro = v => Number(v || 0).toFixed(2) + " €";

// Colori per tipologia
function getTypeColor(tip) {
  if (!tip) return "#8884";
  const t = String(tip).toLowerCase();
  if (t.includes("etf")) return "#0095ff";
  if (t.includes("bond") || t.includes("obbl")) return "#9c27b0";
  if (t.includes("reit")) return "#ff9800";
  if (t.includes("stock") || t.includes("azione")) return "#4caf50";
  return "#8884";
}

// ================================
// Carica dati portafoglio
// ================================
async function loadDividendiData() {
  try {
    const qsnap = await getDocs(collection(db, "portafoglio"));
    rows = qsnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Assicurati campo 'dividendi' numerico
    rows = rows.map(r => ({ ...r, dividendi: Number(r.dividendi || 0) }));
    rows = rows.filter(r => Number(r.dividendi) > 0);
    viewRows = [...rows];

    renderAll();
  } catch (err) {
    console.error("Errore caricamento portafoglio:", err);
  }
}

// ================================
// Rendering completo
// ================================
function renderAll() {
  renderStats(viewRows);
  renderCards(viewRows);
  renderTopChart(viewRows);
}

// ================================
// Cards
// ================================
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

// ================================
// Statistiche
// ================================
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

// ================================
// Top chart
// ================================
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

// ================================
// SORT / SEARCH / FILTER
// ================================
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
const toggleCards = document.getElementById("toggleCards");
toggleCards?.addEventListener("change", () => {
  const container = document.getElementById("cardsContainer");
  if (!container) return;
  container.style.display = toggleCards.checked ? "grid" : "none";
});

// ================================
// Startup
// ================================
document.addEventListener("DOMContentLoaded", () => {
  bindControls();
  loadDividendiData();
});
