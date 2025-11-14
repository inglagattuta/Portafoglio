// ===============================
// main.js - VERSIONE COMPLETA
// ===============================

import app from "./firebase-config.js";

import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
  doc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const db = getFirestore(app);

const tableBody = document.getElementById("tableBody");
const headerRow = document.getElementById("headerRow");

// ---------------------------------
// CONFIG TABELLA
// ---------------------------------

let columnsOrder = [
  "tipologia",
  "nome",
  "prezzo_acquisto",
  "prezzo_corrente",
  "dividendi",
  "prelevato",
  "profitto",
  "score"
];

const euroColumns = ["prezzo_acquisto", "prezzo_corrente", "dividendi", "prelevato"];
const percentColumns = ["percentuale_12_mesi", "rendimento_percentuale", "payback", "percentuale_portafoglio"];

let showPercent = false;

// ---------------------------------
// CARICA I DATI
// ---------------------------------

async function loadData() {
  const snap = await getDocs(collection(db, "portafoglio"));
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // ricrea header
  headerRow.innerHTML = "";
  columnsOrder.forEach(col => {
    const th = document.createElement("th");
    th.textContent = col;
    headerRow.appendChild(th);
  });

  // colonna azioni
  const thA = document.createElement("th");
  thA.textContent = "Azioni";
  headerRow.appendChild(thA);

  // righe
  tableBody.innerHTML = "";

  docs.forEach((d, idx) => {
    const row = tableBody.insertRow();

    columnsOrder.forEach(key => {
      const cell = row.insertCell();

      // profitto calcolato
      if (key === "profitto") {
        const pa = parseFloat(d.prezzo_acquisto || 0);
        const pc = parseFloat(d.prezzo_corrente || 0);
        const div = parseFloat(d.dividendi || 0);
        const pre = parseFloat(d.prelevato || 0);

        const profitto = pc - pa + div + pre;

        cell.textContent = profitto.toFixed(2) + " €";
        cell.dataset.raw = profitto;

        cell.style.color = profitto > 0 ? "green" : profitto < 0 ? "red" : "black";

        return;
      }

      // valori normali
      let val = d[key];

      if (euroColumns.includes(key)) {
        val = parseFloat(val || 0);
        cell.textContent = val.toFixed(2) + " €";
        cell.dataset.raw = val;

      } else if (percentColumns.includes(key)) {
        val = parseFloat(val || 0);
        cell.textContent = val.toFixed(2) + " %";
        cell.dataset.raw = val;
        if (!showPercent) cell.style.display = "none";

      } else if (key === "score") {
        val = parseFloat(val || 0);
        cell.textContent = val.toFixed(2);
        cell.dataset.raw = val;

      } else {
        cell.textContent = val ?? "";
        cell.dataset.raw = String(val ?? "").toLowerCase();
      }
    });

    // Azioni
    const cA = row.insertCell();
    cA.classList.add("actions");

    const btnE = document.createElement("button");
    btnE.textContent = "Modifica";
    btnE.onclick = () => openModalForEdit(d.id, d);

    const btnD = document.createElement("button");
    btnD.textContent = "Cancella";
    btnD.onclick = () => deleteRow(d.id);

    cA.appendChild(btnE);
    cA.appendChild(btnD);
  });

  enableSorting();
}

// ---------------------------------
// ORDINAMENTO
// ---------------------------------

function enableSorting() {
  const headers = Array.from(headerRow.cells);

  headers.forEach((th, index) => {
    if (th.textContent === "Azioni") return;

    th.style.cursor = "pointer";
    th.dataset.asc = "true";

    th.onclick = () => {
      const asc = th.dataset.asc === "true";
      sortColumn(index, asc);
      th.dataset.asc = (!asc).toString();

      headers.forEach(h => {
        if (h !== th) h.textContent = h.textContent.replace(/ ↑| ↓/g, "");
      });

      th.textContent = th.textContent.replace(/ ↑| ↓/g, "") + (asc ? " ↑" : " ↓");
    };
  });
}

function sortColumn(colIndex, asc) {
  const rows = Array.from(tableBody.rows);

  const arr = rows.map(r => {
    const raw = r.cells[colIndex].dataset.raw;
    const num = parseFloat(raw);
    return { row: r, key: isNaN(num) ? raw : num };
  });

  arr.sort((a, b) => {
    const x = a.key, y = b.key;
    return asc ? (x > y ? 1 : -1) : (x < y ? 1 : -1);
  });

  arr.forEach(el => tableBody.appendChild(el.row));
}

// ---------------------------------
// CANCELLA
// ---------------------------------

async function deleteRow(id) {
  if (!confirm("Vuoi cancellare questo record?")) return;
  await deleteDoc(doc(db, "portafoglio", id));
  loadData();
}

// ---------------------------------
// MODIFICA (MODAL)
// ---------------------------------

function openModalForEdit(id, originalData) {
  const modal = document.getElementById("editModal");
  const fieldsDiv = document.getElementById("modalFields");

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

  fieldsDiv.innerHTML = "";

  fields.forEach(f => {
    const val = originalData[f] ?? "";
    fieldsDiv.innerHTML += `
      <label>${f}</label>
      <input type="number" id="fld_${f}" value="${val}" step="0.01">
    `;
  });

  modal.style.display = "flex";

  document.getElementById("modalClose").onclick = () => {
    modal.style.display = "none";
  };

  document.getElementById("modalSave").onclick = async () => {
    const updated = { ...originalData };

    fields.forEach(f => {
      const el = document.getElementById("fld_" + f);
      const val = el.value;
      updated[f] = f === "score" ? parseFloat(parseFloat(val).toFixed(2)) : parseFloat(val);
    });

    await updateDoc(doc(db, "portafoglio", id), updated);
    modal.style.display = "none";
    loadData();
  };
}

// ---------------------------------
// EXPORT
// ---------------------------------

window.exportExcel = async function () {
  const snap = await getDocs(collection(db, "portafoglio"));

  const rows = snap.docs.map(d => {
    const item = { ...d.data() };
    delete item.profitto;
    return item;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Portafoglio");

  XLSX.writeFile(wb, "portafoglio.xlsx");
};

// ---------------------------------
// IMPORT
// ---------------------------------

window.importExcel = async function (event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);

  for (const item of data) {
    delete item.profitto;

    if (!item.nome) continue;

    const snap = await getDocs(collection(db, "portafoglio"));

    let existing = snap.docs.find(d => d.data().nome === item.nome);

    if (existing) {
      await updateDoc(doc(db, "portafoglio", existing.id), item);
    } else {
      await setDoc(doc(db, "portafoglio", crypto.randomUUID()), item);
    }
  }

  alert("Import completato!");
  loadData();
};

// ---------------------------------
// AVVIO
// ---------------------------------

loadData();
