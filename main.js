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

  await fetch(
    "https://workflowinglagattuta.ing-lagattuta.workers.dev/",
    { method: "POST" }
  );

  alert("Aggiornamento avviato!");
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
// LOAD DATA (QUI NASCE TUTTA LA LOGICA)
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

    let quantita = 0;
    let tempoReale = 0;

    if (az && az.investito && az.prezzo_medio && az.prezzo_corrente) {
      quantita = az.investito / az.prezzo_medio;
      tempoReale = quantita * az.prezzo_corrente;
    }

    rowsData.push({
      id: docSnap.id,
      ...d,
      quantita,
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
// COPIA TEMPO REALE → PREZZO CORRENTE (CORRETTA)
// -------------------------------------------------------------
async function copiaTempoRealeInCorrente(riga) {
  if (!riga.quantita || riga.quantita <= 0) {
    alert("❌ Quantità non disponibile");
    return;
  }

  const nuovoPrezzoCorrente =
    riga.tempo_reale / riga.quantita;

  if (!isFinite(nuovoPrezzoCorrente)) {
    alert("❌ Prezzo non valido");
    return;
  }

  await updateDoc(
    doc(db, "portafoglio", riga.id),
    {
      prezzo_corrente: Number(nuovoPrezzoCorrente.toFixed(4))
    }
  );

  await loadData();
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

    // ------------------ AZIONI ------------------
    const tdA = document.createElement("td");
    tdA.className = "action-buttons";

    const btC = document.createElement("button");
    btC.textContent = "📋 Copia";
    btC.className = "btn-copy";
    btC.onclick = () => {
      if (!confirm("Copiare Tempo Reale in Corrente?")) return;
      copiaTempoRealeInCorrente(d);
    };

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

    tdA.append(btC, btE, btD);
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
