import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

async function loadAndamento() {
  console.log("DEBUG: caricamento andamento...");

  const ref = collection(db, "andamento");
  const snapshot = await getDocs(ref);

  // -------------------------------
  // PREPARA RECORD
  // -------------------------------
  let records = snapshot.docs.map(doc => ({
    DATA: doc.id, // ID del doc = data
    INVESTITO: Number(doc.data().INVESTITO || 0),
    GIORNALIERO: Number(doc.data().GIORNALIERO || 0)
  }));


  if (records.length === 0) return;

  // -------------------------------
  // ORDINA PER DATA
  // -------------------------------
  records.sort((a, b) => new Date(a.DATA) - new Date(b.DATA));

  // -------------------------------
  // BOX RIEPILOGO
  // -------------------------------
  const last = records[records.length - 1];
  const inv = last.INVESTITO;
  const val = last.GIORNALIERO;
  const profitto = val - inv;
  const perc = inv > 0 ? ((profitto / inv) * 100).toFixed(2) : "0.00";

  document.getElementById("box-investito").querySelector(".value").textContent = `${inv} €`;
  document.getElementById("box-valore").querySelector(".value").textContent = `${val} €`;
  document.getElementById("box-profitto").querySelector(".value").textContent = `${profitto} €`;
  document.getElementById("box-percentuale").querySelector(".value").textContent = `${perc}%`;

  console.log("DEBUG record count:", records.length);

  // -------------------------------
  // DATI PER IL GRAFICO
  // -------------------------------
  const labels = records.map(r => r.DATA);
  const investito = records.map(r => r.INVESTITO);
  const giornaliero = records.map(r => r.GIORNALIERO);

  const ctx = document.getElementById("grafico").getContext("2d");

  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "INVESTITO",
          data: investito,
          borderWidth: 2,
          borderColor: "rgba(0, 200, 255, 0.9)",
          backgroundColor: "rgba(0, 200, 255, 0.2)",
          tension: 0.35,
          fill: true
        },
        {
          label: "GIORNALIERO",
          data: giornaliero,
          borderWidth: 2,
          borderColor: "rgba(0, 255, 100, 0.9)",
          backgroundColor: "rgba(0, 255, 100, 0.2)",
          tension: 0.35,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: { ticks: { color: "#fff" } },
        y: { ticks: { color: "#fff" } }
      },
      plugins: {
        legend: { labels: { color: "#fff" } }
      }
    }
  });

  // -------------------------------
  // RIEPILOGO MENSILE (ultimo giorno del mese)
  // -------------------------------
  const perMese = {};
  records.forEach(r => {
    const [yy, mm] = r.DATA.split("-");
    const key = `${yy}-${mm}`;
    // Mantiene sempre l’ultimo record del mese
    perMese[key] = r;
  });

  const mesi = Object.keys(perMese).sort();

  const tbody = document.querySelector("#tabella-mensile tbody");
  tbody.innerHTML = "";

  let lastInvestito = null;

  mesi.forEach(mese => {
    const r = perMese[mese];
    const data = r.DATA;
    const invest = r.INVESTITO;
    const val = r.GIORNALIERO;

    let incremento = "-";
    if (lastInvestito !== null) incremento = invest - lastInvestito;
    lastInvestito = invest;

    const profitto = val - invest;
    const profitPerc = invest > 0 ? ((profitto / invest) * 100).toFixed(2) : "0";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${data}</td>
      <td>${invest} €</td>
      <td>${val} €</td>
      <td class="${incremento >= 0 ? "positivo" : "negativo"}">${incremento === "-" ? "-" : incremento + " €"}</td>
      <td class="${profitto >= 0 ? "positivo" : "negativo"}">${profitto} €</td>
      <td class="${profitto >= 0 ? "positivo" : "negativo"}">${profitPerc}%</td>
    `;
    tbody.appendChild(tr);
  });
}

loadAndamento();
