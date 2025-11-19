// ===============================
// IMPORT FIREBASE
// ===============================
import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("🔥 Dividendi.js caricato!");

  // ===============================
  // VARIABILI GLOBALI
  // ===============================
  let rows = [];
  let filteredRows = [];

  // ===============================
  // FETCH DA FIREBASE
  // ===============================
  async function loadDividendi() {
    console.log("📡 Carico dati da Firebase...");

    const snap = await getDocs(collection(db, "portafoglio"));
    rows = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 🔥 Filtra solo titoli che pagano dividendi
    filteredRows = rows.filter(r => Number(r.dividendi) > 0);

    console.log("📊 Trovati titoli con dividendi:", filteredRows.length);

    renderStats(filteredRows);
    renderTable(filteredRows);
    renderChart(filteredRows);
  }

  // ===============================
  // RENDER BOX STATISTICHE
  // ===============================
  function renderStats(data) {
    const totaleDiv = data.reduce((acc, r) => acc + Number(r.dividendi), 0);
    const mediaDiv = data.length > 0 ? totaleDiv / data.length : 0;
    const top = data.length > 0 ? data.reduce((max, r) => r.dividendi > max.dividendi ? r : max) : null;

    document.getElementById("totaleDividendi").textContent = totaleDiv.toFixed(2) + " €";
    document.getElementById("mediaDividendi").textContent = mediaDiv.toFixed(2) + " €";
    document.getElementById("topDividendo").textContent = top ? `${top.nome} (${top.dividendi.toFixed(2)} €)` : "-";

    // Yield fittizio per ora
    document.getElementById("divYield").textContent = "3.5%";
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
        <td>${r.dividendi.toFixed(2)} €</td>
        <td>${r.tipologia}</td>
        <td>${(r.percentuale_portafoglio * 100).toFixed(2)}%</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  // ===============================
  // RENDER GRAFICO TOP DIVIDENDI
  // ===============================
  function renderChart(data) {
    const ctx = document.getElementById("chartTopDiv");
    if (!ctx) {
      console.error("❌ ERRORE: chartTopDiv non trovato!");
      return;
    }

    // Ordina per dividendi
    const top5 = [...data].sort((a, b) => b.dividendi - a.dividendi).slice(0, 5);

    new Chart(ctx, {
      type: "bar",
      data: {
        labels: top5.map(x => x.nome),
        datasets: [{
          label: "Dividendi €",
          data: top5.map(x => x.dividendi)
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        }
      }
    });

    console.log("📈 Grafico generato!");
  }
// ============================
// ORDINAMENTO COLONNE TABELLA
// ============================

function sortTable(tableId, colIndex) {
  const table = document.getElementById(tableId);
  const rows = Array.from(table.querySelectorAll("tbody tr"));
  const isNumber = !isNaN(rows[0].children[colIndex].innerText);

  rows.sort((a, b) => {
    const A = a.children[colIndex].innerText.trim();
    const B = b.children[colIndex].innerText.trim();
    return isNumber ? (parseFloat(A) - parseFloat(B)) : A.localeCompare(B);
  });

  rows.forEach(r => table.querySelector("tbody").appendChild(r));
}

// Attiva il sort al click
document.querySelectorAll("#divTable th.sortable").forEach((th, index) => {
  th.addEventListener("click", () => sortTable("divTable", index));
});

  // ===============================
  // AVVIO
  // ===============================
  loadDividendi();
});
