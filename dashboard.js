import app from "./firebase-config.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const db = getFirestore(app);

// -----------------------------------------------------
// LOAD DATA
// -----------------------------------------------------
async function loadCharts() {
  const snap = await getDocs(collection(db, "portafoglio"));
  const rows = snap.docs.map(d => d.data());

  if (!rows.length) return;

  buildCategoryChart(rows);
  buildInvestedChart(rows);
  buildTopScoreChart(rows);
  buildTypeChart(rows);
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
    type: "bar",
    data: {
      labels: ["Investito", "Valore"],
      datasets: [{
        data: [invested, value]
      }]
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
    type: "bar",
    data: {
      labels: top.map(t => t.nome),
      datasets: [{
        data: top.map(t => t.score)
      }]
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
    type: "doughnut",
    data: {
      labels: Object.keys(byType),
      datasets: [{
        data: Object.values(byType)
      }]
    }
  });
}

loadCharts();
