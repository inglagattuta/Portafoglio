import app from './firebase-config.js?v=4';
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const db = getFirestore(app);
const status = document.getElementById('status');
const container = document.getElementById('table-container');

// Colonne nell'ordine desiderato
const columnsOrder = [
  "nome",
  "prezzo_acquisto",
  "prezzo_corrente",
  "tipologia",
  "dividendi",
  "prelevato",
  "profitto",
  "percentuale_12_mesi",
  "rendimento_percentuale",
  "payback",
  "percentuale_portafoglio",
  "score"
];

async function loadData() {
  try {
    const querySnapshot = await getDocs(collection(db, "portafoglio"));
    if (querySnapshot.empty) {
      status.textContent = "Nessun dato trovato nella collection 'portafoglio'!";
      return;
    }

    const table = document.createElement('table');

    // Intestazione tabella
    const header = table.insertRow();
    columnsOrder.forEach(key => {
      const th = document.createElement('th');
      th.textContent = key;
      th.style.cursor = "pointer";
      header.appendChild(th);
    });

    // Aggiungiamo i dati
    querySnapshot.forEach(doc => {
      const data = doc.data();
      const row = table.insertRow();
      columnsOrder.forEach(key => {
        const cell = row.insertCell();
        let value = data[key] ?? ""; // evita undefined

        // formattazione numeri a 2 decimali
        if (typeof value === "number") {
          value = value.toFixed(2);
        }

        cell.textContent = value;
        cell.style.backgroundColor = "#F0F0F0"; // grigetto chiaro
      });
    });

    container.innerHTML = "";
    container.appendChild(table);

    // Ordinamento colonne
    columnsOrder.forEach((key, index) => {
      let asc = true;
      const th = header.cells[index];
      th.addEventListener("click", () => {
        sortTable(table, index, asc);
        asc = !asc;
      });
    });

  } catch (error) {
    console.error("Errore Firestore:", error);
    status.textContent = "Errore connessione Firestore!";
  }
}

// Ordinamento colonne
function sortTable(table, colIndex, asc = true) {
  const rows = Array.from(table.rows).slice(1); // esclude header
  rows.sort((a, b) => {
    let x = a.cells[colIndex].textContent;
    let y = b.cells[colIndex].textContent;

    x = isNaN(x) ? x : parseFloat(x);
    y = isNaN(y) ? y : parseFloat(y);

    return (x > y ? 1 : -1) * (asc ? 1 : -1);
  });
  rows.forEach(row => table.appendChild(row));
}

loadData();
