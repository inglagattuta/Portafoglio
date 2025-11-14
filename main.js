// main.js - versione aggiornata con label professionali,
// colori dinamici e stile Score.

// -------------------------------------------------------------
// FIREBASE
// -------------------------------------------------------------
import app from "./firebase-config.js";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const db = getFirestore(app);

// -------------------------------------------------------------
// DOM
// -------------------------------------------------------------
const headerRow = document.getElementById("headerRow");
const tableBody = document.getElementById("tableBody");

// Box
const bxInvestito   = document.getElementById("totInvestito");
const bxValore      = document.getElementById("valoreAttuale");
const bxDividendi   = document.getElementById("totDividendi");
const bxProfitto    = document.getElementById("totProfitto");

// -------------------------------------------------------------
// COLUMNS + LABEL MAP
// -------------------------------------------------------------
const columns = [
  "tipologia",
  "nome",
  "prezzo_acquisto",
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

// Etichette “professionali”
const labelMap = {
  tipologia: "Tipologia",
  nome: "Titolo",
  prezzo_acquisto: "Investito",
  prezzo_corrente: "Corrente",
  dividendi: "Dividendi",
  prelevato: "Prelevato",
  profitto: "Profitto",
  score: "Score",
  percentuale_12_mesi: "% 12 mesi",
  rendimento_percentuale: "Rendimento %",
  payback: "Payback",
  percentuale_portafoglio: "% Portafoglio"
};

const hiddenCols = new Set([
  "percentuale_12_mesi",
  "rendimento_percentuale",
  "payback",
  "percentuale_portafoglio"
]);

const euroCols = new Set(["prezzo_acquisto","prezzo_corrente","dividendi","prelevato"]);
const percentCols = new Set(["percentuale_12_mesi","rendimento_percentuale","payback","percentuale_portafoglio"]);

// -------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------
const fmtEuro  = n => Number(n||0).toFixed(2) + " €";
const fmtPerc  = n => Number(n||0).toFixed(2) + " %";
const fmtScore = n => Number(n||0).toFixed(2);

// -------------------------------------------------------------
// HEADER + SORTING
// -------------------------------------------------------------
function renderHeader(){
  headerRow.innerHTML = "";
  columns.forEach(col=>{
    const th = document.createElement("th");
    th.textContent = labelMap[col] || col;
    th.classList.add("sortable");
    if (hiddenCols.has(col)) th.style.display = "none";
    headerRow.appendChild(th);
  });

  const thA = document.createElement("th");
  thA.textContent = "Azioni";
  headerRow.appendChild(thA);
}

function enableSorting(){
  const ths = Array.from(headerRow.children);
  ths.forEach((th, idx) => {
    if (th.textContent === "Azioni") return;
    th.style.cursor = "pointer";
    th.dataset.asc = "true";

    th.onclick = () => {
      const asc = th.dataset.asc === "true";
      sortByColumn(idx, asc);

      th.dataset.asc = (!asc).toString();
      ths.forEach(h => h.textContent = h.textContent.replace(/ ↑| ↓/g,""));
      th.textContent += asc ? " ↑" : " ↓";
    };
  });
}

function sortByColumn(colIndex, asc){
  const rows = Array.from(tableBody.rows);
  const arr = rows.map(r => {
    const c = r.cells[colIndex];
    let raw = c ? c.dataset.raw : "";
    if (raw === undefined || raw === null) raw = "";
    const num = parseFloat(raw);
    let key;
    if (raw === "") key = "";
    else if (!isNaN(num) && String(raw).trim() !== "") key = num;
    else key = String(raw).toLowerCase();
    return { row: r, key };
  });

  arr.sort((a,b) => {
    const x = a.key, y = b.key;
    if (typeof x === "number" && typeof y === "number") return asc ? x - y : y - x;
    if (x === "" && y === "") return 0;
    if (x === "") return asc ? 1 : -1;
    if (y === "") return asc ? -1 : 1;
    if (x > y) return asc ? 1 : -1;
    if (x < y) return asc ? -1 : 1;
    return 0;
  });

  arr.forEach(i => tableBody.appendChild(i.row));
}

// -------------------------------------------------------------
// MODAL
// -------------------------------------------------------------
let modalEl = null;

function ensureModal(){
  if (modalEl) return modalEl;

  modalEl = document.createElement("div");
  modalEl.id = "editModal";
  modalEl.style.position = "fixed";
  modalEl.style.inset = "0";
  modalEl.style.display = "none";
  modalEl.style.alignItems = "center";
  modalEl.style.justifyContent = "center";
  modalEl.style.background = "rgba(0,0,0,0.45)";
  modalEl.innerHTML = `
    <div class="modal-card">
      <h3>Modifica</h3>
      <div id="modalFields"></div>
      <div class="modal-buttons">
        <button id="modalSave">Salva</button>
        <button id="modalClose">Annulla</button>
      </div>
    </div>
  `;
  document.body.appendChild(modalEl);

  modalEl.querySelector("#modalClose").addEventListener("click", ()=>{
    modalEl.style.display = "none";
  });

  return modalEl;
}

async function openEditModal(docId){
  try {
    const ref = doc(db, "portafoglio", docId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return alert("Record non trovato");

    const data = snap.data();
    const modal = ensureModal();
    const fieldsDiv = modal.querySelector("#modalFields");
    fieldsDiv.innerHTML = "";

    const fields = [
      "prezzo_acquisto",
      "prezzo_corrente",
      "dividendi",
      "prelevato",
      "percentuale_12_mesi",
      "rendimento_percentuale",
      "payback",
      "score"
    ];

    fields.forEach(f => {
      const lbl = document.createElement("label");
      lbl.textContent = f.replaceAll("_"," ").toUpperCase();

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

      fields.forEach(f => {
        const el = document.getElementById("fld_" + f);
        if (!el) return;
        const v = el.value;
        if (v === "") delete updated[f];
        else updated[f] = Number(v);
      });

      // Ricalcolo profitto
      updated.profitto = Number(updated.prezzo_corrente || 0)
                       - Number(updated.prezzo_acquisto || 0)
                       + Number(updated.dividendi || 0)
                       + Number(updated.prelevato || 0);

      updated.score = Number(Number(updated.score || 0).toFixed(2));

      await updateDoc(ref, updated);
      modal.style.display = "none";
      await loadData();
    };

  } catch (e) {
    console.error("openEditModal error", e);
    alert("Errore apertura modal");
  }
}

// -------------------------------------------------------------
// IMPORT
// -------------------------------------------------------------
window.importExcel = async function(event){
  const file = event.target.files?.[0];
  if (!file) return alert("Nessun file selezionato");

  try {
    const allSnap = await getDocs(collection(db,"portafoglio"));
    const nameMap = new Map();
    allSnap.docs.forEach(d => {
      const nm = (d.data().nome || "").toLowerCase();
      if (nm) nameMap.set(nm, d.id);
    });

    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    let updated = 0, skipped = 0;

    for (const row of json){
      const nm = (row.nome || "").toLowerCase();
      if (!nm) { skipped++; continue; }

      const id = nameMap.get(nm);
      if (!id) { skipped++; continue; }

      [
        "prezzo_acquisto","prezzo_corrente","dividendi","prelevato",
        "percentuale_12_mesi","rendimento_percentuale","payback",
        "percentuale_portafoglio","score"
      ].forEach(k=>{
        if (row[k] !== undefined && row[k] !== null && row[k] !== "")
          row[k] = Number(row[k]);
      });

      delete row.profitto;
      await updateDoc(doc(db,"portafoglio",id), row);
      updated++;
    }

    alert(`Import completato. Aggiornati: ${updated}, Saltati: ${skipped}`);
    await loadData();

  } catch (e) {
    console.error("import error", e);
    alert("Errore import");
  }
};

// -------------------------------------------------------------
// EXPORT
// -------------------------------------------------------------
window.exportExcel = async function(){
  try {
    const snap = await getDocs(collection(db,"portafoglio"));
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Portafoglio");
    XLSX.writeFile(wb, "portafoglio.xlsx");
  } catch (e) {
    console.error("export error", e);
    alert("Errore export");
  }
};

// -------------------------------------------------------------
// STATISTICHE
// -------------------------------------------------------------
function updateStats(docs){
  let totInvestito = 0;
  let totValore = 0;
  let totDiv = 0;
  let totPrelevato = 0;

  docs.forEach(d => {
    const o = d.data();
    totInvestito += Number(o.prezzo_acquisto || 0);
    totValore    += Number(o.prezzo_corrente || 0);
    totDiv       += Number(o.dividendi || 0);
    totPrelevato += Number(o.prelevato || 0);
  });

  const profitto = totValore - totInvestito + totDiv + totPrelevato;

  bxInvestito.textContent = fmtEuro(totInvestito);
  bxValore.textContent    = fmtEuro(totValore);
  bxDividendi.textContent = fmtEuro(totDiv);
  
  bxProfitto.textContent = fmtEuro(profitto);
  bxProfitto.style.color = profitto >= 0 ? "#2ecc71" : "#e74c3c";
}

// -------------------------------------------------------------
// LOAD DATA
// -------------------------------------------------------------
async function loadData(){
  tableBody.innerHTML = "";
  renderHeader();

  try {
    const snap = await getDocs(collection(db,"portafoglio"));

    snap.docs.forEach(docSnap => {
      const d = docSnap.data();
      const id = docSnap.id;
      const tr = document.createElement("tr");

      columns.forEach(col => {
        const td = document.createElement("td");
        if (hiddenCols.has(col)) td.style.display = "none";

        if (col === "profitto") {
          const p = Number(d.prezzo_corrente||0)
                  - Number(d.prezzo_acquisto||0)
                  + Number(d.dividendi||0)
                  + Number(d.prelevato||0);
          td.textContent = fmtEuro(p);
          td.dataset.raw = p;
        }
        else if (euroCols.has(col)) {
          const v = Number(d[col]||0);
          td.textContent = fmtEuro(v);
          td.dataset.raw = v;
        }
        else if (percentCols.has(col)) {
          const v = Number(d[col]||0);
          td.textContent = fmtPerc(v);
          td.dataset.raw = v;
        }
        else if (col === "score") {
          const v = Number(d[col]||0);
          td.textContent = fmtScore(v);
          td.dataset.raw = v;
          td.classList.add("score-cell");   // ✔ colore score
        }
        else {
          td.textContent = d[col] ?? "";
          td.dataset.raw = (d[col] ?? "").toString();
        }

        tr.appendChild(td);
      });

      // ---------------------------------------------------------
      // AZIONI
      // ---------------------------------------------------------
      const tdA = document.createElement("td");
      tdA.classList.add("action-buttons");

      const btE = document.createElement("button");
      btE.textContent = "Modifica";
      btE.onclick = () => openEditModal(id);

      const btD = document.createElement("button");
      btD.textContent = "Cancella";
      btD.onclick = async () => {
        if (!confirm("Confermi cancellazione?")) return;
        await deleteDoc(doc(db,"portafoglio",id));
        await loadData();
      };

      tdA.appendChild(btE);
      tdA.appendChild(btD);
      tr.appendChild(tdA);

      // ---------------------------------------------------------
      // COLORI DINAMICI PER RIGA
      // ---------------------------------------------------------
      const pa  = Number(d.prezzo_acquisto||0);
      const pc  = Number(d.prezzo_corrente||0);
      const div = Number(d.dividendi||0);
      const pre = Number(d.prelevato||0);

      const profit = pc - pa + div + pre;

      if (profit > 0) tr.classList.add("profit-positive");
      else if (profit < 0) tr.classList.add("profit-negative");
      else tr.classList.add("profit-neutral");

      tableBody.appendChild(tr);
    });

    updateStats(snap.docs);
    enableSorting();

  } catch (e) {
    console.error("loadData error", e);
    alert("Errore caricamento dati");
  }
}

// -------------------------------------------------------------
// START
// -------------------------------------------------------------
loadData();
