// ===============================
// IMPORT FIREBASE
// ===============================
import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// ===============================
// VARIABILI GLOBALI
// ===============================
let filteredRows = [];
let currentSort = { column: null, asc: true };

// ===============================
// ORDINAMENTO
// ===============================
function sortData(column, data) {
  if (currentSort.column === column) {
    currentSort.asc = !currentSort.asc;
  } else {
    currentSort.column = column;
    currentSort.asc = true;
  }

  return data.sort((a, b) => {
    if (a[column] < b[column]) return currentSort.asc ? -1 : 1;
    if (a[column] > b[column]) return currentSort.asc ? 1 : -1;
    return 0;
  });
}

// ===============================
// RENDER TABELLA
// ===============================
function renderTable(data) {
  const tableBody = document.getElementById("tableDividendi");
  tableBody.innerHTML = "";

  data.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.nome}</td>
      <td>${r.tipologia}</td>
      <td>${r.dividendi.toFixed(2)} €</td>
      <td>${(r.percentuale_portafoglio * 100).toFixed(2)}%</td>
      <td>${r.profitto.toFixed(2)} €</td>
      <td>${(r.rendimento_percentuale * 100).toFixed(2)}%</td>
    `;
    tableBody.appendChild(tr);
  });
}

// ===============================
// RENDER BOX STATISTICHE
// ===============================
function renderStats(data) {
  const totaleDiv = data.reduce((acc, r) => acc + r.dividendi, 0);
  const mediaDiv = data.length > 0 ? totaleDiv / data.length : 0;
  const top = data.length > 0 ? data.reduce((max, r) => r.dividendi > max.dividendi ? r : max) : null;

  document.getElementById("totaleDividendi").textContent = totaleDiv.toFixed(2) + " €";
  document.getElementById("mediaDividendi").textContent = mediaDiv.toFixed(2) + " €";
  document.getElementById("topDividendo").textContent = top ? `${top.nome} (${top.dividendi.toFixed(2)} €)` : "-";
}

// ===============================
// FETCH DATI DA FIREBASE
// ===============================
async function loadDividendi() {
  const snap = await getDocs(collection(db, "portafoglio"));
  const rows = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // 🔥 Mostra SOLO titoli che pagano dividendi
  filteredRows = rows.filter(r => Number(r.dividendi) > 0);

  renderStats(filteredRows);
  renderTable(filteredRows);
}


// ===============================
// CLICK SULLE COLONNE
// ===============================
document.querySelectorAll("#dividendiTable thead th[data-sort]").forEach(th => {
  th.addEventListener("click", () => {
    const column = th.dataset.sort;
    const sorted = sortData(column, filteredRows);
    renderTable(sorted);
  });
});

// ===============================
// AVVIO
// ===============================
loadDividendi();
