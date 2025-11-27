import app from "./firebase-config.js";
import {
  getFirestore,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const db = getFirestore(app);

// ================================
//   CARICA DATI DA FIREBASE
// ================================
async function loadAndamento() {
  const snap = await getDocs(collection(db, "andamento"));

  const dati = [];

  snap.forEach((doc) => {
    const id = doc.id; // es: "2025-01-12"
    const data = doc.data();

    // Convertiamo l'ID in vera data per ordinamento
    let parsedDate = new Date(id);

    if (parsedDate.toString() === "Invalid Date") {
      console.warn("Data non valida:", id);
      return;
    }

    dati.push({
      data: parsedDate,
      label: id,
      investito: data.INVESTITO || 0,
      giornaliero: data.GIORNALIERO || 0,
      azioni: data.AZIONI || 0,
    });
  });

  // Ordina per data reale
  dati.sort((a, b) => a.data - b.data);

  return dati;
}

// ================================
//   CREA IL GRAFICO
// ================================
function createChart(labels, values) {
  const ctx = document.getElementById("chartAndamento");

  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Investito (€)",
          data: values,
          borderWidth: 3,
          tension: 0.25,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true },
      },
      scales: {
        x: {
          ticks: { maxRotation: 45, minRotation: 45 },
        },
      },
    },
  });
}

// ================================
//   MAIN
// ================================
async function main() {
  console.log("Caricamento dati andamento...");

  const andamento = await loadAndamento();

  if (andamento.length === 0) {
    console.error("Nessun dato trovato in Firestore!");
    return;
  }

  // Etichette = date formattate tipo 2025-01-12
  const labels = andamento.map((r) => r.label);

  // Valori = colonna INVESTITO
  const values = andamento.map((r) => r.investito);

  // Crea grafico
  createChart(labels, values);
}

main();
