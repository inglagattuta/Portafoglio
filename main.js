await deleteDoc(doc(db, "portafoglio", id));
loadData();
}

// ================================
// IMPORT/EXPORT EXCEL (SheetJS)
// ================================
import * as XLSX from "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";

// EXPORT TO EXCEL
window.exportExcel = async function () {
  const querySnapshot = await getDocs(collection(db, "portafoglio"));
  const rows = [];

  querySnapshot.forEach(docSnap => {
    const data = docSnap.data();
    const copy = { ...data };
    delete copy.profitto; // profitto non si esporta
    rows.push(copy);
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Portafoglio");

  XLSX.writeFile(wb, "portafoglio.xlsx");
};

// IMPORT FROM EXCEL
window.importExcel = async function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json(sheet);

  for (const item of json) {
    delete item.profitto; // non importiamo profitto

    if (!item.nome) continue;

    await updateExistingOrAdd(item);
  }

  loadData();
  alert("Import completato!");
};

async function updateExistingOrAdd(record) {
  const querySnapshot = await getDocs(collection(db, "portafoglio"));
  for (const docSnap of querySnapshot.docs) {
    const data = docSnap.data();
    if (data.nome === record.nome) {
      await updateDoc(doc(db, "portafoglio", docSnap.id), record);
      return;
    }
  }
}
