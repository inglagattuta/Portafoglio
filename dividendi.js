console.log("🔥 Script caricato!");

document.addEventListener("DOMContentLoaded", () => {
  console.log("🔥 DOM pronto!");

  const el = document.getElementById("chartTopDiv");
  console.log("📌 chartTopDiv =", el);

  if (!el) {
    console.error("❌ ERRORE: chartTopDiv NON trovato!");
    return;
  }

  try {
    new Chart(el, {
      type: "bar",
      data: {
        labels: ["A", "B", "C"],
        datasets: [{
          label: "Test",
          data: [5, 3, 8],
        }],
      },
    });
    console.log("✅ Grafico creato!");
  } catch (e) {
    console.error("❌ Errore Chart.js:", e);
  }
});
