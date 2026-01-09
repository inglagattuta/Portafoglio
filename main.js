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
// COLUMNS DEFINITIONS
// -------------------------------------------------------------
const columns = [
  "tipologia",
  "nome",
  "prezzo_acquisto",
  "tempo_reale",          // ← NUOVA COLONNA
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

// colonne nascoste
const hiddenCols = new Set([
  "percentuale_12_mesi",
  "rendimento_percentuale",
  "payback",
  "percentuale_portafoglio"
]);

// formattazioni
const euroCols = new Set(["prezzo_acquisto","prezzo_corrente","dividendi","prelevato","tempo_reale"]);
const percCols = new Set(["percentuale_12_mesi","rendimento_percentuale","payback","percentuale_portafoglio"]);

// -------------------------------------------------------------
// FORMATTERS
// -------------------------------------------------------------
const fmtEuro  = n => Number(n||0).toFixed(2) + " €";
const fmtPerc  = n => Number(n||0).toFixed(2) + " %";
const fmtScore = n => Number(n||0).toFixed(2);

// -------------------------------------------------------------
// HEADER RENDERING + SORTING
// -------------------------------------------------------------
function renderHeader() {
  headerRow.innerHTML = "";

  columns.forEach(col => {
    const th = document.createElement("th");
    th.textContent = labelMap[col] || col;
    if (hiddenCols.has(col)) th.style.display = "none";
    th.classList.add("sortable");
    headerRow.appendChild(th);
  });

  const thA = document.createElement("th");
  thA.textContent = "Azioni";
  headerRow.appendChild(thA);
}

function enableSorting() {
  const ths = Array.from(headerRow.children);

  ths.forEach((th, idx) => {
    if (th.textContent === "Azioni") return;

    th.dataset.asc = "true";
    th.style.cursor = "pointer";

    th.onclick = () => {
      const asc = th.dataset.asc === "true";
      th.dataset.asc = (!asc).toString();
      sortByColumn(idx, asc);

      ths.forEach(h => h.textContent = h.textContent.replace(/ ↑| ↓/g, ""));
      th.textContent += asc ? " ↑" : " ↓";
    };
  });
}

function sortByColumn(colIndex, asc) {
  const rows = Array.from(tableBody.rows);

  const arr = rows.map(r => {
    const raw = r.cells[colIndex]?.dataset.raw || "";
    const num = parseFloat(raw);

    let key;
    if (raw === "") key = "";
    else if (!isNaN(num)) key = num;
    else key = raw.toLowerCase();

    return { row: r, key };
  });

  arr.sort((a, b) => {
    const x = a.key, y = b.key;

    if (typeof x === "number" && typeof y === "number")
      return asc ? x - y : y - x;

    if (x === "" || y === "")
      return asc ? (x === "" ? 1 : -1) : (x === "" ? -1 : 1);

    return asc ? x.localeCompare(y) : y.localeCompare(x);
  });

  arr.forEach(i => tableBody.appendChild(i.row));
}

// -------------------------------------------------------------
// MODAL SYSTEM
// -------------------------------------------------------------
let modalEl = null;

function ensureModal() {
  if (modalEl) return modalEl;

  modalEl = document.createElement("div");
  modalEl.id = "editModal";
  modalEl.classList.add("modal-overlay");
  modalEl.style.display = "none";

  modalEl.innerHTML = `
    <div class="modal-card">
      <h3>Modifica</h3>
      <div id="modalFields"></div>
      <div class="modal-buttons">
        <button id="modalSave" class="btn-save">Salva</button>
        <button id="modalClose" class="btn-cancel">Annulla</button>
      </div>
    </div>
  `;

  document.body.appendChild(modalEl);

  modalEl.querySelector("#modalClose").onclick = () => {
    modalEl.style.display = "none";
  };

  return modalEl;
}

async function openEditModal(docId) {
  const ref = doc(db, "portafoglio", docId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return alert("Record non trovato!");

  const data = snap.data();
  const modal = ensureModal();
  const fieldsDiv = modal.querySelector("#modalFields");
  fieldsDiv.innerHTML = "";

  const editable = [
    "prezzo_acquisto",
    "prezzo_corrente",
    "dividendi",
    "prelevato",
    "percentuale_12_mesi",
    "rendimento_percentuale",
    "payback",
    "score"
  ];

  editable.forEach(f => {
    const lbl = document.createElement("label");
    lbl.textContent = f.toUpperCase().replaceAll("_", " ");

    const inp = document.createElement("input");
    inp.type = "number";
    inp.step = "0.01";
    inp.id = "fld_" + f;
    inp.value = data[f] ?? "";

    fieldsDiv.appendChild(lbl);
    fieldsDiv.appendChild(inp);
  });

  modal.style.display = "flex";

  modal.querySelector("#modalSave").onclick = async () => {
    const updated = { ...data };

    editable.forEach(f => {
      const el = document.getElementById("fld_" + f);
      const v = el.value;
      if (v === "") delete updated[f];
      else updated[f] = Number(v);
    });

    updated.profitto =
      (updated.prezzo_corrente || 0) -
      (updated.prezzo_acquisto || 0) +
      (updated.dividendi || 0) +
      (updated.prelevato || 0);

    updated.score = Number(updated.score || 0);

    await updateDoc(ref, updated);

    modal.style.display = "none";
    await loadData();
  };
}

// -------------------------------------------------------------
// IMPORT / EXPORT EXCEL (unchanged)
// -------------------------------------------------------------
window.importExcel = async function(event) { /*...unchanged...*/ }
window.exportExcel = async function() { /*...unchanged...*/ }

// -------------------------------------------------------------
// STATS
// -------------------------------------------------------------
function updateStats(docs) { /*...unchanged...*/ }

// -------------------------------------------------------------
// LOAD DATA + TEMPO REALE
// -------------------------------------------------------------
async function loadData() {
  tableBody.innerHTML = "";
  renderHeader();

  if (!db) {
    console.error("Firestore non inizializzato!");
    alert("Errore: Firestore non inizializzato.");
    return;
  }

  try {
    console.log("Caricamento dati da Firebase...");
    const snap = await getDocs(collection(db, "portafoglio"));
    const snapAzioni = await getDocs(collection(db, "azioni"));

    // mappa ticker → prezzo_reale
    const azioniMap = new Map();
    snapAzioni.docs.forEach(a => {
      const data = a.data();
      azioniMap.set(data.nome?.toLowerCase(), data);
    });

    if (snap.docs.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = columns.length + 1;
      td.textContent = "Nessun dato trovato!";
      td.style.textAlign = "center";
      td.style.fontStyle = "italic";
      tr.appendChild(td);
      tableBody.appendChild(tr);
      bxInvestito.textContent = "0 €";
      bxValore.textContent = "0 €";
      bxDividendi.textContent = "0 €";
      bxProfitto.textContent = "0 €";
      document.getElementById("totProfittoPerc").textContent = "0 %";
      return;
    }

    snap.docs.forEach(docSnap => {
      const d = docSnap.data();
      const id = docSnap.id;
      const tr = document.createElement("tr");

      const az = azioniMap.get((d.nome || "").toLowerCase());

      columns.forEach(col => {
        const td = document.createElement("td");
        td.style.textAlign = "center";
        td.style.display = hiddenCols.has(col) ? "none" : "table-cell";

        if (col === "profitto") {
          const p = (Number(d.prezzo_corrente)||0) - (Number(d.prezzo_acquisto)||0) +
                    (Number(d.dividendi)||0) + (Number(d.prelevato)||0);
          td.textContent = fmtEuro(p);
          td.dataset.raw = p;
          td.classList.add(p>=0?"positive":"negative");
        } else if (col === "tempo_reale") {
          let valore = 0;
          if (az) {
            const investito = Number(d.prezzo_acquisto||0);
            const prezzoMedio = Number(d.prezzo_medio||0);
            const prezzoReale = Number(az.prezzo_reale||0);
            if (investito>0 && prezzoMedio>0 && prezzoReale>0){
              const quantita = investito / prezzoMedio;
              valore = quantita * prezzoReale;
            }
          }
          td.textContent = fmtEuro(valore);
          td.dataset.raw = valore;
        } else if (euroCols.has(col)) {
          const v = Number(d[col]||0);
          td.textContent = fmtEuro(v);
          td.dataset.raw = v;
        } else if (percCols.has(col)) {
          const v = Number(d[col]||0);
          td.textContent = fmtPerc(v);
          td.dataset.raw = v;
        } else if (col === "score") {
          const v = Number(d[col]||0);
          td.textContent = fmtScore(v);
          td.dataset.raw = v;
          if(v>=12) td.classList.add("score-high");
          else if(v<12 && v>=8) td.classList.add("score-medium");
          else td.classList.add("score-low");
        } else {
          td.textContent = d[col] ?? "";
          td.dataset.raw = (d[col] ?? "").toString();
        }

        tr.appendChild(td);
      });

      const tdA = document.createElement("td");
      tdA.classList.add("action-buttons");
      tdA.style.textAlign = "center";

      const btE = document.createElement("button");
      btE.textContent = "Modifica";
      btE.classList.add("btn-edit");
      btE.onclick = () => openEditModal(id);

      const btD = document.createElement("button");
      btD.textContent = "Cancella";
      btD.classList.add("btn-delete");
      btD.onclick = async () => {
        if(!confirm("Confermi?")) return;
        await deleteDoc(doc(db,"portafoglio",id));
        await loadData();
      };

      tdA.appendChild(btE);
      tdA.appendChild(btD);
      tr.appendChild(tdA);

      tableBody.appendChild(tr);
    });

    updateStats(snap.docs);
    enableSorting();

  } catch(e){
    console.error("Errore nel caricamento dati:", e);
    alert("Errore nel caricamento dati, controlla console.");
  }
}

// -------------------------------------------------------------
// AGGIORNA PREZZI REALTIME (CHIAMATA API BACKEND)
// -------------------------------------------------------------
async function aggiornaPrezziRealtime(){
  try{
    const res = await fetch("/api/update-realtime-prices",{method:"POST"});
    if(!res.ok) throw new Error("Errore API");
    alert("Prezzi aggiornati correttamente");
  }catch(e){
    console.error(e);
    alert("Errore aggiornamento prezzi");
  }
}

// -------------------------------------------------------------
// INIT
// -------------------------------------------------------------
loadData();
