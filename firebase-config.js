
// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// 👉 QUI METTI LA TUA CONFIG FIREBASE
const firebaseConfig = {
   apiKey: "AIzaSyBhDoRKmRffrjO-WvVjgX3K7JdfPaM7MGk",
  authDomain: "portafoglio-dashboard.firebaseapp.com",
  projectId: "portafoglio-dashboard",
  storageBucket: "portafoglio-dashboard.firebasestorage.app",
  messagingSenderId: "194509041146",
  appId: "1:194509041146:web:aa943d555dc067f7110843"
};

// inizializza app
const app = initializeApp(firebaseConfig);

// inizializza Firestore
const db = getFirestore(app);

// 👉 LI ESPORTIAMO
export { app, db };
export default app;
