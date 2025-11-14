// ================================
// IMPORT FIREBASE
// ================================
import app from './firebase-config.js';
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const db = getFirestore(app);

// ================================
// CONFIGURAZIONE COLONNE
// ================================
const columnsOrder = [
  "tipologia",
  "nome",
  "prezzo_acquisto",
  "prezzo_corrente",
  "dividendi",
  "prelevato",
  "profitto", // calcolato
  "score",
  "azioni"
];

const euroColumns = [
  "prezzo_acquisto",
  "prezzo_corrente",
  "dividendi",
  "prelevato"
];

const percentColumns = [
  "percentuale_12_mesi",
  "rendimento_percentuale",
  "payback",
  "percentuale_portafoglio"
];

// ================================
// COSTRUZIONE TABELLA
// ================================
const headerRow = document.getElementById("headerRow");
const tableBody = document.getElementById("tableBody");

// Disegna l'header
columnsOrder.forEach(col => {
  const th = document.createElement("th");
  th.textContent = col.toUpperCase();
  headerRow.appendChild(th);
});

// ================================
// CARICAMENTO DATI
// ================================
async function loadData() {
  const querySnapshot = await getDocs(collection(db, "portafoglio"));
  tableBody.innerHTML = "";

  querySnapshot.forEach(docSnap => {
    const data = docSnap.data();
    const row = tableBody.insertRow();

    columnsOrder.forEach(key => {
      const cell = row.insertCell();

      // =========================
      // CALCOLO PROFITTO
      // =========================
      if (key === "profitto") {
        const pa = parseFloat(data.prezzo_acquisto || 0);
        const pc = parseFloat(data.prezzo_corrente || 0);
        const div = parseFloat(data.dividendi || 0);
        const pre = parseFloat(data.prelevato || 0);

        const profittoCalc = pc - pa + div + pre;
        cell.textContent = profittoCalc.toFixed(2) + " €";
        cell.style.color = profittoCalc > 0 ? "green" : profittoCalc < 0 ? "red" : "black";
        return;
      }

      // =========================
      // COLONNA AZIONI
      // =========================
      if (key === "azioni") {
        cell.classList.add("actions");

        // Bottone modifica
        const editBtn = document.createElement("button");
        editBtn.textContent = "Modifica";
        editBtn.classList.add("edit-btn");
        editBtn.onclick = () => editRow(docSnap.id, data);

        // Bottone cancella
        const delBtn = document.createElement("button");
        delBtn.textContent = "Cancella";
        delBtn.classList.add("delete-btn");
        delBtn.onclick = () => deleteRow(docSnap.id);

        cell.appendChild(editBtn);
        cell.appendChild(delBtn);
        return;
      }

      // =========================
      // FORMATTARE NUMERI
      // =========================
      let value = data[key];

      if (euroColumns.includes(key) && value !== undefined) {
        value = parseFloat(value).toFixed(2) + " €";
      }

      cell.textContent = value ?? "";
    });
  });
}

loadData();

// ================================
// MODIFICA RECORD
// ================================
async function editRow(id, originalData) {
  let newData = { ...originalData };

  for (const key of Object.keys(originalData)) {
    if (key === "profitto" || key === "score") continue;

    const nuovo = prompt(`Modifica ${key}:`, originalData[key]);
    if (nuovo !== null) {
      newData[key] = isNaN(nuovo) ? nuovo : parseFloat(nuovo);
    }
  }

  await updateDoc(doc(db, "portafoglio", id), newData);
  loadData();
}

// ================================
// CANCELLA RECORD
// ================================
async function deleteRow(id) {
  if (!confirm("Sei sicuro di voler cancellare questo elemento?")) return;
  await deleteDoc(doc(db, "portafoglio", id));
  loadData();
}

// ================================
// IMPORT/EXPORT EXCEL (SheetJS)
// ================================
import * as XLSX from "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";

// EXPORT TO EXCEL
window.exportExcel = async function () {
  const querySnapshot = await getDocs(collection(db, "portafoglio"));
  const rows = [];

  querySnapshot.forEach(docSnap => {
    const data = docSnap.data();
    const copy = { ...data };
    delete copy.profitto; // profitto non si esporta
    rows.push(copy);
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Portafoglio");

  XLSX.writeFile(wb, "portafoglio.xlsx");
};

// IMPORT FROM EXCEL
window.importExcel = async function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(sheet);

  for (const item of json) {
    delete item.profitto; // non importiamo profitto

    if (!item.nome) continue;

    await updateExistingOrAdd(item);
  }

  loadData();
  alert("Import completato!");
};

async function updateExistingOrAdd(record) {
  const querySnapshot = await getDocs(collection(db, "portafoglio"));
  for (const docSnap of querySnapshot.docs) {
    const data = docSnap.data();
    if (data.nome === record.nome) {
      await updateDoc(doc(db, "portafoglio", docSnap.id), record);
      return;
    }
  }
}
