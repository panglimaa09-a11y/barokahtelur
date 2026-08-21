(function(){
  'use strict';
  // Bridge for existing debt modules: after any debt/receivable mutation,
  // refresh the dashboard from the same debts_receivables source.
  function fire(){
    document.dispatchEvent(new CustomEvent('barokah:debt-changed'));
    if(typeof window.barokahSyncDebtDashboard==='function') window.barokahSyncDebtDashboard();
  }
  window.barokahDebtChanged=fire;
  window.addEventListener('barokahDebtChanged',fire);
})();
