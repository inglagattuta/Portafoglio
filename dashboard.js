// dashboard.js
// ===============================
// IMPORT FIREBASE v11
// ===============================
import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// ===============================
// LISTE TITOLI PER CATEGORIA
// ===============================
const DIVIDENDI_LIST = [
  "AGNC","AMLP","ARCC","ARR","BKLN","BOAT","EFC","EPR","HAUTO.OL","HRZN","HTGC",
  "IIPR","IUS7","LQDE.L","MAIN","MPCC.OL","NLY","NORAM.OL","O","OHI","OMF","ORC",
  "PSEC","QYLD","SCHD","SDIV","SHYG","SRLN","TPVG","TRMD-A.OL","VAR.OL","WES",
  "XIFR","ZIM"
];

const CRESCITA_LIST = [
  "AAPL","AMZN","DOCU","GOOG","HDX1E.DE","META","MSFT","NUGT","NVDA","TQQQ","UPRO"
];

const CRYPTO_LIST = ["BTC", "ETH", "XRP"];

// ===============================
// VAR GLOBALI CHART
// ===============================
let chartCategory = null;
let chartInvested = null;
let chartByType = null;
let chartTopScore12 = null;
let chartTopPrice = null;
let currentTopLimit = 5;

// ===============================
// UTIL
// ===============================
function safeNum(v) {
  return Number(v ?? 0) || 0;
}

function destroyIfExists(chart) {
  if (chart && typeof chart.destroy === "function") {
    chart.destroy();
  }
}

// ===============================
// AVVIO DOCOUMENTO
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  console.log("Dashboard: DOM pronto, carico dati...");
  loadCharts();

  // Toggle buttons (se presenti in DOM)
  document.getElementById("btnTop5Price")?.addEventListener("click", () => {
    currentTopLimit = 5;
    updateTopButtons();
    if (window._lastRows) buildTopPriceChart(window._lastRows, currentTopLimit);
  });
  document.getElementById("btnTop10Price")?.addEventListener("click", () => {
    currentTopLimit = 10;
    updateTopButtons();
    if (window._lastRows) buildTopPriceChart(window._lastRows, currentTopLimit);
  });
});

function updateTopButtons() {
  document.getElementById("btnTop5Price")?.classList.toggle("active", currentTopLimit === 5);
  document.getElementById("btnTop10Price")?.classList.toggle("active", currentTopLimit === 10);
}

// ===============================
// MAIN: CARICA DATI E RENDER
// ===============================
async function loadCharts() {
  try {
    const snap = await getDocs(collection(db, "portafoglio"));
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (!rows.length) {
      console.warn("Nessun documento trovato in 'portafoglio'.");
      return;
    }

    // salvo globalmente per refresh grafici
    window._lastRows = rows;

    // calcoli e render
    calcCategoryBoxes(rows);
    buildCategoryChart(rows);
    buildInvestedChart(rows);
    buildTypeChart(rows);
    buildTopScore12Chart(rows);
    buildTopPriceChart(rows, currentTopLimit);

  } catch (e) {
    console.error("Errore loadCharts:", e);
  }
}

// ===============================
// MINI CARDS: percentuali per categoria
// ===============================
function calcCategoryBoxes(rows) {
  const totalInvested = rows.reduce((s, r) => s + safeNum(r.prezzo_acquisto), 0);

  let sumDiv = 0, sumCrescita = 0, sumCrypto = 0;
  rows.forEach(r => {
    const ticker = (r.nome || "").toString().trim().toUpperCase();
    const val = safeNum(r.prezzo_acquisto);
    if (DIVIDENDI_LIST.includes(ticker)) sumDiv += val;
    else if (CRESCITA_LIST.includes(ticker)) sumCrescita += val;
    else if (CRYPTO_LIST.includes(ticker)) sumCrypto += val;
  });

  const pDiv = totalInvested ? (sumDiv / totalInvested * 100) : 0;
  const pCrescita = totalInvested ? (sumCrescita / totalInvested * 100) : 0;
  const pCrypto = totalInvested ? (sumCrypto / totalInvested * 100) : 0;

  // Sicurezza: verifico esistenza elementi nel DOM
  const elDiv = document.getElementById("pctDividendi");
  const elCresc = document.getElementById("pctCrescita");
  const elCripto = document.getElementById("pctCripto");

  if (elDiv) elDiv.innerText = `${pDiv.toFixed(2)}% — ${sumDiv.toFixed(2)} €`;
  if (elCresc) elCresc.innerText = `${pCrescita.toFixed(2)}% — ${sumCrescita.toFixed(2)} €`;
  if (elCripto) elCripto.innerText = `${pCrypto.toFixed(2)}% — ${sumCrypto.toFixed(2)} €`;
}

