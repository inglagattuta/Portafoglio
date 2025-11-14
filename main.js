import app from './firebase-config.js';
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const db = getFirestore(app);

// Aggiorna stato connessione
const status = document.getElementById('status');
status.textContent = "Firebase collegato!";

// Esempio: leggere documenti da Firestore
async function loadData() {
  try {
    const querySnapshot = await getDocs(collection(db, "test"));
    console.log("Documenti Firestore:", querySnapshot.docs.map(doc => doc.data()));
  } catch (error) {
    console.error("Errore Firestore:", error);
    status.textContent = "Errore connessione Firestore!";
  }
}

loadData();
