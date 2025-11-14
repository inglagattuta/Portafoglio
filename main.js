// main.js - import/export corretto, import sovrascrive solo record esistenti, modal modifica funzionante

import app from "./firebase-config.js";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const db = getFirestore(app);

const headerRow = document.getElementById("headerRow");
const tableBody = document.getElementById("tableBody");
const editModal = document.getElementById("editModal");
const modalFields = document.getElementById("modalFields");
const modalSave = document.getElementById("modalSave");
const modalClose = document.getElementById("modalClose");

// configurazione colonne (visuale)
const columnsOrder = [
  "tipologia",
  "nome",
  "prezzo_acquisto",
  "prezzo_corrente",
  "dividendi",
  "prelevato",
  "profitto",
  "score"
];

const euroCols = ["prezzo_acquisto", "prezzo_corrente", "dividendi", "prelevato"];
const percentCols = ["percentuale_12_mesi","rendimento_percentuale","payback","percentuale_portafoglio"];

// stato per modal
let currentEditingId = null;
let currentOriginalData = null;

// -----------------------
// render header + table
// -----------------------
function renderHeader(){
  headerRow.innerHTML = "";
  columnsOrder.forEach(col=>{
    const th = document.createElement("th");
    th.textContent = col;
    headerRow.appendChild(th);
  });
  const thA = document.createElement("th");
  thA.textContent = "Azioni";
  headerRow.appendChild(thA);
}

function formatCellValue(key, raw){
  if (raw === undefined || raw === null) return "";
  if (key === "profitto") return Number(raw).toFixed(2) + " €";
  if (euroCols.includes(key)) return Number(raw).toFixed(2) + " €";
  if (percentCols.includes(key)) return Number(raw).toFixed(2) + " %";
  if (key === "score") return Number(raw).toFixed(2);
  return String(raw);
}

async function loadData(){
  try {
    const snap = await getDocs(collection(db, "portafoglio"));
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    renderHeader();
    tableBody.innerHTML = "";

    docs.forEach((d, rIdx)=>{
      const tr = document.createElement("tr");

      columnsOrder.forEach(key=>{
        const td = document.createElement("td");

        if (key === "profitto"){
          // calcola profitto al volo
          const pa = parseFloat(d.prezzo_acquisto || 0);
          const pc = parseFloat(d.prezzo_corrente || 0);
          const div = parseFloat(d.dividendi || 0);
          const pre = parseFloat(d.prelevato || 0);
          const profitto = pc - pa + div + pre;
          td.textContent = profitto.toFixed(2) + " €";
          td.dataset.raw = profitto;
          td.style.color = profitto > 0 ? "green" : profitto < 0 ? "red" : "black";
        } else {
          const raw = d[key];
          td.textContent = formatCellValue(key, raw);
          td.dataset.raw = (euroCols.includes(key) || percentCols.includes(key) || key==="score")
                           ? Number(raw || 0)
                           : String(raw || "").toLowerCase();
        }

        td.style.background = rIdx % 2 === 0 ? "#F0F0F0" : "#E8E8E8";
        tr.appendChild(td);
      });

      // Azioni: crea bottoni con event listeners (scope module sicuro)
      const tdA = document.createElement("td");
      tdA.className = "actions";
      const btnEdit = document.createElement("button");
      btnEdit.textContent = "Modifica";
      btnEdit.addEventListener("click", ()=> openEditModal(d.id, d));
      const btnDel = document.createElement("button");
      btnDel.textContent = "Cancella";
      btnDel.addEventListener("click", ()=> deleteRow(d.id));
      tdA.appendChild(btnEdit);
      tdA.appendChild(btnDel);
      tr.appendChild(tdA);

      tableBody.appendChild(tr);
    });

    enableSorting();
  } catch (e){
    console.error("loadData error", e);
    alert("Errore caricamento dati. Guarda console.");
  }
}

// -----------------------
// sorting (usa dataset.raw per numeri)
// -----------------------
function enableSorting(){
  const headers = Array.from(headerRow.cells);
  headers.forEach((th, idx)=>{
    if (th.textContent === "Azioni") return;
    th.style.cursor = "pointer";
    th.dataset.asc = "true";
    th.onclick = ()=>{
      const asc = th.dataset.asc === "true";
      sortByColumn(idx, asc);
      th.dataset.asc = (!asc).toString();

      // freccia visiva
      headers.forEach(h=> h.textContent = h.textContent.replace(/ ↑| ↓/g, ""));
      th.textContent = th.textContent + (asc ? " ↑" : " ↓");
    };
  });
}

