// dividendi.js
import app from "./firebase-config.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const db = getFirestore(app);

async function loadDividendi() {
  try {
    const snap = await getDocs(collection(db, "portafoglio"));
    const rows = snap.docs.map(d => d.data());

    buildStats(rows);
    buildTable(rows);
    buildChart(rows);
  } catch (e) {
    console.error("Errore loadDividendi:", e);
    // mostra comunque messaggi in pagina se vuoi
  }
}

function buildStats(rows) {
  const totDiv = rows.reduce((sum, r) => sum + (Number(r.dividendi) || 0), 0);
  const totInvestito = rows.reduce((sum, r) => sum + (Number(r.prezzo_acquisto) || 0), 0);

  document.getElementById("divTotale").textContent = totDiv.toFixed(2) + " €";
  document.getElementById("divAnnuale").textContent = (totDiv).toFixed(2) + " €";
  document.getElementById("totInvestDiv").textContent = totInvestito.toFixed(2) + " €";

  const payers = rows.filter(r => Number(r.dividendi) > 0);
  const top = payers.sort((a,b)=> (b.dividendi||0) - (a.dividendi||0))[0];
  document.getElementById("topPayer").textContent = top ? top.nome : "-";

  const divYield = totInvestito > 0 ? (totDiv / totInvestito * 100) : 0;
  document.getElementById("divYield").textContent = divYield.toFixed(2) + " %";

  // mini-cards
  const top5 = payers.sort((a,b)=> (b.dividendi||0) - (a.dividendi||0)).slice(0,5);
  document.getElementById("miniTop5").textContent = top5.map(x => `${x.nome} (${(x.dividendi||0).toFixed(0)}€)`).join(", ") || "-";
  document.getElementById("countPayers").textContent = payers.length;
}

function buildTable(rows) {
  const tbody = document.getElementById("tableDividendi");
  tbody.innerHTML = "";

  // Ordina per dividendi decrescente
  const sorted = [...rows].sort((a,b)=> (b.dividendi||0) - (a.dividendi||0));

  if (sorted.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.style.textAlign = "center";
    td.style.fontStyle = "italic";
    td.textContent = "Nessun dato";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  sorted.forEach(r => {
    const tr = document.createElement("tr");
    const nome = r.nome || "-";
    const div = (Number(r.dividendi) || 0).toFixed(2) + " €";
    const tipo = r.tipologia || "-";
    const pct = ((Number(r.percentuale_portafoglio) || 0) * 100).toFixed(2) + " %";
    const inv = (Number(r.prezzo_acquisto) || 0).toFixed(2) + " €";

    tr.innerHTML = `
      <td style="text-align:center">${nome}</td>
      <td style="text-align:center">${div}</td>
      <td style="text-align:center">${tipo}</td>
      <td style="text-align:center">${pct}</td>
      <td style="text-align:center">${inv}</td>
    `;
    tbody.appendChild(tr);
  });
}

function buildChart(rows) {
  const top10 = [...rows]
    .sort((a,b)=> (b.dividendi||0) - (a.dividendi||0))
    .slice(0,10);

  const labels = top10.map(r => r.nome);
  const values = top10.map(r => Number(r.dividendi) || 0);

  const ctx = document.getElementById("chartTopDiv").getContext("2d");

  // se c'è già un chart precedente lo distruggiamo (utile in hot reload)
  if (window._chartTopDiv) {
    window._chartTopDiv.destroy();
  }

  window._chartTopDiv = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Dividendi (€)",
        data: values,
        backgroundColor: labels.map((_,i) => `rgba(54,162,235, ${0.5 + (i/20)})`),
        borderColor: labels.map(_ => "rgba(54,162,235,1)"),
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: "y",
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ctx.formattedValue + " €" } }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { callback: v => v + " €" }
        }
      }
    }
  });
}

loadDividendi();
