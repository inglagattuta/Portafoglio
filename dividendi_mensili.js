// ===============================
// 📁 dividendi_mensili.js — VERSIONE PRONTA
// ===============================
import app, { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// ===============================
// ELEMENTI DOM
// ===============================
const tbody = () => document.getElementById("tbodyDividendiMese");
const addMonthBtn = () => document.getElementById("addMonthBtn");
const modalEl = () => document.getElementById("modalEditMonth");
const detailListEl = () => document.getElementById("detailList");
const ctxMensile = () => document.getElementById("dividendiBarChart");

let chartMensile = null;
let editId = null;
let editData = null;

// ===============================
// FUNZIONI
// ===============================

// Load mesi e tabella + grafico
async function loadMonths() {
  const tbodyEl = tbody();
  if (!tbodyEl) return;
  tbodyEl.innerHTML = "";

  try {
    const snap = await getDocs(collection(db, "dividendi_mensili"));
    const mesi = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // ordinamento per anno/mese
    mesi.sort((a, b) =>
      a.anno === b.anno ? String(a.mese).localeCompare(String(b.mese)) : a.anno - b.anno
    );

    // render grafico
    buildBarChart(mesi);

    // render tabella
    mesi.forEach(m => {
      const totale = (m.dettaglio || []).reduce((sum, r) => sum + Number(r.importo || 0), 0).toFixed(2);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${m.anno}</td>
        <td>${String(m.mese).padStart(2,"0")}</td>
        <td>${totale} €</td>
        <td>${(m.dettaglio || []).length} titoli</td>
        <td><button class="dashboard-btn" data-id="${m.id}">✏️ Modifica</button></td>
      `;
      tbodyEl.appendChild(tr);
    });

    // bind pulsanti modifica
    document.querySelectorAll("button[data-id]").forEach(btn =>
      btn.addEventListener("click", () => openEdit(btn.dataset.id))
    );
  } catch (err) {
    console.error("Errore loadMonths:", err);
  }
}

// Costruisci grafico barre mensile
function buildBarChart(mesi) {
  const canvas = ctxMensile();
  if (!canvas) return;

  const labels = mesi.map(m => `${m.anno}-${String(m.mese).padStart(2,"0")}`);
  const values = mesi.map(m => (m.dettaglio || []).reduce((s,r) => s + Number(r.importo || 0), 0));

  if (chartMensile) chartMensile.destroy();
  const ctx = canvas.getContext("2d");
  chartMensile = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ label: "Dividendi €", data: values }] },
    options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ y:{ beginAtZero:true } } }
  });
}

// Apri modal edit mese
async function openEdit(id) {
  try {
    const ref = doc(db, "dividendi_mensili", id);
    const snap = await getDoc(ref);
    editData = { id: snap.id, ...snap.data() };
    editId = id;

    if (!editData) return;

    document.getElementById("modalTitle").textContent = `Modifica ${editData.anno}-${String(editData.mese).padStart(2,"0")}`;
    document.getElementById("editYear").value = editData.anno;
    document.getElementById("editMonth").value = editData.mese;

    renderRows();
    modalEl().style.display = "flex";
  } catch (err) {
    console.error("Errore openEdit:", err);
  }
}

// Render righe dettaglio
function renderRows() {
  const detailList = detailListEl();
  if (!detailList || !editData) return;

  detailList.innerHTML = "";

  (editData.dettaglio || []).forEach((row, idx) => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.gap = "10px";
    div.style.marginBottom = "6px";

    div.innerHTML = `
      <input type="text" placeholder="Ticker" value="${row.ticker || ""}" data-row="${idx}" data-field="ticker">
      <input type="number" placeholder="Importo" value="${row.importo || 0}" data-row="${idx}" data-field="importo">
      <button class="dashboard-btn" data-del="${idx}">🗑</button>
    `;

    detailList.appendChild(div);
  });

  // input listener singolo
  detailList.querySelectorAll("input").forEach(inp => {
    inp.addEventListener("input", e => {
      const row = Number(e.target.dataset.row);
      const field = e.target.dataset.field;
      if (editData.dettaglio[row]) editData.dettaglio[row][field] = e.target.value;
    });
  });

  // delete buttons
  detailList.querySelectorAll("button[data-del]").forEach(btn =>
    btn.addEventListener("click", () => {
      editData.dettaglio.splice(Number(btn.dataset.del), 1);
      renderRows();
    })
  );
}

// Bind controlli modal e add month
function bindControls() {
  // Aggiungi riga dettaglio
  document.getElementById("addRow")?.addEventListener("click", () => {
    if (!editData) return;
    editData.dettaglio.push({ ticker: "", importo: 0 });
    renderRows();
  });

  // Salva mese
  document.getElementById("saveMonth")?.addEventListener("click", async () => {
    if (!editData || !editId) return;
    const ref = doc(db, "dividendi_mensili", editId);
    await updateDoc(ref, {
      anno: Number(document.getElementById("editYear").value),
      mese: String(document.getElementById("editMonth").value).padStart(2,"0"),
      dettaglio: editData.dettaglio
    });
    modalEl().style.display = "none";
    await loadMonths();
  });

  // Chiudi modal
  document.getElementById("closeModal")?.addEventListener("click", () => {
    modalEl().style.display = "none";
  });

  // Aggiungi nuovo mese
  addMonthBtn()?.addEventListener("click", async () => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2,"0");

      await addDoc(collection(db, "dividendi_mensili"), { anno: year, mese: month, dettaglio: [] });
      await loadMonths();
    } catch (err) {
      console.error("Errore addMonth:", err);
    }
  });
}

// ===============================
// STARTUP
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  bindControls();
  loadMonths();
});
