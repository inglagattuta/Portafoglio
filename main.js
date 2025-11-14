// main.js - modal edit (A), dark theme compatible, import overwrite existing by nome (case-insensitive), export working
import app from "./firebase-config.js";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  setDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const db = getFirestore(app);

// DOM
const headerRow = document.getElementById("headerRow");
const tableBody = document.getElementById("tableBody");
const btnExport = document.getElementById("btnExport");
const fileInput = document.getElementById("fileInput");
const btnReload = document.getElementById("btnReload");

// columns
const columns = [
  "tipologia",
  "nome",
  "prezzo_acquisto",
  "prezzo_corrente",
  "dividendi",
  "prelevato",
  "profitto", // computed
  "percentuale_12_mesi",
  "rendimento_percentuale",
  "payback",
  "percentuale_portafoglio",
  "score"
];

const hiddenCols = new Set([
  "percentuale_12_mesi",
  "rendimento_percentuale",
  "payback",
  "percentuale_portafoglio"
]);

const euroCols = new Set(["prezzo_acquisto","prezzo_corrente","dividendi","prelevato"]);
const percentCols = new Set(["percentuale_12_mesi","rendimento_percentuale","payback","percentuale_portafoglio"]);

// formatting helpers
const fmtEuro = n => Number(n||0).toFixed(2) + " €";
const fmtPerc = n => Number(n||0).toFixed(2) + " %";
const fmtScore = n => Number(n||0).toFixed(2);

// render header
function renderHeader(){
  headerRow.innerHTML = "";
  columns.forEach(col=>{
    const th = document.createElement("th");
    th.textContent = col;
    if (hiddenCols.has(col)) th.style.display = "none";
    headerRow.appendChild(th);
  });
  const thA = document.createElement("th");
  thA.textContent = "Azioni";
  headerRow.appendChild(thA);
}

// load and render rows
async function loadData(){
  try{
    const snap = await getDocs(collection(db,"portafoglio"));
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    renderHeader();
    tableBody.innerHTML = "";

    docs.forEach((d, idx) => {
      const tr = document.createElement("tr");

      columns.forEach(col => {
        const td = document.createElement("td");
        if (hiddenCols.has(col)) td.style.display = "none";

        if (col === "profitto"){
          const pa = Number(d.prezzo_acquisto || 0);
          const pc = Number(d.prezzo_corrente || 0);
          const div = Number(d.dividendi || 0);
          const pre = Number(d.prelevato || 0);
          const profitto = pc - pa + div + pre;
          td.textContent = fmtEuro(profitto);
          td.dataset.raw = profitto;
          td.style.color = profitto > 0 ? "limegreen" : profitto < 0 ? "crimson" : "#000";
        } else if (euroCols.has(col)){
          const v = Number(d[col] || 0);
          td.textContent = fmtEuro(v);
          td.classList.add("value-euro");
          td.dataset.raw = v;
        } else if (percentCols.has(col)){
          const v = Number(d[col] || 0);
          td.textContent = fmtPerc(v);
          td.classList.add("value-percent");
          td.dataset.raw = v;
        } else if (col === "score"){
          const v = Number(d[col] || 0);
          td.textContent = fmtScore(v);
          td.classList.add("value-score");
          td.dataset.raw = v;
        } else {
          td.textContent = d[col] ?? "";
          td.dataset.raw = String(d[col] ?? "").toLowerCase();
        }
        tr.appendChild(td);
      });

      // actions
      const tdA = document.createElement("td");
      tdA.className = "actions";

      const btnEdit = document.createElement("button");
      btnEdit.textContent = "Modifica";
      btnEdit.className = "edit";
      btnEdit.addEventListener("click", ()=> openEditModal(d.id)); // open modal with doc id

      const btnDel = document.createElement("button");
      btnDel.textContent = "Cancella";
      btnDel.className = "delete";
      btnDel.addEventListener("click", async ()=>{
        if (!confirm("Confermi cancellazione?")) return;
        await deleteDoc(doc(db,"portafoglio",d.id));
        await loadData();
      });

      tdA.appendChild(btnEdit);
      tdA.appendChild(btnDel);
      tr.appendChild(tdA);

      tableBody.appendChild(tr);
    });

    enableSorting();
  } catch(e){
    console.error("loadData error", e);
    alert("Errore caricamento dati (vedi console).");
  }
}

// sorting
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
      th.textContent = th.textContent + (asc ? " ↑" : " ↓");
    };
  });
}

