// =======================================
// FUNZIONI COLORI
// =======================================
export function getColor(val, type = "percent", darkMode = true) {
  let color = "transparent";

  if (type === "percent") {
    if (val > 20) color = darkMode ? "rgba(0,200,0,0.3)" : "rgba(0,128,0,0.3)";
    else if (val > 10) color = darkMode ? "rgba(0,180,0,0.25)" : "rgba(0,200,0,0.25)";
    else if (val > 0) color = darkMode ? "rgba(154,205,50,0.2)" : "rgba(154,205,50,0.2)";
    else if (val === 0) color = darkMode ? "rgba(255,200,0,0.2)" : "rgba(255,165,0,0.2)";
    else if (val > -10) color = darkMode ? "rgba(255,100,50,0.25)" : "rgba(255,69,0,0.25)";
    else color = darkMode ? "rgba(200,0,0,0.3)" : "rgba(139,0,0,0.3)";
  } else {
    if (val >= 10000) color = darkMode ? "rgba(0,200,0,0.3)" : "rgba(0,128,0,0.3)";
    else if (val >= 5000) color = darkMode ? "rgba(0,180,0,0.25)" : "rgba(0,200,0,0.25)";
    else if (val >= 1000) color = darkMode ? "rgba(154,205,50,0.2)" : "rgba(154,205,50,0.2)";
    else if (val >= 0) color = darkMode ? "rgba(255,200,0,0.2)" : "rgba(255,165,0,0.2)";
    else color = darkMode ? "rgba(255,100,50,0.25)" : "rgba(255,69,0,0.25)";
  }

  return color;
}

export function getTextColor(bg) {
  // testo bianco/nero a seconda del colore
  if (!bg) return "#000";
  const rgb = bg.match(/\d+/g);
  if (!rgb) return "#000";
  const brightness = (parseInt(rgb[0])*299 + parseInt(rgb[1])*587 + parseInt(rgb[2])*114)/1000;
  return brightness < 140 ? "#fff" : "#000";
}

