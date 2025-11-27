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
//   GENERA RIEPILOGO MENSILE (ultimo giorno del mese)
// =======================================
function generaRiepilogoMensile(dati) {
  // dati deve essere ordinato per data crescente
  const mesiMap = new Map();

  for (const r of dati) {
    const y = r.data.getFullYear();
    const m = r.data.getMonth(); // 0-11
    const key = `${y}-${String(m + 1).padStart(2, "0")}`;

    // Se non esiste, lo creiamo
    if (!mesiMap.has(key)) {
      mesiMap.set(key, {
        meseKey: key,
        data: r.label,
        investito: r.investito,
        valore: r.giornaliero
      });
    } else {
      // Se già esiste, aggiorniamo solo se la data è più recente
      const existing = mesiMap.get(key);

      if (r.data > new Date(existing.data)) {
        mesiMap.set(key, {
          meseKey: key,
          data: r.label,
          investito: r.investito,
          valore: r.giornaliero
        });
      }
    }
  }

  // Ordina le chiavi (mesi)
  const keys = Array.from(mesiMap.keys()).sort();

  // Genera l'output finale
  const output = keys.map((k, idx, arr) => {
    const curr = mesiMap.get(k);
    const prevKey = idx > 0 ? arr[idx - 1] : null;
    const prev = prevKey ? mesiMap.get(prevKey) : null;

    const incremento = prev ? (curr.investito - prev.investito) : 0;

// Calcolo profitto = valore - investito
const profitto = curr.valore - curr.investito;

// Percentuale profitto
const profitPerc = curr.investito !== 0 
  ? (profitto / curr.investito) * 100 
  : 0;

return {
  mese: curr.data,              
  investito: curr.investito,    
  valore: curr.valore,          
  incremento: incremento,       
  profitto: profitto,           
  profitPerc: Number(profitPerc.toFixed(2))
};

  });

  return output;
}



// =======================================
//   RENDER RIEPILOGO IN TABELLA HTML
// =======================================
function renderRiepilogoInTabella(riepilogo, andamento) {
  const tbody = document.querySelector("#tabellaRiepilogo tbody");
  tbody.innerHTML = "";

  riepilogo.forEach(r => {
    const tr = document.createElement("tr");

    // Riga principale
    tr.innerHTML = `
      <td style="text-align:center;">${r.mese}</td>
      <td style="text-align:right;">${r.investito.toFixed(2)} €</td>
      <td style="text-align:right;">${r.valore.toFixed(2)} €</td>
      <td style="text-align:right;">${r.incremento.toFixed(2)} €</td>
      <td style="text-align:right;">${r.profitto.toFixed(2)} €</td>
      <td style="text-align:right;">${r.profitPerc.toFixed(2)} %</td>
      <td style="text-align:center;"><button class="expand-btn">+</button></td>
    `;
    tbody.appendChild(tr);

    // Riga dettagli nascosta
    const detailTr = document.createElement("tr");
    detailTr.style.display = "none";
    detailTr.classList.add("details");

    // Filtra i valori giornalieri del mese corrente
    const giornoDelMese = andamento.filter(a => {
      const [y, m] = r.mese.split("-");
      return a.data.getFullYear() === Number(y) && (a.data.getMonth() + 1) === Number(m);
    });

    detailTr.innerHTML = `
      <td colspan="7">
        <table class="detail-table" style="width:100%; border-collapse:collapse;">
          <tr>
            <th style="text-align:center;">Giorno</th>
            <th style="text-align:right;">Investito (€)</th>
            <th style="text-align:right;">Valore (€)</th>
            <th style="text-align:right;">Giornaliero (€)</th>
          </tr>
          ${giornoDelMese.map(g => `
            <tr>
              <td style="text-align:center;">${g.label}</td>
              <td style="text-align:right;">${g.investito.toFixed(2)} €</td>
              <td style="text-align:right;">${g.giornaliero.toFixed(2)} €</td>
              <td style="text-align:right;">${g.azioni.toFixed(2)} €</td>
            </tr>`).join('')}
        </table>
      </td>
    `;
    tbody.appendChild(detailTr);

    // Evento click sul +
    tr.querySelector(".expand-btn").addEventListener("click", () => {
      detailTr.style.display = detailTr.style.display === "none" ? "table-row" : "none";
    });
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

    // Mostra la tabella HTML con pulsante +
    renderRiepilogoInTabella(riepilogo, andamento);

  } catch (err) {
    console.error("Errore in main andamento:", err);
  }
}

main();

