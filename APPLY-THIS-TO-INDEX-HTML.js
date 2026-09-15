/* ===== BAROKAH EXPORT FUNCTION — must be defined BEFORE it's called ===== */
function bindBarokahExport(){
  // Export functionality - isolated, does not alter app state
  try {
    const exportBtn = document.getElementById('barokahPrintBtn');
    if(exportBtn && typeof window.printStockReport === 'function'){
      exportBtn.addEventListener('click', () => {
        try {
          window.printStockReport();
        } catch(e){
          console.error('Export failed:', e);
          if(typeof toast === 'function') toast('Export gagal: ' + e.message);
        }
      });
    }
  } catch(e) {
    console.warn('[Barokah] bindBarokahExport init failed:', e.message);
  }
}

/* Call on DOMContentLoaded */
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', bindBarokahExport);
} else {
  bindBarokahExport();
}
