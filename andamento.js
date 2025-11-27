// andamento.js (rifatto, funzionante)
// usa la stessa versione Firebase del tuo firebase-config.js
import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// ================================
//   CARICA DATI DA FIREBASE
// ================================
async function loadAndamento() {
  const ref = collection(db, "andamento");
  const snap = await getDocs(ref);

  const dati = [];

  snap.forEach((docSnap) => {
    const id = docSnap.id;
    const data = docSnap.data();

    // prova a parsare l'id come data; se non è una data valida, usa epoch 1970-01-01
    const parsedDate = new Date(id);
    const dateObj = parsedDate.toString() === "Invalid Date" ? new Date(0) : parsedDate;

    dati.push({
      data: dateObj,               // Date object (usato per ordinamento)
      label: id,                   // id originale (es. "2025-03-15" o "2025-03")
      investito: Number(data.INVESTITO || 0),
      giornaliero: Number(data.GIORNALIERO || 0),
      azioni: Number(data.AZIONI || 0),
    });
  });

  // ordina per data reale (Date object)
  dati.sort((a, b) => a.data - b.data);
  return dati;
}

// ================================
//   CREA IL GRAFICO CON 2 LINEE
// ================================
function createChart(labels, investitoValues, giornalieroValues) {
  const canvas = document.getElementById("chartAndamento");
  if (!canvas) return;

  // Chart.js può usare direttamente l'elemento canvas
  const ctx = canvas.getContext ? canvas.getContext("2d") : canvas;

  if (canvas._chartInstance) canvas._chartInstance.destroy();

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
          borderColor: "rgba(0,150,136,0.9)"
        },
        {
          label: "Giornaliero (€)",
          data: giornalieroValues,
          borderWidth: 3,
          tension: 0.25,
          fill: false,
          borderColor: "rgba(3,169,244,0.9)"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true }, tooltip: { mode: "index", intersect: false } },
      interaction: { mode: "index", intersect: false },
      scales: {
        x: { ticks: { maxRotation: 45, minRotation: 45 }, grid: { color: "rgba(255,255,255,0.03)" } },
        y: { beginAtZero: false, grid: { color: "rgba(255,255,255,0.03)" } }
      }
    }
  });

  canvas._chartInstance = chart;
}

// =======================================
//   GENERA RIEPILOGO MENSILE
// =======================================
function generaRiepilogoMensile(dati) {
  const mesiMap = new Map();

  dati.forEach(r => {
    const y = r.data.getFullYear();
    const m = r.data.getMonth(); // 0-based
    const key = `${y}-${String(m + 1).padStart(2, "0")}`;

    // memorizzo l'ultimo record del mese (per data più recente)
    if (!mesiMap.has(key)) {
      mesiMap.set(key, { meseKey: key, lastLabel: r.label, lastDate: r.data, investito: r.investito, valore: r.giornaliero });
    } else {
      const existing = mesiMap.get(key);
      if (r.data > existing.lastDate) {
        mesiMap.set(key, { meseKey: key, lastLabel: r.label, lastDate: r.data, investito: r.investito, valore: r.giornaliero });
      }
    }
  });

  const keys = Array.from(mesiMap.keys()).sort();

  return keys.map((k, idx, arr) => {
    const curr = mesiMap.get(k);
    const prev = idx > 0 ? mesiMap.get(arr[idx - 1]) : null;
    const incremento = prev ? (curr.investito - prev.investito) : 0;
    const profitto = curr.valore - curr.investito;
    const profitPerc = curr.investito !== 0 ? (profitto / curr.investito) * 100 : 0;

    return {
      mese: k, // stringa "YYYY-MM"
      investito: curr.investito,
      valore: curr.valore,
      incremento,
      profitto,
      profitPerc: Number(profitPerc.toFixed(2)),
      lastLabel: curr.lastLabel // utile per mapping dettagli
    };
  });
}

