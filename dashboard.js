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

// -----------------------------------------------------
// LOAD DATA
// -----------------------------------------------------
async function loadCharts() {
  const snap = await getDocs(collection(db, "portafoglio"));
  const rows = snap.docs.map(d => d.data());
  
  if (!rows.length) return;

  // === NUOVO BLOCCO: CALCOLO 3 BOX ===================
  calcCategoryBoxes(rows);

  // === GRAFICI =======================================
  buildCategoryChart(rows);
  buildInvestedChart(rows);
  buildTopScoreChart(rows);
  buildTypeChart(rows);
}

// -----------------------------------------------------
// CALCOLO PERCENTUALI BOX
// -----------------------------------------------------
function calcCategoryBoxes(rows) {
  const totalInvested = rows.reduce((a,b)=> a + Number(b.prezzo_acquisto || 0), 0);

  let sumDiv = 0;
  let sumCrescita = 0;
  let sumCrypto = 0;

  rows.forEach(r => {
    const ticker = r.titolo?.trim().toUpperCase();
    const val = Number(r.prezzo_acquisto || 0);

    if (DIVIDENDI_LIST.includes(ticker)) sumDiv += val;
    else if (CRESCITA_LIST.includes(ticker)) sumCrescita += val;
    else if (CRYPTO_LIST.includes(ticker)) sumCrypto += val;
  });

  // Percentuali
  const pDiv = totalInvested ? (sumDiv / totalInvested * 100) : 0;
  const pCrescita = totalInvested ? (sumCrescita / totalInvested * 100) : 0;
  const pCrypto = totalInvested ? (sumCrypto / totalInvested * 100) : 0;

  // Aggiorna box in HTML
  document.getElementById("pctDividendi").innerText = pDiv.toFixed(2) + "%";
document.getElementById("pctCrescita").innerText = pCrescita.toFixed(2) + "%";
document.getElementById("pctCripto").innerText = pCrypto.toFixed(2) + "%";
}

// -----------------------------------------------------
// CHART 1: CATEGORIA
// -----------------------------------------------------
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
      datasets: [{
        data: Object.values(byCategory)
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { font: { size: 10 } } }
      }
    }
  });
}

// -----------------------------------------------------
// CHART 2: INVESTITO vs VALORE
// -----------------------------------------------------
function buildInvestedChart(rows) {
  const invested = rows.reduce((a,b)=>a+Number(b.prezzo_acquisto||0), 0);
  const value    = rows.reduce((a,b)=>a+Number(b.prezzo_corrente||0), 0);

  new Chart(document.getElementById("chartInvested"), {
    type: "pie",
    data: {
      labels: ["Investito", "Valore Attuale"],
      datasets: [{
        data: [invested, value]
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { font: { size: 10 } } }
      }
    }
  });
}

// -----------------------------------------------------
// CHART 3: TOP SCORE
// -----------------------------------------------------
function buildTopScoreChart(rows) {
  const top = rows
    .sort((a,b)=>b.score - a.score)
    .slice(0,5);

  new Chart(document.getElementById("chartTopScore"), {
    type: "pie",
    data: {
      labels: top.map(x => x.titolo),
      datasets: [{
        data: top.map(x => x.score)
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { font: { size: 10 } } }
      }
    }
  });
}

// -----------------------------------------------------
// CHART 4: TIPOLOGIA %
// -----------------------------------------------------
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
      datasets: [{
        data: Object.values(byType)
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { font: { size: 10 } } }
      }
    }
  });
}

// -----------------------------------------------------
loadCharts();
