import app from "./firebase-config.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const db = getFirestore(app);

// =============================
// LISTE TITOLI PER CATEGORIA
// =============================
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


// ======================================================================
// 🔵 LOAD CHARTS — VERSIONE CORRETTA (UNA SOLA FUNZIONE!)
// ======================================================================
async function loadCharts() {
  const snap = await getDocs(collection(db, "portafoglio"));
  const rows = snap.docs.map(d => d.data());

  if (!rows.length) return;

  // Mini cards
  calcCategoryBoxes(rows);

  // Grafici esistenti
  buildCategoryChart(rows);
  buildInvestedChart(rows);
  buildTypeChart(rows);
  buildTopScore12Chart(rows);

  // Grafico prezzi: default = Top 5
  renderTopPrezziChart(rows, 5);

  // Toggle bottoni
  const btn5 = document.getElementById("btnTop5Prezzi");
  const btn10 = document.getElementById("btnTop10Prezzi");

  if (btn5 && btn10) {
    btn5.addEventListener("click", () => {
      renderTopPrezziChart(rows, 5);
      btn5.classList.add("active");
      btn10.classList.remove("active");
    });

    btn10.addEventListener("click", () => {
      renderTopPrezziChart(rows, 10);
      btn10.classList.add("active");
      btn5.classList.remove("active");
    });
  }
}



// ======================================================================
// MINI CARDS
// ======================================================================
function calcCategoryBoxes(rows) {
  const totalInvested = rows.reduce((a,b)=> a + Number(b.prezzo_acquisto || 0), 0);

  let sumDiv = 0, sumCrescita = 0, sumCrypto = 0;

  rows.forEach(r => {
    const ticker = r.nome?.trim().toUpperCase();
    const val = Number(r.prezzo_acquisto || 0);

    if (DIVIDENDI_LIST.includes(ticker)) sumDiv += val;
    else if (CRESCITA_LIST.includes(ticker)) sumCrescita += val;
    else if (CRYPTO_LIST.includes(ticker)) sumCrypto += val;
  });

  document.getElementById("pctDividendi").innerText =
    `${(sumDiv/totalInvested*100).toFixed(2)}% — ${sumDiv.toFixed(2)} €`;

  document.getElementById("pctCrescita").innerText =
    `${(sumCrescita/totalInvested*100).toFixed(2)}% — ${sumCrescita.toFixed(2)} €`;

  document.getElementById("pctCripto").innerText =
    `${(sumCrypto/totalInvested*100).toFixed(2)}% — ${sumCrypto.toFixed(2)} €`;
}



// ======================================================================
// CHART 1: CATEGORIA
// ======================================================================
function buildCategoryChart(rows) {
  const byCategory = {};

  rows.forEach(r => {
    if (!byCategory[r.tipologia]) byCategory[r.tipologia] = 0;
    byCategory[r.tipologia] += Number(r.prezzo_corrente || 0);
  });

  new Chart(document.getElementById("chartCategory"), {
    type: "pie",
    data: {
      labels: Object.keys(byCategory),
      datasets: [{ data: Object.values(byCategory) }]
    },
    options: { maintainAspectRatio: false }
  });
}



// ======================================================================
// CHART 2: INVESTITO VS VALORE
// ======================================================================
function buildInvestedChart(rows) {
  const invested = rows.reduce((a,b)=>a+Number(b.prezzo_acquisto||0), 0);
  const value    = rows.reduce((a,b)=>a+Number(b.prezzo_corrente||0), 0);

  new Chart(document.getElementById("chartInvested"), {
    type: "pie",
    data: {
      labels: ["Investito", "Valore Attuale"],
      datasets: [{ data: [invested, value] }]
    },
    options: { maintainAspectRatio: false }
  });
}



// ======================================================================
// CHART 3: TOP SCORE (orizzontale, come lo volevi)
// ======================================================================
function buildTopScore12Chart(rows) {
  const top = rows
    .filter(x => Number(x.score) > 12)
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, 5);

  if (!top.length) return;

  new Chart(document.getElementById("chartTopScore12"), {
    type: "bar",
    data: {
      labels: top.map(x => x.nome),
      datasets: [{ data: top.map(x => Number(x.score)) }]
    },
    options: {
      indexAxis: "y",
      maintainAspectRatio: false,
      plugins: { legend: { display: false } }
    }
  });
}



// ======================================================================
// CHART 4: TIPOLOGIA
// ======================================================================
function buildTypeChart(rows) {
  const byType = {};

  rows.forEach(r => {
    if (!byType[r.tipologia]) byType[r.tipologia] = 0;
    byType[r.tipologia] += Number(r.prezzo_acquisto || 0);
  });

  new Chart(document.getElementById("chartByType"), {
    type: "pie",
    data: {
      labels: Object.keys(byType),
      datasets: [{ data: Object.values(byType) }]
    },
    options: { maintainAspectRatio: false }
  });
}



// ======================================================================
// 🔥 NUOVO GRAFICO: PREZZO ACQUISTO VS CORRENTE (TOP 5 / TOP 10)
// ======================================================================
let chartPrezzi = null;

function renderTopPrezziChart(rows, limit = 5) {
  const canvas = document.getElementById("chartTopPrezzi");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const top = [...rows]
    .sort((a, b) => Number(b.prezzo_corrente) - Number(a.prezzo_corrente))
    .slice(0, limit);

  const labels = top.map(t => t.nome);
  const prezziAcq = top.map(t => Number(t.prezzo_acquisto || 0));
  const prezziCorr = top.map(t => Number(t.prezzo_corrente || 0));

  if (chartPrezzi) chartPrezzi.destroy();

  chartPrezzi = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Prezzo Acquisto", data: prezziAcq },
        { label: "Prezzo Corrente", data: prezziCorr }
      ]
    },
    options: {
      indexAxis: "y",
      maintainAspectRatio: false
    }
  });
}


// ======================================================================
loadCharts();
