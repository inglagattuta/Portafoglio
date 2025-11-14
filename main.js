// main.js - versione corretta per import/export e sorting
import app from './firebase-config.js';
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
const tableBody = document.getElementById("tableBody");
const headerRow = document.getElementById("headerRow");

// CONFIG
let columnsOrder = [
  "tipologia",
  "nome",
  "prezzo_acquisto",
  "prezzo_corrente",
  "dividendi",
  "prelevato",
  "profitto", // calcolato
  "score",
  // (Azioni è aggiunta visivamente, non in columnsOrder)
];

const euroColumns = ["prezzo_acquisto", "prezzo_corrente", "dividendi", "prelevato"];
const percentColumns = ["percentuale_12_mesi", "rendimento_percentuale", "payback", "percentuale_portafoglio"];
let showPercent = false; // se hai toggle, gestiscilo esternamente

// Utility - rimuove simboli e ritorna numero o NaN
function numericValueFromCellText(text) {
  if (text == null) return NaN;
  // rimuove tutto tranne numeri, punti, trattino
  const cleaned = String(text).replace(/[^\d\.\-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === "." ) return NaN;
  return parseFloat(cleaned);
}

// RICARICA TABELLA
export async function loadData() { // export per test se vuoi
  const snap = await getDocs(collection(db, "portafoglio"));
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // pulisci header e ricrea (per sicurezza)
  headerRow.innerHTML = "";
  columnsOrder.forEach(col => {
    const th = document.createElement("th");
    th.textContent = col;
    headerRow.appendChild(th);
  });
  // colonna azioni
  const thActions = document.createElement("th");
  thActions.textContent = "Azioni";
  headerRow.appendChild(thActions);

  // righe
  tableBody.innerHTML = "";
  docs.forEach((d, rIndex) => {
    const row = tableBody.insertRow();

    // per ogni colonna (compresa profitto calcolato)
    columnsOrder.forEach(key => {
      const cell = row.insertCell();

      // profitto calcolato
      if (key === "profitto") {
        const pa = parseFloat(d.prezzo_acquisto || 0);
        const pc = parseFloat(d.prezzo_corrente || 0);
        const div = parseFloat(d.dividendi || 0);
        const pre = parseFloat(d.prelevato || 0);
        const profittoCalc = pc - pa + div + pre;
        cell.textContent = profittoCalc.toFixed(2) + " €";
        cell.style.color = profittoCalc > 0 ? "green" : profittoCalc < 0 ? "red" : "black";
        cell.dataset.raw = profittoCalc; // utile per sorting
        cell.style.background = rIndex % 2 === 0 ? "#F0F0F0" : "#E8E8E8";
        return;
      }

      // valore normale
      let val = d[key];
      if (val === undefined || val === null) {
        cell.textContent = "";
        cell.dataset.raw = "";
      } else if (euroColumns.includes(key)) {
        const num = parseFloat(val) || 0;
        cell.textContent = num.toFixed(2) + " €";
        cell.dataset.raw = num;
      } else if (percentColumns.includes(key)) {
        const num = parseFloat(val) || 0;
        cell.textContent = num.toFixed(2) + " %";
        cell.dataset.raw = num;
        if (!showPercent) cell.style.display = "none";
      } else if (key === "score") {
        const num = parseFloat(val) || 0;
        cell.textContent = num.toFixed(2);
        cell.dataset.raw = num;
      } else {
        // testo
        cell.textContent = val;
        cell.dataset.raw = String(val).toLowerCase();
      }

      cell.style.background = rIndex % 2 === 0 ? "#F0F0F0" : "#E8E8E8";
    });

    // colonna azioni
    const actionCell = row.insertCell();
    actionCell.classList.add("actions");

    const btnEdit = document.createElement("button");
    btnEdit.textContent = "Modifica";
    btnEdit.onclick = () => openModalForEdit(d.id, d);

    const btnDel = document.createElement("button");
    btnDel.textContent = "Cancella";
    btnDel.onclick = () => deleteRow(d.id);

    actionCell.appendChild(btnEdit);
    actionCell.appendChild(btnDel);
  });

  // dopo aver costruito, abilitiamo l'ordinamento
  enableSorting();
}

// ORDINAMENTO
function enableSorting() {
  const headers = Array.from(headerRow.cells);
  headers.forEach((th, index) => {
    // non abilitiamo ordinamento per Azioni (ultima colonna)
    if (th.textContent === "Azioni") return;

    th.style.cursor = "pointer";
    // rimuove eventuali indicatori
    th.dataset.asc = "true";
    th.onclick = () => {
      const asc = th.dataset.asc === "true";
      sortTableByColumn(index, asc);
      th.dataset.asc = (!asc).toString();

      // freccia visiva: rimuovi da tutti e poi aggiungi a questo
      headers.forEach(h => {
        if (h !== th) h.textContent = h.textContent.replace(/ ↑| ↓/g, "");
      });
      th.textContent = th.textContent.replace(/ ↑| ↓/g, "") + (asc ? " ↑" : " ↓");
      highlightColumn(index, asc);
    };
  });
}

// funzione che evidenzia la colonna ordinata
function highlightColumn(colIndex, asc) {
  // rimuovi evidenze
  for (let r = 0; r < tableBody.rows.length; r++) {
    const cells = tableBody.rows[r].cells;
    for (let c = 0; c < cells.length; c++) {
      cells[c].style.border = "none";
      // ripristina alternanza colore (salvata via inline)
      // (non tocchiamo display)
    }
  }
  // evidenzia colonna
  for (let r = 0; r < tableBody.rows.length; r++) {
    const cell = tableBody.rows[r].cells[colIndex];
    if (!cell) continue;
    cell.style.border = "1px solid #999";
    cell.style.background = asc ? "#C6F6D5" : "#FFE4B2";
  }
}

// ordinamento reale
function sortTableByColumn(colIndex, asc = true) {
  const rows = Array.from(tableBody.rows);
  // build array of {row, key} using dataset.raw where possible
  const arr = rows.map(row => {
    const cell = row.cells[colIndex];
    if (!cell) return { row, key: "" };
    const raw = cell.dataset.raw;
    // if raw is numeric-like, keep as number
    const num = parseFloat(raw);
    if (!isNaN(num)) return { row, key: num };
    return { row, key: String(raw) };
  });

  arr.sort((a, b) => {
    const x = a.key, y = b.key;
    if (typeof x === "number" && typeof y === "number") {
      return asc ? x - y : y - x;
    } else {
      // string compare
      if (x > y) return asc ? 1 : -1;
      if (x < y) return asc ? -1 : 1;
      return 0;
    }
  });

  // reappend sorted rows
  arr.forEach(item => tableBody.appendChild(item.row));
}

// DELETE
async function deleteRow(id) {
  if (!confirm("Sei sicuro di cancellare?")) return;
  await deleteDoc(doc(db, "portafoglio", id));
  await loadData();
}

// MODALE DI MODIFICA - modifica i campi richiesti
function openModalForEdit(id, originalData) {
  // crea overlay/modal se non presente
  let modal = document.getElementById("editModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "editModal";
    Object.assign(modal.style, {
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999
    });
    modal.innerHTML = `
      <div id="editModalContent" style="background:#fff;padding:20px;border-radius:8px;width:320px;">
        <h3 style="margin-top:0">Modifica</h3>
        <div id="modalFields"></div>
        <div style="text-align:right;margin-top:10px;">
          <button id="modalSave">Salva</button>
          <button id="modalClose">Chiudi</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
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

  const fieldsContainer = modal.querySelector("#modalFields");
  fieldsContainer.innerHTML = "";
  fields.forEach(f => {
    const v = originalData[f] ?? "";
    const wrapper = document.createElement("div");
    wrapper.style.marginBottom = "8px";
    wrapper.innerHTML = `<label style="display:block;font-size:13px">${f}</label><input id="fld_${f}" type="number" step="0.01" value="${v}" style="width:100%"/>`;
    fieldsContainer.appendChild(wrapper);
  });

  modal.style.display = "flex";

  modal.querySelector("#modalClose").onclick = () => modal.style.display = "none";

  modal.querySelector("#modalSave").onclick = async () => {
    const updated = { ...originalData };
    fields.forEach(f => {
      const el = document.getElementById("fld_" + f);
      if (!el) return;
      const val = el.value;
      if (val === "") {
        delete updated[f]; // non sovrascrive se vuoto
      } else {
        // score deve essere salvato come numero con 2 decimali
        if (f === "score") {
          updated[f] = parseFloat(parseFloat(val).toFixed(2));
        } else {
          updated[f] = parseFloat(val);
        }
      }
    });

    await updateDoc(doc(db, "portafoglio", id), updated);
    modal.style.display = "none";
    await loadData();
  };
}

// ==========================
// IMPORT / EXPORT Excel
// (usa global XLSX caricato via <script> in index.html)
// ==========================
window.exportExcel = async function exportExcel() {
  const snap = await getDocs(collection(db, "portafoglio"));
  const rows = snap.docs.map(s => {
    const obj = { ...s.data() };
    delete obj.profitto;
    return obj;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Portafoglio");
  XLSX.writeFile(wb, "portafoglio.xlsx");
};

window.importExcel = async function importExcel(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const ab = await file.arrayBuffer();
  const workbook = XLSX.read(ab, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(sheet);

  for (const item of json) {
    // ignora profitto da file
    delete item.profitto;
    if (!item.nome) continue;
    // prova a trovare esistente per nome; se trova aggiorna, altrimenti crea nuovo
    const snap = await getDocs(collection(db, "portafoglio"));
    let found = false;
    for (const docSnap of snap.docs) {
      if ((docSnap.data().nome || "").toString() === item.nome.toString()) {
        await updateDoc(doc(db, "portafoglio", docSnap.id), item);
        found = true;
        break;
      }
    }
    if (!found) {
      // crea nuovo doc con id automatico
      await setDoc(doc(db, "portafoglio", crypto.randomUUID()), item);
    }
  }

  alert("Import completato");
  await loadData();
};

// avvia
loadData();
