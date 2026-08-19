// Barokah Telur V70 - Supabase configuration
// Public browser key only. Never put service_role/secret keys here.
window.BAROKAH_SUPABASE_CONFIG = {
  url: "https://sdshagdvwhryjygvwgkn.supabase.co",
  anonKey: "sb_publishable_zbG-wnIOHVoTjVDRvs0zqQ_Aw2-K8Yc"
};

// Production UI cleanup loader. config.js is already loaded by index.html,
// so this guarantees the visible print-script leak is removed without
// changing the application's data or Supabase logic.
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
