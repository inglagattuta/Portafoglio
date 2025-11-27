// andamento.js (completo, responsive e con colori dinamici)
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

    const parsedDate = new Date(id);
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

  dati.sort((a, b) => a.data - b.data);
  return dati;
}

// ================================
//   CREA IL GRAFICO CON 2 LINEE
// ================================
function createChart(labels, investitoValues, giornalieroValues) {
  const ctx = document.getElementById("chartAndamento");
  if (!ctx) return;

  if (ctx._chartInstance) ctx._chartInstance.destroy();

  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Investito (€)", data: investitoValues, borderWidth: 3, tension: 0.25, fill: false },
        { label: "Giornaliero (€)", data: giornalieroValues, borderWidth: 3, tension: 0.25, fill: false }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true }, tooltip: { mode: "index", intersect: false } },
      interaction: { mode: "index", intersect: false },
      scales: { x: { ticks: { maxRotation: 45, minRotation: 45 } }, y: { beginAtZero: false } }
    }
  });

  ctx._chartInstance = chart;
}

// =======================================
//   GENERA RIEPILOGO MENSILE
// =======================================
function generaRiepilogoMensile(dati) {
  const mesiMap = new Map();

  dati.forEach(r => {
    const y = r.data.getFullYear();
    const m = r.data.getMonth();
    const key = `${y}-${String(m + 1).padStart(2, "0")}`;

    if (!mesiMap.has(key)) {
      mesiMap.set(key, { meseKey: key, data: r.label, investito: r.investito, valore: r.giornaliero });
    } else {
      const existing = mesiMap.get(key);
      if (r.data > new Date(existing.data)) {
        mesiMap.set(key, { meseKey: key, data: r.label, investito: r.investito, valore: r.giornaliero });
      }
    }
  });

  const keys = Array.from(mesiMap.keys()).sort();

  return keys.map((k, idx, arr) => {
    const curr = mesiMap.get(k);
    const prev = idx > 0 ? mesiMap.get(arr[idx - 1]) : null;
    const incremento = prev ? curr.investito - prev.investito : 0;
    const profitto = curr.valore - curr.investito;
    const profitPerc = curr.investito !== 0 ? (profitto / curr.investito) * 100 : 0;

    return {
      mese: curr.data,
      investito: curr.investito,
      valore: curr.valore,
      incremento,
      profitto,
      profitPerc: Number(profitPerc.toFixed(2))
    };
  });
}

// =======================================
//   COLOR SCALE FUNCTION
// =======================================
function getColor(val, type="percent") {
  let color = "#fff";

  if(type === "percent") {
    if (val > 20) color = "#006400";
    else if (val > 10) color = "#008000";
    else if (val > 0) color = "#9ACD32";
    else if (val === 0) color = "#FFA500";
    else if (val > -10) color = "#FF4500";
    else color = "#8B0000";
  } else {
    // valore assoluto: più alto = verde
    if(val >= 10000) color = "#006400";
    else if(val >= 5000) color = "#008000";
    else if(val >= 1000) color = "#9ACD32";
    else if(val >= 0) color = "#FFA500";
    else color = "#FF4500";
  }

  return color;
}

// =======================================
//   RENDER TABELLA HTML
// =======================================
function renderRiepilogoInTabella(riepilogo, andamento) {
  const tbody = document.querySelector("#tabellaRiepilogo tbody");
  tbody.innerHTML = "";

  riepilogo.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-align:center;">${r.mese}</td>
      <td style="text-align:right; background-color:${getColor(r.investito,"value")};">${r.investito.toFixed(2)} €</td>
      <td style="text-align:right; background-color:${getColor(r.valore,"value")};">${r.valore.toFixed(2)} €</td>
      <td style="text-align:right; background-color:${getColor(r.incremento,"value")};">${r.incremento.toFixed(2)} €</td>
      <td style="text-align:right; background-color:${getColor(r.profitto,"value")};">${r.profitto.toFixed(2)} €</td>
      <td style="text-align:right; background-color:${getColor(r.profitPerc,"percent")};">${r.profitPerc.toFixed(2)} %</td>
      <td style="text-align:center;"><button class="expand-btn">+</button></td>
    `;
    tbody.appendChild(tr);

    const detailTr = document.createElement("tr");
    detailTr.style.display = "none";
    detailTr.classList.add("details");

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
            <th style="text-align:center;">Azioni</th>
          </tr>
          ${giornoDelMese.map(g => `
            <tr data-id="${g.label}">
              <td style="text-align:center;">${g.label}</td>
              <td style="text-align:right; background-color:${getColor(g.investito,"value")};">${g.investito.toFixed(2)}</td>
              <td style="text-align:right; background-color:${getColor(g.giornaliero,"value")};">${g.giornaliero.toFixed(2)}</td>
              <td style="text-align:right; background-color:${getColor(g.azioni,"value")};">${g.azioni.toFixed(2)}</td>
              <td style="text-align:center;"><button class="edit-btn">✏️ Modifica</button></td>
            </tr>`).join('')}
        </table>
      </td>
    `;
    tbody.appendChild(detailTr);

    // Expand mensile
    tr.querySelector(".expand-btn").addEventListener("click", () => {
      detailTr.style.display = detailTr.style.display === "none" ? "table-row" : "none";
    });
  });

  // --- EDIT/UPDATE GIORNALIERO ---
  tbody.addEventListener("click", async (e) => {
    if (!e.target.classList.contains("edit-btn")) return;

    const btn = e.target;
    const trGiorno = btn.closest("tr");
    const celle = trGiorno.querySelectorAll("td");
    const idGiorno = trGiorno.dataset.id;

    if (btn.textContent === "✏️ Modifica") {
      celle[1].innerHTML = `<input type="number" value="${celle[1].textContent}" style="width:80px">`;
      celle[2].innerHTML = `<input type="number" value="${celle[2].textContent}" style="width:80px">`;
      celle[3].innerHTML = `<input type="number" value="${celle[3].textContent}" style="width:80px">`;
      btn.textContent = "💾 Salva";
    } else if (btn.textContent === "💾 Salva") {
      const nuoviValori = {
        INVESTITO: parseFloat(celle[1].querySelector("input").value),
        GIORNALIERO: parseFloat(celle[2].querySelector("input").value),
        AZIONI: parseFloat(celle[3].querySelector("input").value)
      };

      try {
        const docRef = doc(db, "andamento", idGiorno);
        await updateDoc(docRef, nuoviValori);

        celle[1].textContent = nuoviValori.INVESTITO.toFixed(2);
        celle[2].textContent = nuoviValori.GIORNALIERO.toFixed(2);
        celle[3].textContent = nuoviValori.AZIONI.toFixed(2);
        btn.textContent = "✏️ Modifica";

        // Aggiorna colori immediatamente
        celle[1].style.backgroundColor = getColor(nuoviValori.INVESTITO,"value");
        celle[2].style.backgroundColor = getColor(nuoviValori.GIORNALIERO,"value");
        celle[3].style.backgroundColor = getColor(nuoviValori.AZIONI,"value");

        alert("Giornata aggiornata correttamente!");
      } catch(err) {
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