function sortByColumn(colIndex, asc){
  const rows = Array.from(tableBody.rows);
  const arr = rows.map(r => {
    const c = r.cells[colIndex];
    const raw = c ? c.dataset.raw : "";
    const num = parseFloat(raw);
    const key = !isNaN(num) ? num : raw;
    return { row: r, key };
  });

  arr.sort((a,b) => {
    const x = a.key, y = b.key;
    if (typeof x === "number" && typeof y === "number") return asc ? x - y : y - x;
    if (x > y) return asc ? 1 : -1;
    if (x < y) return asc ? -1 : 1;
    return 0;
  });

  arr.forEach(i => tableBody.appendChild(i.row));
}

// -----------------
// MODAL EDIT (A)
// -----------------
let modalEl = null;
function ensureModal(){
  if (modalEl) return modalEl;
  modalEl = document.createElement("div");
  modalEl.id = "editModal";
  modalEl.innerHTML = `
    <div class="modal-card">
      <h3 style="margin:0 0 8px 0">Modifica</h3>
      <div id="modalFields"></div>
      <div class="row">
        <button id="modalSave">Salva</button>
        <button id="modalClose">Annulla</button>
      </div>
    </div>
  `;
  document.body.appendChild(modalEl);
  // wire close
  modalEl.querySelector("#modalClose").addEventListener("click", ()=> modalEl.style.display = "none");
  return modalEl;
}

async function openEditModal(docId){
  try{
    const snap = await getDocs(collection(db,"portafoglio"));
    const found = snap.docs.find(d => d.id === docId);
    if (!found) { alert("Record non trovato"); return; }
    const data = found.data();

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
      inp.id = "fld_"+f;
      inp.value = data[f] ?? "";
      fieldsDiv.appendChild(lbl);
      fieldsDiv.appendChild(inp);
    });

    // show modal
    modal.style.display = "flex";

    // save handler
    const saveBtn = modal.querySelector("#modalSave");
    saveBtn.onclick = async () => {
      const updated = { ...data };
      fields.forEach(f => {
        const el = document.getElementById("fld_"+f);
        if (!el) return;
        const v = el.value;
        if (v === "") delete updated[f];
        else updated[f] = (f === "score") ? Number(Number(v).toFixed(2)) : Number(v);
      });

      // recalc profitto (we store it for compatibility)
      updated.profitto = Number(updated.prezzo_corrente || 0)
                       - Number(updated.prezzo_acquisto || 0)
                       + Number(updated.dividendi || 0)
                       + Number(updated.prelevato || 0);

      await updateDoc(doc(db,"portafoglio",docId), updated);
      modal.style.display = "none";
      await loadData();
    };

  } catch(e){
    console.error("openEditModal error", e);
    alert("Errore apertura modal (vedi console).");
  }
}

// -----------------
// EXPORT / IMPORT
// -----------------
async function exportExcel(){
  try{
    const snap = await getDocs(collection(db,"portafoglio"));
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Portafoglio");
    XLSX.writeFile(wb, "portafoglio.xlsx");
  } catch(e){
    console.error("export error", e);
    alert("Errore export (vedi console)");
  }
}

// import: overwrite only existing by nome (case-insensitive); do NOT create new
async function importExcelHandler(event){
  const file = event.target.files?.[0];
  if (!file) return alert("Nessun file selezionato");
  try{
    // map existing names -> id
    const allSnap = await getDocs(collection(db,"portafoglio"));
    const nameMap = new Map();
    allSnap.docs.forEach(d => {
      const nm = (d.data().nome || "").toString().toLowerCase();
      if (nm) nameMap.set(nm, d.id);
    });

    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    let updated=0, skipped=0;
    for (const row of json){
      const nm = (row.nome || "").toString().toLowerCase();
      if (!nm) { skipped++; continue; }
      const id = nameMap.get(nm);
      if (!id) { skipped++; continue; } // do not create new
      // normalize numeric fields
      ["prezzo_acquisto","prezzo_corrente","dividendi","prelevato","percentuale_12_mesi","rendimento_percentuale","payback","percentuale_portafoglio","score"].forEach(k=>{
        if (row[k] !== undefined && row[k] !== null && row[k] !== "") row[k] = Number(row[k]);
      });
      delete row.profitto;
      await updateDoc(doc(db,"portafoglio",id), row);
      updated++;
    }

    alert(`Import completato. Aggiornati: ${updated}. Saltati: ${skipped}.`);
    await loadData();
  } catch(e){
    console.error("import error", e);
    alert("Errore import (vedi console)");
  }
}

// wire up
btnExport.addEventListener("click", exportExcel);
fileInput.addEventListener("change", importExcelHandler);
btnReload.addEventListener("click", loadData);

// start
loadData();
