// andamento.js (completo)
// usa la stessa versione Firebase del tuo firebase-config.js
import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// ================================
//   CARICA DATI DA FIREBASE
// ================================
async function loadAndamento() {
  const ref = collection(db, "andamento");
  const snap = await getDocs(ref);

  const dati = [];

  snap.forEach((doc) => {
    const id = doc.id; // es: "2025-01-12"
    const data = doc.data();

    let parsedDate = new Date(id);
    if (parsedDate.toString() === "Invalid Date") {
      console.warn("Data non valida:", id);
      return;
    }

    dati.push({
      data: parsedDate,
      label: id,
      investito: Number(data.INVESTITO || 0),
      giornaliero: Number(data.GIORNALIERO || 0),
      azioni: Number(data.AZIONI || 0),
    });
  });

  // Ordina per data reale (crescente)
  dati.sort((a, b) => a.data - b.data);

  return dati;
}

// ================================
//   CREA IL GRAFICO CON 2 LINEE
// ================================
function createChart(labels, investitoValues, giornalieroValues) {
  const ctx = document.getElementById("chartAndamento");
  if (!ctx) {
    console.error("Elemento canvas #chartAndamento non trovato.");
    return;
  }

  // Se esiste già un chart, lo rimuoviamo (semplice guard)
  if (ctx._chartInstance) {
    ctx._chartInstance.destroy();
  }

  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Investito (€)",
          data: investitoValues,
          borderWidth: 3,
          tension: 0.25,
          fill: false,
        },
        {
          label: "Giornaliero (€)",
          data: giornalieroValues,
          borderWidth: 3,
          tension: 0.25,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true },
        tooltip: {
          mode: 'index',
          intersect: false,
        }
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        x: {
          ticks: { maxRotation: 45, minRotation: 45 },
        },
        y: {
          beginAtZero: false
        }
      },
    },
  });

  // memorizzo istanza per eventuale distruzione successiva
  ctx._chartInstance = chart;
}

// =======================================
//   GENERA RIEPILOGO MENSILE (primo giorno)
// =======================================
function generaRiepilogoMensile(dati) {
  // dati deve essere ordinato per data crescente
  const mesiMap = new Map();

  for (const r of dati) {
    const y = r.data.getFullYear();
    const m = r.data.getMonth(); // 0-11
    const key = `${y}-${String(m + 1).padStart(2, "0")}`; // e.g. 2025-01

    // se non esiste ancora il mese lo aggiungiamo con il primo giorno incontrato
    if (!mesiMap.has(key)) {
      mesiMap.set(key, {
        meseKey: key,
        data: r.label,           // id originale: es "2025-01-01"
        investito: r.investito,
        valore: r.giornaliero
      });
    }
  }

  // Ordina i mesi (chiavi)
  const keys = Array.from(mesiMap.keys()).sort();

  const output = keys.map((k, idx, arr) => {
    const curr = mesiMap.get(k);
    const prevKey = idx > 0 ? arr[idx - 1] : null;
    const prev = prevKey ? mesiMap.get(prevKey) : null;

    const incremento = prev ? (curr.investito - prev.investito) : 0;
    const profitto = curr.valore - curr.investito;
    const profitPerc = curr.investito !== 0 ? (profitto / curr.investito) * 100 : 0;

    return {
      mese: curr.data,                     // es. "2025-01-01"
      investito: curr.investito,
      valore: curr.valore,
      incremento: Number(incremento),
      profitto: Number(profitto),
      profitPerc: Number(profitPerc.toFixed(2))
    };
  });

  return output;
}

// =======================================
//   RENDER RIEPILOGO IN TABELLA HTML
// =======================================
function renderRiepilogoInTabella(riepilogo) {
  const tbody = document.querySelector("#tabellaRiepilogo tbody");
  if (!tbody) {
    console.warn("Tabella riepilogo non trovata: #tabellaRiepilogo tbody");
    return;
  }
  tbody.innerHTML = "";

  riepilogo.forEach(r => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td style="text-align:center;">${r.mese}</td>
      <td style="text-align:right;">${r.investito.toFixed(2)} €</td>
      <td style="text-align:right;">${r.valore.toFixed(2)} €</td>
      <td style="text-align:right;">${r.incremento.toFixed(2)} €</td>
      <td style="text-align:right;">${r.profitto.toFixed(2)} €</td>
      <td style="text-align:right;">${r.profitPerc.toFixed(2)} %</td>
    `;

    tbody.appendChild(tr);
  });
}

// ================================
//   MAIN
// ================================
async function main() {
  try {
    console.log("Caricamento dati andamento...");

    const andamento = await loadAndamento();

    if (!andamento || andamento.length === 0) {
      console.error("Nessun dato trovato in Firestore!");
      return;
    }

    // --- GRAFICO ---
    const labels = andamento.map(r => r.label);
    const investitoValues = andamento.map(r => r.investito);
    const giornalieroValues = andamento.map(r => r.giornaliero);
    createChart(labels, investitoValues, giornalieroValues);

    // --- RIEPILOGO MENSILE ---
    const riepilogo = generaRiepilogoMensile(andamento);
    console.table(riepilogo);

    // Mostra la tabella HTML
    renderRiepilogoInTabella(riepilogo);

  } catch (err) {
    console.error("Errore in main andamento:", err);
  }
}

main();
