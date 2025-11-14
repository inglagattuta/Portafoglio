<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard Portafoglio</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
    }

    .header h1 {
      font-size: 28px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .controls {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-primary {
      background: white;
      color: #667eea;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    }

    .btn-success {
      background: #10b981;
      color: white;
    }

    .btn-success:hover {
      background: #059669;
    }

    .btn-danger {
      background: #ef4444;
      color: white;
      padding: 8px 16px;
      font-size: 12px;
    }

    .btn-danger:hover {
      background: #dc2626;
    }

    .btn-edit {
      background: #3b82f6;
      color: white;
      padding: 8px 16px;
      font-size: 12px;
    }

    .btn-edit:hover {
      background: #2563eb;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #f9fafb;
    }

    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .stat-card h3 {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 8px;
    }

    .stat-card .value {
      font-size: 24px;
      font-weight: bold;
      color: #1f2937;
    }

    .table-container {
      padding: 30px;
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
    }

    th {
      background: #f3f4f6;
      padding: 15px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
      cursor: pointer;
      user-select: none;
      position: relative;
    }

    th:hover {
      background: #e5e7eb;
    }

    th::after {
      content: '⇅';
      position: absolute;
      right: 10px;
      opacity: 0.3;
    }

    td {
      padding: 15px;
      border-bottom: 1px solid #e5e7eb;
    }

    tr:hover {
      background: #f9fafb;
    }

    .positive {
      color: #10b981;
      font-weight: 600;
    }

    .negative {
      color: #ef4444;
      font-weight: 600;
    }

    .actions {
      display: flex;
      gap: 8px;
    }

    /* Modal */
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }

    .modal.active {
      display: flex;
    }

    .modal-content {
      background: white;
      border-radius: 16px;
      padding: 30px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from {
        transform: translateY(-50px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .modal-header h2 {
      color: #1f2937;
    }

    .close {
      font-size: 28px;
      cursor: pointer;
      color: #6b7280;
    }

    .close:hover {
      color: #1f2937;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      color: #374151;
      font-weight: 600;
    }

    .form-group input, .form-group select {
      width: 100%;
      padding: 12px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
      transition: border 0.3s;
    }

    .form-group input:focus, .form-group select:focus {
      outline: none;
      border-color: #667eea;
    }

    .form-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 30px;
    }

    .loading {
      display: none;
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      z-index: 2000;
    }

    .loading.active {
      display: block;
    }

    .spinner {
      border: 4px solid #f3f4f6;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 15px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .notification {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      z-index: 3000;
      animation: slideInRight 0.3s ease;
      display: none;
    }

    .notification.active {
      display: block;
    }

    .notification.success {
      background: #10b981;
    }

    .notification.error {
      background: #ef4444;
    }

    @keyframes slideInRight {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    input[type="file"] {
      display: none;
    }

    .filter-section {
      padding: 20px 30px;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      align-items: center;
    }

    .filter-section label {
      font-weight: 600;
      color: #374151;
    }

    .filter-section select, .filter-section input {
      padding: 8px 12px;
      border: 2px solid #e5e7eb;
      border-radius: 6px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>
        <span>📊</span>
        Dashboard Portafoglio
      </h1>
      <div class="controls">
        <button class="btn btn-primary" onclick="openAddModal()">
          ➕ Aggiungi
        </button>
        <button class="btn btn-success" onclick="exportExcel()">
          📥 Esporta Excel
        </button>
        <label for="fileInput" class="btn btn-success">
          📤 Importa Excel
        </label>
        <input type="file" id="fileInput" accept=".xlsx,.xls" onchange="importExcel(event)">
      </div>
    </div>

    <div class="stats">
      <div class="stat-card">
        <h3>Valore Totale</h3>
        <div class="value" id="totalValue">€0.00</div>
      </div>
      <div class="stat-card">
        <h3>Profitto Totale</h3>
        <div class="value" id="totalProfit">€0.00</div>
      </div>
      <div class="stat-card">
        <h3>Rendimento %</h3>
        <div class="value" id="totalReturn">0.00%</div>
      </div>
      <div class="stat-card">
        <h3>N° Investimenti</h3>
        <div class="value" id="totalInvestments">0</div>
      </div>
    </div>

    <div class="filter-section">
      <label>Filtra per tipologia:</label>
      <select id="filterType" onchange="applyFilters()">
        <option value="">Tutte</option>
        <option value="Azioni">Azioni</option>
        <option value="ETF">ETF</option>
        <option value="Crypto">Crypto</option>
        <option value="Obbligazioni">Obbligazioni</option>
      </select>
      
      <label>Ordina per:</label>
      <select id="sortBy" onchange="applyFilters()">
        <option value="nome">Nome</option>
        <option value="profitto">Profitto</option>
        <option value="score">Score</option>
        <option value="prezzo_corrente">Prezzo Corrente</option>
      </select>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr id="headerRow"></tr>
        </thead>
        <tbody id="tableBody"></tbody>
      </table>
    </div>
  </div>

  <!-- Modal -->
  <div class="modal" id="editModal">
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="modalTitle">Modifica Record</h2>
        <span class="close" onclick="closeModal()">&times;</span>
      </div>
      <form id="editForm">
        <div class="form-group">
          <label>Tipologia</label>
          <select id="edit_tipologia" required>
            <option value="Azioni">Azioni</option>
            <option value="ETF">ETF</option>
            <option value="Crypto">Crypto</option>
            <option value="Obbligazioni">Obbligazioni</option>
          </select>
        </div>
        <div class="form-group">
          <label>Nome</label>
          <input type="text" id="edit_nome" required>
        </div>
        <div class="form-group">
          <label>Prezzo Acquisto (€)</label>
          <input type="number" step="0.01" id="edit_prezzo_acquisto" required>
        </div>
        <div class="form-group">
          <label>Prezzo Corrente (€)</label>
          <input type="number" step="0.01" id="edit_prezzo_corrente" required>
        </div>
        <div class="form-group">
          <label>Dividendi (€)</label>
          <input type="number" step="0.01" id="edit_dividendi" value="0">
        </div>
        <div class="form-group">
          <label>Prelevato (€)</label>
          <input type="number" step="0.01" id="edit_prelevato" value="0">
        </div>
        <div class="form-group">
          <label>Percentuale 12 Mesi (%)</label>
          <input type="number" step="0.01" id="edit_percentuale_12_mesi" value="0">
        </div>
        <div class="form-group">
          <label>Rendimento Percentuale (%)</label>
          <input type="number" step="0.01" id="edit_rendimento_percentuale" value="0">
        </div>
        <div class="form-group">
          <label>Payback (anni)</label>
          <input type="number" step="0.1" id="edit_payback" value="0">
        </div>
        <div class="form-group">
          <label>Score</label>
          <input type="number" step="0.01" id="edit_score" value="0">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-primary" onclick="closeModal()">Annulla</button>
          <button type="submit" class="btn btn-success">Salva</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Loading -->
  <div class="loading" id="loading">
    <div class="spinner"></div>
    <div>Caricamento...</div>
  </div>

  <!-- Notification -->
  <div class="notification" id="notification"></div>

  <script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
    import {
      getFirestore,
      collection,
      getDocs,
      getDoc,
      setDoc,
      doc,
      deleteDoc,
    } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

    const firebaseConfig = {
      apiKey: "AIzaSyBhDoRKmRffrjO-WvVjgX3K7JdfPaM7MGk",
      authDomain: "portafoglio-dashboard.firebaseapp.com",
      projectId: "portafoglio-dashboard",
      storageBucket: "portafoglio-dashboard.firebasestorage.app",
      messagingSenderId: "194509041146",
      appId: "1:194509041146:web:aa943d555dc067f7110843"
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    let allData = [];
    let currentEditId = null;

    const columns = [
      "tipologia",
      "nome",
      "prezzo_acquisto",
      "prezzo_corrente",
      "dividendi",
      "prelevato",
      "profitto",
      "percentuale_12_mesi",
      "rendimento_percentuale",
      "payback",
      "percentuale_portafoglio",
      "score",
    ];

    const columnLabels = {
      tipologia: "Tipologia",
      nome: "Nome",
      prezzo_acquisto: "Prezzo Acquisto",
      prezzo_corrente: "Prezzo Corrente",
      dividendi: "Dividendi",
      prelevato: "Prelevato",
      profitto: "Profitto",
      percentuale_12_mesi: "% 12 Mesi",
      rendimento_percentuale: "Rendimento %",
      payback: "Payback",
      percentuale_portafoglio: "% Portafoglio",
      score: "Score",
    };

    // Utility Functions
    function showLoading() {
      document.getElementById('loading').classList.add('active');
    }

    function hideLoading() {
      document.getElementById('loading').classList.remove('active');
    }

    function showNotification(message, type = 'success') {
      const notification = document.getElementById('notification');
      notification.textContent = message;
      notification.className = `notification ${type} active`;
      setTimeout(() => {
        notification.classList.remove('active');
      }, 3000);
    }

    function formatCurrency(value) {
      return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR'
      }).format(value);
    }

    function formatPercentage(value) {
      return `${Number(value).toFixed(2)}%`;
    }

    // Render Functions
    function renderHeader() {
      const headerRow = document.getElementById("headerRow");
      headerRow.innerHTML = "";
      
      columns.forEach((col) => {
        const th = document.createElement('th');
        th.textContent = columnLabels[col];
        th.onclick = () => sortTable(col);
        headerRow.appendChild(th);
      });
      
      const actionsHeader = document.createElement('th');
      actionsHeader.textContent = 'Azioni';
      headerRow.appendChild(actionsHeader);
    }

    function renderTable(data) {
      const tableBody = document.getElementById("tableBody");
      tableBody.innerHTML = "";

      data.forEach((item) => {
        const tr = document.createElement("tr");

        columns.forEach((col) => {
          const td = document.createElement("td");
          let value = item[col] ?? 0;

          if (col === "profitto") {
            td.textContent = formatCurrency(value);
            td.className = value > 0 ? "positive" : value < 0 ? "negative" : "";
          } else if (col.includes("percentuale") || col.includes("rendimento")) {
            td.textContent = formatPercentage(value);
          } else if (col.includes("prezzo") || col === "dividendi" || col === "prelevato") {
            td.textContent = formatCurrency(value);
          } else if (col === "score") {
            td.textContent = Number(value).toFixed(2);
          } else {
            td.textContent = value;
          }

          tr.appendChild(td);
        });

        const actionsTd = document.createElement("td");
        actionsTd.className = "actions";
        actionsTd.innerHTML = `
          <button class="btn btn-edit" onclick="window.editRecord('${item.id}')">✏️ Modifica</button>
          <button class="btn btn-danger" onclick="window.deleteRecord('${item.id}')">🗑️ Cancella</button>
        `;
        tr.appendChild(actionsTd);

        tableBody.appendChild(tr);
      });

      updateStats(data);
    }

    function updateStats(data) {
      const totalValue = data.reduce((sum, item) => sum + Number(item.prezzo_corrente || 0), 0);
      const totalProfit = data.reduce((sum, item) => sum + Number(item.profitto || 0), 0);
      const totalInvested = data.reduce((sum, item) => sum + Number(item.prezzo_acquisto || 0), 0);
      const totalReturn = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

      document.getElementById('totalValue').textContent = formatCurrency(totalValue);
      document.getElementById('totalProfit').textContent = formatCurrency(totalProfit);
      document.getElementById('totalProfit').className = totalProfit > 0 ? 'value positive' : totalProfit < 0 ? 'value negative' : 'value';
      document.getElementById('totalReturn').textContent = formatPercentage(totalReturn);
      document.getElementById('totalInvestments').textContent = data.length;
    }

    // Load Data
    async function loadData() {
      try {
        showLoading();
        const querySnapshot = await getDocs(collection(db, "portafoglio"));
        allData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        
        renderHeader();
        applyFilters();
        hideLoading();
      } catch (error) {
        console.error("Errore caricamento dati:", error);
        showNotification("Errore nel caricamento dei dati", "error");
        hideLoading();
      }
    }

    // Filter and Sort
    function applyFilters() {
      const filterType = document.getElementById('filterType').value;
      const sortBy = document.getElementById('sortBy').value;

      let filteredData = [...allData];

      if (filterType) {
        filteredData = filteredData.filter(item => item.tipologia === filterType);
      }

      filteredData.sort((a, b) => {
        const aVal = Number(a[sortBy]) || a[sortBy] || 0;
        const bVal = Number(b[sortBy]) || b[sortBy] || 0;
        
        if (typeof aVal === 'string') {
          return aVal.localeCompare(bVal);
        }
        return bVal - aVal;
      });

      renderTable(filteredData);
    }

    function sortTable(column) {
      allData.sort((a, b) => {
        const aVal = Number(a[column]) || a[column] || 0;
        const bVal = Number(b[column]) || b[column] || 0;
        
        if (typeof aVal === 'string') {
          return aVal.localeCompare(bVal);
        }
        return bVal - aVal;
      });
      
      applyFilters();
    }

    // Modal Functions
    window.openAddModal = function() {
      currentEditId = null;
      document.getElementById('modalTitle').textContent = 'Aggiungi Nuovo Record';
      document.getElementById('editForm').reset();
      document.getElementById('editModal').classList.add('active');
    };

    window.editRecord = async function(id) {
      try {
        showLoading();
        const docRef = doc(db, "portafoglio", id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          showNotification("Record non trovato", "error");
          hideLoading();
          return;
        }

        const data = docSnap.data();
        currentEditId = id;

        document.getElementById('modalTitle').textContent = 'Modifica Record';
        document.getElementById('edit_tipologia').value = data.tipologia || '';
        document.getElementById('edit_nome').value = data.nome || '';
        document.getElementById('edit_prezzo_acquisto').value = data.prezzo_acquisto || 0;
        document.getElementById('edit_prezzo_corrente').value = data.prezzo_corrente || 0;
        document.getElementById('edit_dividendi').value = data.dividendi || 0;
        document.getElementById('edit_prelevato').value = data.prelevato || 0;
        document.getElementById('edit_percentuale_12_mesi').value = data.percentuale_12_mesi || 0;
        document.getElementById('edit_rendimento_percentuale').value = data.rendimento_percentuale || 0;
        document.getElementById('edit_payback').value = data.payback || 0;
        document.getElementById('edit_score').value = data.score || 0;

        document.getElementById('editModal').classList.add('active');
        hideLoading();
      } catch (error) {
        console.error("Errore modifica:", error);
        showNotification("Errore nel caricamento del record", "error");
        hideLoading();
      }
    };

    window.closeModal = function() {
      document.getElementById('editModal').classList.remove('active');
      currentEditId = null;
    };

    // Form Submit
    document.getElementById('editForm').addEventListener('submit', async function(e) {
      e.preventDefault();

      try {
        showLoading();

        const data = {
          tipologia: document.getElementById('edit_tipologia').value,
          nome: document.getElementById('edit_nome').value,
          prezzo_acquisto: Number(document.getElementById('edit_prezzo_acquisto').value),
          prezzo_corrente: Number(document.getElementById('edit_prezzo_corrente').value),
          dividendi: Number(document.getElementById('edit_dividendi').value),
          prelevato: Number(document.getElementById('edit_prelevato').value),
          percentuale_12_mesi: Number(document.getElementById('edit_percentuale_12_mesi').value),
          rendimento_percentuale: Number(document.getElementById('edit_rendimento_percentuale').value),
          payback: Number(document.getElementById('edit_payback').value),
          score: Number(document.getElementById('edit_score').value),
        };

        data.profitto = data.prezzo_corrente - data.prezzo_acquisto + data.dividendi + data.prelevato;

        const docId = currentEditId || data.nome.replace(/\s+/g, '_');
        await setDoc(doc(db, "portafoglio", docId), data);

        closeModal();
        await loadData();
        showNotification(currentEditId ? "Record aggiornato con successo!" : "Record aggiunto con successo!");
        hideLoading();
      } catch (error) {
        console.error("Errore salvataggio:", error);
        showNotification("Errore nel salvataggio", "error");
        hideLoading();
      }
    });

    // Delete Record
    window.deleteRecord = async function(id) {
      if (!confirm("Sei sicuro di voler cancellare questo record?")) return;

      try {
        showLoading();
        await deleteDoc(doc(db, "portafoglio", id));
        await loadData();
        showNotification("Record cancellato con successo!");
        hideLoading();
      } catch (error) {
        console.error("Errore cancellazione:", error);
        showNotification("Errore nella cancellazione", "error");
        hideLoading();
      }
    };

    // Export Excel
    window.exportExcel = async function() {
      try {
        showLoading();
        const workbook = XLSX.utils.book_new();
        const exportData = allData.map(item => {
          const { id, ...rest } = item;
          return rest;
        });

        const sheet = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(workbook, sheet, "Portafoglio");
        XLSX.writeFile(workbook, `portafoglio_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        showNotification("Excel esportato con successo!");
        hideLoading();
      } catch (error) {
        console.error("Errore export:", error);
        showNotification("Errore nell'esportazione", "error");
        hideLoading();
      }
    };

    // Import Excel
    window.importExcel = async function(event) {
      const file = event.target.files[0];
      if (!file) return;

      try {
        showLoading();
        const reader = new FileReader();
        
        reader.onload = async function(e) {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet);

            for (const row of json) {
              const id = row.nome ? row.nome.replace(/\s+/g, '_') : `record_${Date.now()}`;
              await setDoc(doc(db, "portafoglio", id), row, { merge: true });
            }

            await loadData();
            showNotification(`${json.length} record importati con successo!`);
            hideLoading();
          } catch (error) {
            console.error("Errore parsing Excel:", error);
            showNotification("Errore nel parsing del file Excel", "error");
            hideLoading();
          }
        };

        reader.readAsArrayBuffer(file);
      } catch (error) {
        console.error("Errore import:", error);
        showNotification("Errore nell'importazione", "error");
        hideLoading();
      }

      event.target.value = '';
    };

    // Make applyFilters globally accessible
    window.applyFilters = applyFilters;

    // Initialize
    loadData();
  </script>
</body>
</html>
