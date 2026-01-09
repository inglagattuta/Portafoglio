// -------------------------------------------------------------
// FIREBASE INIT
// -------------------------------------------------------------
import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// -------------------------------------------------------------
// DOM
// -------------------------------------------------------------
const headerRow = document.getElementById("headerRow");
const tableBody = document.getElementById("tableBody");

const bxInvestito = document.getElementById("totInvestito");
const bxValore = document.getElementById("valoreAttuale");
const bxDividendi = document.getElementById("totDividendi");
const bxProfitto = document.getElementById("totProfitto");
const bxProfittoPerc = document.getElementById("totProfittoPerc");

// -------------------------------------------------------------
// SORT
// -------------------------------------------------------------
let sortColumn = null;
let sortDirection = 1; // 1 asc, -1 desc

// -------------------------------------------------------------
// BOTTONE REALTIME
// -------------------------------------------------------------
const controls = document.querySelector(".controls");

const btnRealtime = document.createElement("button");
btnRealtime.textContent = "🔄 Aggiorna Tempo Reale";
btnRealtime.className = "dashboard-btn";
btnRealtime.onclick = async () => {
  if (!confirm("Aggiornare i prezzi in tempo reale?")) return;
  await fetch("/api/update-realtime-prices", { method: "POST" });
  await loadData();
};

controls.appendChild(btnRealtime);

// -------------------------------------------------------------
// COLONNE
// -------------------------------------------------------------
const columns = [
  "tipologia",
  "nome",
  "prezzo_acquisto",
  "tempo_reale",
  "prezzo_corrente",
  "dividendi",
  "prelevato",
  "profitto",
  "score"
];

const labelMap = {
  tipologia: "Tipologia",
  nome: "Titolo",
  prezzo_acquisto: "Investito",
  tempo_reale: "Tempo Reale",
  prezzo_corrente: "Corrente",
  dividendi: "Dividendi",
  prelevato: "Prelevato",
  profitto: "Profitto",
  score: "Score"
};

const euroCols = new Set([
  "prezzo_acquisto",
  "prezzo_corrente",
  "dividendi",
  "prelevato",
  "tempo_reale"
]);

// -------------------------------------------------------------
// FORMAT
// -------------------------------------------------------------
const fmtEuro = v => Number(v || 0).toFixed(2) + " €";

// -------------------------------------------------------------
// HEADER (ORDINABILE)
// -------------------------------------------------------------
function renderHeader() {
  headerRow.innerHTML = "";

  columns.forEach(col => {
    const th = document.createElement("th");
    th.style.cursor = "pointer";
    th.textContent = labelMap[col] || col;

    if (sortColumn === col) {
      th.textContent += sortDirection === 1 ? " ▲" : " ▼";
    }

    th.onclick = () => {
      if (sortColumn === col) {
        sortDirection = -sortDirection;
      } else {
        sortColumn = col;
        sortDirection = 1;
      }
      loadData();
    };

    headerRow.appendChild(th);
  });

  const thA = document.createElement("th");
  thA.textContent = "Azioni";
  headerRow.appendChild(thA);
}

