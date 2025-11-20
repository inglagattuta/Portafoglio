// dividendi.js
import { db } from "./firebase-config.js";

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getFirestore
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";


console.log("dividendi.js loaded");

let rows = [];
let viewRows = [];
let currentSort = { column: "nome", asc: true };

// helper formatting
const fmtEuro = v => Number(v || 0).toFixed(2) + " €";

// ============ COLORI PER TIPOLOGIA =============
function getTypeColor(tip) {
  if (!tip) return "#8884"; // grigio default
  const t = tip.toLowerCase();
  if (t.includes("etf")) return "#0095ff";     // blu ETF
  if (t.includes("bond") || t.includes("obbl")) return "#9c27b0"; // viola bond
  if (t.includes("reit")) return "#ff9800";   // arancio REIT
  if (t.includes("stock") || t.includes("azione")) return "#4caf50"; // verde stock
  return "#8884"; // default
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
  const top10 = [...data].sort((a, b) => Number(b.dividendi) - Number(a.dividendi)).slice(0, 10);

  const canvas = document.getElementById("chartTopDiv");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const colors = ["#4caf50","#81c784","#43a047","#66bb6a","#388e3c","#aed581","#2e7d32","#9ccc65","#1b5e20","#c5e1a5"];

  if (chartTop) chartTop.destroy();
  chartTop = new Chart(ctx, {
    type: "bar",
    data: {
      labels: top10.map(x => x.nome),
      datasets: [{ label:"Dividendi €", data: top10.map(x=>Number(x.dividendi)), backgroundColor: colors, borderRadius:8, borderSkipped:false }]
    },
    options: {
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{display:false},
        tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${ctx.formattedValue} €`}}
      },
      scales:{
        y:{beginAtZero:true, grid:{drawBorder:false}},
        x:{grid:{display:false}}
      }
    }
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

  updateSortButtonsUI();
  renderAll();
}

function updateSortButtonsUI() {
  document.querySelectorAll(".sort-btn").forEach(btn => {
    const col = btn.dataset.column;
    btn.classList.toggle("active", col===currentSort.column);
    const ind = btn.querySelector(".sort-indicator");
    if(col===currentSort.column) ind.textContent = currentSort.asc?"↑":"↓";
    else ind.textContent="↕";
  });
}

function applySearchAndFilter() {
  const q = (document.getElementById("searchCard")?.value || "").trim().toLowerCase();
  const typ = (document.getElementById("filterType")?.value || "").trim();

  viewRows = rows.filter(r => {
    if(typ && String(r.tipologia||"").toLowerCase()!==typ.toLowerCase()) return false;
    if(q && !(String(r.nome||"").toLowerCase().includes(q))) return false;
    return true;
  });

  sortView(currentSort.column);
}

function bindControls() {
  document.querySelectorAll(".sort-btn").forEach(btn => btn.addEventListener("click",()=>sortView(btn.dataset.column)));
  document.getElementById("searchCard")?.addEventListener("input",applySearchAndFilter);
  document.getElementById("filterType")?.addEventListener("change",applySearchAndFilter);
}

document.addEventListener("DOMContentLoaded",()=>{
  bindControls();
  loadDividendiData();
});







const tbody = document.getElementById("tbodyDividendiMese");
const addMonthBtn = document.getElementById("addMonthBtn");

let editId = null;
let editData = null;

// ==================================================
// 1️⃣ CARICA LISTA MESI
// ==================================================
async function loadMonths() {
  tbody.innerHTML = "";

  const snap = await getDocs(collection(db, "dividendi_mensili"));
  const mesi = [];

  snap.forEach(d => mesi.push({ id: d.id, ...d.data() }));

  mesi.sort((a, b) =>
    a.anno === b.anno ? a.mese.localeCompare(b.mese) : a.anno - b.anno
  );

  mesi.forEach(m => {
    const totale = (m.dettaglio || [])
      .reduce((sum, r) => sum + Number(r.importo || 0), 0)
      .toFixed(2);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.anno}</td>
      <td>${m.mese}</td>
      <td>${totale} €</td>
      <td>${m.dettaglio?.length || 0} titoli</td>
      <td><button class="dashboard-btn" data-id="${m.id}">✏️ Modifica</button></td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelectorAll("button[data-id]").forEach(btn => {
    btn.addEventListener("click", () => openEdit(btn.dataset.id));
  });
}

loadMonths();

// ==================================================
// 2️⃣ MODAL — APRE UN MESE
// ==================================================
const modal = document.getElementById("modalEditMonth");
const modalTitle = document.getElementById("modalTitle");
const detailList = document.getElementById("detailList");

async function openEdit(id) {
  editId = id;

  const snap = await getDocs(collection(db, "dividendi_mensili"));
  snap.forEach(d => {
    if (d.id === id) editData = { id: d.id, ...d.data() };
  });

  modalTitle.textContent = `Modifica ${editData.anno}-${editData.mese}`;
  document.getElementById("editYear").value = editData.anno;
document.getElementById("editMonth").value = editData.mese;

  renderRows();
  modal.style.display = "flex";
}

// ==================================================
// 3️⃣ RENDER DELLE RIGHE
// ==================================================
function renderRows() {
  detailList.innerHTML = "";

  editData.dettaglio.forEach((row, idx) => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.gap = "10px";
    div.style.marginBottom = "6px";

    div.innerHTML = `
      <input type="text" placeholder="Ticker" value="${row.ticker}" data-row="${idx}" data-field="ticker">
      <input type="number" placeholder="Importo" value="${row.importo}" data-row="${idx}" data-field="importo">
      <button data-del="${idx}" class="dashboard-btn">🗑</button>
    `;
    detailList.appendChild(div);
  });

  detailList.addEventListener("input", e => {
    const row = e.target.dataset.row;
    const field = e.target.dataset.field;
    if (row !== undefined) editData.dettaglio[row][field] = e.target.value;
  });

  detailList.querySelectorAll("button[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      editData.dettaglio.splice(btn.dataset.del, 1);
      renderRows();
    });
  });
}

// ==================================================
// 4️⃣ AGGIUNGI RIGA
// ==================================================
document.getElementById("addRow").addEventListener("click", () => {
  editData.dettaglio.push({ ticker: "", importo: 0 });
  renderRows();
});

// ==================================================
// 5️⃣ SALVA MESE
// ==================================================
document.getElementById("saveMonth").addEventListener("click", async () => {
  const ref = doc(db, "dividendi_mensili", editId);
 await updateDoc(ref, {
  anno: Number(document.getElementById("editYear").value),
  mese: document.getElementById("editMonth").value.padStart(2, "0"),
  dettaglio: editData.dettaglio
});


  modal.style.display = "none";
  loadMonths();
});

// ==================================================
// 6️⃣ CHIUDI MODAL
// ==================================================
document.getElementById("closeModal").addEventListener("click", () => {
  modal.style.display = "none";
});

// ==================================================
// 7️⃣ AGGIUNGI NUOVO MESE
// ==================================================
addMonthBtn.addEventListener("click", async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const docRef = await addDoc(collection(db, "dividendi_mensili"), {
    anno: year,
    mese: month,
    dettaglio: []
  });

  loadMonths();
});
// =========================================
// 🔥 GRAFICO DIVIDENDI MENSILI
// =========================================
let chartDividendiBar = null;

function buildBarChart(mesi) {
  const labels = mesi.map(m => `${m.anno}-${m.mese}`);
  const values = mesi.map(m =>
    (m.dettaglio || []).reduce((t, r) => t + Number(r.importo || 0), 0)
  );

  const ctx = document.getElementById("dividendiBarChart");
  if (!ctx) return;

  if (chartDividendiBar) chartDividendiBar.destroy();

  chartDividendiBar = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Dividendi €",
          data: values
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