// ===============================
// CHART 1: ALLOCAZIONE PER CATEGORIA (Dividendi / Crescita / Cripto)
// ===============================
function buildCategoryChart(rows) {
  let sumDividendi = 0;
  let sumCrescita = 0;
  let sumCripto = 0;

  rows.forEach(r => {
    const investito = safeNum(r.prezzo_acquisto);

    if (r.categoria === "Dividendi") {
      sumDividendi += investito;
    } else if (r.categoria === "Crescita") {
      sumCrescita += investito;
    } else if (r.categoria === "Cripto") {
      sumCripto += investito;
    }
  });

  const labels = ["Dividendi", "Crescita", "Cripto"];
  const data = [sumDividendi, sumCrescita, sumCripto];

  destroyIfExists(chartCategory);
  chartCategory = new Chart(document.getElementById("chartCategory"), {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: [
          "#6c5ce7", // Dividendi
          "#00cec9", // Crescita
          "#fdcb6e"  // Cripto
        ],
        borderWidth: 0
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            color: getComputedStyle(document.body)
              .getPropertyValue("--text-color")
          }
        }
      }
    }
  });
}


// ===============================
// CHART 2: INVESTITO VS VALORE (pie)
// ===============================
function buildInvestedChart(rows) {
  const invested = rows.reduce((s, r) => s + safeNum(r.prezzo_acquisto), 0);
  const value = rows.reduce((s, r) => s + safeNum(r.prezzo_corrente), 0);

  destroyIfExists(chartInvested);
  chartInvested = new Chart(document.getElementById("chartInvested"), {
    type: "pie",
    data: {
      labels: ["Investito", "Valore Attuale"],
      datasets: [{ data: [invested, value] }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: true, position: "bottom" } }
    }
  });
}

// ===============================
// CHART 3: TIPI DI INVESTIMENTO (pie)
// ===============================
function buildTypeChart(rows) {
  const byType = {};
  rows.forEach(r => {
    const k = r.tipologia || "Altro";
    byType[k] = (byType[k] || 0) + safeNum(r.prezzo_acquisto);
  });

  destroyIfExists(chartByType);
  chartByType = new Chart(document.getElementById("chartByType"), {
    type: "pie",
    data: {
      labels: Object.keys(byType),
      datasets: [{ data: Object.values(byType) }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: true, position: "bottom" } }
    }
  });
}

// ===============================
// CHART 4: TOP SCORE > 12 (bar horizontal)
// ===============================
function buildTopScore12Chart(rows) {
  const top = rows
    .filter(x => safeNum(x.score) > 12)
    .sort((a,b) => safeNum(b.score) - safeNum(a.score))
    .slice(0, 5);

  if (!top.length) {
    destroyIfExists(chartTopScore12);
    return;
  }

  destroyIfExists(chartTopScore12);
  chartTopScore12 = new Chart(document.getElementById("chartTopScore12"), {
    type: "bar",
    data: {
      labels: top.map(x => x.nome || "N/A"),
      datasets: [{ data: top.map(x => safeNum(x.score)) }]
    },
    options: {
      maintainAspectRatio: false,
      indexAxis: "y",
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } }
    }
  });
}

// ===============================
// CHART 5: TOP TITOLI PER PREZZO (bar horizontal, DUE SERIE)
// ===============================
function buildTopPriceChart(rows, limit = 5) {
  if (!Array.isArray(rows) || rows.length === 0) return;

  const sorted = [...rows].sort((a,b) => safeNum(b.prezzo_corrente) - safeNum(a.prezzo_corrente));
  const top = sorted.slice(0, limit);

  const labels = top.map(x => x.nome || "N/A");
  const prezziAcq = top.map(x => safeNum(x.prezzo_acquisto));
  const prezziCorr = top.map(x => safeNum(x.prezzo_corrente));

  // canvas check
  const canvas = document.getElementById("chartTopPrice");
  if (!canvas) return;

  destroyIfExists(chartTopPrice);
  chartTopPrice = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Prezzo Acquisto",
          data: prezziAcq,
          // don't hardcode color if you prefer Chart default; here kept for readability
          backgroundColor: "rgba(54, 162, 235, 0.7)"
        },
        {
          label: "Prezzo Corrente",
          data: prezziCorr,
          backgroundColor: "rgba(255, 99, 132, 0.7)"
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      indexAxis: "y",
      responsive: true,
      plugins: { legend: { position: "bottom" } },
      scales: { x: { beginAtZero: true } }
    }
  });
}
