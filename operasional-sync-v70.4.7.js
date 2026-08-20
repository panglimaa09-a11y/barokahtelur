(function(){
  'use strict';
  const SB=()=>window.barokahSupabase;
  let channel=null;
  let timer=null;
  let lastUserId=null;
  let loading=false;
  let pending=false;

  async function getUser(){
    const sb=SB();
    if(!sb) return null;
    const r=await sb.auth.getUser();
    return r.data&&r.data.user?r.data.user:null;
  }

  async function refresh(){
    if(loading){pending=true;return;}
    const sb=SB();
    if(!sb)return;
    const u=await getUser();
    if(!u)return;
    loading=true;
    try{
      // Reload the operational module from the same source of truth.
      if(typeof window.loadOperationalData==='function'){
        await window.loadOperationalData();
      }else if(typeof window.loadOperational==='function'){
        await window.loadOperational();
      }else{
        // The current operational module keeps load() private, so trigger its navigation.
        const page=document.getElementById('page-operational');
        const nav=document.getElementById('opNavBtn');
        if(page && page.classList.contains('active') && nav) nav.click();
      }
      if(typeof window.renderOperationalDashboard==='function') await window.renderOperationalDashboard();
      // Existing module exposes no public loader; a custom event gives it a safe hook.
      document.dispatchEvent(new CustomEvent('barokah:operational-refresh',{detail:{source:'sync'}}));
    }catch(e){console.warn('Operational sync:',e);}
    finally{
      loading=false;
      if(pending){pending=false;setTimeout(refresh,50);}
    }
  }

  function subscribe(u){
    const sb=SB();
    if(!sb||!u)return;
    if(channel)sb.removeChannel(channel);
    channel=sb.channel('barokah-operational-'+u.id)
      .on('postgres_changes',{event:'*',schema:'public',table:'operational_transactions',filter:'user_id=eq.'+u.id},()=>{
        clearTimeout(refresh._t);refresh._t=setTimeout(refresh,120);
      })
      .subscribe();
  }

  async function boot(){
    const sb=SB();if(!sb)return;
    try{
      const u=await getUser();
      if(u && u.id!==lastUserId){lastUserId=u.id;subscribe(u);}
      if(!u && lastUserId){lastUserId=null;if(channel){sb.removeChannel(channel);channel=null;}}
      await refresh();
    }catch(e){console.warn('Operational sync boot:',e);}
  }

  function schedule(){
    clearInterval(timer);
    timer=setInterval(()=>{if(document.visibilityState==='visible')refresh();},15000);
  }

  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});
  window.addEventListener('focus',refresh);
  window.addEventListener('pageshow',refresh);
  document.addEventListener('barokah:supabase-ready',()=>{boot();schedule();});
  document.addEventListener('barokah:operational-refresh',()=>{if(document.visibilityState==='visible')setTimeout(refresh,50);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{setTimeout(()=>{boot();schedule();},500),{once:true}});else setTimeout(()=>{boot();schedule();},500);
})();
