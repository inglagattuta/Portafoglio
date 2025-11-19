import app from "./firebase-config.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const db = getFirestore(app);

// =============================
// LISTA TITOLI A DIVIDENDI
// =============================
const DIVIDENDI_LIST = [
  "AGNC","AMLP","ARCC","ARR","BKLN","BOAT","EFC","EPR","HAUTO.OL","HRZN","HTGC",
  "IIPR","IUS7","LQDE.L","MAIN","MPCC.OL","NLY","NORAM.OL","O","OHI","OMF","ORC",
  "PSEC","QYLD","SCHD","SDIV","SHYG","SRLN","TPVG","TRMD-A.OL","VAR.OL","WES",
  "XIFR","ZIM"
];

// =============================
// FUNZIONE PRINCIPALE
// =============================
async function loadDividendi() {
  const snap = await getDocs(collection(db, "portafoglio"));
  let rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Filtra SOLO titoli con dividendi
  let divRows = rows.filter(r =>
    DIVIDENDI_LIST.includes(r.nome?.trim().toUpperCase())
  );

  if (!divRows.length) return;

  renderMiniCards(divRows);
  renderTable(divRows);
  renderChart(divRows);
}

// =============================
// MINI CARDS
// =============================
function renderMiniCards(rows) {
  const totale = rows.reduce((a,b)=> a + Number(b.dividendi || 0), 0);

  const top = [...rows].sort((a,b) =>
    Number(b.dividendi) - Number(a.dividendi)
  )[0];

  const totaleValore = rows.reduce((a,b)=> a + Number(b.prezzo_corrente || 0), 0);
  const yieldPerc = totaleValore > 0 ? (totale / totaleValore * 100) : 0;

  document.getElementById("totaleDividendi").innerText = `${totale.toFixed(2)} €`;
  document.getElementById("mediaDividendi").innerText = `${(totale/12).toFixed(2)} €`;
  document.getElementById("topDividendo").innerText = `${top.nome} (${top.dividendi.toFixed(2)} €)`;
  document.getElementById("divYield").innerText = `${yieldPerc.toFixed(1)}%`;
}

// =============================
// TABELLA
// =============================
function renderTable(rows) {
  const tbody = document.getElementById("tableDividendi");
  if (!tbody) return;

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.nome}</td>
      <td>${r.dividendi.toFixed(2)} €</td>
      <td>${r.tipologia}</td>
      <td>${(r.percentuale_portafoglio * 100).toFixed(2)}%</td>
    </tr>
  `).join("");
}

// =============================
// TOP 5 DIVIDENDI – Grafico
// =============================
function renderChart(rows) {
  const top5 = [...rows]
    .sort((a,b) => Number(b.dividendi) - Number(a.dividendi))
    .slice(0, 5);

  const ctx = document.getElementById("chartTopDiv");
  if (!ctx) return;

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: top5.map(x => x.nome),
      datasets: [{
        label: "Dividendi €",
        data: top5.map(x => Number(x.dividendi)),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true }}
    }
  });
}

// =============================
// AVVIO
// =============================
loadDividendi();
