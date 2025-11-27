<script type="module">
import { db } from "./firebase-config.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const tabellaBody = document.querySelector("#tabella-andamento tbody");
const ctx = document.getElementById("grafico");
let grafico = null;

async function loadAndamento() {
  const ref = collection(db, "andamento");
  const snap = await getDocs(ref);

  let labels = [];
  let valori = [];

  tabellaBody.innerHTML = "";

  snap.forEach(doc => {
    const d = doc.data();
    
    // nomi coerenti con Firebase
    const azioni = d.AZIONI ?? 0;
    const investito = d.INVESTITO ?? 0;
    const giornaliero = d.GIORNALIERO ?? 0;

    // label per grafico = count progressivo
    labels.push("Step " + labels.length);
    valori.push(giornaliero);

    tabellaBody.innerHTML += `
      <tr>
        <td>${azioni}</td>
        <td>${investito} €</td>
        <td>${giornaliero} €</td>
      </tr>
    `;
  });

  renderGrafico(labels, valori);
}

function renderGrafico(labels, valori) {
  if (grafico) grafico.destroy();

  grafico = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Valore Giornaliero",
        data: valori,
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        backgroundColor: "rgba(0, 150, 255, 0.25)",
        borderColor: "rgba(0, 150, 255, 0.8)"
      }]
    },
    options: {
      plugins: { legend: { labels: { color: "#fff" } } },
      scales: {
        x: { ticks: { color: "#ccc" }, grid: { color: "rgba(255,255,255,0.05)" }},
        y: { ticks: { color: "#ccc" }, grid: { color: "rgba(255,255,255,0.05)" }}
      }
    }
  });
}

loadAndamento();
</script>
