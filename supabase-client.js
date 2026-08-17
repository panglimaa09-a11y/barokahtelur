// Barokah Telur V70 - Supabase client
(function(){
  function init(){
    if(!window.supabase || !window.BAROKAH_SUPABASE_CONFIG){
      console.error("Supabase belum siap."); return;
    }
    const c=window.BAROKAH_SUPABASE_CONFIG;
    window.barokahSupabase=window.supabase.createClient(c.url,c.anonKey);
    window.barokahSupabaseReady=true;
    window.dispatchEvent(new CustomEvent("barokah:supabase-ready"));
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init); else init();
})();
