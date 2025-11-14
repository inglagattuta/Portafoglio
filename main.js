// main.js - versione definitiva: format, score 2 decimali, import overwrite, export, modal editing

import app from "./firebase-config.js"; // tieni il tuo file firebase-config.js
import {
  getFirestore,
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const db = getFirestore(app);

const headerRow = document.getElementById("headerRow");
const tableBody = document.getElementById("tableBody");
const btnExport = document.getElementById("btnExport");
const fileInput = document.getElementById("fileInput");
const btnReload = document.getElementById("btnReload");

// colonna in ordine
const columns = [
  "tipologia",
  "nome",
  "prezzo_acquisto",
  "prezzo_corrente",
  "dividendi",
  "prelevato",
  "profitto", // calcolato al volo
  "percentuale_12_mesi",
  "rendimento_percentuale",
  "payback",
  "percentuale_portafoglio",
  "score"
];

const hiddenColumns = new Set([
  "percentuale_12_mesi",
  "rendimento_percentuale",
  "payback",
  "percentuale_portafoglio"
]);

const euroCols = new Set(["prezzo_acquisto","prezzo_corrente","dividendi","prelevato"]);
const percentCols = new Set(["percentuale_12_mesi","rendimento_percentuale","payback","percentuale_portafoglio"]);

// utilità formattazione
function fmtEuro(n){
  n = Number(n || 0);
  return n.toFixed(2) + " €";
}
function fmtPerc(n){
  n = Number(n || 0);
  return n.toFixed(2) + " %";
}
function fmtScore(n){
  n = Number(n || 0);
  return n.toFixed(2);
}

// render header
function renderHeader(){
  headerRow.innerHTML = "";
  columns.forEach(col=>{
    const th = document.createElement("th");
    th.textContent = col;
    if (hiddenColumns.has(col)) th.style.display = "none";
    headerRow.appendChild(th);
  });
  const thA = document.createElement("th");
  thA.textContent = "Azioni";
  headerRow.appendChild(thA);
}

// render row (usiamo sempre formattazione coerente)
function renderRow(id, data, rowIndex){
  const tr = document.createElement("tr");

  columns.forEach(col=>{
    const td = document.createElement("td");

    // gestione colonne nascoste
    if (hiddenColumns.has(col)) td.style.display = "none";

    if (col === "profitto"){
      // ricalcola profitto
      const pa = Number(data.prezzo_acquisto || 0);
      const pc = Number(data.prezzo_corrente || 0);
      const div = Number(data.dividendi || 0);
      const pre = Number(data.prelevato || 0);
      const profitto = pc - pa + div + pre;
      td.textContent = fmtEuro(profitto);
      td.dataset.raw = profitto;
      td.style.color = profitto > 0 ? "green" : profitto < 0 ? "red" : "#000";
    } else if (euroCols.has(col)){
      const v = Number(data[col] ?? 0);
      td.textContent = fmtEuro(v);
      td.dataset.raw = v;
    } else if (percentCols.has(col)){
      const v = Number(data[col] ?? 0);
      td.textContent = fmtPerc(v);
      td.dataset.raw = v;
    } else if (col === "score"){
      const v = Number(data[col] ?? 0);
      td.textContent = fmtScore(v);
      td.dataset.raw = v;
    } else {
      td.textContent = data[col] ?? "";
      td.dataset.raw = String(data[col] ?? "").toLowerCase();
    }

    // righe alternate
    td.style.background = rowIndex % 2 === 0 ? "#F0F0F0" : "#FFFFFF";

    tr.appendChild(td);
  });

  // colonne azioni
  const tdA = document.createElement("td");
  tdA.className = "actions";

  const btnEdit = document.createElement("button");
  btnEdit.textContent = "Modifica";
  btnEdit.addEventListener("click", ()=> openEditModal(id));

  const btnDelete = document.createElement("button");
  btnDelete.textContent = "Cancella";
  btnDelete.className = "delete";
  btnDelete.addEventListener("click", async ()=>{
    if (!confirm("Confermi cancellazione?")) return;
    await deleteDoc(doc(db,"portafoglio",id));
    await loadData();
  });

  tdA.appendChild(btnEdit);
  tdA.appendChild(btnDelete);
  tr.appendChild(tdA);

  tableBody.appendChild(tr);
}

// load dati
async function loadData(){
  renderHeader();
  tableBody.innerHTML = "";
  const snap = await getDocs(collection(db,"portafoglio"));
  snap.forEach((docSnap, idx)=>{
    renderRow(docSnap.id, docSnap.data(), idx);
  });
  enableSorting();
}

// sorting (usa dataset.raw)
function enableSorting(){
  const ths = Array.from(headerRow.children);
  ths.forEach((th, idx)=>{
    if (th.textContent === "Azioni") return;
    th.style.cursor = "pointer";
    th.dataset.asc = "true";
    th.onclick = () => {
      const asc = th.dataset.asc === "true";
      sortByColumn(idx, asc);
      th.dataset.asc = (!asc).toString();

      // indicatori
      ths.forEach(h=> h.textContent = h.textContent.replace(/ ↑| ↓/g,""));
      th.textContent = th.textContent + (asc ? " ↑" : " ↓");
    };
  });
}

function sortByColumn(colIndex, asc){
  const rows = Array.from(tableBody.rows);
  const arr = rows.map(r=>{
    const cell = r.cells[colIndex];
    const raw = cell ? cell.dataset.raw : "";
    const n = parseFloat(raw);
    const key = !isNaN(n) ? n : raw;
    return { row: r, key };
  });

  arr.sort((a,b)=>{
    const x = a.key, y = b.key;
    if (typeof x === "number" && typeof y === "number") return asc ? x-y : y-x;
    if (x > y) return asc ? 1 : -1;
    if (x < y) return asc ? -1 : 1;
    return 0;
  });

  arr.forEach(i => tableBody.appendChild(i.row));
}

// ---- MODAL EDIT (semplice) ----
function openEditModal(id){
  // prendiamo il documento corrente
  getDocs(collection(db,"portafoglio")).then(snap=>{
    const docSnap = snap.docs.find(d => d.id === id);
    if (!docSnap) { alert("Record non trovato"); return; }
    const data = docSnap.data();

    // costruiamo modal dinamico
    let modal = document.getElementById("editModal");
    if (!modal){
      modal = document.createElement("div");
      modal.id = "editModal";
      modal.innerHTML = `
        <div class="card">
          <h3>Modifica</h3>
          <div id="modalFields"></div>
          <div class="row">
            <button id="modalSave">Salva</button>
            <button id="modalClose">Chiudi</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      // stile inline per sicurezza
      modal.style.display = "flex";
      modal.style.alignItems = "center";
      modal.style.justifyContent = "center";
      modal.style.position = "fixed";
      modal.style.inset = 0;
      modal.style.background = "rgba(0,0,0,0.45)";
      modal.querySelector("#modalClose").addEventListener("click", ()=> modal.style.display = "none");
    }

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

    const fieldsDiv = modal.querySelector("#modalFields");
    fieldsDiv.innerHTML = "";
    fields.forEach(f=>{
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
      fields.forEach(f=>{
        const el = document.getElementById("fld_"+f);
        if (!el) return;
        const v = el.value;
        if (v === "") delete updated[f];
        else updated[f] = (f === "score") ? parseFloat(parseFloat(v).toFixed(2)) : Number(v);
      });

      // ricalcola profitto e non lo salva se preferisci; lo salviamo per compatibilità
      updated.profitto = (Number(updated.prezzo_corrente || 0)
                         - Number(updated.prezzo_acquisto || 0)
                         + Number(updated.dividendi || 0)
                         + Number(updated.prelevato || 0));

      await setDoc(doc(db,"portafoglio",id), updated, { merge: true });
      modal.style.display = "none";
      await loadData();
    };
  });
}

// ---- EXPORT / IMPORT ----
async function exportExcel(){
  try {
    const snap = await getDocs(collection(db,"portafoglio"));
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Portafoglio");
    XLSX.writeFile(wb, "portafoglio.xlsx");
  } catch(e){
    console.error(e);
    alert("Errore export, guarda console");
  }
}

async function importExcelHandler(event){
  const file = event.target.files?.[0];
  if (!file) return alert("Nessun file selezionato");
  try {
    // mappa nome (lowercase) -> docId
    const snapAll = await getDocs(collection(db,"portafoglio"));
    const nameMap = new Map();
    snapAll.docs.forEach(d => {
      const nm = (d.data().nome || "").toString().toLowerCase();
      if (nm) nameMap.set(nm, d.id);
    });

    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    let updated=0, skipped=0;
    for (const row of json){
      const name = (row.nome || "").toString().toLowerCase();
      if (!name) { skipped++; continue; }
      const id = nameMap.get(name);
      if (!id) { skipped++; continue; } // NON CREA nuovi
      // normalizziamo numerici
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
    console.error(e);
    alert("Errore import (vedi console)");
  }
}

// wire buttons
btnExport.addEventListener("click", exportExcel);
fileInput.addEventListener("change", importExcelHandler);
btnReload.addEventListener("click", loadData);

// start
loadData();
