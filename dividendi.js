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

// ===================================================
// RENDER CARDS
// ===================================================
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
      const tip = r.tipologia || "-";
      const bgcolor = getTypeColor(tip);
      const perc = (Number(r.percentuale_portafoglio || 0) * 100).toFixed(2);

      return `
      <article class="card-item"
        style="border-left: 10px solid ${bgcolor};"
        role="article" tabindex="0" aria-labelledby="name-${r.id}">

        <div class="card-header">
          <h3 class="card-title" id="name-${r.id}">${r.nome}</h3>
          <span class="card-badge" style="background:${bgcolor}; color:#fff;">
            ${tip}
          </span>
        </div>

        <div class="card-body">
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

        <div class="card-footer">
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
  const top5 = [...data].sort((a,b) => Number(b.dividendi)-Number(a.dividendi)).slice(0,5);
  const ctx = document.getElementById("chartTopDiv");
  if (!ctx) return;

  // Gradienti barre
  const colors = top5.map((_, i) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    switch(i) {
      case 0: gradient.addColorStop(0, 'rgba(75,192,192,0.8)'); gradient.addColorStop(1,'rgba(75,192,192,0.3)'); break;
      case 1: gradient.addColorStop(0, 'rgba(255,159,64,0.8)'); gradient.addColorStop(1,'rgba(255,159,64,0.3)'); break;
      case 2: gradient.addColorStop(0, 'rgba(153,102,255,0.8)'); gradient.addColorStop(1,'rgba(153,102,255,0.3)'); break;
      case 3: gradient.addColorStop(0, 'rgba(54,162,235,0.8)'); gradient.addColorStop(1,'rgba(54,162,235,0.3)'); break;
      case 4: gradient.addColorStop(0, 'rgba(255,99,132,0.8)'); gradient.addColorStop(1,'rgba(255,99,132,0.3)'); break;
      default: gradient.addColorStop(0,'rgba(200,200,200,0.8)'); gradient.addColorStop(1,'rgba(200,200,200,0.3)');
    }
    return gradient;
  });

  try {
    if (chartTop) chartTop.destroy();
    chartTop = new Chart(ctx, {
      type: "bar",
      data: {
        labels: top5.map(x => x.nome),
        datasets: [{
          label: "Dividendi €",
          data: top5.map(x => Number(x.dividendi)),
          backgroundColor: colors,
          borderRadius: 8,
          barPercentage: 0.6,
          categoryPercentage: 0.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#222',
            titleColor: '#fff',
            bodyColor: '#fff',
            padding: 10,
            cornerRadius: 6
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { drawBorder: false, color: 'rgba(200,200,200,0.2)' },
            ticks: { stepSize: 20, font: { size: 12 } }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 12, weight: '600' } }
          }
        },
        animation: { duration: 1000, easing: 'easeOutQuart' }
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
