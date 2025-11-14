<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dashboard Portfolio</title>

  <!-- CSS con busting cache -->
<link rel="stylesheet" href="style.css?v=1000">

  <!-- Chart.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>

<body>
  <div class="container">

    <header>
      <h1>📊 Dashboard Portafoglio</h1>
      <p class="subtitle">Analisi grafica</p>
    </header>

    <!-- CONTROLLI -->
    <div class="controls">
      <label class="file-label">
        📥 Importa Excel
        <input type="file" accept=".xlsx,.xls">
      </label>

      <button onclick="window.location.href='index.html'">
        ⬅ Torna alla Home
      </button>

      <button class="dashboard-btn">
        📊 Dashboard
      </button>
    </div>

    <!-- GRAFICI -->
    <div class="charts-grid">

      <div class="chart-box">
        <h3>Allocazione per Categoria</h3>
        <canvas id="chartCategory"></canvas>
      </div>

      <div class="chart-box">
        <h3>Investito vs Attuale</h3>
        <canvas id="chartInvested"></canvas>
      </div>

      <div class="chart-box">
        <h3>Top 5 per Score</h3>
        <canvas id="chartTopScore"></canvas>
      </div>

      <div class="chart-box">
        <h3>% Investito per Tipologia</h3>
        <canvas id="chartByType"></canvas>
      </div>

    </div>

  </div>

  <script src="dashboard.js?v=3"></script>
</body>
</html>
