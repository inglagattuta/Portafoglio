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

  console.log(
    "DEBUG >12:", 
    rows.filter(x => Number(x.score) > 12).length,
    rows.filter(x => Number(x.score) > 12).map(x => x.nome)
  );

  // MINI CARDS
  calcCategoryBoxes(rows);

  // GRAFICI ESISTENTI
  buildCategoryChart(rows);
  buildInvestedChart(rows);
  buildTypeChart(rows);

  // ⭐ NUOVO GRAFICO: TUTTI I TITOLI CON SCORE > 12
  buildTopScore12Chart(rows);
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
    const ticker = r.nome?.trim().toUpperCase();
    const val = Number(r.prezzo_acquisto || 0);

    if (DIVIDENDI_LIST.includes(ticker)) sumDiv += val;
    else if (CRESCITA_LIST.includes(ticker)) sumCrescita += val;
    else if (CRYPTO_LIST.includes(ticker)) sumCrypto += val;
  });

  const pDiv = totalInvested ? (sumDiv / totalInvested * 100) : 0;
  const pCrescita = totalInvested ? (sumCrescita / totalInvested * 100) : 0;
  const pCrypto = totalInvested ? (sumCrypto / totalInvested * 100) : 0;

  document.getElementById("pctDividendi").innerText =
    `${pDiv.toFixed(2)}% — ${sumDiv.toFixed(2)} €`;

  document.getElementById("pctCrescita").innerText =
    `${pCrescita.toFixed(2)}% — ${sumCrescita.toFixed(2)} €`;

  document.getElementById("pctCripto").innerText =
    `${pCrypto.toFixed(2)}% — ${sumCrypto.toFixed(2)} €`;
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
      datasets: [{ data: Object.values(byCategory) }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { labels: { font: { size: 10 } } } }
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
      datasets: [{ data: [invested, value] }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { labels: { font: { size: 10 } } } }
    }
  });
}

// -----------------------------------------------------
// CHART 3: TOP SCORE (TUTTI score > 12)
// -----------------------------------------------------
function buildTopScore12Chart(rows) {
  const top = rows
    .filter(x => Number(x.score) > 12)
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, 5);   // <-- SOLO TOP 5

  if (!top.length) return;

  const labels = top.map(x => x.nome || "N/A");
  const values = top.map(x => Number(x.score));

  // Rende il canvas più basso e compatto
  const wrapper = document.getElementById("topScoreWrapper");
  if (wrapper) wrapper.style.height = "260px";

  new Chart(document.getElementById("chartTopScore12"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "",
        data: values,
        borderWidth: 0,
        backgroundColor: [
          "rgba(54, 162, 235, 0.8)",
          "rgba(75, 192, 192, 0.8)",
          "rgba(255, 206, 86, 0.8)",
          "rgba(153, 102, 255, 0.8)",
          "rgba(255, 99, 132, 0.8)"
        ],
        hoverBackgroundColor: [
          "rgba(54, 162, 235, 1)",
          "rgba(75, 192, 192, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(153, 102, 255, 1)",
          "rgba(255, 99, 132, 1)"
        ]
      }]
    },
    options: {
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Top 5 Titoli per Score",
          font: { size: 18, weight: "bold" },
          padding: { bottom: 15 }
        },
        tooltip: {
          callbacks: {
            label: ctx => `Score: ${ctx.raw.toFixed(2)}`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { display: false },
          ticks: { font: { size: 12 } }
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 13, weight: "bold" } }
        }
      }
    }
  });
}

// -----------------------------------------------------
// CHART 4: TIPI DI INVESTIMENTO
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
      datasets: [{ data: Object.values(byType) }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { labels: { font: { size: 10 } } } }
    }
  });
}


function buildTopPrezziChart(data) {
  const canvas = document.getElementById("chartTopPrezzi");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // Prendiamo i 5 con il prezzo corrente più alto
  const top5 = [...data]
    .sort((a, b) => b.prezzo_corrente - a.prezzo_corrente)
    .slice(0, 5);

  const labels = top5.map(t => t.titolo);
  const prezziAcq = top5.map(t => t.prezzo_acquisto || 0);
  const prezziCorr = top5.map(t => t.prezzo_corrente || 0);

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Prezzo Acquisto",
          data: prezziAcq,
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
      responsive: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// -----------------------------------------------------
loadCharts();
