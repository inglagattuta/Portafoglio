import app from './firebase-config.js?v=20';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const db = getFirestore(app);
const container = document.getElementById('table-container');

/* COLONNE */
let columnsOrder = [
  "tipologia",
  "nome",
  "prezzo_acquisto",
  "prezzo_corrente",
  "dividendi",
  "prelevato",
  "profitto",   // calcolato automaticamente
  "score",
  "percentuale_12_mesi",
  "rendimento_percentuale",
  "payback",
  "percentuale_portafoglio"
];

const euroColumns = ["prezzo_acquisto", "prezzo_corrente", "dividendi", "prelevato"];
const percentColumns = ["percentuale_12_mesi", "rendimento_percentuale", "payback", "percentuale_portafoglio"];
let showPercent = false;

/* ===========================
   CARICAMENTO DATI
=========================== */
async function loadData() {
  try {
    const querySnapshot = await getDocs(collection(db, "portafoglio"));

    container.innerHTML = "";

    if (querySnapshot.empty) {
      container.innerHTML = "<p>Nessun dato trovato nella collection 'portafoglio'.</p>";
      return;
    }

    /* === BOTTONI === */
    const toggleBtn = document.createElement("button");
    toggleBtn.textContent = "Mostra colonne %";
    toggleBtn.onclick = () => {
      showPercent = !showPercent;
      toggleBtn.textContent = showPercent ? "Nascondi colonne %" : "Mostra colonne %";
      togglePercentColumns(table);
    };

    const exportBtn = document.createElement("button");
    exportBtn.textContent = "Esporta Excel";
    exportBtn.onclick = exportToExcel;

    const importInput = document.createElement("input");
    importInput.type = "file";
    importInput.accept = ".xlsx,.xls";
    importInput.onchange = e => {
      if (e.target.files.length) importFromExcel(e.target.files[0]);
    };

    container.appendChild(toggleBtn);
    container.appendChild(exportBtn);
    container.appendChild(importInput);

    /* === TABELLA === */
    const table = document.createElement("table");
    container.appendChild(table);

    const header = table.insertRow();

    // HEADER
    columnsOrder.forEach(key => {
      const th = document.createElement("th");
      th.textContent = key;
      if (percentColumns.includes(key) && !showPercent) th.style.display = "none";
      header.appendChild(th);
    });

    // COLONNA AZIONI
    const thActions = document.createElement("th");
    thActions.textContent = "Azioni";
    header.appendChild(thActions);

    /* === RIGHE === */
    querySnapshot.forEach((docSnap, rIndex) => {
      const data = docSnap.data();
      const row = table.insertRow();

      columnsOrder.forEach(key => {
        const cell = row.insertCell();

        let value = data[key] ?? "";

        // 🔥 PROFITTO: CALCOLATO
        if (key === "profitto") {
          const pa = parseFloat(data.prezzo_acquisto || 0);
          const pc = parseFloat(data.prezzo_corrente || 0);
          const div = parseFloat(data.dividendi || 0);
          const pre = parseFloat(data.prelevato || 0);

          const profittoCalc = pc - pa + div + pre;
          value = profittoCalc.toFixed(2) + " €";

          cell.style.color = profittoCalc > 0 ? "green" :
                             profittoCalc < 0 ? "red" : "black";
        }

        // FORMATTAZIONE NUMERI
        else if (typeof value === "number") {
          value = value.toFixed(2);

          if (euroColumns.includes(key)) value += " €";
          else if (percentColumns.includes(key)) value += " %";
        }

        cell.textContent = value;
        cell.style.backgroundColor = rIndex % 2 === 0 ? "#F0F0F0" : "#E8E8E8";

        if (percentColumns.includes(key) && !showPercent) {
          cell.style.display = "none";
        }
      });

      /* === COLONNA AZIONI === */
      const actionCell = row.insertCell();

      const btnEdit = document.createElement("button");
      btnEdit.textContent = "Modifica";
      btnEdit.style.marginRight = "5px";
      btnEdit.onclick = () => editRow(docSnap.id, data);

      const btnDelete = document.createElement("button");
      btnDelete.textContent = "Cancella";
      btnDelete.onclick = () => deleteRow(docSnap.id);

      actionCell.appendChild(btnEdit);
      actionCell.appendChild(btnDelete);
    });

    enableSorting(table);

  } catch (error) {
    console.error(error);
    container.innerHTML = "<p>Errore connessione Firestore.</p>";
  }
}

/* ===========================
   MODIFICA RECORD
=========================== */
function editRow(id, data) {
  const updated = { ...data };

  for (const key of Object.keys(data)) {
    if (key === "profitto") continue;
    const newVal = prompt(`Modifica ${key}:`, data[key]);
    if (newVal !== null) {
      updated[key] = isNaN(data[key]) ? newVal : parseFloat(newVal);
    }
  }

  setDoc(doc(db, "portafoglio", id), updated).then(() => {
    alert("Record aggiornato!");
    loadData();
  });
}

/* ===========================
   CANCELLA RECORD
=========================== */
function deleteRow(id) {
  if (!confirm("Vuoi davvero cancellare questo record?")) return;

  deleteDoc(doc(db, "portafoglio", id)).then(() => {
    alert("Cancellato!");
    loadData();
  });
}

/* ===========================
   TOGGLE COLONNE %
=========================== */
function togglePercentColumns(table) {
  for (let r = 0; r < table.rows.length; r++) {
    const row = table.rows[r];
    columnsOrder.forEach((key, cIndex) => {
      if (percentColumns.includes(key)) {
        row.cells[cIndex].style.display = showPercent ? "" : "none";
      }
    });
  }
}

/* ===========================
   ORDINAMENTO COLONNE
=========================== */
function enableSorting(table) {
  const headerCells = table.rows[0].cells;

  columnsOrder.forEach((key, index) => {
    let asc = true;
    headerCells[index].style.cursor = "pointer";

    headerCells[index].onclick = () => {
      sortTable(table, index, asc);
      asc = !asc;
    };
  });
}

function sortTable(table, colIndex, asc) {
  const rows = Array.from(table.rows).slice(1);

  rows.sort((a, b) => {
    let x = a.cells[colIndex].textContent.replace("€", "").replace("%", "");
    let y = b.cells[colIndex].textContent.replace("€", "").replace("%", "");

    x = parseFloat(x) || x.toLowerCase();
    y = parseFloat(y) || y.toLowerCase();

    return asc ? (x > y ? 1 : -1) : (x < y ? 1 : -1);
  });

  rows.forEach(r => table.appendChild(r));
}

/* ===========================
   EXPORT EXCEL
=========================== */
function exportToExcel() {
  getDocs(collection(db, "portafoglio")).then(querySnapshot => {
    const arr = [];

    querySnapshot.forEach(docSnap => {
      const obj = { ...docSnap.data() };
      delete obj.profitto; // non esportiamo campo calcolato
      arr.push(obj);
    });

    const ws = XLSX.utils.json_to_sheet(arr);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Portafoglio");
    XLSX.writeFile(wb, "Portafoglio.xlsx");
  });
}

/* ===========================
   IMPORT EXCEL
=========================== */
function importFromExcel(file) {
  const reader = new FileReader();

  reader.onload = async e => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    for (const item of json) {
      delete item.profitto; // ignoriamo profitto
      const id = item.nome || crypto.randomUUID();
      await setDoc(doc(db, "portafoglio", id), item);
    }

    alert("Import completato!");
    loadData();
  };

  reader.readAsArrayBuffer(file);
}

loadData();