// =======================================
// RENDER TABELLA
// =======================================
export function renderRiepilogoInTabella(riepilogo, andamento) {
  const tbody = document.querySelector("#tabellaRiepilogo tbody");
  tbody.innerHTML = "";
  const darkMode = document.body.classList.contains("dark");

  riepilogo.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-align:center;">${r.mese}</td>
      <td style="text-align:right; background-color:${getColor(r.investito,"value",darkMode)}; color:${getTextColor(getColor(r.investito,"value",darkMode))};">${r.investito.toFixed(2)} €</td>
      <td style="text-align:right; background-color:${getColor(r.valore,"value",darkMode)}; color:${getTextColor(getColor(r.valore,"value",darkMode))};">${r.valore.toFixed(2)} €</td>
      <td style="text-align:right; background-color:${getColor(r.incremento,"value",darkMode)}; color:${getTextColor(getColor(r.incremento,"value",darkMode))};">${r.incremento.toFixed(2)} €</td>
      <td style="text-align:right; background-color:${getColor(r.profitto,"value",darkMode)}; color:${getTextColor(getColor(r.profitto,"value",darkMode))};">${r.profitto.toFixed(2)} €</td>
      <td style="text-align:right; background-color:${getColor(r.profitPerc,"percent",darkMode)}; color:${getTextColor(getColor(r.profitPerc,"percent",darkMode))};">${r.profitPerc.toFixed(2)} %</td>
      <td style="text-align:center;"><button class="expand-btn">+</button></td>
    `;
    tbody.appendChild(tr);

    // dettagli giornalieri
    const detailTr = document.createElement("tr");
    detailTr.style.display = "none";
    detailTr.classList.add("details");

    const giorni = andamento.filter(a => {
      const [y,m] = r.mese.split("-");
      return a.data.getFullYear() === Number(y) && (a.data.getMonth()+1) === Number(m);
    });

    detailTr.innerHTML = `
      <td colspan="7">
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <th style="text-align:center;">Giorno</th>
            <th style="text-align:right;">Investito (€)</th>
            <th style="text-align:right;">Valore (€)</th>
            <th style="text-align:right;">Giornaliero (€)</th>
            <th style="text-align:center;">Azioni</th>
          </tr>
          ${giorni.map(g => `
            <tr data-id="${g.label}">
              <td style="text-align:center;">${g.label}</td>
              <td style="text-align:right; background-color:${getColor(g.investito,"value",darkMode)}; color:${getTextColor(getColor(g.investito,"value",darkMode))};">${g.investito.toFixed(2)}</td>
              <td style="text-align:right; background-color:${getColor(g.giornaliero,"value",darkMode)}; color:${getTextColor(getColor(g.giornaliero,"value",darkMode))};">${g.giornaliero.toFixed(2)}</td>
              <td style="text-align:right; background-color:${getColor(g.azioni,"value",darkMode)}; color:${getTextColor(getColor(g.azioni,"value",darkMode))};">${g.azioni.toFixed(2)}</td>
              <td style="text-align:center;"><button class="edit-btn">✏️ Modifica</button></td>
            </tr>`).join('')}
        </table>
      </td>
    `;
    tbody.appendChild(detailTr);

    tr.querySelector(".expand-btn").addEventListener("click", () => {
      detailTr.style.display = detailTr.style.display === "none" ? "table-row" : "none";
    });
  });

  // Edit giornaliero
  tbody.addEventListener("click", async e => {
    if (!e.target.classList.contains("edit-btn")) return;
    const btn = e.target;
    const trGiorno = btn.closest("tr");
    const celle = trGiorno.querySelectorAll("td");
    const idGiorno = trGiorno.dataset.id;
    const darkMode = document.body.classList.contains("dark");

    if (btn.textContent === "✏️ Modifica") {
      celle[1].innerHTML = `<input type="number" value="${celle[1].textContent}" style="width:80px">`;
      celle[2].innerHTML = `<input type="number" value="${celle[2].textContent}" style="width:80px">`;
      celle[3].innerHTML = `<input type="number" value="${celle[3].textContent}" style="width:80px">`;
      btn.textContent = "💾 Salva";
    } else {
      const nuoviValori = {
        INVESTITO: parseFloat(celle[1].querySelector("input").value),
        GIORNALIERO: parseFloat(celle[2].querySelector("input").value),
        AZIONI: parseFloat(celle[3].querySelector("input").value)
      };
      try {
        const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js");
        const docRef = doc(db,"andamento",idGiorno);
        await updateDoc(docRef, nuoviValori);
        celle[1].textContent = nuoviValori.INVESTITO.toFixed(2);
        celle[2].textContent = nuoviValori.GIORNALIERO.toFixed(2);
        celle[3].textContent = nuoviValori.AZIONI.toFixed(2);
        btn.textContent = "✏️ Modifica";
        celle[1].style.backgroundColor = getColor(nuoviValori.INVESTITO,"value",darkMode);
        celle[2].style.backgroundColor = getColor(nuoviValori.GIORNALIERO,"value",darkMode);
        celle[3].style.backgroundColor = getColor(nuoviValori.AZIONI,"value",darkMode);
        celle[1].style.color = getTextColor(getColor(nuoviValori.INVESTITO,"value",darkMode));
        celle[2].style.color = getTextColor(getColor(nuoviValori.GIORNALIERO,"value",darkMode));
        celle[3].style.color = getTextColor(getColor(nuoviValori.AZIONI,"value",darkMode));
        alert("Giornata aggiornata correttamente!");
      } catch(err) {
        console.error(err);
        alert("Errore aggiornamento Firestore!");
      }
    }
  });
}

// =======================================
// ESEMPIO DATI STATICI PER TEST
// =======================================
const datiRiepilogo = [
  {data: "2025-01", investito: 1000, valore: 1100, incremento: 100, profitto: 100, percentuale: 10, azioni: 5},
  {data: "2025-02", investito: 1200, valore: 1250, incremento: 50, profitto: 50, percentuale: 4.16, azioni: 4},
  {data: "2025-03", investito: 1500, valore: 1600, incremento: 100, profitto: 100, percentuale: 6.66, azioni: 6},
];

// =======================================
// INIT
// =======================================
document.addEventListener("DOMContentLoaded", () => {
  renderRiepilogoInTabella(datiRiepilogo, datiRiepilogo);
});
