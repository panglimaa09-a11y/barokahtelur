// Barokah Telur V70 - Supabase configuration
// Public browser key only. Never put service_role/secret keys here.
window.BAROKAH_SUPABASE_CONFIG = {
  url: "https://sdshagdvwhryjygvwgkn.supabase.co",
  anonKey: "sb_publishable_zbG-wnIOHVoTjVDRvs0zqQ_Aw2-K8Yc"
};

// Existing UI cleanup loader.
(function(){
  function loadUiCleanup(){
    if(document.querySelector('script[data-barokah-ui-cleanup]')) return;
    var s=document.createElement('script');
    s.src='ui-bugfix.js?v=2';
    s.async=false;
    s.dataset.barokahUiCleanup='1';
    document.head.appendChild(s);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadUiCleanup,{once:true});
  else loadUiCleanup();
})();

// Existing operational module.
(function(){
  function loadOperational(){
    if(document.querySelector('script[data-barokah-operasional]')) return;
    var s=document.createElement('script');
    s.src='operasional.js?v=70.4.0-b';
    s.async=false;
    s.dataset.barokahOperasional='1';
    document.head.appendChild(s);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadOperational,{once:true});
  else loadOperational();
})();

// Dashboard operational summary.
(function(){
  function loadFinancialB(){
    if(document.querySelector('script[data-barokah-financial-b]')) return;
    var s=document.createElement('script');
    s.src='financial-b-dashboard-preview.js?v=70.4.2';
    s.async=false;
    s.dataset.barokahFinancialB='1';
    document.head.appendChild(s);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadFinancialB,{once:true});
  else loadFinancialB();
})();

// Dashboard Utang & Piutang summary.
(function(){
  function loadFinancialC(){
    if(document.querySelector('script[data-barokah-financial-c]')) return;
    var s=document.createElement('script');
    s.src='financial-c-dashboard-preview.js?v=70.4.1';
    s.async=false;
    s.dataset.barokahFinancialC='1';
    document.head.appendChild(s);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadFinancialC,{once:true});
  else loadFinancialC();
})();

// Isolated operational edit + print enhancement. Does not replace operasional.js.
(function(){
  function loadOperationalEditPrint(){
    if(document.querySelector('script[data-barokah-operational-edit-print]')) return;
    var s=document.createElement('script');
    s.src='operasional-edit-print.js?v=70.4.2';
    s.async=false;
    s.dataset.barokahOperationalEditPrint='1';
    document.head.appendChild(s);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadOperationalEditPrint,{once:true});
  else loadOperationalEditPrint();
})();