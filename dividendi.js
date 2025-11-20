import app from "./firebase-config.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const db = getFirestore(app);

// ===============================
// ELEMENTI DOM
// ===============================
const tbody = document.getElementById("tbodyDividendiMese");
const ctx = document.getElementById("dividendiBarChart");
let chartDividendiBar = null;


let editId = null;
let editData = null;

// ===============================
//  📊 COSTRUZIONE GRAFICO
// ===============================
function buildBarChart(mesi) {
  if (!ctx) return;

  const labels = mesi.map(m => `${m.anno}-${m.mese}`);
  const valori = mesi.map(m =>
    (m.dettaglio || []).reduce((sum, r) => sum + Number(r.importo || 0), 0)
  );

  if (chartDividendiBar) chartDividendiBar.destroy();

  chartDividendiBar = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Dividendi (€)",
          data: valori
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

// ===============================
// 1️⃣ CARICA LISTA MESI
// ===============================
async function loadMonths() {
  tbody.innerHTML = "";

  const snap = await getDocs(collection(db, "dividendi_mensili"));
  const mesi = [];

  snap.forEach(d => mesi.push({ id: d.id, ...d.data() }));

  mesi.sort((a, b) =>
    a.anno === b.anno ? a.mese.localeCompare(b.mese) : a.anno - b.anno
  );

  // 🔥 aggiorna grafico
  buildBarChart(mesi);

  // 🔥 render tabella
  mesi.forEach(m => {
    const totale = (m.dettaglio || [])
      .reduce((sum, r) => sum + Number(r.importo || 0), 0)
      .toFixed(2);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.anno}</td>
      <td>${m.mese}</td>
      <td>${totale} €</td>
      <td>${m.dettaglio?.length || 0} titoli</td>
      <td>
        <button class="dashboard-btn" data-id="${m.id}">✏️ Modifica</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // event per pulsanti modifica
  document.querySelectorAll("button[data-id]").forEach(btn => {
    btn.addEventListener("click", () => openEdit(btn.dataset.id));
  });
}

loadMonths();

// ===============================
// 2️⃣ MODAL — APRE UN MESE
// ===============================
const modal = document.getElementById("modalEditMonth");
const modalTitle = document.getElementById("modalTitle");
const detailList = document.getElementById("detailList");

async function openEdit(id) {
  editId = id;

  const snap = await getDocs(collection(db, "dividendi_mensili"));
  snap.forEach(d => {
    if (d.id === id) editData = { id: d.id, ...d.data() };
  });

  modalTitle.textContent = `Modifica ${editData.anno}-${editData.mese}`;

  document.getElementById("editYear").value = editData.anno;
  document.getElementById("editMonth").value = editData.mese;

  renderRows();
  modal.style.display = "flex";
}

// ===============================
// 3️⃣ RENDER RIGHE DETTAGLIO
// ===============================
function renderRows() {
  detailList.innerHTML = "";

  editData.dettaglio.forEach((row, idx) => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.gap = "10px";
    div.style.marginBottom = "6px";

    div.innerHTML = `
      <input type="text" value="${row.ticker}" data-row="${idx}" data-field="ticker">
      <input type="number" value="${row.importo}" data-row="${idx}" data-field="importo">
      <button class="dashboard-btn" data-del="${idx}">🗑</button>
    `;
    detailList.appendChild(div);
  });

  detailList.addEventListener("input", e => {
    const row = e.target.dataset.row;
    const field = e.target.dataset.field;
    if (row !== undefined) editData.dettaglio[row][field] = e.target.value;
  });

  detailList.querySelectorAll("button[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      editData.dettaglio.splice(btn.dataset.del, 1);
      renderRows();
    });
  });
}

// ===============================
// 4️⃣ AGGIUNGI RIGA
// ===============================
document.getElementById("addRow").addEventListener("click", () => {
  editData.dettaglio.push({ ticker: "", importo: 0 });
  renderRows();
});

// ===============================
// 5️⃣ SALVA MESE
// ===============================
document.getElementById("saveMonth").addEventListener("click", async () => {
  const ref = doc(db, "dividendi_mensili", editId);

  await updateDoc(ref, {
    anno: Number(document.getElementById("editYear").value),
    mese: document.getElementById("editMonth").value.padStart(2, "0"),
    dettaglio: editData.dettaglio
  });

  modal.style.display = "none";
  loadMonths();
});

// ===============================
// 6️⃣ CHIUDI MODAL
// ===============================
document.getElementById("closeModal").addEventListener("click", () => {
  modal.style.display = "none";
});
