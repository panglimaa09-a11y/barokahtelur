// Barokah Telur V70 - Supabase configuration
// Public browser key only. Never put service_role/secret keys here.
window.BAROKAH_SUPABASE_CONFIG = {
  url: "https://sdshagdvwhryjygvwgkn.supabase.co",
  anonKey: "sb_publishable_zbG-wnIOHVoTjVDRvs0zqQ_Aw2-K8Yc"
};

(function(){
  function load(src, attr){
    if(document.querySelector('script['+attr+']')) return;
    var s=document.createElement('script'); s.src=src; s.async=false; s.setAttribute(attr,'1'); document.head.appendChild(s);
  }
  function boot(){
    load('ui-bugfix.js?v=2','data-barokah-ui-cleanup');
    load('operasional.js?v=70.4.0-b','data-barokah-operasional-preview');
    load('financial-b-dashboard-preview.js?v=2','data-barokah-financial-preview-b');
    load('financial-c-dashboard-preview.js?v=70.4.1','data-barokah-financial-preview-c');
    load('utang-piutang-satuan-v70.4.3.js?v=1','data-barokah-debt-unit-preview');
    load('edit-operasional-utang-v70.4.4.js?v=1','data-barokah-edit-44');
    load('sidebar-v70.4.5.js?v=3','data-barokah-sidebar-v7045');
    load('sidebar-operasional-fix-v70.4.5.js?v=2','data-barokah-sidebar-operasional-fix');
    load('operasional-sync-v70.4.9.js?v=1','data-barokah-operational-sync-v7049');
    load('stock-gudang-integrated-v70.5.3.js?v=1','data-barokah-stock-integrated-v7053');
    load('stock-gudang-integrated-hooks-v70.5.3.js?v=1','data-barokah-stock-integrated-hooks-v7053');
    load('debt-dashboard-sync-v70.6.2.js?v=1','data-barokah-debt-dashboard-sync-v7062');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();