// -------------------------------------------------------------
// FIREBASE INIT
// -------------------------------------------------------------
import { db } from "./firebase-config.js";

import {
  collection,
  getDocs,
  getDoc,
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
// REALE BUTTON
// -------------------------------------------------------------
const btnRealtime = document.createElement("button");
btnRealtime.textContent = "🔄 Aggiorna Tempo Reale";
btnRealtime.classList.add("btn-primary");
btnRealtime.onclick = async () => {
  if (!confirm("Aggiornare i prezzi in tempo reale?")) return;
  await aggiornaPrezziRealtime();
  await loadData();
};
document.body.prepend(btnRealtime);

// -------------------------------------------------------------
// COLUMNS
// -------------------------------------------------------------
const columns = [
  "tipologia",
  "nome",
  "prezzo_acquisto",
  "tempo_reale",
  "prezzo_corrente",
  "dividendi",
  "prelevato",
  "profitto",
  "percentuale_12_mesi",
  "rendimento_percentuale",
  "payback",
  "percentuale_portafoglio",
  "score"
];

const labelMap = {
  tipologia: "Tipologia",
  nome: "Titolo",
  prezzo_acquisto: "Investito",
  tempo_reale: "Tempo Reale",
  prezzo_corrente: "Corrente",
  dividendi: "Dividendi",
  prelevato: "Prelevato",
  profitto: "Profitto",
  percentuale_12_mesi: "% 12 mesi",
  rendimento_percentuale: "Rend %",
  payback: "Payback",
  percentuale_portafoglio: "% Portafoglio",
  score: "Score"
};

const hiddenCols = new Set([
  "percentuale_12_mesi",
  "rendimento_percentuale",
  "payback",
  "percentuale_portafoglio"
]);

const euroCols = new Set([
  "prezzo_acquisto",
  "prezzo_corrente",
  "dividendi",
  "prelevato",
  "tempo_reale"
]);

const percCols = new Set([
  "percentuale_12_mesi",
  "rendimento_percentuale",
  "payback",
  "percentuale_portafoglio"
]);

// -------------------------------------------------------------
// FORMATTERS
// -------------------------------------------------------------
const fmtEuro  = n => Number(n || 0).toFixed(2) + " €";
const fmtPerc  = n => Number(n || 0).toFixed(2) + " %";
const fmtScore = n => Number(n || 0).toFixed(2);

// -------------------------------------------------------------
// HEADER
// -------------------------------------------------------------
function renderHeader() {
  headerRow.innerHTML = "";

  columns.forEach(col => {
    const th = document.createElement("th");
    th.textContent = labelMap[col] || col;
    if (hiddenCols.has(col)) th.style.display = "none";
    headerRow.appendChild(th);
  });

  const thA = document.createElement("th");
  thA.textContent = "Azioni";
  headerRow.appendChild(thA);
}

// -------------------------------------------------------------
// LOAD DATA + TEMPO REALE
// -------------------------------------------------------------
async function loadData() {
  tableBody.innerHTML = "";
  renderHeader();

  try {
    const snap = await getDocs(collection(db, "portafoglio"));
    const snapAzioni = await getDocs(collection(db, "azioni"));

    // 🔑 MAPPA PER TICKER
    const azioniMap = new Map();
    snapAzioni.docs.forEach(a => {
      const d = a.data();
      if (d.ticker) {
        azioniMap.set(d.ticker.toUpperCase(), d);
      }
    });

    snap.docs.forEach(docSnap => {
      const d = docSnap.data();
      const id = docSnap.id;
      const tr = document.createElement("tr");

      const ticker = (d.nome || "").toUpperCase();
      const az = azioniMap.get(ticker);

      columns.forEach(col => {
        const td = document.createElement("td");
        td.style.textAlign = "center";
        td.style.display = hiddenCols.has(col) ? "none" : "table-cell";

        // ---------------- TEMPO REALE ----------------
        if (col === "tempo_reale") {
          let valore = 0;

          if (az) {
            const investito      = Number(az.investito || 0);
            const prezzoMedio    = Number(az.prezzo_medio || 0);
            const prezzoCorrente = Number(az.prezzo_corrente || 0);

            if (investito > 0 && prezzoMedio > 0 && prezzoCorrente > 0) {
              const quantita = investito / prezzoMedio;
              valore = quantita * prezzoCorrente;
            }
          }

          td.textContent = fmtEuro(valore);
          td.dataset.raw = valore;
        }

        // ---------------- PROFITTO ----------------
        else if (col === "profitto") {
          const p =
            (Number(d.prezzo_corrente) || 0) -
            (Number(d.prezzo_acquisto) || 0) +
            (Number(d.dividendi) || 0) +
            (Number(d.prelevato) || 0);

          td.textContent = fmtEuro(p);
          td.dataset.raw = p;
        }

        // ---------------- EURO ----------------
        else if (euroCols.has(col)) {
          const v = Number(d[col] || 0);
          td.textContent = fmtEuro(v);
          td.dataset.raw = v;
        }

        // ---------------- PERCENTUALI ----------------
        else if (percCols.has(col)) {
          const v = Number(d[col] || 0);
          td.textContent = fmtPerc(v);
          td.dataset.raw = v;
        }

        // ---------------- SCORE ----------------
        else if (col === "score") {
          const v = Number(d[col] || 0);
          td.textContent = fmtScore(v);
          td.dataset.raw = v;
        }

        // ---------------- DEFAULT ----------------
        else {
          td.textContent = d[col] ?? "";
          td.dataset.raw = d[col] ?? "";
        }

        tr.appendChild(td);
      });

      // ---------------- ACTIONS ----------------
      const tdA = document.createElement("td");

      const btE = document.createElement("button");
      btE.textContent = "Modifica";
      btE.onclick = () => openEditModal(id);

      const btD = document.createElement("button");
      btD.textContent = "Cancella";
      btD.onclick = async () => {
        if (!confirm("Confermi?")) return;
        await deleteDoc(doc(db, "portafoglio", id));
        await loadData();
      };

      tdA.append(btE, btD);
      tr.appendChild(tdA);

      tableBody.appendChild(tr);
    });

  } catch (e) {
    console.error("Errore loadData:", e);
  }
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
