// -------------------------------------------------------------
// FIREBASE INIT
// -------------------------------------------------------------
import { db } from "./firebase-config.js";

import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// -------------------------------------------------------------
// DOM ELEMENTS
// -------------------------------------------------------------
const headerRow = document.getElementById("headerRow");
const tableBody = document.getElementById("tableBody");

const bxInvestito = document.getElementById("totInvestito");
const bxValore    = document.getElementById("valoreAttuale");
const bxDividendi = document.getElementById("totDividendi");
const bxProfitto  = document.getElementById("totProfitto");

// -------------------------------------------------------------
// REALTIME BUTTON
// -------------------------------------------------------------
const btnRealtime = document.createElement("button");
btnRealtime.textContent = "🔄 Aggiorna Tempo Reale";
btnRealtime.className = "dashboard-btn";
btnRealtime.style.background = "#00b894";

btnRealtime.onclick = async () => {
  if (!confirm("Aggiornare i prezzi in tempo reale?")) return;
  await aggiornaPrezziRealtime();
  await loadData();
};

document.querySelector(".controls")?.appendChild(btnRealtime);

// -------------------------------------------------------------
// COLUMNS
// -------------------------------------------------------------
const columns = [
  "tipologia",
  "nome",
  "prezzo_acquisto",
  "prezzo_corrente",
  "tempo_reale",
  "dividendi",
  "prelevato",
  "profitto",
  "score"
];

const labelMap = {
  tipologia: "Tipologia",
  nome: "Titolo",
  prezzo_acquisto: "Investito",
  prezzo_corrente: "Corrente",
  tempo_reale: "Tempo Reale",
  dividendi: "Dividendi",
  prelevato: "Prelevato",
  profitto: "Profitto",
  score: "Score"
};

const euroCols = new Set([
  "prezzo_acquisto",
  "prezzo_corrente",
  "dividendi",
  "prelevato",
  "tempo_reale",
  "profitto"
]);

// -------------------------------------------------------------
// FORMATTERS
// -------------------------------------------------------------
const fmtEuro  = n => Number(n || 0).toFixed(2) + " €";
const fmtScore = n => Number(n || 0).toFixed(2);

// -------------------------------------------------------------
// HEADER
// -------------------------------------------------------------
function renderHeader() {
  headerRow.innerHTML = "";

  columns.forEach(col => {
    const th = document.createElement("th");
    th.textContent = labelMap[col] || col;
    headerRow.appendChild(th);
  });

  const thA = document.createElement("th");
  thA.textContent = "Azioni";
  headerRow.appendChild(thA);
}

// -------------------------------------------------------------
// LOAD DATA
// -------------------------------------------------------------
async function loadData() {
  tableBody.innerHTML = "";
  renderHeader();

  try {
    const snapPort = await getDocs(collection(db, "portafoglio"));
    const snapAz   = await getDocs(collection(db, "azioni"));

    // 🔑 MAPPA AZIONI PER TICKER
    const azioniMap = new Map();
    snapAz.docs.forEach(d => {
      const a = d.data();
      if (a.ticker) azioniMap.set(a.ticker.toUpperCase(), a);
    });

    snapPort.docs.forEach(docSnap => {
      const d = docSnap.data();
      const id = docSnap.id;
      const tr = document.createElement("tr");

      const ticker = (d.nome || "").toUpperCase();
      const az = azioniMap.get(ticker);

      columns.forEach(col => {
        const td = document.createElement("td");
        td.style.textAlign = "center";

        // ---------------- TEMPO REALE ----------------
        if (col === "tempo_reale") {
          let valore = 0;

          if (az) {
            const investito   = Number(az.investito || 0);
            const prezzoMed  = Number(az.prezzo_medio || 0);
            const prezzoCorr = Number(az.prezzo_corrente || 0);

            if (investito > 0 && prezzoMed > 0 && prezzoCorr > 0) {
              const quantita = investito / prezzoMed;
              valore = quantita * prezzoCorr;
            }
          }

          td.textContent = fmtEuro(valore);
        }

        // ---------------- PROFITTO ----------------
        else if (col === "profitto") {
          const p =
            (Number(d.prezzo_corrente) || 0) -
            (Number(d.prezzo_acquisto) || 0) +
            (Number(d.dividendi) || 0) +
            (Number(d.prelevato) || 0);

          td.textContent = fmtEuro(p);
        }

        // ---------------- EURO ----------------
        else if (euroCols.has(col)) {
          td.textContent = fmtEuro(d[col]);
        }

        // ---------------- SCORE ----------------
        else if (col === "score") {
          td.textContent = fmtScore(d[col]);
        }

        // ---------------- DEFAULT ----------------
        else {
          td.textContent = d[col] ?? "";
        }

        tr.appendChild(td);
      });

      // ---------------- ACTIONS ----------------
      const tdA = document.createElement("td");

      const btD = document.createElement("button");
      btD.textContent = "❌";
      btD.onclick = async () => {
        if (!confirm("Confermi cancellazione?")) return;
        await deleteDoc(doc(db, "portafoglio", id));
        await loadData();
      };

      tdA.appendChild(btD);
      tr.appendChild(tdA);
      tableBody.appendChild(tr);
    });

    // 🔥 BOX STATS
    updateStats(snapPort.docs);

  } catch (e) {
    console.error("Errore loadData:", e);
  }
}

// -------------------------------------------------------------
// STATS BOX (SOLO PORTAFOGLIO)
// -------------------------------------------------------------
function updateStats(docs) {
  let investito = 0;
  let valore = 0;
  let dividendi = 0;
  let prelevato = 0;

  docs.forEach(d => {
    const x = d.data();
    investito += Number(x.prezzo_acquisto || 0);
    valore    += Number(x.prezzo_corrente || 0);
    dividendi += Number(x.dividendi || 0);
    prelevato += Number(x.prelevato || 0);
  });

  const profitto =
    valore - investito + dividendi + prelevato;

  const perc =
    investito > 0 ? (profitto / investito) * 100 : 0;

  bxInvestito.textContent = fmtEuro(investito);
  bxValore.textContent    = fmtEuro(valore);
  bxDividendi.textContent = fmtEuro(dividendi);
  bxProfitto.textContent  = fmtEuro(profitto);

  const elPerc = document.getElementById("totProfittoPerc");
  if (elPerc) elPerc.textContent = perc.toFixed(2) + " %";
}

// -------------------------------------------------------------
// API REALTIME
// -------------------------------------------------------------
async function aggiornaPrezziRealtime() {
  await fetch("/api/update-realtime-prices", { method: "POST" });
}

// -------------------------------------------------------------
// INIT
// -------------------------------------------------------------
loadData();
