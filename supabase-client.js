// Barokah Telur V70 - Supabase client
(function(){
  function loadScript(src, marker){
    if(document.querySelector('script[data-barokah-script="'+marker+'"]'))return;
    const s=document.createElement('script');
    s.src=src;
    s.async=false;
    s.dataset.barokahScript=marker;
    document.head.appendChild(s);
  }
  function init(){
    if(!window.supabase || !window.BAROKAH_SUPABASE_CONFIG){
      console.error("Supabase belum siap."); return;
    }
    const c=window.BAROKAH_SUPABASE_CONFIG;
    window.barokahSupabase=window.supabase.createClient(c.url,c.anonKey);
    window.barokahSupabaseReady=true;
    window.dispatchEvent(new CustomEvent("barokah:supabase-ready"));
    loadScript('multi-account.js','multi-account');
    loadScript('shared-data.js','shared-data');
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init); else init();
})();
