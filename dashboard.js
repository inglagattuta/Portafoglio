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
// VARIABILI GLOBALI CHART
// ===============================
let chartCategory = null;
let chartInvested = null;
let chartByType = null;
let chartTopScore12 = null;
let chartTopPrice = null;
let chartTopProfit = null;

let currentTopLimit = 5;      // prezzo
let currentProfitLimit = 5;   // profitti

// ===============================
// UTILS
// ===============================
function safeNum(v) {
  return Number(v ?? 0) || 0;
}

function destroyIfExists(chart) {
  if (chart && typeof chart.destroy === "function") chart.destroy();
}

// ===============================
// AVVIO DOCUMENTO
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  loadCharts();

  // Toggle prezzo
  document.getElementById("btnTop5Price")?.addEventListener("click", () => {
    currentTopLimit = 5;
    updateTopButtonsPrice();
    if (window._lastRows) buildTopPriceChart(window._lastRows, currentTopLimit);
  });

  document.getElementById("btnTop10Price")?.addEventListener("click", () => {
    currentTopLimit = 10;
    updateTopButtonsPrice();
    if (window._lastRows) buildTopPriceChart(window._lastRows, currentTopLimit);
  });

  // Toggle profitti
  document.getElementById("btnTop5Profit")?.addEventListener("click", () => {
    currentProfitLimit = 5;
    updateTopButtonsProfit();
    if (window._lastRows) buildTopProfitChart(window._lastRows, currentProfitLimit);
  });

  document.getElementById("btnTop10Profit")?.addEventListener("click", () => {
    currentProfitLimit = 10;
    updateTopButtonsProfit();
    if (window._lastRows) buildTopProfitChart(window._lastRows, currentProfitLimit);
  });
});

function updateTopButtonsPrice() {
  document.getElementById("btnTop5Price")?.classList.toggle("active", currentTopLimit === 5);
  document.getElementById("btnTop10Price")?.classList.toggle("active", currentTopLimit === 10);
}

function updateTopButtonsProfit() {
  document.getElementById("btnTop5Profit")?.classList.toggle("active", currentProfitLimit === 5);
  document.getElementById("btnTop10Profit")?.classList.toggle("active", currentProfitLimit === 10);
}

// ===============================
// MAIN
// ===============================
async function loadCharts() {
  const snap = await getDocs(collection(db, "portafoglio"));
  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (!rows.length) return;

  window._lastRows = rows;

  calcCategoryBoxes(rows);
  buildCategoryChart(rows);
  buildInvestedChart(rows);
  buildTypeChart(rows);
  buildTopScore12Chart(rows);
  buildTopPriceChart(rows, currentTopLimit);
  buildTopProfitChart(rows, currentProfitLimit);   // <-- nuovo grafico
}

// ===============================
// MINI CARDS
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

  document.getElementById("pctDividendi").innerText = `${pDiv.toFixed(2)}% — ${sumDiv.toFixed(2)} €`;
  document.getElementById("pctCrescita").innerText = `${pCrescita.toFixed(2)}% — ${sumCrescita.toFixed(2)} €`;
  document.getElementById("pctCripto").innerText = `${pCrypto.toFixed(2)}% — ${sumCrypto.toFixed(2)} €`;
}

// ===============================
// CHART 1: CATEGORIE
// ===============================
function buildCategoryChart(rows) {
  let sumDividendi = 0, sumCrescita = 0, sumCripto = 0;

  rows.forEach(r => {
    const nome = (r.nome || "").trim().toUpperCase();
    const investito = safeNum(r.prezzo_acquisto);

    if (DIVIDENDI_LIST.includes(nome)) sumDividendi += investito;
    else if (CRESCITA_LIST.includes(nome)) sumCrescita += investito;
    else if (CRYPTO_LIST.includes(nome)) sumCripto += investito;
  });

  destroyIfExists(chartCategory);
  chartCategory = new Chart(document.getElementById("chartCategory"), {
    type: "pie",
    data: {
      labels: ["Dividendi", "Crescita", "Cripto"],
      datasets: [{
        data: [sumDividendi, sumCrescita, sumCripto],
        backgroundColor: ["#6c5ce7", "#00cec9", "#fdcb6e"],
        borderWidth: 0
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } }
    }
  });
}

// ===============================
// CHART 2: INVESTITO VS ATTUALE
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
      plugins: { legend: { position: "bottom" } }
    }
  });
}

// ===============================
// CHART 3: TIPOLOGIE
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
      plugins: { legend: { position: "bottom" } }
    }
  });
}

// ===============================
// CHART 4: TOP SCORE
// ===============================
function buildTopScore12Chart(rows) {
  const top = rows
    .filter(x => safeNum(x.score) > 12)
    .sort((a,b) => safeNum(b.score) - safeNum(a.score))
    .slice(0, 5);

  destroyIfExists(chartTopScore12);
  chartTopScore12 = new Chart(document.getElementById("chartTopScore12"), {
    type: "bar",
    data: {
      labels: top.map(x => x.nome),
      datasets: [{ data: top.map(x => safeNum(x.score)) }]
    },
    options: {
      indexAxis: "y",
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } }
    }
  });
}

// ===============================
// CHART 5: TOP PREZZO
// ===============================
function buildTopPriceChart(rows, limit = 5) {
  const sorted = [...rows].sort((a,b) => safeNum(b.prezzo_corrente) - safeNum(a.prezzo_corrente));
  const top = sorted.slice(0, limit);

  destroyIfExists(chartTopPrice);
  chartTopPrice = new Chart(document.getElementById("chartTopPrice"), {
    type: "bar",
    data: {
      labels: top.map(x => x.nome),
      datasets: [
        {
          label: "Prezzo Acquisto",
          data: top.map(x => safeNum(x.prezzo_acquisto)),
          backgroundColor: "rgba(54,162,235,0.7)"
        },
        {
          label: "Prezzo Corrente",
          data: top.map(x => safeNum(x.prezzo_corrente)),
          backgroundColor: "rgba(255,99,132,0.7)"
        }
      ]
    },
    options: {
      indexAxis: "y",
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      scales: { x: { beginAtZero: true } }
    }
  });
}

// ===============================
// CHART 6: TOP PROFITTI (NUOVO)
// ===============================
function buildTopProfitChart(rows, limit = 5) {
  const sorted = [...rows]
    .filter(x => !isNaN(safeNum(x.profitto)))
    .sort((a, b) => safeNum(b.profitto) - safeNum(a.profitto))
    .slice(0, limit);

  destroyIfExists(chartTopProfit);
  chartTopProfit = new Chart(document.getElementById("chartTopProfit"), {
    type: "bar",
    data: {
      labels: sorted.map(x => x.nome),
      datasets: [{
        label: "Profitto (€)",
        data: sorted.map(x => safeNum(x.profitto)),
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: "y",
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } }
    }
  });
}