// =======================================
//   RENDER RIEPILOGO IN TABELLA HTML
// =======================================
function renderRiepilogoInTabella(riepilogo, andamento) {
  const tbody = document.querySelector("#tabellaRiepilogo tbody");
  if (!tbody) {
    console.error("Tabella #tabellaRiepilogo non trovata in DOM");
    return;
  }
  tbody.innerHTML = "";

  // per ogni mese crea riga riepilogo + riga dettagli (nascosta)
  riepilogo.forEach(r => {
    const tr = document.createElement("tr");
    tr.classList.add("summary-row");

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

    // dettagli giornalieri per quel mese
    const detailTr = document.createElement("tr");
    detailTr.classList.add("details");
    detailTr.style.display = "none";

    // filtro andamento per quel mese (comparando anno e mese)
    const [yy, mm] = r.mese.split("-");
    const giornoDelMese = andamento.filter(a => {
      return a.data.getFullYear() === Number(yy) && (a.data.getMonth() + 1) === Number(mm);
    });

    // costruisco innerHTML per la riga dei dettagli
    const rowsGiorni = giornoDelMese.map(g => {
      return `
        <tr data-id="${g.label}">
          <td style="text-align:center;">${g.label}</td>
          <td style="text-align:right;">${g.investito.toFixed(2)} €</td>
          <td style="text-align:right;">${g.giornaliero.toFixed(2)} €</td>
          <td style="text-align:right;">${g.azioni.toFixed(2)}</td>
          <td style="text-align:center;"><button class="edit-btn">✏️ Modifica</button></td>
        </tr>
      `;
    }).join("");

    detailTr.innerHTML = `
      <td colspan="7">
        <table class="detail-table" style="width:100%; border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:center;">Giorno</th>
              <th style="text-align:right;">Investito (€)</th>
              <th style="text-align:right;">Valore (€)</th>
              <th style="text-align:right;">Azioni</th>
              <th style="text-align:center;">Azione</th>
            </tr>
          </thead>
          <tbody>
            ${rowsGiorni || '<tr><td colspan="5" style="text-align:center;">Nessun dato giornaliero</td></tr>'}
          </tbody>
        </table>
      </td>
    `;
    tbody.appendChild(detailTr);

    // attacco l'evento expand al pulsante (dopo che tr è stato inserito)
    const btn = tr.querySelector(".expand-btn");
    btn.addEventListener("click", () => {
      detailTr.style.display = detailTr.style.display === "none" ? "table-row" : "none";
    });
  });

  // --- Event delegation per edit/save sulle righe di dettaglio ---
  tbody.addEventListener("click", async (e) => {
    const target = e.target;
    if (!target.classList.contains("edit-btn")) return;

    const trGiorno = target.closest("tr");
    if (!trGiorno) return;

    const celle = trGiorno.querySelectorAll("td");
    const idGiorno = trGiorno.dataset.id;

    // se pulsante è "✏️ Modifica" -> trasformo in input
    if (target.textContent === "✏️ Modifica") {
      const valInvestito = celle[1].textContent.replace(" €", "").trim();
      const valGiornaliero = celle[2].textContent.replace(" €", "").trim();
      const valAzioni = celle[3].textContent.replace(" €", "").trim();

      celle[1].innerHTML = `<input type="number" value="${valInvestito}" style="width:100px">`;
      celle[2].innerHTML = `<input type="number" value="${valGiornaliero}" style="width:100px">`;
      celle[3].innerHTML = `<input type="number" value="${valAzioni}" style="width:100px">`;

      target.textContent = "💾 Salva";
      return;
    }

    // se pulsante è "💾 Salva"
    if (target.textContent === "💾 Salva") {
      try {
        const nuoviValori = {
          INVESTITO: parseFloat(celle[1].querySelector("input").value || 0),
          GIORNALIERO: parseFloat(celle[2].querySelector("input").value || 0),
          AZIONI: parseFloat(celle[3].querySelector("input").value || 0)
        };

        // aggiorna Firestore
        const docRef = doc(db, "andamento", idGiorno);
        await updateDoc(docRef, nuoviValori);

        // aggiorna UI: testo semplice
        celle[1].textContent = nuoviValori.INVESTITO.toFixed(2) + " €";
        celle[2].textContent = nuoviValori.GIORNALIERO.toFixed(2) + " €";
        celle[3].textContent = nuoviValori.AZIONI.toFixed(2);

        target.textContent = "✏️ Modifica";

        // (opzionale) potresti voler ricaricare l'intera vista per aggiornare il riepilogo/grafico
        // loadAndamento().then(data => { /* già gestito in main se vuoi */ });

        alert("Giornata aggiornata correttamente!");
      } catch (err) {
        console.error("Errore aggiornamento Firestore:", err);
        alert("Errore durante l'aggiornamento!");
      }
    }
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

    const labels = andamento.map(r => r.label);
    const investitoValues = andamento.map(r => r.investito);
    const giornalieroValues = andamento.map(r => r.giornaliero);

    createChart(labels, investitoValues, giornalieroValues);

    const riepilogo = generaRiepilogoMensile(andamento);
    console.table(riepilogo);
    renderRiepilogoInTabella(riepilogo, andamento);
  } catch (err) {
    console.error("Errore in main andamento:", err);
  }
}

main();
