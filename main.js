import app from './firebase-config.js';
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const db = getFirestore(app);
const status = document.getElementById('status');
const body = document.body;

// Funzione per caricare dati da Firestore
async function loadData() {
  try {
    const querySnapshot = await getDocs(collection(db, "portafoglio")); // collection aggiornata
    if(querySnapshot.empty){
      status.textContent = "Nessun dato trovato nella collection 'portafoglio'!";
      return;
    }

    status.textContent = "Dati caricati da Firebase:";

    // Creiamo una tabella
    const table = document.createElement('table');
    table.style.margin = "20px auto";
    table.style.borderCollapse = "collapse";
    table.style.width = "90%";

    // Intestazione tabella
    const header = table.insertRow();
    const docKeys = Object.keys(querySnapshot.docs[0].data());
    docKeys.forEach(key => {
      const th = document.createElement('th');
      th.textContent = key;
      th.style.border = "1px solid #333";
      th.style.padding = "5px";
      header.appendChild(th);
    });

    // Aggiungiamo i dati
    querySnapshot.forEach(doc => {
      const data = doc.data();
      const row = table.insertRow();
      docKeys.forEach(key => {
        const cell = row.insertCell();
        cell.textContent = data[key];
        cell.style.border = "1px solid #333";
        cell.style.padding = "5px";
      });
    });

    body.appendChild(table);

  } catch (error) {
    console.error("Errore Firestore:", error);
    status.textContent = "Errore connessione Firestore!";
  }
}

loadData();
