// main.js - completo, con import/export excel, update, formattazione

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// CONFIGURAZIONE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyBhDoRKmRffrjO-WvVjgX3K7JdfPaM7MGk",
  authDomain: "portafoglio-dashboard.firebaseapp.com",
  projectId: "portafoglio-dashboard",
  storageBucket: "portafoglio-dashboard.firebasestorage.app",
  messagingSenderId: "194509041146",
  appId: "1:194509041146:web:aa943d555dc067f7110843"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ELEMENTI DOM
const headerRow = document.getElementById("headerRow");
const tableBody = document.getElementById("tableBody");

// COLONNE (tipologia deve essere prima)
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
  "score",
  "azioni",
];

// COLONNE DA NASCONDERE
const hiddenColumns = [
  "percentuale_12_mesi",
  "rendimento_percentuale",
  "payback",
  "percentuale_portafoglio",
];

// RENDER TABELLA
function renderHeader() {
  headerRow.innerHTML = "";
  columns.forEach((col) => {
    if (col === "azioni") {
      headerRow.innerHTML += `<th>Azioni</th>`;
    } else {
      headerRow.innerHTML += `<th ${hiddenColumns.includes(col) ? "style='display:none'" : ""}>${col}</th>`;
    }
  });
}

function renderRow(id, data) {
  const tr = document.createElement("tr");

  columns.forEach((col) => {
    const td = document.createElement("td");

    if (col === "azioni") {
      td.className = "actions";
      td.innerHTML = `
        <button onclick="editRecord('${id}')">Modifica</button>
        <button onclick="deleteRecord('${id}')">Cancella</button>
      `;
    } else {
      td.textContent = data[col] ?? "";

      if (col === "profitto") {
        const value = Number(data[col]);
        td.style.color = value > 0 ? "green" : value < 0 ? "red" : "black";
      }

      if (col === "score") {
        td.textContent = Number(data[col]).toFixed(2);
      }

      if (hiddenColumns.includes(col)) {
        td.style.display = "none";
      }
    }

    tr.appendChild(td);
  });

  tableBody.appendChild(tr);
}

// CARICAMENTO DATI
async function loadData() {
  tableBody.innerHTML = "";
  renderHeader();

  const querySnapshot = await getDocs(collection(db, "portafoglio"));
  querySnapshot.forEach((docSnap) => {
    renderRow(docSnap.id, docSnap.data());
  });
}

loadData();

// MODIFICA RECORD
window.editRecord = async function (id) {
  const docRef = doc(db, "portafoglio", id);
  const docSnap = await getDocs(collection(db, "portafoglio"));

  const data = (await getDocs(collection(db, "portafoglio"))).docs
    .find((d) => d.id === id)
    ?.data();

  if (!data) return alert("Errore: record non trovato");

  const newValues = {};

  const fieldsToEdit = [
    "prezzo_acquisto",
    "prezzo_corrente",
    "dividendi",
    "prelevato",
    "percentuale_12_mesi",
    "rendimento_percentuale",
    "payback",
    "score",
  ];

  for (const field of fieldsToEdit) {
    const value = prompt(`Modifica ${field}:`, data[field] ?? "");
    if (value === null) return; // annullato
    newValues[field] = Number(value);
  }

  newValues.profitto =
    newValues.prezzo_corrente -
    newValues.prezzo_acquisto +
    newValues.dividendi +
    newValues.prelevato;

  await setDoc(doc(db, "portafoglio", id), {
    ...data,
    ...newValues,
  });

  loadData();
};

// CANCELLA RECORD
window.deleteRecord = async function (id) {
  if (!confirm("Sei sicuro di voler cancellare questo record?")) return;
  await deleteDoc(doc(db, "portafoglio", id));
  loadData();
};

// EXPORT EXCEL
window.exportExcel = async function () {
  const workbook = XLSX.utils.book_new();
  const querySnapshot = await getDocs(collection(db, "portafoglio"));

  const data = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  const sheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, sheet, "Portafoglio");
  XLSX.writeFile(workbook, "portafoglio.xlsx");
};

// IMPORT EXCEL CON CONTROLLO DUPLICATI
window.importExcel = async function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    for (const row of json) {
      const id = row.id || row.nome;
      if (!id) continue;

      await setDoc(doc(db, "portafoglio", id), row, { merge: true });
    }

    loadData();
  };

  reader.readAsArrayBuffer(file);
};
