# Portafoglio
# 📊 Portafoglio Dashboard — Aggiornamento Prezzi On‑Demand

Questo progetto implementa un **aggiornamento prezzi on‑demand** (azioni / strumenti finanziari) con un’architettura **sicura e production‑grade**, senza esporre token sensibili nel browser.

L’aggiornamento viene avviato **manuale tramite bottone** dalla dashboard web e propaga fino a Firebase passando per GitHub Actions.

---

## 🧠 Architettura

```
[ Browser ]
     │
     ▼
[ Cloudflare Worker ]
     │  (GitHub API – workflow_dispatch)
     ▼
[ GitHub Actions ]
     │  (Node.js)
     ▼
[ Firebase Firestore ]
```

### Perché questa architettura

* 🔒 **Nessun token nel frontend**
* 🚫 Nessun 401 / CORS / rate‑limit dal browser
* ⚙️ Workflow riutilizzabile (manuale + schedulato)
* ☁️ Serverless end‑to‑end

---

## 🧩 Componenti

### 1️⃣ Frontend (Dashboard)

* Bottone **🔄 Aggiorna Tempo Reale**
* Chiama il Cloudflare Worker via `fetch POST`

```js
btnRealtime.onclick = async () => {
  if (!confirm("Aggiornare i prezzi in tempo reale?")) return;

  await fetch("https://workflowinglagattuta.ing-lagattuta.workers.dev/", {
    method: "POST"
  });

  alert("Aggiornamento avviato!");
};
```

---

### 2️⃣ Cloudflare Worker (Trigger sicuro)

Responsabilità:

* Espone un endpoint pubblico
* Valida il metodo (`POST`)
* Chiama GitHub API con **token segreto server‑side**

📄 **Codice Worker completo**

```js
export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const res = await fetch(
      "https://api.github.com/repos/inglagattuta/Portafoglio/actions/workflows/update-etoro.yml/dispatches",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
          "Accept": "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "cloudflare-worker-portafoglio",
        },
        body: JSON.stringify({ ref: "main" }),
      }
    );

    return new Response(JSON.stringify({ ok: res.ok }), {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  },
};
```

🔐 **Secret richiesto nel Worker**

* `GITHUB_TOKEN`
* Tipo: **Secret**

---

### 3️⃣ GitHub Actions (Workflow)

📄 `.github/workflows/update-etoro.yml`

```yml
name: Aggiorna prezzi azioni su Firestore

on:
  workflow_dispatch:
  schedule:
    - cron: '0 * * * *'

jobs:
  update-portfolio:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install axios firebase-admin

      - name: Run update prices script
        env:
          TWELVE_DATA_API_KEY: ${{ secrets.TWELVE_DATA_API_KEY }}
          FIREBASE_KEY_JSON: ${{ secrets.FIREBASE_KEY_JSON }}
        run: node scripts/update-prices.js
```

---

### 4️⃣ Script Node.js (Aggiornamento Firebase)

📄 `scripts/update-prices.js`

Responsabilità:

* Legge la collezione `azioni`
* Recupera i prezzi (Twelve Data → Yahoo fallback)
* Aggiorna `prezzo_corrente`, `lastUpdated`, `price_source`

*(Script completo documentato nel repository)*

---

## 🔐 Sicurezza

✔️ Token GitHub **mai esposto al browser**
✔️ Permessi minimi (fine‑grained token)
✔️ GitHub API chiamata solo server‑side
✔️ Possibile aggiungere allow‑list dominio sul Worker

---

## 🧪 Test & Debug

### Test Worker manuale

```js
fetch("https://workflowinglagattuta.ing-lagattuta.workers.dev/", { method: "POST" })
  .then(r => r.json())
  .then(console.log);
```

Risultato atteso:

```json
{ "ok": true }
```

### Errori comuni

| Errore | Causa                       |
| ------ | --------------------------- |
| 401    | Token mancante o errato     |
| 403    | Header `User-Agent` assente |
| 404    | Nome workflow errato        |
| 422    | Branch `ref` sbagliato      |

---

## 🚀 Estensioni future

* ⏳ Stato avanzamento job
* 🔄 Spinner / loading UX
* 🔐 Autenticazione Worker
* 📊 Logging avanzato
* 📅 Aggiornamenti per asset diversi (crypto / ETF)

---

## 👏 Conclusione

Questo setup rappresenta una **pipeline moderna, sicura e scalabile** per aggiornamenti dati on‑demand.

> Frontend semplice. Backend serverless. CI orchestrata.

**Production‑ready.** 💪🔥

