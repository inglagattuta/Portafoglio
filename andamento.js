<script type="module">
  console.log("SCRIPT AVVIATO");

  import { db } from "./firebase-config.js";
  import {
    collection,
    getDocs
  } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

  const ctx = document.getElementById("grafico");
  let grafico = null;

  async function loadAndamento() {
    console.log("CARICO DATI...");

    const ref = collection(db, "andamento");
    const snap = await getDocs(ref);

    let labels = [];
    let valoriGiornaliero = [];
    let valoriInvestito = [];

    // ORDINA PER ID (storico)
    let records = [];
    snap.forEach(doc => records.push({ id: doc.id, ...doc.data() }));
    records.sort((a, b) => a.id.localeCompare(b.id));

    console.log("RECORD ORDINATI:", records);

    records.forEach((d, i) => {
      if (!d.GIORNALIERO || !d.INVESTITO) return;

      labels.push("Punto " + (i + 1));
      valoriGiornaliero.push(d.GIORNALIERO);
      valoriInvestito.push(d.INVESTITO);
    });

    renderGrafico(labels, valoriGiornaliero, valoriInvestito);
  }

  function renderGrafico(labels, giornaliero, investito) {
    if (grafico) grafico.destroy();

    grafico = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Giornaliero",
            data: giornaliero,
            borderWidth: 2,
            tension: 0.35,
            borderColor: "rgba(0, 180, 255, 0.9)",
            backgroundColor: "rgba(0, 180, 255, 0.15)",
            fill: true
          },
          {
            label: "Investito",
            data: investito,
            borderWidth: 2,
            tension: 0.35,
            borderColor: "rgba(255, 255, 0, 0.8)",
            backgroundColor: "rgba(255, 255, 0, 0.10)",
            fill: true
          }
        ]
      },
      options: {
        plugins: {
          legend: {
            labels: { color: "#ffffff", font: { size: 14 } }
          }
        },
        scales: {
          x: {
            ticks: { color: "#cccccc" },
            grid: { color: "rgba(255,255,255,0.05)" }
          },
          y: {
            ticks: { color: "#cccccc" },
            grid: { color: "rgba(255,255,255,0.05)" }
          }
        }
      }
    });
  }

  loadAndamento();
</script>
