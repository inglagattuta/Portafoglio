// dividendi.js
import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

console.log("dividendi.js loaded");

let rows = [];
let viewRows = [];
let currentSort = { column: "nome", asc: true };

// helpers
const fmtEuro = v => Number(v || 0).toFixed(2) + " €";
const fmtPerc = v => (Number(v || 0) * 100).toFixed(2) + " %";

async function loadDividendiData() {
  try {
    const snap = await getDocs(collection(db, "portafoglio"));
    rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // keep only those with dividends > 0
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

// --- RENDER CARDS ---
function renderCards(data) {
  const container = document.getElementById("cardsContainer");
  if (!container) return;
  if (!data.length) {
    container.innerHTML = `<div class="card-item"><div class="card-name">Nessun titolo a dividendo trovato</div></div>`;
    return;
  }

  container.innerHTML = data.map(r => {
    const tip = r.tipologia || "-";
    return `
      <article class="card-item" role="article" tabindex="0" aria-labelledby="name-${r.id}">
        <div class="card-top">
          <div class="card-name" id="name-${r.id}">${r.nome}</div>
          <div class="card-type">${tip}</div>
        </div>

        <div class="card-values">
          <div>
            <div class="value-primary">${fmtEuro(r.dividendi)}</div>
            <div class="value-secondary">Dividendo</div>
          </div>

          <div>
            <div class="value-primary">${fmtEuro(r.prezzo_corrente || r.prezzo_acquisto)}</div>
            <div class="value-secondary">Prezzo</div>
          </div>

          <div>
            <div class="value-primary">${(Number(r.percentuale_portafoglio||0)*100).toFixed(2)}%</div>
            <div class="value-secondary">% portaf.</div>
          </div>
        </div>

        <div class="card-footer">
          <div>Profitto: ${fmtEuro(r.profitto)}</div>
          <div>Yield: ${(Number(r.rendimento_percentuale||0)*100).toFixed(2)}%</div>
        </div>
      </article>
    `;
  }).join("");
}

// --- RENDER STATISTICHE (mini cards in alto) ---
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

// --- CHART TOP5 ---
let chartTop = null;
function renderChart(data) {
  const top5 = [...data].sort((a,b) => Number(b.dividendi)-Number(a.dividendi)).slice(0,5);
  const ctx = document.getElementById("chartTopDiv");
  if (!ctx) return;
  try {
    if (chartTop) chartTop.destroy();
    chartTop = new Chart(ctx, {
      type: "bar",
      data: {
        labels: top5.map(x => x.nome),
        datasets: [{
          label: "Dividendi €",
          data: top5.map(x => Number(x.dividendi)),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  } catch (e) {
    console.error("Errore Chart:", e);
  }
}

// --- SORTING / FILTER / SEARCH ---
function sortView(column) {
  if (currentSort.column === column) currentSort.asc = !currentSort.asc;
  else { currentSort.column = column; currentSort.asc = true; }

  viewRows.sort((a,b) => {
    const A = (a[column] !== undefined && a[column] !== null) ? a[column] : "";
    const B = (b[column] !== undefined && b[column] !== null) ? b[column] : "";
    // numeric?
    const nA = Number(A), nB = Number(B);
    if (!isNaN(nA) && !isNaN(nB)) {
      return currentSort.asc ? nA - nB : nB - nA;
    }
    // string compare
    const sA = String(A).toLowerCase();
    const sB = String(B).toLowerCase();
    return currentSort.asc ? sA.localeCompare(sB) : sB.localeCompare(sA);
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

  // apply current sort
  sortView(currentSort.column);
  // sortView will call renderAll
}

// --- EVENT LISTENERS ---
function bindControls() {
  document.querySelectorAll(".sort-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const col = btn.dataset.column;
      sortView(col);
    });
  });

  const search = document.getElementById("searchCard");
  if (search) {
    search.addEventListener("input", () => {
      applySearchAndFilter();
    });
  }

  const filter = document.getElementById("filterType");
  if (filter) {
    filter.addEventListener("change", () => {
      applySearchAndFilter();
    });
  }
}

// on load
document.addEventListener("DOMContentLoaded", () => {
  bindControls();
  loadDividendiData();
});
