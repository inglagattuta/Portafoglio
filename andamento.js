// =======================================
// IMPORTS
// =======================================
import { db } from "./firebase-config.js";
import { collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getColor, getTextColor } from "./colorUtils.js";

// =======================================
// CARICA DATI DA FIRESTORE
// =======================================
async function loadAndamento() {
  const ref = collection(db, "andamento");
  const snap = await getDocs(ref);

  const dati = [];
  snap.forEach(docSnap => {
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

  dati.sort((a,b) => a.data - b.data);
  return dati;
}

// =======================================
// CREA IL GRAFICO
// =======================================
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
// GENERA RIEPILOGO MENSILE
// =======================================
function generaRiepilogoMensile(dati) {
  const mesiMap = new Map();

  dati.forEach(r => {
    const y = r.data.getFullYear();
    const m = r.data.getMonth();
    const key = `${y}-${String(m+1).padStart(2,"0")}`;

    if (!mesiMap.has(key) || r.data > new Date(mesiMap.get(key).data)) {
      mesiMap.set(key, { meseKey: key, data: r.label, investito: r.investito, valore: r.giornaliero });
    }
  });

  const keys = Array.from(mesiMap.keys()).sort();

  return keys.map((k, idx, arr) => {
    const curr = mesiMap.get(k);
    const prev = idx > 0 ? mesiMap.get(arr[idx-1]) : null;
    const incremento = prev ? curr.investito - prev.investito : 0;
    const profitto = curr.valore - curr.investito;
    const profitPerc = curr.investito !== 0 ? (profitto/curr.investito)*100 : 0;

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
// RENDER TABELLA HTML - DARK MODE READY
// =======================================
function renderRiepilogoInTabella(riepilogo, andamento) {
  const tbody = document.querySelector("#tabellaRiepilogo tbody");
  tbody.innerHTML = "";
  const darkMode = document.body.classList.contains("dark");

  riepilogo.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-align:center;">${r.mese}</td>
      <td style="text-align:right; background-color:${getColor(r.investito,"value",darkMode)}; color:${getTextColor(getColor(r.investito,"value",darkMode), darkMode)};">${r.investito.toFixed(2)} €</td>
      <td style="text-align:right; background-color:${getColor(r.valore,"value",darkMode)}; color:${getTextColor(getColor(r.valore,"value",darkMode), darkMode)};">${r.valore.toFixed(2)} €</td>
      <td style="text-align:right; background-color:${getColor(r.incremento,"value",darkMode)}; color:${getTextColor(getColor(r.incremento,"value",darkMode), darkMode)};">${r.incremento.toFixed(2)} €</td>
      <td style="text-align:right; background-color:${getColor(r.profitto,"value",darkMode)}; color:${getTextColor(getColor(r.profitto,"value",darkMode), darkMode)};">${r.profitto.toFixed(2)} €</td>
      <td style="text-align:right; background-color:${getColor(r.profitPerc,"percent",darkMode)}; color:${getTextColor(getColor(r.profitPerc,"percent",darkMode), darkMode)};">${r.profitPerc.toFixed(2)} %</td>
      <td style="text-align:center;"><button class="expand-btn">+</button></td>
    `;
    tbody.appendChild(tr);

    // Dettaglio giornaliero
    const detailTr = document.createElement("tr");
    detailTr.style.display = "none";
    detailTr.classList.add("details");

    const giorni = andamento.filter(a => {
      const [y,m] = r.mese.split("-");
      return a.data.getFullYear() === Number(y) && (a.data.getMonth()+1) === Number(m);
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
          ${giorni.map(g => `
            <tr data-id="${g.label}">
              <td style="text-align:center;">${g.label}</td>
              <td style="text-align:right; background-color:${getColor(g.investito,"value",darkMode)}; color:${getTextColor(getColor(g.investito,"value",darkMode), darkMode)};">${g.investito.toFixed(2)}</td>
              <td style="text-align:right; background-color:${getColor(g.giornaliero,"value",darkMode)}; color:${getTextColor(getColor(g.giornaliero,"value",darkMode), darkMode)};">${g.giornaliero.toFixed(2)}</td>
              <td style="text-align:right; background-color:${getColor(g.azioni,"value",darkMode)}; color:${getTextColor(getColor(g.azioni,"value",darkMode), darkMode)};">${g.azioni.toFixed(2)}</td>
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

  // Edit giornaliero
  tbody.addEventListener("click", async e => {
    if (!e.target.classList.contains("edit-btn")) return;

    const btn = e.target;
    const trGiorno = btn.closest("tr");
    const celle = trGiorno.querySelectorAll("td");
    const idGiorno = trGiorno.dataset.id;
    const darkMode = document.body.classList.contains("dark");

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
        const docRef = doc(db,"andamento",idGiorno);
        await updateDoc(docRef, nuoviValori);

        celle[1].textContent = nuoviValori.INVESTITO.toFixed(2);
        celle[2].textContent = nuoviValori.GIORNALIERO.toFixed(2);
        celle[3].textContent = nuoviValori.AZIONI.toFixed(2);
        btn.textContent = "✏️ Modifica";

        celle[1].style.backgroundColor = getColor(nuoviValori.INVESTITO,"value",darkMode);
        celle[2].style.backgroundColor = getColor(nuoviValori.GIORNALIERO,"value",darkMode);
        celle[3].style.backgroundColor = getColor(nuoviValori.AZIONI,"value",darkMode);

        celle[1].style.color = getTextColor(getColor(nuoviValori.INVESTITO,"value",darkMode), darkMode);
        celle[2].style.color = getTextColor(getColor(nuoviValori.GIORNALIERO,"value",darkMode), darkMode);
        celle[3].style.color = getTextColor(getColor(nuoviValori.AZIONI,"value",darkMode), darkMode);

        alert("Giornata aggiornata correttamente!");
      } catch(err) {
        console.error("Errore aggiornamento Firestore:", err);
        alert("Errore durante l'aggiornamento!");
      }
    }
  });
}

// =======================================
// MAIN
// =======================================
async function main() {
  try {
    const andamento = await loadAndamento();
    if (!andamento || andamento.length === 0) {
      console.error("Nessun dato trovato!");
      return;
    }

    const labels = andamento.map(r => r.label);
    const investitoValues = andamento.map(r => r.investito);
    const giornalieroValues = andamento.map(r => r.giornaliero);

    createChart(labels, investitoValues, giornalieroValues);

    const riepilogo = generaRiepilogoMensile(andamento);
    renderRiepilogoInTabella(riepilogo, andamento);
  } catch(err) {
    console.error("Errore main andamento:", err);
  }
}

main();
