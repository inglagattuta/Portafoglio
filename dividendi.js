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
  if (!tip) return "var(--card-default)";
  const t = tip.toLowerCase();
  if (t.includes("etf")) return "var(--card-etf)";
  if (t.includes("bond") || t.includes("obbl")) return "var(--card-bond)";
  if (t.includes("reit")) return "var(--card-reit)";
  if (t.includes("stock") || t.includes("azione")) return "var(--card-stock)";
  return "var(--card-default)";
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

function renderCards(data) {
  const container = document.getElementById("cardsContainer");
  if (!container) return;

  if (!data.length) {
    container.innerHTML = `
      <div class="card-item">
        <div class="card-name">Nessun titolo a dividendo trovato</div>
      </div>`;
    return;
  }

  container.innerHTML = data
    .map((r) => {
      const tip = (r.tipologia || "").trim().toLowerCase();
      
      // Gradient moderni
      let gradient = "linear-gradient(135deg, #888 0%, #bbb 100%)"; // default grigio
      if (tip === "etf") gradient = "linear-gradient(135deg, #0095ff 0%, #00d4ff 100%)";
      else if (tip === "azione") gradient = "linear-gradient(135deg, #4caf50 0%, #81e07f 100%)";

      const perc = (Number(r.percentuale_portafoglio || 0) * 100).toFixed(2);

      return `
      <article class="card-item"
        style="border-left: 10px solid transparent; background: ${gradient};"
        role="article" tabindex="0" aria-labelledby="name-${r.id}">

        <div class="card-header" style="background: rgba(255,255,255,0.15); padding: 6px 10px; border-radius: 6px;">
          <h3 class="card-title" id="name-${r.id}" style="color: #fff;">${r.nome}</h3>
          <span class="card-badge" style="background: rgba(0,0,0,0.25); color:#fff; font-weight:600; padding: 3px 8px; border-radius: 999px;">
            ${r.tipologia || "-"}
          </span>
        </div>

        <div class="card-body" style="color: #fff; margin-top: 10px;">
          <div class="card-row">
            <span>Dividendo:</span>
            <strong>${fmtEuro(r.dividendi)}</strong>
          </div>
          <div class="card-row">
            <span>Prezzo:</span>
            <strong>${fmtEuro(r.prezzo_corrente || r.prezzo_acquisto)}</strong>
          </div>
          <div class="card-row">
            <span>% Portafoglio:</span>
            <strong>${perc}%</strong>
          </div>
        </div>

        <div class="card-footer" style="margin-top: 10px; display:flex; justify-content:space-between; color:#fff;">
          <span>Profitto: <b>${fmtEuro(r.profitto)}</b></span>
          <span>Yield: <b>${(Number(r.rendimento_percentuale || 0) * 100).toFixed(2)}%</b></span>
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
  const top = data.length ? data.reduce((mx, r) => r.dividendi > mx.dividendi ? r : mx, data[0]) : null;

  const totaleValore = data.reduce((s, x) => s + Number(x.prezzo_corrente || 0), 0);
  const yieldPerc = totaleValore ? (totale / totaleValore * 100) : 0;

  document.getElementById("totaleDividendi").textContent = fmtEuro(totale);
  document.getElementById("mediaDividendi").textContent = fmtEuro(media);
  document.getElementById("topDividendo").textContent = top ? `${top.nome} (${fmtEuro(top.dividendi)})` : "-";
  document.getElementById("divYield").textContent = `${yieldPerc.toFixed(2)}%`;
}

// ===================================================
// CHART TOP5 MODERNO
// ===================================================
let chartTop = null;

function renderChart(data) {
  const top10 = [...data]
    .sort((a, b) => Number(b.dividendi) - Number(a.dividendi))
    .slice(0, 10);

  const canvas = document.getElementById("chartTopDiv");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Colori diversi per ogni barra
  const colors = [
    "#4caf50", "#81c784", "#43a047", "#66bb6a", "#388e3c",
    "#aed581", "#2e7d32", "#9ccc65", "#1b5e20", "#c5e1a5"
  ];

  try {
    if (chartTop) chartTop.destroy();
    chartTop = new Chart(ctx, {
      type: "bar",
      data: {
        labels: top10.map(x => x.nome),
        datasets: [{
          label: "Dividendi €",
          data: top10.map(x => Number(x.dividendi)),
          backgroundColor: colors,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { 
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${ctx.formattedValue} €`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { drawBorder: false }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  } catch (e) {
    console.error("Errore Chart:", e);
  }
}

// ===================================================
// SORTING + SEARCH + FILTER
// ===================================================
function sortView(column) {
  if (currentSort.column === column) currentSort.asc = !currentSort.asc;
  else { currentSort.column = column; currentSort.asc = true; }

  viewRows.sort((a,b) => {
    const A = a[column] ?? "";
    const B = b[column] ?? "";
    const nA = Number(A), nB = Number(B);

    if (!isNaN(nA) && !isNaN(nB)) {
      return currentSort.asc ? nA - nB : nB - nA;
    }
    return currentSort.asc
      ? String(A).localeCompare(String(B))
      : String(B).localeCompare(String(A));
  });

  updateSortButtonsUI();
  renderAll();
}

function updateSortButtonsUI() {
  document.querySelectorAll(".sort-btn").forEach(btn => {
    const col = btn.dataset.column;
    btn.classList.toggle("active", col === currentSort.column);
    const ind = btn.querySelector(".sort-indicator");
    if (col === currentSort.column) ind.textContent = currentSort.asc ? "↑" : "↓";
    else ind.textContent = "↕";
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
  document.querySelectorAll(".sort-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      sortView(btn.dataset.column);
    });
  });

  const search = document.getElementById("searchCard");
  if (search) {
    search.addEventListener("input", applySearchAndFilter);
  }

  const filter = document.getElementById("filterType");
  if (filter) {
    filter.addEventListener("change", applySearchAndFilter);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  bindControls();
  loadDividendiData();
});
