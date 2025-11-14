import app from './firebase-config.js?v=13';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const db = getFirestore(app);
const container = document.getElementById('table-container');

let columnsOrder = [
  "tipologia", "nome", "prezzo_acquisto", "prezzo_corrente",
  "dividendi", "prelevato", "profitto", "score",
  "percentuale_12_mesi", "rendimento_percentuale", "payback", "percentuale_portafoglio"
];

const euroColumns = ["prezzo_acquisto", "prezzo_corrente", "dividendi", "prelevato", "profitto"];
const percentColumns = ["percentuale_12_mesi", "rendimento_percentuale", "payback", "percentuale_portafoglio"];
let showPercent = false;

async function loadData() {
  try {
    const querySnapshot = await getDocs(collection(db, "portafoglio"));
    if (querySnapshot.empty) {
      container.innerHTML = "<p>Nessun dato trovato nella collection 'portafoglio'!</p>";
      return;
    }

    const toggleBtn = document.createElement("button");
    toggleBtn.textContent = "Mostra colonne %";
    toggleBtn.style.marginRight = "10px";
    toggleBtn.onclick = () => {
      showPercent = !showPercent;
      toggleBtn.textContent = showPercent ? "Nascondi colonne %" : "Mostra colonne %";
      togglePercentColumns(table);
    };

    const exportBtn = document.createElement("button");
    exportBtn.textContent = "Export Excel";
    exportBtn.style.marginRight = "10px";
    exportBtn.onclick = exportToExcel;

    const importBtn = document.createElement("input");
    importBtn.type = "file";
    importBtn.accept = ".xlsx,.xls";
    importBtn.onchange = (e) => {
      if (e.target.files.length) importFromExcel(e.target.files[0]);
    };

    container.innerHTML = "";
    container.appendChild(toggleBtn);
    container.appendChild(exportBtn);
    container.appendChild(importBtn);

    const table = document.createElement('table');
    container.appendChild(table);

    const header = table.insertRow();
    columnsOrder.concat(["Azioni"]).forEach(key => {
      const th = document.createElement('th');
      th.textContent = key;
      th.style.cursor = "pointer";
      if (percentColumns.includes(key) && !showPercent) th.style.display = "none";
      header.appendChild(th);
    });

    querySnapshot.forEach((docSnap, rIndex) => {
      const data = docSnap.data();
      const row = table.insertRow();

      columnsOrder.forEach(key => {
        const cell = row.insertCell();
        let value = data[key] ?? "";

        if (typeof value === "number") {
          value = value.toFixed(2);
          if (euroColumns.includes(key)) value += " €";
          else if (percentColumns.includes(key)) value += " %";
        }

        if (key === "profitto") {
          let num = parseFloat(value);
          if (!isNaN(num)) cell.style.color = num > 0 ? "green" : num < 0 ? "red" : "#000";
        }

        cell.textContent = value;
        cell.style.backgroundColor = rIndex % 2 === 0 ? "#F0F0F0" : "#E8E8E8";
        if (percentColumns.includes(key) && !showPercent) cell.style.display = "none";
      });

      // Colonna Azioni
      const actionCell = row.insertCell();
      const modifyBtn = document.createElement("button");
      modifyBtn.textContent = "Modifica";
      modifyBtn.onclick = () => editRow(docSnap.id, data);
      modifyBtn.style.marginRight = "5px";

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Cancella";
      deleteBtn.onclick = () => deleteRow(docSnap.id);

      actionCell.appendChild(modifyBtn);
      actionCell.appendChild(deleteBtn);
    });

    // Ordinamento colonne con frecce
    columnsOrder.forEach((key, index) => {
      let asc = true;
      const th = header.cells[index];
      th.addEventListener("click", () => {
        sortTable(table, index, asc);

        Array.from(header.cells).forEach((cell, i) => {
          cell.style.background = "linear-gradient(to bottom, #FFB300, #FFC857)";
          cell.textContent = i < columnsOrder.length ? columnsOrder[i] : "Azioni";
          if (percentColumns.includes(columnsOrder[i]) && !showPercent) cell.style.display = "none";
        });

        Array.from(table.rows).forEach((row, rIndex) => {
          if (rIndex === 0) return;
          Array.from(row.cells).forEach((cell, cIndex) => {
            cell.style.border = "none";
            if (!percentColumns.includes(columnsOrder[cIndex]) || showPercent) {
              cell.style.backgroundColor = rIndex % 2 === 0 ? "#F0F0F0" : "#E8E8E8";
              cell.style.display = "";
            } else {
              cell.style.display = "none";
            }
          });
        });

        const arrow = asc ? " ↑" : " ↓";
        th.textContent = key + arrow;
        Array.from(table.rows).forEach((row, rIndex) => {
          if (rIndex === 0) return;
          const cell = row.cells[index];
          if (!percentColumns.includes(key) || showPercent) {
            cell.style.backgroundColor = asc ? "#C6F6D5" : "#FFE4B2";
            cell.style.border = "1px solid #999";
          }
        });

        asc = !asc;
      });
    });

  } catch (error) {
    console.error(error);
    container.innerHTML = "<p>Errore connessione Firestore!</p>";
  }
}

// Funzioni Azioni
function editRow(id, data) {
  const updatedData = { ...data };
  for (const key of Object.keys(data)) {
    if (key === "score") continue; // opzionale
    const newVal = prompt(`Modifica ${key}`, data[key]);
    if (newVal !== null) {
      updatedData[key] = isNaN(data[key]) ? newVal : parseFloat(newVal);
    }
  }
  const docRef = doc(db, "portafoglio", id);
  setDoc(docRef, updatedData).then(() => {
    alert("Record aggiornato!");
    loadData();
  });
}

function deleteRow(id) {
  if (confirm("Sei sicuro di voler cancellare questo record?")) {
    const docRef = doc(db, "portafoglio", id);
    deleteDoc(docRef).then(() => {
      alert("Record cancellato!");
      loadData();
    });
  }
}

// Toggle colonne %
function togglePercentColumns(table) {
  const rows = Array.from(table.rows);
  rows.forEach(row => {
    Array.from(row.cells).forEach((cell, cIndex) => {
      const key = cIndex < columnsOrder.length ? columnsOrder[cIndex] : null;
      if (percentColumns.includes(key)) {
        cell.style.display = showPercent ? "" : "none";
      }
    });
  });
}

// Ordinamento
function sortTable(table, colIndex, asc = true) {
  const rows = Array.from(table.rows).slice(1);
  rows.sort((a, b) => {
    let x = a.cells[colIndex].textContent.replace(" ↑","").replace(" ↓","").replace(" €","").replace(" %","");
    let y = b.cells[colIndex].textContent.replace(" ↑","").replace(" ↓","").replace(" €","").replace(" %","");
    x = isNaN(x) ? x : parseFloat(x);
    y = isNaN(y) ? y : parseFloat(y);
    return (x > y ? 1 : -1) * (asc ? 1 : -1);
  });
  rows.forEach(row => table.appendChild(row));
}

// Export/Import Excel
function exportToExcel() {
  getDocs(collection(db, "portafoglio")).then(querySnapshot => {
    const data = [];
    querySnapshot.forEach(docSnap => data.push(docSnap.data()));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Portafoglio");
    XLSX.writeFile(wb, "Portafoglio.xlsx");
  }).catch(err => console.error(err));
}

function importFromExcel(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    for (const item of jsonData) {
      const docRef = doc(db, "portafoglio", item.nome || crypto.randomUUID());
      await setDoc(docRef, item);
    }
    alert("Import completato!");
    loadData();
  };
  reader.readAsArrayBuffer(file);
}

loadData();
