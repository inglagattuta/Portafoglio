// ===============================
// IMPORT FIREBASE v11
// ===============================
import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// ====================================
// CARICO DATI PRINCIPALI PORTAFOGLIO
// ====================================
async function loadDashboard() {
  console.log("📡 Dashboard → Carico dati Firebase...");

  const snap = await getDocs(collection(db, "portafoglio"));
  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log("📊 Asset trovati:", rows.length);

  if (!rows.length) return;

  renderMiniCards(rows);
  renderChartCategory(rows);
  renderChartInvested(rows);
  renderChartTypes(rows);
  renderChartTopScore(rows);
  renderChartTopPrice(rows);
}

// ====================================
// MINI CARDS % CATEGORIE
// ====================================
function renderMiniCards(rows) {
  let tot = rows.reduce((a, b) => a + Number(b.prezzo_corrente || 0), 0);

  const pct = (nome) => {
    const somma = rows
      .filter(r => r.categoria === nome)
      .reduce((a,b)=> a + Number(b.prezzo_corrente || 0), 0);

    return tot > 0 ? (somma / tot * 100).toFixed(1) : 0;
  };

  document.getElementById("pctDividendi").innerText = pct("Dividendi") + "%";
  document.getElementById("pctCrescita").innerText  = pct("Crescita") + "%";
  document.getElementById("pctCripto").innerText     = pct("Cripto") + "%";
}

// ====================================
// GRAFICO 1: Allocazione per categoria
// ====================================
function renderChartCategory(rows) {
  const ctx = document.getElementById("chartCategory");
  if (!ctx) return;

  const categorie = ["Dividendi", "Crescita", "Cripto"];

  const values = categorie.map(cat =>
    rows
      .filter(r => r.categoria === cat)
      .reduce((a,b)=> a + Number(b.prezzo_corrente || 0), 0)
  );

  new Chart(ctx, {
    type: "pie",
    data: {
      labels: categorie,
      datasets: [{ data: values }]
    }
  });
}

// ====================================
// GRAFICO 2: Investito vs Valore Attuale
// ====================================
function renderChartInvested(rows) {
  const ctx = document.getElementById("chartInvested");
  if (!ctx) return;

  const investito = rows.reduce((a,b)=> a + Number(b.prezzo_acquisto || 0), 0);
  const valore    = rows.reduce((a,b)=> a + Number(b.prezzo_corrente || 0), 0);

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Investito", "Valore Attuale"],
      datasets: [{
        data: [investito, valore],
        borderWidth: 1
      }]
    },
    options: { scales: { y: { beginAtZero: true }} }
  });
}

// ====================================
// GRAFICO 3: Tipi di investimento (Tipologia)
// ====================================
function renderChartTypes(rows) {
  const ctx = document.getElementById("chartByType");
  if (!ctx) return;

  const tipi = [...new Set(rows.map(r => r.tipologia || "Altro"))];

  const values = tipi.map(t =>
    rows
      .filter(r => r.tipologia === t)
      .reduce((a,b)=> a + Number(b.prezzo_corrente || 0), 0)
  );

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: tipi,
      datasets: [{
        label: "Valore €",
        data: values,
        borderWidth: 1
      }]
    }
  });
}

// ====================================
// GRAFICO 4: Top 5 Score
// ====================================
function renderChartTopScore(rows) {
  const ctx = document.getElementById("chartTopScore12");
  if (!ctx) return;

  const top = [...rows]
    .sort((a,b)=> Number(b.score) - Number(a.score))
    .slice(0, 5);

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: top.map(x => x.nome),
      datasets: [{
        label: "Score",
        data: top.map(x => Number(x.score)),
        borderWidth: 1
      }]
    }
  });
}

// ====================================
// GRAFICO 5: Top 5/10 Prezzo
// ====================================
function renderChartTopPrice(rows) {
  const ctx = document.getElementById("chartTopPrice");
  if (!ctx) return;

  let limit = 5;
  const btn5 = document.getElementById("btnTop5Price");
  const btn10 = document.getElementById("btnTop10Price");

  function updateChart() {

    const top = [...rows]
      .sort((a,b)=> Number(b.prezzo_corrente) - Number(a.prezzo_corrente))
      .slice(0, limit);

    new Chart(ctx, {
      type: "bar",
      data: {
        labels: top.map(x => x.nome),
        datasets: [{
          label: "Prezzo Corrente €",
          data: top.map(x => Number(x.prezzo_corrente)),
          borderWidth: 1
        }]
      }
    });
  }

  // Pulsanti
  if (btn5) btn5.onclick = () => {
    limit = 5;
    btn5.classList.add("active");
    btn10.classList.remove("active");
    updateChart();
  };

  if (btn10) btn10.onclick = () => {
    limit = 10;
    btn10.classList.add("active");
    btn5.classList.remove("active");
    updateChart();
  };

  updateChart();
}

// ===============================
// AVVIO
// ===============================
loadDashboard();
