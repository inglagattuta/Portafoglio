import { db } from "./firebase-config.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

async function loadAndamento() {
  console.log("DEBUG: caricamento andamento...");

  const ref = collection(db, "andamento");
  const snapshot = await getDocs(ref);

  const records = snapshot.docs.map(doc => doc.data());

  console.log("DEBUG record count:", records.length);

  if (records.length === 0) {
    console.log("Nessun dato trovato!");
    return;
  }

  // ORDINA PER DATA (importantissimo)
  records.sort((a, b) => new Date(a.DATA) - new Date(b.DATA));

  // PREPARA I DATI
  const labels = records.map(r => r.DATA);
  const investito = records.map(r => Number(r.INVESTITO || 0));
  const giornaliero = records.map(r => Number(r.GIORNALIERO || 0));

  console.log("DEBUG labels:", labels);

  // CREA IL GRAFICO
  const ctx = document.getElementById("chart-andamento").getContext("2d");

  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "INVESTITO",
          data: investito,
          borderWidth: 2,
          borderColor: "rgba(0, 200, 255, 0.9)",
          backgroundColor: "rgba(0, 200, 255, 0.2)",
          tension: 0.3
        },
        {
          label: "GIORNALIERO",
          data: giornaliero,
          borderWidth: 2,
          borderColor: "rgba(0, 255, 100, 0.9)",
          backgroundColor: "rgba(0, 255, 100, 0.2)",
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: {
          title: { display: true, text: "Data" },
          ticks: { color: "#fff" }
        },
        y: {
          title: { display: true, text: "Valore (€)" },
          ticks: { color: "#fff" }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: "#fff"
          }
        }
      }
    }
  });
}

loadAndamento();
