// dividendi.js
import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

console.log("dividendi.js loaded");

let rows = [];
let viewRows = [];
let currentSort = { column: "nome", asc: true };

// helper formatting
const fmtEuro = v => Number(v || 0).toFixed(2) + " €";

// ============ COLORI PER TIPOLOGIA =============
function getTypeColor(tip) {
  if (!tip) return "#8884";
  const t = tip.toLowerCase();
  if (t.includes("etf")) return "#0095ff";
  if (t.includes("bond") || t.includes("obbl")) return "#9c27b0";
  if (t.includes("reit")) return "#ff9800";
  if (t.includes("stock") || t.includes("azione")) return "#4caf50";
  return "#8884";
}

// ===============================================
async function loadDividendiData() {
  try {
    const snap = await getDocs(collection(db, "portafoglio"));
    rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    rows = rows.filter(r => Number(r.dividendi) > 0);
    viewRows = [...rows];

    renderAll();
  } catch (e) {
    console.error("Errore caricamento dividendi:", e);
  }
}

function renderAll() {
  renderStats(viewRows);
  renderCards(viewRows);
  renderChart(viewRows);
}

// ===================================================
// RENDER CARDS
// ===================================================
function renderCards(data) {
  const container = document.getElementById("cardsContainer");
  if (!container) return;

  if (!data.length) {
    container.innerHTML = `<div class="card-item"><div class="card-name">Nessun titolo a dividendo trovato</div></div>`;
    return;
  }

  container.innerHTML = data
    .map(r => {
      const tip = r.tipologia || "-";
      const bgcolor = getTypeColor(tip);
      const perc = (Number(r.percentuale_portafoglio || 0) * 100).toFixed(2);

      const profitto = 
        (Number(r.prezzo_corrente || 0) - Number(r.prezzo_acquisto || 0)) +
        Number(r.dividendi || 0) +
        Number(r.prelevato || 0);

      const yieldPerc = ((Number(r.dividendi || 0) / (Number(r.prezzo_acquisto || 1))) * 100).toFixed(2);

      return `
      <article class="card-item" role="article" tabindex="0">
        <div class="card-header">
          <h3 class="card-title">${r.nome}</h3>
          <span class="card-badge" style="background:${bgcolor}; color:white;">
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
    })
    .join("");
}

// ===================================================
// RENDER STATISTICHE
// ===================================================
function renderStats(data) {
  const totale = data.reduce((s, x) => s + Number(x.dividendi || 0), 0);
  const media = data.length ? totale / 12 : 0;
  const totaleInvestito = data.reduce((s, x) => s + Number(x.prezzo_acquisto || 0), 0);
  const totaleValore = data.reduce((s, x) => s + Number(x.prezzo_corrente || 0), 0);
  const yieldPerc = totaleValore ? (totale / totaleValore * 100) : 0;

  document.getElementById("totaleDividendi").textContent = fmtEuro(totale);
  document.getElementById("mediaDividendi").textContent = fmtEuro(media);
  document.getElementById("totaleInvestito").textContent = fmtEuro(totaleInvestito);
  document.getElementById("divYield").textContent = `${yieldPerc.toFixed(2)}%`;
}

// ===================================================
// CHART TOP 10
// ===================================================
let chartTop = null;

function renderChart(data) {
  const top10 = [...data]
    .sort((a, b) => Number(b.dividendi) - Number(a.dividendi))
    .slice(0, 10);

  const canvas = document.getElementById("chartTopDiv");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  if (chartTop) chartTop.destroy();
  chartTop = new Chart(ctx, {
    type: "bar",
    data: {
      labels: top10.map(x => x.nome),
      datasets: [{
        label:"Dividendi €",
        data: top10.map(x => Number(x.dividendi)),
        backgroundColor: "#4caf50"
      }]
    },
    options: { responsive: true, maintainAspectRatio:false }
  });
}

// ===================================================
// SORTING + SEARCH + FILTER
// ===================================================
function sortView(column) {
  if (currentSort.column === column) currentSort.asc = !currentSort.asc;
  else { currentSort.column = column; currentSort.asc = true; }

  viewRows.sort((a,b) => {
    let A,B;
    if(column==="yield"){
      A = Number(a.dividendi || 0) / (Number(a.prezzo_acquisto || 1));
      B = Number(b.dividendi || 0) / (Number(b.prezzo_acquisto || 1));
    } else {
      A = a[column] ?? "";
      B = b[column] ?? "";
      const nA = Number(A), nB = Number(B);
      if(!isNaN(nA) && !isNaN(nB)) return currentSort.asc ? nA-nB : nB-nA;
    }
    return currentSort.asc ? String(A).localeCompare(String(B)) : String(B).localeCompare(String(A));
  });

  renderAll();
}

function applySearchAndFilter() {
  const q = (document.getElementById("searchCard")?.value || "").toLowerCase();
  const typ = (document.getElementById("filterType")?.value || "").trim();

  viewRows = rows.filter(r => {
    if(typ && String(r.tipologia||"").toLowerCase()!==typ.toLowerCase()) return false;
    if(q && !(String(r.nome||"").toLowerCase().includes(q))) return false;
    return true;
  });

  sortView(currentSort.column);
}

document.addEventListener("DOMContentLoaded",()=>{
  loadDividendiData();
});
