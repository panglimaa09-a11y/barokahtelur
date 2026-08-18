// Barokah Telur V70 - Supabase client
(function(){
  function loadMultiAccount(){
    if(document.querySelector('script[data-barokah-multi-account]'))return;
    const s=document.createElement('script');
    s.src='multi-account.js';
    s.async=false;
    s.dataset.barokahMultiAccount='1';
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
    loadMultiAccount();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init); else init();
})();