function sortByColumn(colIndex, asc){
  const rows = Array.from(tableBody.rows);
  const arr = rows.map(row=>{
    const cell = row.cells[colIndex];
    const raw = cell ? cell.dataset.raw : "";
    const num = parseFloat(raw);
    return { row, key: (!isNaN(num) ? num : raw) };
  });

  arr.sort((a,b)=>{
    const x = a.key, y = b.key;
    if (typeof x === "number" && typeof y === "number") return asc ? x - y : y - x;
    if (x > y) return asc ? 1 : -1;
    if (x < y) return asc ? -1 : 1;
    return 0;
  });

  arr.forEach(item=> tableBody.appendChild(item.row));
}

// -----------------------
// delete
// -----------------------
async function deleteRow(id){
  if (!confirm("Sei sicuro di cancellare questo record?")) return;
  try{
    await deleteDoc(doc(db,"portafoglio",id));
    await loadData();
  } catch(e){
    console.error(e);
    alert("Errore cancellazione");
  }
}

// -----------------------
// EDIT modal
// -----------------------
function openEditModal(id, originalData){
  currentEditingId = id;
  currentOriginalData = originalData;
  modalFields.innerHTML = "";

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

  fields.forEach(f=>{
    const lbl = document.createElement("label");
    lbl.textContent = f.replaceAll("_"," ").toUpperCase();
    const inp = document.createElement("input");
    inp.type = "number";
    inp.step = "0.01";
    inp.id = "fld_" + f;
    inp.value = originalData[f] ?? "";
    inp.style.width = "100%";
    inp.style.marginBottom = "8px";
    modalFields.appendChild(lbl);
    modalFields.appendChild(inp);
  });

  editModal.style.display = "flex";
}

modalClose.addEventListener("click", ()=> {
  editModal.style.display = "none";
});

modalSave.addEventListener("click", async ()=>{
  if (!currentEditingId) return;
  const updated = { ...currentOriginalData };
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

  fields.forEach(f=>{
    const el = document.getElementById("fld_" + f);
    if (!el) return;
    const v = el.value;
    if (v === "") {
      delete updated[f];
    } else {
      updated[f] = (f === "score") ? parseFloat(parseFloat(v).toFixed(2)) : parseFloat(v);
    }
  });

  try{
    await updateDoc(doc(db,"portafoglio",currentEditingId), updated);
    editModal.style.display = "none";
    await loadData();
  } catch(e){
    console.error(e);
    alert("Errore aggiornamento");
  }
});

// -----------------------
// EXPORT (usa global XLSX caricato in index.html)
// -----------------------
async function exportExcel(){
  try{
    const snap = await getDocs(collection(db,"portafoglio"));
    const rows = snap.docs.map(d => {
      const obj = { id: d.id, ...d.data() };
      delete obj.profitto;
      return obj;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Portafoglio");
    XLSX.writeFile(wb, "portafoglio.xlsx");
  } catch(e){
    console.error(e);
    alert("Errore export");
  }
}

// rendi le funzioni disponibili per i pulsanti in index.html
window.exportExcel = exportExcel;

// -----------------------
// IMPORT: sovrascrive SOLO se nome esistente (case-insensitive). Non crea nuovi.
// -----------------------
window.importExcel = async function(event){
  const file = event.target.files?.[0];
  if (!file) return alert("Nessun file selezionato");
  try{
    // build map nome(lowercase) -> docId
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

    let updatedCount = 0;
    let skippedCount = 0;
    const skippedNames = [];

    for (const row of json){
      const name = (row.nome || "").toString().toLowerCase();
      if (!name) {
        skippedCount++;
        continue;
      }
      const docId = nameMap.get(name);
      if (docId){
        // prepare record: remove profitto if present
        const toSave = { ...row };
        delete toSave.profitto;
        // convert numeric strings to numbers for known numeric fields
        ["prezzo_acquisto","prezzo_corrente","dividendi","prelevato","percentuale_12_mesi","rendimento_percentuale","payback","percentuale_portafoglio","score"].forEach(k=>{
          if (toSave[k]!==undefined && toSave[k]!==null && toSave[k] !== "") toSave[k] = Number(toSave[k]);
        });
        await updateDoc(doc(db,"portafoglio",docId), toSave);
        updatedCount++;
      } else {
        skippedCount++;
        skippedNames.push(row.nome || "(no name)");
      }
    }

    let msg = `Import completato. Aggiornati: ${updatedCount}. Saltati (non trovati): ${skippedCount}.`;
    if (skippedNames.length) msg += ` Nomi saltati: ${skippedNames.slice(0,10).join(", ")}${skippedNames.length>10?"...":""}`;
    alert(msg);
    await loadData();
  } catch(e){
    console.error(e);
    alert("Errore import: guarda console");
  }
};

// export la funzione loadData per debug se necessario
window.loadData = loadData;

// avvia
loadData();
