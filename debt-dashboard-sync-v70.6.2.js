(function(){
  'use strict';
  // V70.6.2: keep dashboard debt/receivable cards synchronized with the
  // authoritative debts_receivables table. This module is intentionally
  // read-only and does not alter transactions or stock.
  function SB(){ return window.barokahSupabase; }
  function fmt(n){ return Number(n||0).toLocaleString('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}); }
  async function getUser(){
    const sb=SB();
    if(!sb) return null;
    const r=await sb.auth.getUser();
    if(r.error) throw r.error;
    return r.data && r.data.user ? r.data.user : null;
  }
  async function loadDebtTotals(){
    const sb=SB(); if(!sb) return null;
    const user=await getUser(); if(!user) return null;
    const q=await sb.from('debts_receivables')
      .select('kind,total_amount,paid_amount')
      .eq('user_id',user.id);
    if(q.error) throw q.error;
    let piutang=0,utang=0,open=0,paid=0;
    (q.data||[]).forEach(function(r){
      const total=Math.max(0,Number(r.total_amount||0));
      const p=Math.max(0,Number(r.paid_amount||0));
      const balance=Math.max(0,total-p);
      paid+=Math.min(total,p);
      if(r.kind==='utang') utang+=balance;
      else piutang+=balance;
      if(balance>0) open++;
    });
    return {piutang,utang,open,paid};
  }
  function setText(ids,value){
    ids.forEach(function(id){ const el=document.getElementById(id); if(el) el.textContent=value; });
  }
  async function sync(){
    try{
      const t=await loadDebtTotals(); if(!t) return;
      setText(['debtTotalPiutang','dashboardTotalPiutang','financialTotalPiutang'],fmt(t.piutang));
      setText(['debtTotalUtang','dashboardTotalUtang','financialTotalUtang'],fmt(t.utang));
      setText(['debtCountOpen','dashboardDebtOpen'],String(t.open));
      setText(['debtPaidTotal','dashboardDebtPaid'],fmt(t.paid));
      window.barokahDebtDashboardTotals=t;
      document.dispatchEvent(new CustomEvent('barokah:debt-sync',{detail:t}));
    }catch(e){ console.warn('[Barokah] debt dashboard sync:',e); }
  }
  function start(){
    sync();
    document.addEventListener('barokah:debt-changed',sync);
    document.addEventListener('barokah:transaction-changed',sync);
    window.addEventListener('focus',sync);
    setInterval(sync,3000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.barokahSyncDebtDashboard=sync;
})();
