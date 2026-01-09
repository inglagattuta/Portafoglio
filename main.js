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
const bxValore = document.getElementById("valoreAttuale");
const bxDividendi = document.getElementById("totDividendi");
const bxProfitto = document.getElementById("totProfitto");
const bxProfittoPerc = document.getElementById("totProfittoPerc");

// -------------------------------------------------------------
// STATO
// -------------------------------------------------------------
let rowsData = [];
let sortState = { column: null, dir: 1 };

// -------------------------------------------------------------
// BOTTONE REALTIME
// -------------------------------------------------------------
const controls = document.querySelector(".controls");

const btnRealtime = document.createElement("button");
btnRealtime.textContent = "🔄 Aggiorna Tempo Reale";
btnRealtime.className = "dashboard-btn";
btnRealtime.onclick = async () => {
  if (!confirm("Aggiornare i prezzi in tempo reale?")) return;

  btnRealtime.disabled = true;
  btnRealtime.textContent = "⏳ Aggiornamento in corso...";

  try {
    await fetch(
      "https://api.github.com/repos/inglagattuta/Portafoglio/actions/workflows/update-etoro.yml/dispatches",
      {
        method: "POST",
        headers: {
          "Accept": "application/vnd.github+json",
          "Authorization": "Bearer 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",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ref: "main" })
      }
    );

    // tempo per completare GitHub Action
    setTimeout(() => {
      loadData();
      btnRealtime.textContent = "✅ Aggiornato";
      setTimeout(() => {
        btnRealtime.textContent = "🔄 Aggiorna Tempo Reale";
        btnRealtime.disabled = false;
      }, 2000);
    }, 20000);

  } catch (e) {
    alert("Errore durante l'aggiornamento");
    btnRealtime.textContent = "🔄 Aggiorna Tempo Reale";
    btnRealtime.disabled = false;
  }
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

const fmtEuro = v => Number(v || 0).toFixed(2) + " €";

// -------------------------------------------------------------
// HEADER CON SORT STABILE
// -------------------------------------------------------------
function renderHeader() {
  headerRow.innerHTML = "";

  columns.forEach(col => {
    const th = document.createElement("th");
    th.textContent = labelMap[col];
    th.style.cursor = "pointer";

    th.onclick = () => {
      sortState.dir =
        sortState.column === col ? -sortState.dir : 1;
      sortState.column = col;
      sortRows();
      renderTable();
    };

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
  rowsData = [];
  renderHeader();

  const snap = await getDocs(collection(db, "portafoglio"));
  const snapAzioni = await getDocs(collection(db, "azioni"));

  const azioniMap = new Map();
  snapAzioni.docs.forEach(a => {
    const d = a.data();
    if (d.ticker) azioniMap.set(d.ticker.toUpperCase(), d);
  });

  snap.docs.forEach(docSnap => {
    const d = docSnap.data();
    const az = azioniMap.get((d.nome || "").toUpperCase());

    let tempoReale = 0;
    if (az && az.investito && az.prezzo_medio && az.prezzo_corrente) {
      const qty = az.investito / az.prezzo_medio;
      tempoReale = qty * az.prezzo_corrente;
    }

    rowsData.push({
      id: docSnap.id,
      ...d,
      tempo_reale: tempoReale
    });
  });

  sortRows();
  renderTable();
}

// -------------------------------------------------------------
// SORT STABILE
// -------------------------------------------------------------
function sortRows() {
  if (!sortState.column) return;

  const col = sortState.column;
  const dir = sortState.dir;

  rowsData.sort((a, b) => {
    const va = a[col] ?? 0;
    const vb = b[col] ?? 0;

    if (typeof va === "string") {
      return va.localeCompare(vb) * dir;
    }
    return (va - vb) * dir;
  });
}

// -------------------------------------------------------------
// RENDER TABLE
// -------------------------------------------------------------
function renderTable() {
  tableBody.innerHTML = "";

  let totInvestito = 0;
  let totValore = 0;
  let totDividendi = 0;
  let totProfitto = 0;

  rowsData.forEach(d => {
    const tr = document.createElement("tr");

    columns.forEach(col => {
      const td = document.createElement("td");
      td.style.textAlign = "center";

      if (col === "score") {
        const v = Number(d.score || 0);
        td.textContent = v.toFixed(2);
        td.className =
          v >= 12 ? "score-high" :
          v >= 8 ? "score-medium" :
          "score-low";
      }
      else if (euroCols.has(col)) {
        const v = Number(d[col] || 0);
        td.textContent = fmtEuro(v);

        if (col === "prezzo_acquisto") totInvestito += v;
        if (col === "dividendi") totDividendi += v;
        if (col === "tempo_reale") totValore += v;
      }
      else if (col === "profitto") {
        const p =
          (d.prezzo_corrente || 0) -
          (d.prezzo_acquisto || 0) +
          (d.dividendi || 0) +
          (d.prelevato || 0);

        td.textContent = fmtEuro(p);
        totProfitto += p;
      }
      else {
        td.textContent = d[col] ?? "";
      }

      tr.appendChild(td);
    });

    const tdA = document.createElement("td");
    tdA.className = "action-buttons";

    const btE = document.createElement("button");
    btE.textContent = "Modifica";
    btE.className = "btn-edit";
    btE.onclick = () => openEditModal(d.id);

    const btD = document.createElement("button");
    btD.textContent = "Elimina";
    btD.className = "btn-delete";
    btD.onclick = async () => {
      if (!confirm("Confermi eliminazione?")) return;
      await deleteDoc(doc(db, "portafoglio", d.id));
      loadData();
    };

    tdA.append(btE, btD);
    tr.appendChild(tdA);
    tableBody.appendChild(tr);
  });

  bxInvestito.textContent = fmtEuro(totInvestito);
  bxValore.textContent = fmtEuro(totValore);
  bxDividendi.textContent = fmtEuro(totDividendi);
  bxProfitto.textContent = fmtEuro(totProfitto);
  bxProfittoPerc.textContent =
    totInvestito > 0
      ? ((totProfitto / totInvestito) * 100).toFixed(2) + " %"
      : "0 %";
}

// -------------------------------------------------------------
loadData();
