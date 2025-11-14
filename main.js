import app from './firebase-config.js?v=3';
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const db = getFirestore(app);
const status = document.getElementById('status');
const container = document.getElementById('table-container');

async function loadData() {
  try {
    const querySnapshot = await getDocs(collection(db, "portafoglio"));
    if (querySnapshot.empty) {
      status.textContent = "Nessun dato trovato nella collection 'portafoglio'!";
      return;
    }

    // Creiamo la tabella
    const table = document.createElement('table');

    // Intestazione tabella
    const header = table.insertRow();
    const docKeys = Object.keys(querySnapshot.docs[0].data());
    docKeys.forEach(key => {
      const th = document.createElement('th');
      th.textContent = key;
      th.style.cursor = "pointer"; // indica che si può cliccare
      header.appendChild(th);
    });

    // Aggiungiamo i dati
    querySnapshot.forEach(doc => {
      const data = doc.data();
      const row = table.insertRow();
      docKeys.forEach(key => {
        const cell = row.insertCell();
        let value = data[key];

        // se è numero, formatta a 2 decimali
        if (typeof value === "number") {
          value = value.toFixed(2);
        }

        cell.textContent = value;
      });
    });

    container.innerHTML = ""; // pulisce eventuale vecchia tabella
    container.appendChild(table);

    // Ordinamento colonne
    docKeys.forEach((key, index) => {
      let asc = true;
      const th = header.cells[index];
      th.addEventListener("click", () => {
        sortTable(table, index, asc);
        asc = !asc; // alterna asc/desc
      });
    });

  } catch (error) {
    console.error("Errore Firestore:", error);
    status.textContent = "Errore connessione Firestore!";
  }
}

// Funzione per ordinare la tabella
function sortTable(table, colIndex, asc = true) {
  const rows = Array.from(table.rows).slice(1); // esclude header
  rows.sort((a, b) => {
    let x = a.cells[colIndex].textContent;
    let y = b.cells[colIndex].textContent;

    // prova a convertire in numero, se possibile
    x = isNaN(x) ? x : parseFloat(x);
    y = isNaN(y) ? y : parseFloat(y);

    return (x > y ? 1 : -1) * (asc ? 1 : -1);
  });
  rows.forEach(row => table.appendChild(row));
}

loadData();
