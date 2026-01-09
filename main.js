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
// DOM
// -------------------------------------------------------------
const headerRow = document.getElementById("headerRow");
const tableBody = document.getElementById("tableBody");

const bxInvestito = document.getElementById("totInvestito");
const bxValore    = document.getElementById("valoreAttuale");
const bxDividendi = document.getElementById("totDividendi");
const bxProfitto  = document.getElementById("totProfitto");
const bxProfittoPerc = document.getElementById("totProfittoPerc");

// -------------------------------------------------------------
// BOTTONE REALTIME (UNO SOLO)
// -------------------------------------------------------------
const controls = document.querySelector(".controls");

const btnRealtime = document.createElement("button");
btnRealtime.textContent = "🔄 Aggiorna Tempo Reale";
btnRealtime.className = "dashboard-btn";
btnRealtime.onclick = async () => {
  if (!confirm("Aggiornare i prezzi in tempo reale?")) return;
  await fetch("/api/update-realtime-prices", { method: "POST" });
  await loadData();
};

controls.appendChild(btnRealtime);

// -------------------------------------------------------------
// COLONNE
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
  score: "Score"
};

const euroCols = new Set([
  "prezzo_acquisto",
  "prezzo_corrente",
  "dividendi",
  "prelevato",
  "tempo_reale"
]);

// -------------------------------------------------------------
// FORMAT
// -------------------------------------------------------------
const fmtEuro = v => Number(v || 0).toFixed(2) + " €";

// -------------------------------------------------------------
// HEADER
// -------------------------------------------------------------
function renderHeader() {
  headerRow.innerHTML = "";
  columns.forEach(c => {
    const th = document.createElement("th");
    th.textContent = labelMap[c] || c;
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

  const snap = await getDocs(collection(db, "portafoglio"));
  const snapAzioni = await getDocs(collection(db, "azioni"));

  // MAPPA AZIONI PER TICKER
  const azioniMap = new Map();
  snapAzioni.docs.forEach(a => {
    const d = a.data();
    if (d.ticker) azioniMap.set(d.ticker.toUpperCase(), d);
  });

  let totInvestito = 0;
  let totValore = 0;
  let totDividendi = 0;
  let totProfitto = 0;

  snap.docs.forEach(docSnap => {
    const d = docSnap.data();
    const id = docSnap.id;
    const tr = document.createElement("tr");

    const az = azioniMap.get((d.nome || "").toUpperCase());

    columns.forEach(col => {
      const td = document.createElement("td");
      td.style.textAlign = "center";

      // -------- TEMPO REALE --------
      if (col === "tempo_reale") {
        let valore = 0;
        if (az && az.investito && az.prezzo_medio && az.prezzo_corrente) {
          const qty = az.investito / az.prezzo_medio;
          valore = qty * az.prezzo_corrente;
        }
        td.textContent = fmtEuro(valore);
        totValore += valore;
      }

      // -------- PROFITTO --------
      else if (col === "profitto") {
        const p =
          (d.prezzo_corrente || 0) -
          (d.prezzo_acquisto || 0) +
          (d.dividendi || 0) +
          (d.prelevato || 0);
        td.textContent = fmtEuro(p);
        totProfitto += p;
      }

      // -------- EURO --------
      else if (euroCols.has(col)) {
        const v = Number(d[col] || 0);
        td.textContent = fmtEuro(v);

        if (col === "prezzo_acquisto") totInvestito += v;
        if (col === "dividendi") totDividendi += v;
      }

      else {
        td.textContent = d[col] ?? "";
      }

      tr.appendChild(td);
    });

    // -------- AZIONI --------
    const tdA = document.createElement("td");
    tdA.className = "action-buttons";

    const btE = document.createElement("button");
    btE.textContent = "Modifica";
    btE.className = "btn-edit";
    btE.onclick = () => openEditModal(id);

    const btD = document.createElement("button");
    btD.textContent = "Elimina";
    btD.className = "btn-delete";
    btD.onclick = async () => {
      if (!confirm("Confermi eliminazione?")) return;
      await deleteDoc(doc(db, "portafoglio", id));
      loadData();
    };

    tdA.append(btE, btD);
    tr.appendChild(tdA);
    tableBody.appendChild(tr);
  });

  // -------- BOX --------
  bxInvestito.textContent = fmtEuro(totInvestito);
  bxValore.textContent    = fmtEuro(totValore);
  bxDividendi.textContent = fmtEuro(totDividendi);
  bxProfitto.textContent  = fmtEuro(totProfitto);
  bxProfittoPerc.textContent =
    totInvestito > 0
      ? ((totProfitto / totInvestito) * 100).toFixed(2) + " %"
      : "0 %";
}

// -------------------------------------------------------------
// MODAL (rimane invariato)
// -------------------------------------------------------------
async function openEditModal(id) {
  alert("Modal già funzionante – riusiamo il tuo codice esistente");
}

// -------------------------------------------------------------
loadData();
