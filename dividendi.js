document.addEventListener("DOMContentLoaded", () => {

  import app from "./firebase-config.js";
  import {
    getFirestore,
    collection,
    getDocs
  } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

  const db = getFirestore(app);

  async function loadDividendi() {
    const snap = await getDocs(collection(db, "dividendi"));
    const data = snap.docs.map(d => d.data());

    renderTable(data);
    renderStats(data);
    renderChart(data);
  }

  function renderTable(data) {
    const tbody = document.getElementById("tableDividendi");
    if (!tbody) return;

    tbody.innerHTML = data
      .map(d => `
        <tr>
          <td>${d.nome}</td>
          <td>${d.dividendo} €</td>
          <td>${d.tipo}</td>
          <td>${d.percentuale}%</td>
        </tr>
      `)
      .join("");
  }

  function renderStats(data) {
    let totale = data.reduce((s, x) => s + Number(x.dividendo), 0);
    document.getElementById("totaleDividendi").innerHTML = totale.toFixed(2) + " €";

    document.getElementById("mediaDividendi").innerHTML = (totale / 12).toFixed(2) + " €";

    let top = data.sort((a, b) => b.dividendo - a.dividendo)[0];
    document.getElementById("topDividendo").innerHTML = top ? top.nome : "-";

    // Yield finto per ora
    document.getElementById("divYield").innerHTML = "3.5%";
  }

  function renderChart(data) {
    const ctx = document.getElementById("chartTopDiv");
    if (!ctx) return console.error("❌ chartTopDiv non trovato nell’HTML");

    let top5 = data.sort((a, b) => b.dividendo - a.dividendo).slice(0, 5);

    new Chart(ctx, {
      type: "bar",
      data: {
        labels: top5.map(x => x.nome),
        datasets: [{
          label: "Dividendi €",
          data: top5.map(x => x.dividendo)
        }]
      }
    });
  }

  loadDividendi();

});
