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
