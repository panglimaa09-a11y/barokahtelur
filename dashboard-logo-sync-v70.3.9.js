/* BAROKAH TELUR V70.3.9 - Dashboard Logo Sync */
(function(){
  'use strict';

  function getSB(){ return window.barokahSupabase || window.supabaseClient || window._supabase || null; }
  function escapeHtml(v){ return String(v ?? '').replace(/[&<>\"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[s])); }

  function applyLogo(url){
    const logos=document.querySelectorAll('.top .logo, .brand .logo, .logo');
    if(!logos.length) return false;
    logos.forEach(el=>{
      if(url){
        el.innerHTML='<img src="'+escapeHtml(url)+'" alt="Logo Barokah Telur" class="barokah-dashboard-logo-img">';
        el.classList.add('has-profile-logo');
      }else{
        el.innerHTML='BT';
        el.classList.remove('has-profile-logo');
      }
    });
    if(!document.getElementById('barokahDashboardLogoStyle')){
      const st=document.createElement('style');
      st.id='barokahDashboardLogoStyle';
      st.textContent='.brand .logo.has-profile-logo,.top .logo.has-profile-logo{overflow:hidden;padding:0}.barokah-dashboard-logo-img{width:100%;height:100%;display:block;object-fit:cover;border-radius:inherit}.brand .logo.has-profile-logo{background:#fff!important}';
      document.head.appendChild(st);
    }
    return true;
  }

  async function sync(){
    const sb=getSB();
    if(!sb) return;
    try{
      const session=await sb.auth.getSession();
      const user=session?.data?.session?.user;
      if(!user) return;
      const r=await sb.from('profiles').select('logo_url').eq('id',user.id).maybeSingle();
      if(r.error) return;
      applyLogo(r.data?.logo_url || null);
    }catch(e){ /* dashboard logo sync must never break the application */ }
  }

  window.barokahSyncDashboardLogo=sync;
  function start(){
    sync();
    setTimeout(sync,1200);
    setTimeout(sync,3000);
    setInterval(sync,30000);
    const sb=getSB();
    if(sb?.auth?.onAuthStateChange) sb.auth.onAuthStateChange(function(){ setTimeout(sync,400); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
