// main.js completo aggiornato con colori dinamici, score colorato e nuova struttura colonne

let tableData = [];

// ==========================
// IMPORTA EXCEL
// ==========================
export function importExcel(event) {
  const file = event.target.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    tableData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    renderTable(tableData);
    updateStats();
  };

  reader.readAsArrayBuffer(file);
}

// ==========================
// ESPORTA EXCEL
// ==========================
export function exportExcel() {
  const worksheet = XLSX.utils.json_to_sheet(tableData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Portfolio");
  XLSX.writeFile(workbook, "portfolio.xlsx");
}

// ==========================
// RENDER TABELLA
// ==========================
function renderTable(data) {
  const headerRow = document.getElementById("headerRow");
  const tableBody = document.getElementById("tableBody");

  headerRow.innerHTML = "";
  tableBody.innerHTML = "";

  if (data.length === 0) return;

  // nuove colonne richieste
  const orderedColumns = [
    "Tipologia",
    "Titolo",
    "Investito",
    "Corrente",
    "Dividendi",
    "Prelevato",
    "Profitto",
    "Score"
  ];

  orderedColumns.forEach(col => {
    const th = document.createElement("th");
    th.textContent = col;
    headerRow.appendChild(th);
  });

  data.forEach((row, rowIndex) => {
    const tr = document.createElement("tr");

    orderedColumns.forEach(col => {
      const td = document.createElement("td");
      let value = row[col] ?? "";

      // Formattazione numerica
      if (["Investito", "Corrente", "Dividendi", "Prelevato", "Profitto"].includes(col)) {
        value = parseFloat(value) || 0;
        td.textContent = value.toFixed(2) + " €";
      } else {
        td.textContent = value;
      }

      // --------------------------
      // COLORI DINAMICI PROFITTO
      // --------------------------
      if (col === "Profitto") {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          if (num > 0) td.classList.add("profit-positive");
          if (num < 0) td.classList.add("profit-negative");
        }
      }

      // --------------------------
      // COLORE SPECIALE SCORE
      // --------------------------
      if (col === "Score") {
        const score = parseFloat(value);
        if (!isNaN(score)) {
          if (score >= 75) td.classList.add("score-high");
          else if (score >= 50) td.classList.add("score-medium");
          else td.classList.add("score-low");
        }
      }

      tr.appendChild(td);
    });

    tableBody.appendChild(tr);
  });
}

// ==========================
// AGGIORNA CARD SUPERIORI
// ==========================
function updateStats() {
  let investito = 0;
  let attuale = 0;
  let dividendi = 0;
  let profitto = 0;

  tableData.forEach(row => {
    investito += parseFloat(row["Investito"]) || 0;
    attuale += parseFloat(row["Corrente"]) || 0;
    dividendi += parseFloat(row["Dividendi"]) || 0;
    profitto += parseFloat(row["Profitto"]) || 0;
  });

  document.getElementById("totInvestito").textContent = investito.toFixed(2) + " €";
  document.getElementById("valoreAttuale").textContent = attuale.toFixed(2) + " €";
  document.getElementById("totDividendi").textContent = dividendi.toFixed(2) + " €";
  document.getElementById("totProfitto").textContent = profitto.toFixed(2) + " €";
}
