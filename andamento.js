// -------------------------------------------------------------
// FIREBASE INIT
// -------------------------------------------------------------
import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  doc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// -------------------------------------------------------------
// DOM ELEMENTS
// -------------------------------------------------------------
const tableBody = document.getElementById("andamentoBody");

// Box riepilogo
const bxInv = document.getElementById("boxInvestito");
const bxGio = document.getElementById("boxGiornaliero");
const bxAzi = document.getElementById("boxAzioni");

// -------------------------------------------------------------
// FORMATTERS
// -------------------------------------------------------------
const fmtEuro = n => Number(n || 0).toFixed(2) + " €";

// -------------------------------------------------------------
// CARICAMENTO DATI
// -------------------------------------------------------------
async function loadAndamento() {
  tableBody.innerHTML = "";

  console.log("Carico dati da Firebase -> andamento...");

  const snap = await getDocs(collection(db, "andamento"));
  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (rows.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Nessun dato trovato</td></tr>`;
    return;
  }

  // Ordina per data crescente
  rows.sort((a, b) => a.id.localeCompare(b.id));

  let totInv = 0;
  let totGio = 0;
  let totAzi = 0;

  rows.forEach(row => {
    const tr = document.createElement("tr");

    const tdData = document.createElement("td");
    tdData.textContent = row.id;
    tr.appendChild(tdData);

    const tdInv = document.createElement("td");
    tdInv.textContent = fmtEuro(row.INVESTITO);
    tr.appendChild(tdInv);

    const tdGio = document.createElement("td");
    tdGio.textContent = fmtEuro(row.GIORNALIERO);
    tr.appendChild(tdGio);

    const tdAzi = document.createElement("td");
    tdAzi.textContent = fmtEuro(row.AZIONI);
    tr.appendChild(tdAzi);

    tableBody.appendChild(tr);

    totInv += Number(row.INVESTITO || 0);
    totGio += Number(row.GIORNALIERO || 0);
    totAzi += Number(row.AZIONI || 0);
  });

  // Aggiorna i box
  bxInv.textContent = fmtEuro(totInv);
  bxGio.textContent = fmtEuro(totGio);
  bxAzi.textContent = fmtEuro(totAzi);

  console.log("Caricamento completato (andamento).");
}

// -------------------------------------------------------------
// AVVIO
// -------------------------------------------------------------
loadAndamento();
