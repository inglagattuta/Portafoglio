import app from './firebase-config.js?v=10';
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const db = getFirestore(app);
const container = document.getElementById('table-container');

// Colonne nell'ordine desiderato
let columnsOrder = [
  "tipologia", "nome", "prezzo_acquisto", "prezzo_corrente",
  "dividendi", "prelevato", "profitto", "score",
  "percentuale_12_mesi", "rendimento_percentuale", "payback", "percentuale_portafoglio"
];

// Colonne in € e %
const euroColumns = ["prezzo_acquisto", "prezzo_corrente", "dividendi", "prelevato", "profitto"];
const percentColumns = ["percentuale_12_mesi", "rendimento_percentuale", "payback", "percentuale_portafoglio"];

// Stato toggle
let showPercent = false;

async function loadData() {
  try {
    const querySnapshot = await getDocs(collection(db, "portafoglio"));
    if (querySnapshot.empty) {
      container.innerHTML = "<p>Nessun dato trovato nella collection 'portafoglio'!</p>";
      return;
    }

    // Pulsante toggle
    const toggleBtn = document.createElement("button");
    toggleBtn.textContent = "Mostra colonne %";
    toggleBtn.style.marginBottom = "10px";
    toggleBtn.onclick = () => {
      showPercent = !showPercent;
      toggleBtn.textContent = showPercent ? "Nascondi colonne %" : "Mostra colonne %";
      togglePercentColumns(table);
    };
    container.innerHTML = "";
    container.appendChild(toggleBtn);

    const table = document.createElement('table');
    container.appendChild(table);

    // Intestazione tabella
    const header = table.insertRow();
    columnsOrder.forEach(key => {
      const th = document.createElement('th');
      th.textContent = key;
      th.style.cursor = "pointer";
      if (percentColumns.includes(key) && !showPercent) th.style.display = "none";
      header.appendChild(th);
    });

    // Aggiungiamo i dati
    querySnapshot.forEach((doc, rIndex) => {
      const data = doc.data();
      const row = table.insertRow();
      columnsOrder.forEach(key => {
        const cell = row.insertCell();
        let value = data[key] ?? "";

        if (typeof value === "number") {
          value = value.toFixed(2);
          if (euroColumns.includes(key)) value = value + " €";
          else if (percentColumns.includes(key)) value = value + " %";
        }

        // Colorazione profitto
        if (key === "profitto") {
          let num = parseFloat(value);
          if (!isNaN(num)) cell.style.color = num > 0 ? "green" : num < 0 ? "red" : "#000";
        }

        cell.textContent = value;
        cell.style.backgroundColor = rIndex % 2 === 0 ? "#F0F0F0" : "#E8E8E8";

        if (percentColumns.includes(key) && !showPercent) cell.style.display = "none";
      });
    });

    // Ordinamento colonne con frecce e evidenziazione
    columnsOrder.forEach((key, index) => {
      let asc = true;
      const th = header.cells[index];
      th.addEventListener("click", () => {
        sortTable(table, index, asc);

        // reset header e celle
        Array.from(header.cells).forEach((cell, i) => {
          cell.style.background = "linear-gradient(to bottom, #FFB300, #FFC857)";
          cell.textContent = columnsOrder[i];
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

        // evidenzia colonna ordinata
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
    console.error("Errore Firestore:", error);
    container.innerHTML = "<p>Errore connessione Firestore!</p>";
  }
}

// Funzione per mostrare/nascondere colonne %
function togglePercentColumns(table) {
  const rows = Array.from(table.rows);
  rows.forEach((row, rIndex) => {
    Array.from(row.cells).forEach((cell, cIndex) => {
      const key = columnsOrder[cIndex];
      if (percentColumns.includes(key)) {
        cell.style.display = showPercent ? "" : "none";
      }
    });
  });
}

// Ordinamento colonne
function sortTable(table, colIndex, asc = true) {
  const rows = Array.from(table.rows).slice(1);
  rows.sort((a, b) => {
    let x = a.cells[colIndex].textContent.replace(" ↑", "").replace(" ↓", "").replace(" €", "").replace(" %", "");
    let y = b.cells[colIndex].textContent.replace(" ↑", "").replace(" ↓", "").replace(" €", "").replace(" %", "");
    x = isNaN(x) ? x : parseFloat(x);
    y = isNaN(y) ? y : parseFloat(y);
    return (x > y ? 1 : -1) * (asc ? 1 : -1);
  });
  rows.forEach(row => table.appendChild(row));
}

loadData();
