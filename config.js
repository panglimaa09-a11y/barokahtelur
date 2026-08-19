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

// Isolated Financial Preview A: Omzet card.
(function(){
  function loadFinancialPreview(){
    if(document.querySelector('script[data-barokah-financial-preview-a]')) return;
    var s=document.createElement('script');
    s.src='financial-a-preview.js?v=1';
    s.async=false;
    s.dataset.barokahFinancialPreviewA='1';
    document.head.appendChild(s);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadFinancialPreview,{once:true});
  else loadFinancialPreview();
})();

// Financial Preview B: reuse the existing isolated operational module.
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
