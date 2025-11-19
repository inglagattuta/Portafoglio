// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBhDoRKmRffrjO-WvVjgX3K7JdfPaM7MGk",
  authDomain: "portafoglio-dashboard.firebaseapp.com",
  projectId: "portafoglio-dashboard",
  storageBucket: "portafoglio-dashboard.firebasestorage.app",
  messagingSenderId: "194509041146",
  appId: "1:194509041146:web:aa943d555dc067f7110843"
};

export const app = initializeApp(firebaseConfig);
export const db  = getFirestore(app);
// 👇 aggiungi QUESTO
export default app;
