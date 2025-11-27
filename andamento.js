// andamento.js
import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// ===================================
// CARICA DATI FIREBASE
// ===================================
async function loadAndamento() {
  const ref = collection(db, "andamento");
  const snap = await getDocs(ref);

  const dati = [];

  snap.forEach(doc => {
    const d = doc.data();

    const investito = d.INVESTITO ?? 0;
    const valore = d.GIORNALIERO ?? 0;
    const azioni = d.AZIONI ?? 0;

    const incremento = valore - investito;
    const percentuale = investito > 0 ? (incremento / investito) * 100 : 0;

    dati.push({
      data: doc.id,                 // Usa l’ID come data (es: "2025-02")
      investito,
      valore,
      incremento,
      profitto: incremento,
      percentuale,
      azioni
    });
  });

  // Ordina per data crescente
  dati.sort((a, b) => a.data.localeCompare(b.data));

  renderGrafico(dati);
  renderRiepilogoInTabella(dati);
}

// ===================================
// TABELLA
// ===================================
function renderRiepilogoInTabella(dati) {
  const tbody = document.querySelector("#tabellaRiepilogo tbody");
  tbody.innerHTML = "";

  dati.forEach(r => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${r.data}</td>
      <td>${r.investito.toLocaleString("it-IT", {style:"currency", currency:"EUR"})}</td>
      <td>${r.valore.toLocaleString("it-IT", {style:"currency", currency:"EUR"})}</td>
      <td>${r.incremento.toLocaleString("it-IT", {style:"currency", currency:"EUR"})}</td>
      <td>${r.profitto.toLocaleString("it-IT", {style:"currency", currency:"EUR"})}</td>
      <td>${r.percentuale.toFixed(2)}%</td>
      <td>${r.azioni}</td>
    `;

    tbody.appendChild(tr);
  });
}

// ===================================
// GRAFICO
// ===================================
let chartRef = null;

function renderGrafico(dati) {
  const ctx = document.getElementById("chartAndamento").getContext("2d");

  const labels = dati.map(d => d.data);
  const values = dati.map(d => d.valore);

  if (chartRef) chartRef.destroy();

  chartRef = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Valore Portafoglio",
        data: values,
        borderWidth: 3
      }]
    }
  });
}

// ===================================
// INIT
// ===================================
document.addEventListener("DOMContentLoaded", loadAndamento);
