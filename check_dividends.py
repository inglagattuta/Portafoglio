import requests
from datetime import datetime, timedelta
import firebase_admin
from firebase_admin import credentials, firestore

# ==========================
# CONFIGURAZIONE TELEGRAM
# ==========================
BOT_TOKEN = "8421543055:AAF899LE21CHn10QklLaUvncrhalXFn36rQ"
CHAT_ID = "151793561"

TELEGRAM_URL = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"

def send_telegram(msg):
    data = {
        "chat_id": CHAT_ID,
        "text": msg,
        "parse_mode": "HTML"
    }
    requests.post(TELEGRAM_URL, data=data)

# ==========================
# FIREBASE
# ==========================
cred = credentials.Certificate("firebase-key.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# ==========================
# CHECK DIVIDENDI
# ==========================
def check_dividends():
    today = datetime.utcnow().date()
    tomorrow = today + timedelta(days=1)

    # estrai solo mese e giorno per confronto
    tomorrow_md = (str(tomorrow.month).zfill(2), str(tomorrow.day).zfill(2))

    docs = db.collection("dividendi_annual").get()

    reminder_list = []

    for d in docs:
        data = d.to_dict()
        ticker = data.get("ticker")
        pagamenti = data.get("date_pagamento", [])

        for date_str in pagamenti:
            try:
                dt = datetime.strptime(date_str, "%Y-%m-%d")
                md = (str(dt.month).zfill(2), str(dt.day).zfill(2))
                if md == tomorrow_md:
                    reminder_list.append(ticker)
            except:
                continue

    if not reminder_list:
        send_telegram("📭 Nessun dividendo in pagamento domani.")
    else:
        msg = "📅 <b>Dividendi in pagamento domani:</b>\n\n"
        for t in reminder_list:
            msg += f"• <b>{t}</b>\n"
        send_telegram(msg)

if __name__ == "__main__":
    check_dividends()
