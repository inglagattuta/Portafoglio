import os
import datetime
import firebase_admin
from firebase_admin import credentials, firestore
import requests

# =============================
# CONFIGURAZIONE
# =============================
TELEGRAM_TOKEN = os.environ["TELEGRAM_TOKEN"]
TELEGRAM_CHAT_ID = os.environ["TELEGRAM_CHAT_ID"]

# =============================
# FIREBASE
# =============================
cred = credentials.Certificate("firebase-key.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# =============================
# LOGICA DIVIDENDI
# =============================
def check_dividends():
    tomorrow = (datetime.date.today() + datetime.timedelta(days=1))

    collection_ref = db.collection("dividendi_annual")
    docs = collection_ref.stream()

    tickers_tomorrow = []

    for doc in docs:
        data = doc.to_dict()
        ticker = data.get("ticker")
        dates = data.get("date_pagamento", [])

        for d in dates:
            try:
                div_date = datetime.datetime.strptime(d, "%Y-%m-%d").date()
                if div_date == tomorrow:
                    tickers_tomorrow.append(ticker)
            except:
                pass

    return tickers_tomorrow

# =============================
# TELEGRAM
# =============================
def send_telegram_message(message):
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message
    }
    requests.post(url, json=payload)

# =============================
# MAIN
# =============================
tickers = check_dividends()

if tickers:
    msg = "📅 *Dividendi in arrivo domani*\n\n" + "\n".join(f"• {t}" for t in tickers)
else:
    msg = "Nessun dividendo previsto per domani."

send_telegram_message(msg)
print("Notifica inviata:", tickers)
