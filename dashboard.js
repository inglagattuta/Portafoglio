// Esempio dati: sostituire con dati reali dal tuo DB Firebase
const portfolio = [
  { ticker: "AAPL", category: "Crescita", type: "Azioni", invested: 1000, current: 1200, score: 9 },
  { ticker: "MSFT", category: "Crescita", type: "Azioni", invested: 800, current: 950, score: 8 },
  { ticker: "QYLD", category: "Dividendi", type: "ETF", invested: 500, current: 520, score: 12 },
  { ticker: "BTC", category: "Crypto", type: "Crypto", invested: 700, current: 1200, score: 15 },
  { ticker: "AGNC", category: "Dividendi", type: "ETF", invested: 400, current: 420, score: 10 }
];

// --- Chart 1: Allocazione per Categoria ---
const allocationByCategory = {};
portfolio.forEach(p => {
  allocationByCategory[p.category] = (allocationByCategory[p.category] || 0) + p.current;
});
const chartCategory = new Chart(document.getElementById("chartCategory"), {
  type: "pie",
  data: {
    labels: Object.keys(allocationByCategory),
    datasets: [{
      data: Object.values(allocationByCategory),
      backgroundColor: ["#4ade80","#60a5fa","#f87171","#facc15","#a78bfa"]
    }]
  }
});

// --- Chart 2: Investito vs Valore Attuale ---
const investedVsCurrent = {
  Investito: portfolio.reduce((a,b)=>a+b.invested,0),
  Attuale: portfolio.reduce((a,b)=>a+b.current,0)
};
const chartInvested = new Chart(document.getElementById("chartInvested"), {
  type: "bar",
  data: {
    labels: ["Portafoglio"],
    datasets: [
      { label: "Investito", data: [investedVsCurrent.Investito], backgroundColor:"#3b82f6" },
      { label: "Attuale", data: [investedVsCurrent.Attuale], backgroundColor:"#10b981" }
    ]
  },
  options: { responsive:true, plugins:{legend:{position:"top"}} }
});

// --- Chart 3: Top 5 Score ---
const topScoreData = [...portfolio].sort((a,b)=>b.score-a.score).slice(0,5);
const chartTopScore = new Chart(document.getElementById("chartTopScore"), {
  type: "bar",
  data: {
    labels: topScoreData.map(p=>p.ticker),
    datasets:[{ label:"Score", data: topScoreData.map(p=>p.score), backgroundColor:"#fbbf24" }]
  },
  options:{ responsive:true, plugins:{legend:{display:false}} }
});

// --- Chart 4: Percentuale Investito per Tipologia ---
const percentageByType = {};
portfolio.forEach(p => {
  percentageByType[p.type] = (percentageByType[p.type] || 0) + p.invested;
});
const chartByType = new Chart(document.getElementById("chartByType"), {
  type:"pie",
  data:{
    labels: Object.keys(percentageByType),
    datasets:[{
      data: Object.values(percentageByType),
      backgroundColor:["#4ade80","#60a5fa","#f87171","#facc15","#a78bfa"]
    }]
  }
});
