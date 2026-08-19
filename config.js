// Barokah Telur V70 - Supabase configuration
// Public browser key only. Never put service_role/secret keys here.
window.BAROKAH_SUPABASE_CONFIG = {
  url: "https://sdshagdvwhryjygvwgkn.supabase.co",
  anonKey: "sb_publishable_zbG-wnIOHVoTjVDRvs0zqQ_Aw2-K8Yc"
};

(function(){
  function loadScript(src,marker){
    if(document.querySelector('script['+marker+']')) return;
    var s=document.createElement('script');
    s.src=src;
    s.async=false;
    s.setAttribute(marker,'1');
    document.head.appendChild(s);
  }
  function loadAll(){
    loadScript('ui-bugfix.js?v=3','data-barokah-ui-cleanup');
    loadScript('dashboard-financial-sync-v70.4.0.js?v=2','data-barokah-financial-sync');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadAll,{once:true});
  else loadAll();
})();
