import app from "./firebase-config.js";
import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const db = getFirestore(app);

async function loadDividendi() {
  const tbody = document.getElementById("divTable");
  tbody.innerHTML = "";

  const snap = await getDocs(collection(db, "portafoglio"));
  const rows = snap.docs.map(d => d.data());

  // Ordiniamo per dividendi maggiori
  rows.sort((a, b) => (b.dividendi || 0) - (a.dividendi || 0));

  rows.forEach(r => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${r.nome || ""}</td>
      <td>${(r.dividendi || 0).toFixed(2)} €</td>
      <td>${r.tipologia || ""}</td>
      <td>${(r.score || 0).toFixed(2)}</td>
    `;

    tbody.appendChild(tr);
  });
}

loadDividendi();
