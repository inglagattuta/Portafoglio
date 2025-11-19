// -------------------------------------------------------------
// FIREBASE INIT (uguale al main.js)
// -------------------------------------------------------------
import app from "./firebase-config.js";

import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const db = getFirestore(app);

// -------------------------------------------------------------
// CARICAMENTO DATI
// -------------------------------------------------------------
async function loadDividendi() {
  const snap = await getDocs(collection(db, "portafoglio"));
  const rows = snap.docs.map(d => d.data());

  buildStats(rows);
  buildTable(rows);
  buildChart(rows);
}

// -------------------------------------------------------------
// STATISTICHE
// -------------------------------------------------------------
function buildStats(rows) {
  const totDiv = rows.reduce((sum, r) => sum + (r.dividendi || 0), 0);
  const totInvestito = rows.reduce((sum, r) => sum + (r.prezzo_acquisto || 0), 0);

  document.getElementById("divTotale").textContent = totDiv.toFixed(2) + " €";
  document.getElementById("divMensile").textContent = (totDiv / 12).toFixed(2) + " €";

  const top = [...rows].sort((a, b) => (b.dividendi || 0) - (a.dividendi || 0))[0];
  document.getElementById("topPayer").textContent = top ? top.nome : "-";

  const divYield = totInvestito > 0 ? (totDiv / totInvestito * 100) : 0;
  document.getElementById("divYield").textContent = divYield.toFixed(2) + "%";
}

// -------------------------------------------------------------
// TABELLA
// -------------------------------------------------------------
function buildTable(rows) {
  const tbody = document.getElementById("tableDividendi");
  tbody.innerHTML = "";

  rows.sort((a, b) => (b.dividendi || 0) - (a.dividendi || 0));

  rows.forEach(r => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${r.nome}</td>
      <td>${(r.dividendi || 0).toFixed(2)} €</td>
      <td>${r.tipologia || "-"}</td>
      <td>${((r.percentuale_portafoglio || 0) * 100).toFixed(2)}%</td>
    `;

    tbody.appendChild(tr);
  });
}

// -------------------------------------------------------------
// GRAFICO TOP5
// -------------------------------------------------------------
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
        data: values
      }]
    },
    options: {
      indexAxis: "y",
      plugins: {
        legend: { display: false }
      }
    }
  });
}

loadDividendi();
