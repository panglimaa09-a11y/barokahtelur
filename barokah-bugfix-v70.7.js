(function(){'use strict';
const SB=()=>window.barokahSupabase;
function activePage(){return document.getElementById('page-operational')?.classList.contains('active')}
let syncing=false;
async function syncOperational(){
  if(syncing||!activePage())return;
  const sb=SB(); if(!sb)return;
  syncing=true;
  try{
    const {data:{user}={}}=await sb.auth.getUser();
    if(!user)return;
    const {data,error}=await sb.from('operational_transactions').select('*').eq('user_id',user.id).order('transaction_date',{ascending:false}).order('created_at',{ascending:false});
    if(error)throw error;
    window.dispatchEvent(new CustomEvent('barokah:operational-data',{detail:{rows:data||[]}}));
  }catch(e){console.warn('[V71] operational sync',e)}finally{syncing=false}
}
function install(){
  const old=document.getElementById('opPrint');
  if(old && old.dataset.v71PrintOwner!=='1'){
    old.dataset.v71PrintOwner='1';
    old.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      if(typeof window.BarokahOperationalPrint==='function')window.BarokahOperationalPrint();
    },true);
  }
}
function boot(){
  install();
  document.addEventListener('barokah:operational-changed',syncOperational);
  window.addEventListener('barokah:supabase-ready',()=>setTimeout(syncOperational,300));
  window.addEventListener('focus',()=>{if(activePage())syncOperational()});
  const mo=new MutationObserver(install);
  if(document.body)mo.observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();