import { db } from "./firebase-config.js";

async function loadDividendi() {
  const snap = await db.collection("portafoglio").get();
  const rows = snap.docs.map(d => d.data());

  const totalePeso = rows.reduce((sum, r) => sum + (r.percentuale_portafoglio || 0), 0);
  const totaleInvestito = totalePeso > 0 ? totalePeso * 100 : 0;

  buildStats(rows, totaleInvestito);
  buildTable(rows, totaleInvestito);
  buildChart(rows);
}

// ------------------------------------------------------------
// 1. STATISTICHE
// ------------------------------------------------------------
function buildStats(rows, totaleInvestito) {

  const totDiv = rows.reduce((sum, r) => sum + (r.dividendi || 0), 0);
  const divMensile = totDiv / 12;

  const top = [...rows].sort((a, b) => (b.dividendi || 0) - (a.dividendi || 0))[0];

  const divYield = totaleInvestito > 0 ? (totDiv / totaleInvestito) * 100 : 0;

  document.getElementById("divTotale").textContent = totDiv.toFixed(2) + " €";
  document.getElementById("divMensile").textContent = divMensile.toFixed(2) + " €";
  document.getElementById("topPayer").textContent = top ? top.nome : "-";
  document.getElementById("divYield").textContent = divYield.toFixed(2) + "%";
}

// ------------------------------------------------------------
// 2. TABELLA
// ------------------------------------------------------------
function buildTable(rows, totaleInvestito) {
  const tbody = document.getElementById("tableDividendi");
  tbody.innerHTML = "";

  rows.sort((a, b) => (b.dividendi || 0) - (a.dividendi || 0));

  rows.forEach(r => {
    const investito = (r.percentuale_portafoglio || 0) * totaleInvestito;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.nome}</td>
      <td>${(r.dividendi || 0).toFixed(2)} €</td>
      <td>${r.tipologia || "-"}</td>
      <td>${investito.toFixed(2)} €</td>
      <td>${((r.percentuale_portafoglio || 0) * 100).toFixed(2)}%</td>
    `;
    tbody.appendChild(tr);
  });
}

// ------------------------------------------------------------
// 3. GRAFICO
// ------------------------------------------------------------
function buildChart(rows) {
  const top5 = [...rows]
    .sort((a, b) => (b.dividendi || 0) - (a.dividendi || 0))
    .slice(0, 5);

  const labels = top5.map(r => r.nome);
  const values = top5.map(r => r.dividendi || 0);

  new Chart(document.getElementById("chartTopDiv"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Dividendi (€)",
        data: values,
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { beginAtZero: true }
      }
    }
  });
}

loadDividendi();
