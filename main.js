// main.js - versione aggiornata con dark mode, label professionali,
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
        "prezzo_a_
