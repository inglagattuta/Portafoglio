import { db } from "./firebase-config.js";
import { collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

async function loadAndamento() {
  try {
    console.log("DEBUG: caricamento andamento...");

    const ref = collection(db, "andamento");
    const snapshot = await getDocs(ref);

    // mappa i record usando l'ID del documento come DATA (formato YYYY-MM-DD)
    let records = snapshot.docs.map(d => ({
      DATA: d.id,
      INVESTITO: Number(d.data().INVESTITO ?? 0),
      GIORNALIERO: Number(d.data().GIORNALIERO ?? 0)
    }));

    // ordina subito per sicurezza
    records.sort((a,b) => new Date(a.DATA) - new Date(b.DATA));
    console.log("DEBUG: records caricati", records.length, "esempi:", records.slice(-3));

    // gestione caso vuoto
    if (records.length === 0) {
      console.warn("Nessun record in collection 'andamento'");
      // svuota i box se esistono
      ["box-investito","box-valore","box-profitto","box-percentuale"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          const v = el.querySelector(".value");
          if (v) v.textContent = "-";
        }
      });
      return;
    }

    // ultimo record (ultimo giorno disponibile)
    const last = records[records.length - 1];
    const inv = Number(last.INVESTITO || 0);
    const val = Number(last.GIORNALIERO || 0);
    const profitto = +(val - inv).toFixed(2);
    const perc = inv > 0 ? ((profitto / inv) * 100).toFixed(2) : "0.00";

    console.log("DEBUG ultimo record:", last, { inv, val, profitto, perc });

    // aggiorna i 4 box in modo sicuro (verifica esistenza)
    const safeSet = (id, text) => {
      const box = document.getElementById(id);
      if (!box) {
        console.warn("Box non trovato:", id);
        return;
      }
      const valEl = box.querySelector(".value");
      if (!valEl) {
        console.warn("Elemento .value non trovato in", id);
        return;
      }
      valEl.textContent = text;
    };

    safeSet("box-investito", `${inv} €`);
    safeSet("box-valore", `${val} €`);
    safeSet("box-profitto", `${profitto} €`);
    safeSet("box-percentuale", `${perc}%`);

    // ---------- grafico ----------
    const labels = records.map(r => r.DATA);
    const investito = records.map(r => r.INVESTITO);
    const giornaliero = records.map(r => r.GIORNALIERO);

    const ctx = document.getElementById("grafico")?.getContext?.("2d");
    if (!ctx) {
      console.error("Canvas grafico non trovato (#grafico).");
    } else {
      // distruggi grafico precedente se presente
      if (window._andamentoChart) {
        try { window._andamentoChart.destroy(); } catch(e){/*ignore*/ }
      }
      window._andamentoChart = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            { label: "GIORNALIERO", data: giornaliero, borderColor: "rgba(0,180,255,1)", backgroundColor: "rgba(0,180,255,0.12)", tension: 0.35, fill: true },
            { label: "INVESTITO", data: investito, borderColor: "rgba(255,220,0,1)", backgroundColor: "rgba(255,220,0,0.08)", tension: 0.35, fill: true }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { labels: { color: getComputedStyle(document.body).color } } },
          scales: {
            x: { ticks: { color: getComputedStyle(document.body).color } },
            y: { ticks: { color: getComputedStyle(document.body).color } }
          }
        }
      });
    }

    // ---------- tabella mensile ----------
    const perMese = {};
    records.forEach(r => {
      const key = r.DATA.slice(0,7); // YYYY-MM
      perMese[key] = r; // lascia l'ultimo giorno del mese
    });
    const mesi = Object.keys(perMese).sort();

    const tbody = document.querySelector("#tabella-mensile tbody");
    if (!tbody) { console.error("tabella-mensile tbody non trovata"); return; }
    tbody.innerHTML = "";

    let lastInvestito = null;
    mesi.forEach(mese => {
      const r = perMese[mese];
      const invest = Number(r.INVESTITO || 0);
      const valr = Number(r.GIORNALIERO || 0);
      const incremento = lastInvestito !== null ? invest - lastInvestito : 0;
      lastInvestito = invest;
      const prof = valr - invest;
      const percM = invest>0 ? ((prof/invest)*100).toFixed(2) : "0.00";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.DATA}</td>
        <td class="right">${invest} €</td>
        <td class="right">${valr} €</td>
        <td class="${incremento>=0?'positivo':'negativo'} right">${incremento === "-" ? "-" : increment o + " €"}</td>
        <td class="${prof>=0?'positivo':'negativo'} right">${prof} €</td>
        <td class="${prof>=0?'positivo':'negativo'} right">${percM}%</td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error("Errore in loadAndamento:", err);
  }
}

// avvio
loadAndamento();
