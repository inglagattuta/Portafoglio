import app from './firebase-config.js?v=1';
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

    status.textContent = "Dati caricati da Firebase:";

    // Creiamo la tabella
    const table = document.createElement('table');

    // Intestazione tabella
    const header = table.insertRow();
    const docKeys = Object.keys(querySnapshot.docs[0].data());
    docKeys.forEach(key => {
      const th = document.createElement('th');
      th.textContent = key;
      header.appendChild(th);
    });

    // Aggiungiamo i dati
    querySnapshot.forEach(doc => {
      const data = doc.data();
      const row = table.insertRow();
      docKeys.forEach(key => {
        const cell = row.insertCell();
        cell.textContent = data[key];
      });
    });

    container.innerHTML = ""; // pulisce eventuale vecchia tabella
    container.appendChild(table);

  } catch (error) {
    console.error("Errore Firestore:", error);
    status.textContent = "Errore connessione Firestore!";
  }
}

loadData();