// -------------------------------------------------------------
// LOAD DATA
// -------------------------------------------------------------
async function loadData() {
  tableBody.innerHTML = "";
  renderHeader();

  const snap = await getDocs(collection(db, "portafoglio"));
  const snapAzioni = await getDocs(collection(db, "azioni"));

  const azioniMap = new Map();
  snapAzioni.docs.forEach(a => {
    const d = a.data();
    if (d.ticker) azioniMap.set(d.ticker.toUpperCase(), d);
  });

  let rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (sortColumn) {
    rows.sort((a, b) => {
      const va = a[sortColumn] ?? 0;
      const vb = b[sortColumn] ?? 0;

      if (!isNaN(va) && !isNaN(vb)) {
        return (va - vb) * sortDirection;
      }
      return String(va).localeCompare(String(vb)) * sortDirection;
    });
  }

  let totInvestito = 0;
  let totValore = 0;
  let totDividendi = 0;
  let totProfitto = 0;

  rows.forEach(d => {
    const tr = document.createElement("tr");
    const az = azioniMap.get((d.nome || "").toUpperCase());

    columns.forEach(col => {
      const td = document.createElement("td");
      td.style.textAlign = "center";

      // TEMPO REALE
      if (col === "tempo_reale") {
        let valore = 0;
        if (az && az.investito && az.prezzo_medio && az.prezzo_corrente) {
          const qty = az.investito / az.prezzo_medio;
          valore = qty * az.prezzo_corrente;
        }
        td.textContent = fmtEuro(valore);
        totValore += valore;
      }

      // PROFITTO
      else if (col === "profitto") {
        const p =
          (d.prezzo_corrente || 0) -
          (d.prezzo_acquisto || 0) +
          (d.dividendi || 0) +
          (d.prelevato || 0);
        td.textContent = fmtEuro(p);
        totProfitto += p;
      }

      // SCORE
      else if (col === "score") {
        const v = Number(d.score || 0);
        td.textContent = v.toFixed(2);
        td.classList.remove("score-high", "score-medium", "score-low");

        if (v >= 12) td.classList.add("score-high");
        else if (v >= 8) td.classList.add("score-medium");
        else td.classList.add("score-low");
      }

      // EURO
      else if (euroCols.has(col)) {
        const v = Number(d[col] || 0);
        td.textContent = fmtEuro(v);
        if (col === "prezzo_acquisto") totInvestito += v;
        if (col === "dividendi") totDividendi += v;
      }

      else {
        td.textContent = d[col] ?? "";
      }

      tr.appendChild(td);
    });

    // AZIONI
    const tdA = document.createElement("td");
    tdA.className = "action-buttons";

    const btE = document.createElement("button");
    btE.textContent = "Modifica";
    btE.className = "btn-edit";
    btE.onclick = () => openEditModal(d.id);

    const btD = document.createElement("button");
    btD.textContent = "Elimina";
    btD.className = "btn-delete";
    btD.onclick = async () => {
      if (!confirm("Confermi eliminazione?")) return;
      await deleteDoc(doc(db, "portafoglio", d.id));
      loadData();
    };

    tdA.append(btE, btD);
    tr.appendChild(tdA);
    tableBody.appendChild(tr);
  });

  bxInvestito.textContent = fmtEuro(totInvestito);
  bxValore.textContent = fmtEuro(totValore);
  bxDividendi.textContent = fmtEuro(totDividendi);
  bxProfitto.textContent = fmtEuro(totProfitto);
  bxProfittoPerc.textContent =
    totInvestito > 0
      ? ((totProfitto / totInvestito) * 100).toFixed(2) + " %"
      : "0 %";
}

// -------------------------------------------------------------
// MODAL
// -------------------------------------------------------------
let modalEl = null;

function ensureModal() {
  if (modalEl) return modalEl;

  modalEl = document.createElement("div");
  modalEl.id = "editModal";
  modalEl.className = "modal-overlay";
  modalEl.style.display = "none";

  modalEl.innerHTML = `
    <div class="modal-card">
      <h3>Modifica Titolo</h3>
      <div id="modalFields"></div>
      <div class="modal-buttons">
        <button id="modalSave" class="btn-save">Salva</button>
        <button id="modalClose" class="btn-cancel">Annulla</button>
      </div>
    </div>
  `;

  document.body.appendChild(modalEl);
  modalEl.querySelector("#modalClose").onclick = () => modalEl.style.display = "none";
  return modalEl;
}

async function openEditModal(id) {
  const ref = doc(db, "portafoglio", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return alert("Record non trovato");

  const data = snap.data();
  const modal = ensureModal();
  const fields = modal.querySelector("#modalFields");
  fields.innerHTML = "";

  ["prezzo_acquisto","prezzo_corrente","dividendi","prelevato","score"].forEach(f => {
    const label = document.createElement("label");
    label.textContent = f.replaceAll("_"," ").toUpperCase();
    const input = document.createElement("input");
    input.type = "number";
    input.step = "0.01";
    input.id = "fld_" + f;
    input.value = data[f] ?? "";
    fields.append(label, input);
  });

  modal.style.display = "flex";

  modal.querySelector("#modalSave").onclick = async () => {
    const updated = { ...data };
    ["prezzo_acquisto","prezzo_corrente","dividendi","prelevato","score"].forEach(f => {
      updated[f] = Number(document.getElementById("fld_" + f).value || 0);
    });

    updated.profitto =
      updated.prezzo_corrente -
      updated.prezzo_acquisto +
      updated.dividendi +
      updated.prelevato;

    await updateDoc(ref, updated);
    modal.style.display = "none";
    loadData();
  };
}

// -------------------------------------------------------------
loadData();
