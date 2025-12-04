<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portafoglio Investimenti</title>

  <!-- STILI -->
  <link rel="stylesheet" href="style.css">

  <!-- ICONA (opzionale) -->
  <link rel="icon" href="favicon.png">

  <!-- CHART.JS -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body data-theme="light">
  <div class="container">
    <!-- HEADER -->
    <header>
      <div class="header-top">
        <div>
          <h1>Portafoglio Investimenti</h1>
          <p class="subtitle">Dashboard personale con andamento, rischio e dividendi</p>
        </div>

        <div class="theme-toggle">
          <span>Chiaro</span>
          <label class="switch">
            <input type="checkbox" id="themeToggle">
            <span class="slider"></span>
          </label>
          <span>Scuro</span>
        </div>
      </div>
    </header>

    <!-- STATISTICHE PRINCIPALI -->
    <section class="stats-grid" aria-label="Statistiche portafoglio">
      <div class="stat-card">
        <div class="stat-label">Valore Totale Portafoglio</div>
        <div class="stat-value" id="statValoreTotale">€ 0</div>
        <div class="stat-subvalue" id="statValoreIniziale">Investito iniziale: € 0</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Profit / Loss</div>
        <div class="stat-value" id="statPL">€ 0</div>
        <div class="stat-subvalue" id="statPLPerc">0%</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Dividendi Annuali</div>
        <div class="stat-value" id="statDividendi">€ 0</div>
        <div class="stat-subvalue" id="statYieldOnCost">Yield on cost: 0%</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Score / Rischio</div>
        <div class="stat-value" id="statRischio">–</div>
        <div class="stat-subvalue" id="statScoreMedio">Score medio: –</div>
      </div>
    </section>

    <!-- CONTROLLI -->
    <section aria-label="Controlli portafoglio">
      <div class="controls">
        <button id="btnAdd">
          ➕ Nuovo titolo
        </button>

        <button class="export-btn" id="btnExport">
          📤 Esporta dati
        </button>

        <button id="btnImportJson">
          📥 Importa JSON
        </button>

        <a href="https://inglagattuta.github.io/Portafoglio/dashboard.html"
           class="dashboard-btn" target="_blank" rel="noopener">
          📊 Dashboard
        </a>
      </div>

      <div class="filter-group">
        <input type="text" id="searchInput" placeholder="Cerca per ticker o nome...">
        <select id="typeFilter">
          <option value="">Tutti i tipi</option>
          <option value="Azione">Azione</option>
          <option value="ETF">ETF</option>
          <option value="Cripto">Cripto</option>
        </select>
      </div>

      <div class="sort-group">
        <button class="sort-btn" data-sort="valoreAttuale">
          Valore attuale
          <span class="sort-indicator">↕</span>
        </button>
        <button class="sort-btn" data-sort="profitto">
          Profitto
          <span class="sort-indicator">↕</span>
        </button>
        <button class="sort-btn" data-sort="rendimentoPerc">
          Rendimento %
          <span class="sort-indicator">↕</span>
        </button>
        <button class="sort-btn" data-sort="score">
          Score
          <span class="sort-indicator">↕</span>
        </button>
      </div>
    </section>

    <!-- MINI-CARDS -->
    <section class="mini-cards" aria-label="Riassunto rapido">
      <div class="mini-card">
        <h3>Titoli in portafoglio</h3>
        <p id="miniTitoli">0</p>
      </div>
      <div class="mini-card">
        <h3>Percentuale investito</h3>
        <p id="miniPercInvestito">0%</p>
      </div>
      <div class="mini-card">
        <h3>Rendimento 12 mesi</h3>
        <p id="mini12Mesi">0%</p>
      </div>
      <div class="mini-card">
        <h3>Payback medio</h3>
        <p id="miniPayback">0%</p>
      </div>
    </section>

    <!-- TABELLA PORTAFOGLIO -->
    <section aria-label="Dettaglio posizioni">
      <div class="table-container">
        <table id="portfolioTable">
          <thead>
            <tr>
              <th class="sortable" data-key="tipologia">Tipo</th>
              <th class="sortable" data-key="ticker">Titolo</th>
              <th class="sortable" data-key="investito">Investito</th>
              <th class="sortable" data-key="valoreAttuale">Corrente</th>
              <th class="sortable" data-key="dividendi">Dividendi</th>
              <th class="sortable" data-key="prelevato">Prelevato</th>
              <th class="sortable" data-key="profitto">Profitto</th>
              <th class="sortable" data-key="score">Score</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody id="portfolioBody">
            <!-- righe via JS -->
          </tbody>
        </table>
      </div>
    </section>

    <!-- DIVIDENDI -->
    <section class="dividendi-container" aria-label="Dividendi">
      <div class="toggle-wrapper">
        <button class="toggle-button active" id="toggleDividendiTitoli">Per titolo</button>
        <button class="toggle-button" id="toggleDividendiMese">Per mese</button>
      </div>

      <div class="dividendi-layout">
        <div class="dividendi-left">
          <h2>Dividendi per titolo</h2>
          <div class="cards-grid" id="dividendiPerTitolo">
            <!-- cards via JS -->
          </div>
        </div>

        <div class="dividendi-right">
          <h2>Dividendi mensili (simulati)</h2>
          <div class="table-responsive">
            <table id="dividendiMeseTable">
              <thead>
                <tr>
                  <th>Mese</th>
                  <th>Totale</th>
                </tr>
              </thead>
              <tbody id="dividendiMeseBody">
                <!-- righe via JS -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <!-- GRAFICI -->
    <section class="charts-grid" aria-label="Grafici portafoglio">
      <div class="chart-card">
        <h2>Allocazione per tipologia</h2>
        <canvas id="chartAllocazione"></canvas>
      </div>
      <div class="chart-card">
        <h2>Investito vs Corrente</h2>
        <canvas id="chartPerformance"></canvas>
      </div>
      <div class="chart-card">
        <h2>Top 10 per peso</h2>
        <canvas id="chartTop10"></canvas>
      </div>
    </section>
  </div>

  <!-- MODALE MODIFICA -->
  <div id="editModal" class="modal-overlay" style="display:none;">
    <div class="modal-card">
      <h3>Modifica posizione</h3>

      <label for="modalTicker">Ticker</label>
      <input type="text" id="modalTicker" readonly>

      <label for="modalInvestito">Investito</label>
      <input type="number" id="modalInvestito" step="0.01">

      <label for="modalCorrente">Corrente</label>
      <input type="number" id="modalCorrente" step="0.01">

      <label for="modalDividendi">Dividendi totali</label>
      <input type="number" id="modalDividendi" step="0.01">

      <label for="modalPrelevato">Prelevato</label>
      <input type="number" id="modalPrelevato" step="0.01">

      <label for="modalScore">Score</label>
      <input type="number" id="modalScore" step="0.01">

      <div class="modal-buttons">
        <button id="modalSave">Salva</button>
        <button id="modalClose">Chiudi</button>
      </div>
    </div>
  </div>

  <!-- SCRIPT APP + FIREBASE -->
  <script type="module">
    import app, { db } from "./firebase-config.js";
    import {
      collection,
      onSnapshot,
      doc,
      updateDoc,
      deleteDoc
    } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

    // THEME
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;

    function applyTheme(theme) {
      body.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
      themeToggle.checked = theme === 'dark';
    }

    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    themeToggle.addEventListener('change', () => {
      applyTheme(themeToggle.checked ? 'dark' : 'light');
    });

    // DATI
    let portfolioData = [];
    const colRef = collection(db, "portafoglio");

    // FORMATTERS
    function formatCurrency(value) {
      return '€ ' + Number(value || 0).toLocaleString('it-IT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }

    function formatPerc(v) {
      return Number(v || 0).toFixed(2) + '%';
    }

    // RENDER TABELLA
    const tbody = document.getElementById('portfolioBody');

    function renderTable(data) {
      tbody.innerHTML = '';

      data.forEach(row => {
        const tr = document.createElement('tr');

        const plClass =
          row.profitto > 0 ? 'profit-positive' :
          row.profitto < 0 ? 'profit-negative' :
          'profit-neutral';

        let scoreClass = 'score-low';
        if (row.score >= 70) scoreClass = 'score-high';
        else if (row.score >= 40) scoreClass = 'score-medium';

        tr.innerHTML = `
          <td>${row.tipologia}</td>
          <td>${row.ticker}</td>
          <td>${formatCurrency(row.investito)}</td>
          <td>${formatCurrency(row.valoreAttuale)}</td>
          <td>${formatCurrency(row.dividendi)}</td>
          <td>${formatCurrency(row.prelevato)}</td>
          <td class="${plClass}">
            ${formatCurrency(row.profitto)} (${formatPerc(row.rendimentoPerc * 100)})
          </td>
          <td class="score-cell ${scoreClass}">
            ${row.score.toFixed(2)}
          </td>
          <td>
            <div class="action-buttons">
              <button class="btn-edit" data-id="${row.id}">Modifica</button>
              <button class="btn-delete" data-id="${row.id}">Cancella</button>
            </div>
          </td>
        `;

        tbody.appendChild(tr);
      });

      attachRowActions();
      updateStats(data);
      updateMiniCards(data);
      updateDividendi(data);
      updateCharts(data);
    }

    // STATS GLOBALI
    function updateStats(data) {
      let investitoTot = 0;
      let valoreTot = 0;
      let dividendiTot = 0;
      let prelevatoTot = 0;
      let scoreSomma = 0;
      let scoreCount = 0;

      data.forEach(r => {
        investitoTot += r.investito;
        valoreTot += r.valoreAttuale;
        dividendiTot += r.dividendi;
        prelevatoTot += r.prelevato;
        if (!isNaN(r.score)) {
          scoreSomma += r.score;
          scoreCount++;
        }
      });

      const profittoTot = valoreTot + prelevatoTot + dividendiTot - investitoTot;
      const plPerc = investitoTot ? (profittoTot / investitoTot) * 100 : 0;
      const yoc = investitoTot ? (dividendiTot / investitoTot) * 100 : 0;
      const scoreMedio = scoreCount ? scoreSomma / scoreCount : 0;

      document.getElementById('statValoreTotale').textContent = formatCurrency(valoreTot);
      document.getElementById('statValoreIniziale').textContent = 'Investito iniziale: ' + formatCurrency(investitoTot);
      document.getElementById('statPL').textContent = formatCurrency(profittoTot);
      document.getElementById('statPLPerc').textContent = plPerc.toFixed(2) + '%';
      document.getElementById('statDividendi').textContent = formatCurrency(dividendiTot);
      document.getElementById('statYieldOnCost').textContent = 'Yield on cost: ' + yoc.toFixed(2) + '%';
      document.getElementById('statRischio').textContent = scoreMedio.toFixed(2);
      document.getElementById('statScoreMedio').textContent = 'Score medio: ' + scoreMedio.toFixed(2);
    }

    function updateMiniCards(data) {
      const titoli = data.length;
      let percPortafoglio = 0;
      let perc12Mesi = 0;
      let payback = 0;

      data.forEach(r => {
        percPortafoglio += r.percentualePortafoglio;
        perc12Mesi += r.percentuale12Mesi;
        payback += r.payback;
      });

      const paybackMedio = titoli ? payback / titoli : 0;

      document.getElementById('miniTitoli').textContent = titoli;
      document.getElementById('miniPercInvestito').textContent = (percPortafoglio * 100).toFixed(2) + '%';
      document.getElementById('mini12Mesi').textContent = (perc12Mesi * 100).toFixed(2) + '%';
      document.getElementById('miniPayback').textContent = (paybackMedio * 100).toFixed(2) + '%';
    }

    // DIVIDENDI
    function updateDividendi(data) {
      const perTitoloContainer = document.getElementById('dividendiPerTitolo');
      const meseBody = document.getElementById('dividendiMeseBody');

      perTitoloContainer.innerHTML = '';
      meseBody.innerHTML = '';

      data.forEach(r => {
        if (!r.dividendi) return;
        const card = document.createElement('div');
        card.className = 'card-item';
        card.innerHTML = `
          <div class="card-header">
            <div class="card-title">${r.ticker}</div>
            <div class="card-badge">${formatPerc(r.rendimentoPerc * 100)}</div>
          </div>
          <div class="card-body">
            <div class="card-row">
              <span>Dividendi totali</span>
              <strong>${formatCurrency(r.dividendi)}</strong>
            </div>
            <div class="card-row">
              <span>Profitto</span>
              <strong>${formatCurrency(r.profitto)}</strong>
            </div>
          </div>
          <div class="card-footer">
            <span>Tipo: <b>${r.tipologia}</b></span>
            <span>Score: <b>${r.score.toFixed(2)}</b></span>
          </div>
        `;
        perTitoloContainer.appendChild(card);
      });

      const totaleDiv = data.reduce((s, r) => s + r.dividendi, 0);
      const mensile = totaleDiv / 12;
      const mesi = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

      mesi.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${m}</td>
          <td>${formatCurrency(mensile)}</td>
        `;
        meseBody.appendChild(tr);
      });
    }

    // GRAFICI
    let chartAllocazione, chartPerformance, chartTop10;

    function updateCharts(data) {
      const ctxAlloc = document.getElementById('chartAllocazione').getContext('2d');
      const ctxPerf = document.getElementById('chartPerformance').getContext('2d');
      const ctxTop10 = document.getElementById('chartTop10').getContext('2d');

      if (chartAllocazione) chartAllocazione.destroy();
      if (chartPerformance) chartPerformance.destroy();
      if (chartTop10) chartTop10.destroy();

      const byType = {};
      data.forEach(r => {
        byType[r.tipologia] = (byType[r.tipologia] || 0) + r.valoreAttuale;
      });

      chartAllocazione = new Chart(ctxAlloc, {
        type: 'doughnut',
        data: {
          labels: Object.keys(byType),
          datasets: [{
            data: Object.values(byType),
            backgroundColor: ['#667eea', '#38bdf8', '#22c55e', '#f97316', '#e11d48']
          }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
      });

      chartPerformance = new Chart(ctxPerf, {
        type: 'bar',
        data: {
          labels: data.map(r => r.ticker),
          datasets: [
            {
              label: 'Investito',
              data: data.map(r => r.investito),
              backgroundColor: 'rgba(148, 163, 184, 0.7)'
            },
            {
              label: 'Valore attuale',
              data: data.map(r => r.valoreAttuale),
              backgroundColor: 'rgba(56, 189, 248, 0.8)'
            }
          ]
        },
        options: { responsive: true }
      });

      const sorted = [...data].sort((a, b) => b.percentualePortafoglio - a.percentualePortafoglio).slice(0, 10);

      chartTop10 = new Chart(ctxTop10, {
        type: 'bar',
        data: {
          labels: sorted.map(r => r.ticker),
          datasets: [{
            label: '% portafoglio',
            data: sorted.map(r => r.percentualePortafoglio * 100),
            backgroundColor: '#4ade80'
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }

    // MODALE / AZIONI
    const modal = document.getElementById('editModal');
    const modalClose = document.getElementById('modalClose');
    const modalSave = document.getElementById('modalSave');
    let editingId = null;

    function openModal(row) {
      editingId = row.id;
      document.getElementById('modalTicker').value = row.ticker;
      document.getElementById('modalInvestito').value = row.investito;
      document.getElementById('modalCorrente').value = row.valoreAttuale;
      document.getElementById('modalDividendi').value = row.dividendi;
      document.getElementById('modalPrelevato').value = row.prelevato;
      document.getElementById('modalScore').value = row.score;
      modal.style.display = 'flex';
    }

    function closeModal() {
      modal.style.display = 'none';
      editingId = null;
    }

    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal();
    });

    modalSave.addEventListener('click', async () => {
      if (!editingId) return;
      const investito = Number(document.getElementById('modalInvestito').value || 0);
      const corrente = Number(document.getElementById('modalCorrente').value || 0);
      const dividendi = Number(document.getElementById('modalDividendi').value || 0);
      const prelevato = Number(document.getElementById('modalPrelevato').value || 0);
      const score = Number(document.getElementById('modalScore').value || 0);

      const rendimentoPerc = investito ? (corrente + prelevato + dividendi - investito) / investito : 0;

      const ref = doc(db, "portafoglio", editingId);
      await updateDoc(ref, {
        prezzo_acquisto: investito,        // se per te è investito totale, puoi cambiare logica
        prezzo_corrente: corrente,
        dividendi: dividendi,
        prelevato: prelevato,
        score: score,
        rendimento_percentuale: rendimentoPerc
      });

      closeModal();
    });

    async function handleDelete(id) {
      const conferma = confirm("Vuoi davvero cancellare questa posizione?");
      if (!conferma) return;
      const ref = doc(db, "portafoglio", id);
      await deleteDoc(ref);
    }

    function attachRowActions() {
      document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const row = portfolioData.find(r => r.id === id);
          if (row) openModal(row);
        });
      });

      document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          handleDelete(id);
        });
      });
    }

    // FILTRI / ORDINAMENTO
    const searchInput = document.getElementById('searchInput');
    const typeFilter = document.getElementById('typeFilter');
    const sortButtons = document.querySelectorAll('.sort-btn');
    let currentSortKey = null;
    let currentSortDir = 1;

    function applyFiltersAndSort() {
      const term = searchInput.value.toLowerCase();
      const type = typeFilter.value;

      let data = portfolioData.filter(r => {
        const matchTerm =
          r.ticker.toLowerCase().includes(term) ||
          r.nome.toLowerCase().includes(term);
        const matchType = type ? r.tipologia === type : true;
        return matchTerm && matchType;
      });

      if (currentSortKey) {
        data = data.sort((a, b) => {
          const av = a[currentSortKey] || 0;
          const bv = b[currentSortKey] || 0;
          if (av < bv) return -1 * currentSortDir;
          if (av > bv) return 1 * currentSortDir;
          return 0;
        });
      }

      renderTable(data);
    }

    searchInput.addEventListener('input', applyFiltersAndSort);
    typeFilter.addEventListener('change', applyFiltersAndSort);

    sortButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-sort');
        if (currentSortKey === key) {
          currentSortDir *= -1;
        } else {
          currentSortKey = key;
          currentSortDir = 1;
        }
        sortButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyFiltersAndSort();
      });
    });

    // BOTTONI PLACEHOLDER
    document.getElementById('btnAdd').addEventListener('click', () => {
      alert('Qui puoi aggiungere una nuova posizione creando un documento Firestore.');
    });

    document.getElementById('btnExport').addEventListener('click', () => {
      alert('Qui puoi implementare esportazione JSON/CSV del portafoglio.');
    });

    document.getElementById('btnImportJson').addEventListener('click', () => {
      alert('Qui puoi implementare importazione JSON nel portafoglio.');
    });

    // TOGGLE DIVIDENDI (solo stile)
    const toggleTitoli = document.getElementById('toggleDividendiTitoli');
    const toggleMese = document.getElementById('toggleDividendiMese');
    toggleTitoli.addEventListener('click', () => {
      toggleTitoli.classList.add('active');
      toggleMese.classList.remove('active');
    });
    toggleMese.addEventListener('click', () => {
      toggleMese.classList.add('active');
      toggleTitoli.classList.remove('active');
    });

    // LISTENER REALTIME FIRESTORE
    onSnapshot(colRef, (snapshot) => {
      portfolioData = snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        const investito = Number(d.prezzo_acquisto || 0);
        const corrente = Number(d.prezzo_corrente || 0);
        const dividendi = Number(d.dividendi || 0);
        const prelevato = Number(d.prelevato || 0);
        const profitto = Number(d.profitto || (corrente + prelevato + dividendi - investito));
        const rendimento = Number(d.rendimento_percentuale || (investito ? profitto / investito : 0));

        return {
          id: docSnap.id,
          ticker: docSnap.id,
          nome: d.nome || docSnap.id,
          tipologia: d.tipologia || '',
          investito,
          valoreAttuale: corrente,
          dividendi,
          prelevato,
          profitto,
          rendimentoPerc: rendimento,                 // es. 0.12
          percentualePortafoglio: Number(d.percentuale_portafoglio || 0),
          percentuale12Mesi: Number(d.percentuale_12_mesi || 0),
          payback: Number(d.payback || 0),
          score: Number(d.score || 0)
        };
      });

      applyFiltersAndSort();
    }, (err) => {
      console.error("Errore Firestore:", err);
      alert("Errore nel caricamento dei dati dal database.");
    });
  </script>
</body>
</html>
