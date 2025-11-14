import app from './firebase-config.js';
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const db = getFirestore(app);
const status = document.getElementById('status');
const body = document.body;

// Funzione per caricare dati da Firestore
async function loadData() {
  try {
    const querySnapshot = await getDocs(collection(db, "test")); // cambia "test" se hai un altro nome
    if(querySnapshot.empty){
      status.textContent = "Nessun dato trovato!";
      return;
    }
    status.textContent = "Dati caricati da Firebase:";

    querySnapshot.forEach(doc => {
      const data = doc.data();
      const div = document.createElement('div');
      div.textContent = JSON.stringify(data);
      body.appendChild(div);
    });
  } catch (error) {
    console.error("Errore Firestore:", error);
    status.textContent = "Errore connessione Firestore!";
  }
}

loadData();

