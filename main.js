// main.js - versione corretta: sorting robusto, modal usa getDoc, box IDs corretti, import/export ok
// main.js - versione aggiornata con label professionali,
// colori dinamici e stile Score.

// -------------------------------------------------------------
// FIREBASE
// -------------------------------------------------------------
import app from "./firebase-config.js";
import {
getFirestore,
@@ -14,32 +18,52 @@ import {

const db = getFirestore(app);

// DOM (ATTENZIONE: questi id devono corrispondere al tuo index.html)
// -------------------------------------------------------------
// DOM
// -------------------------------------------------------------
const headerRow = document.getElementById("headerRow");
const tableBody = document.getElementById("tableBody");

// Box statistiche — gli ID devono essere quelli presenti nell'HTML
const bxInvestito = document.getElementById("totInvestito");
const bxValore = document.getElementById("valoreAttuale");
const bxDividendi = document.getElementById("totDividendi");
const bxProfitto = document.getElementById("totProfitto");
// Box
const bxInvestito   = document.getElementById("totInvestito");
const bxValore      = document.getElementById("valoreAttuale");
const bxDividendi   = document.getElementById("totDividendi");
const bxProfitto    = document.getElementById("totProfitto");

// colonne
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
  "profitto", // computed
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
@@ -50,52 +74,42 @@ const hiddenCols = new Set([
const euroCols = new Set(["prezzo_acquisto","prezzo_corrente","dividendi","prelevato"]);
const percentCols = new Set(["percentuale_12_mesi","rendimento_percentuale","payback","percentuale_portafoglio"]);

// formatting helpers
const fmtEuro = n => Number(n||0).toFixed(2) + " €";
const fmtPerc = n => Number(n||0).toFixed(2) + " %";
// -------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------
const fmtEuro  = n => Number(n||0).toFixed(2) + " €";
const fmtPerc  = n => Number(n||0).toFixed(2) + " %";
const fmtScore = n => Number(n||0).toFixed(2);

// render header
// -------------------------------------------------------------
// HEADER + SORTING
// -------------------------------------------------------------
function renderHeader(){
headerRow.innerHTML = "";
columns.forEach(col=>{
const th = document.createElement("th");
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

th.textContent = labelMap[col] || col;

    th.classList.add('sortable');
    th.textContent = labelMap[col] || col;
    th.classList.add("sortable");
if (hiddenCols.has(col)) th.style.display = "none";
headerRow.appendChild(th);
});

const thA = document.createElement("th");
thA.textContent = "Azioni";
headerRow.appendChild(thA);
}

// robust sorting: normalizza dataset.raw ed è tolerante ai missing
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
@@ -109,10 +123,9 @@ function sortByColumn(colIndex, asc){
const c = r.cells[colIndex];
let raw = c ? c.dataset.raw : "";
if (raw === undefined || raw === null) raw = "";
    // if raw is empty string, use empty string key
const num = parseFloat(raw);
let key;
    if (raw === "") key = ""; // keep empty
    if (raw === "") key = "";
else if (!isNaN(num) && String(raw).trim() !== "") key = num;
else key = String(raw).toLowerCase();
return { row: r, key };
@@ -122,7 +135,7 @@ function sortByColumn(colIndex, asc){
const x = a.key, y = b.key;
if (typeof x === "number" && typeof y === "number") return asc ? x - y : y - x;
if (x === "" && y === "") return 0;
    if (x === "") return asc ? 1 : -1; // put empties at end/start
    if (x === "") return asc ? 1 : -1;
if (y === "") return asc ? -1 : 1;
if (x > y) return asc ? 1 : -1;
if (x < y) return asc ? -1 : 1;
@@ -132,12 +145,14 @@ function sortByColumn(colIndex, asc){
arr.forEach(i => tableBody.appendChild(i.row));
}

// -----------------
// MODAL EDIT (usa getDoc per leggere il singolo documento)
// -----------------
// -------------------------------------------------------------
// MODAL
// -------------------------------------------------------------
let modalEl = null;

function ensureModal(){
if (modalEl) return modalEl;

modalEl = document.createElement("div");
modalEl.id = "editModal";
modalEl.style.position = "fixed";
@@ -157,17 +172,21 @@ function ensureModal(){
   </div>
 `;
document.body.appendChild(modalEl);
  modalEl.querySelector("#modalClose").addEventListener("click", ()=> modalEl.style.display = "none");

  modalEl.querySelector("#modalClose").addEventListener("click", ()=>{
    modalEl.style.display = "none";
  });

return modalEl;
}

async function openEditModal(docId){
try {
const ref = doc(db, "portafoglio", docId);
const snap = await getDoc(ref);
    if (!snap.exists()) { alert("Record non trovato"); return; }
    const data = snap.data();
    if (!snap.exists()) return alert("Record non trovato");

    const data = snap.data();
const modal = ensureModal();
const fieldsDiv = modal.querySelector("#modalFields");
fieldsDiv.innerHTML = "";
@@ -186,20 +205,22 @@ async function openEditModal(docId){
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

    const saveBtn = modal.querySelector("#modalSave");
    saveBtn.onclick = async () => {
    modal.querySelector("#modalSave").onclick = async () => {
const updated = { ...data };

fields.forEach(f => {
const el = document.getElementById("fld_" + f);
if (!el) return;
@@ -208,13 +229,12 @@ async function openEditModal(docId){
else updated[f] = Number(v);
});

      // ricalcolo profitto
      // Ricalcolo profitto
updated.profitto = Number(updated.prezzo_corrente || 0)
- Number(updated.prezzo_acquisto || 0)
+ Number(updated.dividendi || 0)
+ Number(updated.prelevato || 0);

      // score salvatto con 2 decimali
updated.score = Number(Number(updated.score || 0).toFixed(2));

await updateDoc(ref, updated);
@@ -224,13 +244,13 @@ async function openEditModal(docId){

} catch (e) {
console.error("openEditModal error", e);
    alert("Errore apertura modal (vedi console)");
    alert("Errore apertura modal");
}
}

// -----------------
// IMPORT - global per HTML onchange="importExcel(event)"
// -----------------
// -------------------------------------------------------------
// IMPORT
// -------------------------------------------------------------
window.importExcel = async function(event){
const file = event.target.files?.[0];
if (!file) return alert("Nessun file selezionato");
@@ -239,7 +259,7 @@ window.importExcel = async function(event){
const allSnap = await getDocs(collection(db,"portafoglio"));
const nameMap = new Map();
allSnap.docs.forEach(d => {
      const nm = (d.data().nome || "").toString().toLowerCase();
      const nm = (d.data().nome || "").toLowerCase();
if (nm) nameMap.set(nm, d.id);
});

@@ -249,32 +269,40 @@ window.importExcel = async function(event){
const json = XLSX.utils.sheet_to_json(sheet);

let updated = 0, skipped = 0;

for (const row of json){
      const nm = (row.nome || "").toString().toLowerCase();
      const nm = (row.nome || "").toLowerCase();
if (!nm) { skipped++; continue; }

const id = nameMap.get(nm);
      if (!id) { skipped++; continue; } // non creare nuovi
      ["prezzo_acquisto","prezzo_corrente","dividendi","prelevato",
       "percentuale_12_mesi","rendimento_percentuale","payback",
       "percentuale_portafoglio","score"].forEach(k=>{
         if (row[k] !== undefined && row[k] !== null && row[k] !== "") row[k] = Number(row[k]);
       });
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

    alert(`Import completato. Aggiornati: ${updated}. Saltati: ${skipped}.`);
    alert(`Import completato. Aggiornati: ${updated}, Saltati: ${skipped}`);
await loadData();

} catch (e) {
console.error("import error", e);
    alert("Errore import (vedi console)");
    alert("Errore import");
}
};

// -----------------
// EXPORT - global per onclick="exportExcel()"
// -----------------
// -------------------------------------------------------------
// EXPORT
// -------------------------------------------------------------
window.exportExcel = async function(){
try {
const snap = await getDocs(collection(db,"portafoglio"));
@@ -285,13 +313,13 @@ window.exportExcel = async function(){
XLSX.writeFile(wb, "portafoglio.xlsx");
} catch (e) {
console.error("export error", e);
    alert("Errore export (vedi console)");
    alert("Errore export");
}
};

// -----------------
// updateStats: calcola i 4 box
// -----------------
// -------------------------------------------------------------
// STATISTICHE
// -------------------------------------------------------------
function updateStats(docs){
let totInvestito = 0;
let totValore = 0;
@@ -301,37 +329,31 @@ function updateStats(docs){
docs.forEach(d => {
const o = d.data();
totInvestito += Number(o.prezzo_acquisto || 0);
    totValore += Number(o.prezzo_corrente || 0);
    totDiv += Number(o.dividendi || 0);
    totValore    += Number(o.prezzo_corrente || 0);
    totDiv       += Number(o.dividendi || 0);
totPrelevato += Number(o.prelevato || 0);
});

const profitto = totValore - totInvestito + totDiv + totPrelevato;

  if (bxInvestito) bxInvestito.textContent = fmtEuro(totInvestito);
  if (bxValore) bxValore.textContent = fmtEuro(totValore);
  if (bxDividendi) bxDividendi.textContent = fmtEuro(totDiv);
  if (bxProfitto) {
    bxProfitto.textContent = fmtEuro(profitto);
    bxProfitto.style.color = profitto >= 0 ? "#48bb78" : "#f56565";
  }
  bxInvestito.textContent = fmtEuro(totInvestito);
  bxValore.textContent    = fmtEuro(totValore);
  bxDividendi.textContent = fmtEuro(totDiv);
  
  bxProfitto.textContent = fmtEuro(profitto);
  bxProfitto.style.color = profitto >= 0 ? "#2ecc71" : "#e74c3c";
}

// -----------------
// loadData (UNICA funzione)
// -----------------
// -------------------------------------------------------------
// LOAD DATA
// -------------------------------------------------------------
async function loadData(){
  if (!headerRow || !tableBody) {
    console.error("Elemento headerRow/tableBody non trovato nel DOM");
    return;
  }

tableBody.innerHTML = "";
renderHeader();

try {
const snap = await getDocs(collection(db,"portafoglio"));
    // popoliamo la tabella

snap.docs.forEach(docSnap => {
const d = docSnap.data();
const id = docSnap.id;
@@ -342,39 +364,43 @@ async function loadData(){
if (hiddenCols.has(col)) td.style.display = "none";

if (col === "profitto") {
          const p = Number(d.prezzo_corrente || 0) - Number(d.prezzo_acquisto || 0)
                    + Number(d.dividendi || 0) + Number(d.prelevato || 0);
          const p = Number(d.prezzo_corrente||0)
                  - Number(d.prezzo_acquisto||0)
                  + Number(d.dividendi||0)
                  + Number(d.prelevato||0);
td.textContent = fmtEuro(p);
td.dataset.raw = p;
}
else if (euroCols.has(col)) {
          const v = Number(d[col] || 0);
          const v = Number(d[col]||0);
td.textContent = fmtEuro(v);
td.dataset.raw = v;
}
else if (percentCols.has(col)) {
          const v = Number(d[col] || 0);
          const v = Number(d[col]||0);
td.textContent = fmtPerc(v);
td.dataset.raw = v;
}
        else if (col === "score"){
  const v = Number(d[col]||0);
  td.textContent = fmtScore(v);
  td.dataset.raw = v;
  td.classList.add("score-cell");  // <-- aggiunta per il colore
}
else {
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

      // Azioni
      // ---------------------------------------------------------
      // AZIONI
      // ---------------------------------------------------------
const tdA = document.createElement("td");
      tdA.classList.add('action-buttons');
      
      tdA.classList.add("action-buttons");

const btE = document.createElement("button");
btE.textContent = "Modifica";
btE.onclick = () => openEditModal(id);
@@ -391,33 +417,33 @@ else {
tdA.appendChild(btD);
tr.appendChild(tdA);

      // ---- COLORI DINAMICI IN BASE AL PROFITTO (CON CLASSI CSS) ----
      const pa = Number(d.prezzo_acquisto || 0);
      const pc = Number(d.prezzo_corrente || 0);
      const div = Number(d.dividendi || 0);
      const pre = Number(d.prelevato || 0);
      // ---------------------------------------------------------
      // COLORI DINAMICI PER RIGA
      // ---------------------------------------------------------
      const pa  = Number(d.prezzo_acquisto||0);
      const pc  = Number(d.prezzo_corrente||0);
      const div = Number(d.dividendi||0);
      const pre = Number(d.prelevato||0);

const profit = pc - pa + div + pre;

      if (profit > 0) {
        tr.classList.add('profit-positive');
      } else if (profit < 0) {
        tr.classList.add('profit-negative');
      } else {
        tr.classList.add('profit-neutral');
      }
      if (profit > 0) tr.classList.add("profit-positive");
      else if (profit < 0) tr.classList.add("profit-negative");
      else tr.classList.add("profit-neutral");

tableBody.appendChild(tr);
});

    // stats e sorting
updateStats(snap.docs);
enableSorting();

} catch (e) {
console.error("loadData error", e);
    alert("Errore caricamento dati (vedi console)");
    alert("Errore caricamento dati");
}
}

// avvio
// -------------------------------------------------------------
// START
// -------------------------------------------------------------
loadData();
