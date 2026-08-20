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

// Financial Preview B: existing operational module.
(function(){
  function loadOperationalPreview(){
    if(document.querySelector('script[data-barokah-operasional-preview]')) return;
    var s=document.createElement('script');
    s.src='operasional.js?v=70.4.0-b';
    s.async=false;
    s.dataset.barokahOperasionalPreview='1';
    document.head.appendChild(s);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadOperationalPreview,{once:true});
  else loadOperationalPreview();
})();

// Financial Preview B: isolated Dashboard operational summary.
(function(){
  function loadFinancialPreviewB(){
    if(document.querySelector('script[data-barokah-financial-preview-b]')) return;
    var s=document.createElement('script');
    s.src='financial-b-dashboard-preview.js?v=2';
    s.async=false;
    s.dataset.barokahFinancialPreviewB='1';
    document.head.appendChild(s);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadFinancialPreviewB,{once:true});
  else loadFinancialPreviewB();
})();

// Financial Stage C: isolated Dashboard Utang & Piutang summary.
(function(){
  function loadFinancialPreviewC(){
    if(document.querySelector('script[data-barokah-financial-preview-c]')) return;
    var s=document.createElement('script');
    s.src='financial-c-dashboard-preview.js?v=70.4.1';
    s.async=false;
    s.dataset.barokahFinancialPreviewC='1';
    document.head.appendChild(s);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadFinancialPreviewC,{once:true});
  else loadFinancialPreviewC();
})();

// V70.4.3 Preview: isolated quantity/unit enhancement for Utang Piutang.
(function(){
  function loadDebtUnitPreview(){
    if(document.querySelector('script[data-barokah-debt-unit-preview]')) return;
    var s=document.createElement('script');
    s.src='utang-piutang-satuan-v70.4.3.js?v=1';
    s.async=false;
    s.dataset.barokahDebtUnitPreview='1';
    document.head.appendChild(s);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadDebtUnitPreview,{once:true});
  else loadDebtUnitPreview();
})();

// V70.4.4 Preview: isolated edit actions for Operasional and Utang Piutang.
(function(){
  function loadEditEnhancement(){
    if(document.querySelector('script[data-barokah-edit-44]')) return;
    var s=document.createElement('script');
    s.src='edit-operasional-utang-v70.4.4.js?v=1';
    s.async=false;
    s.dataset.barokahEdit44='1';
    document.head.appendChild(s);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadEditEnhancement,{once:true});
  else loadEditEnhancement();
})();