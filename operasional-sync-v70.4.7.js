(function(){
  'use strict';
  const SB=()=>window.barokahSupabase;
  let channel=null,timer=null,lastUserId=null,busy=false;
  async function user(){const sb=SB();if(!sb)return null;const r=await sb.auth.getUser();return r.data&&r.data.user?r.data.user:null;}
  async function refresh(){
    if(busy)return; const sb=SB();if(!sb)return; const u=await user();if(!u)return; busy=true;
    try{
      const page=document.getElementById('page-operational'), nav=document.getElementById('opNavBtn');
      if(page&&page.classList.contains('active')&&nav) nav.click();
      document.dispatchEvent(new CustomEvent('barokah:operational-data-changed',{detail:{userId:u.id}}));
    }catch(e){console.warn('Operational sync:',e)}finally{busy=false;}
  }
  function subscribe(u){const sb=SB();if(!sb||!u)return;if(channel)sb.removeChannel(channel);channel=sb.channel('barokah-operational-'+u.id).on('postgres_changes',{event:'*',schema:'public',table:'operational_transactions',filter:'user_id=eq.'+u.id},()=>{clearTimeout(refresh._t);refresh._t=setTimeout(refresh,150)}).subscribe();}
  async function boot(){const sb=SB();if(!sb)return;const u=await user();if(u&&u.id!==lastUserId){lastUserId=u.id;subscribe(u)}if(!u&&channel){sb.removeChannel(channel);channel=null;lastUserId=null}await refresh();clearInterval(timer);timer=setInterval(()=>{if(document.visibilityState==='visible')refresh()},15000)}
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh()});
  window.addEventListener('focus',refresh);
  window.addEventListener('pageshow',refresh);
  document.addEventListener('barokah:supabase-ready',()=>setTimeout(boot,400));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,700),{once:true});else setTimeout(boot,700);
})();
