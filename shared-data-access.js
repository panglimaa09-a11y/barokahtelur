(function(){
  'use strict';
  const getClient=()=>window.barokahSupabase;
  let adminCache={value:false,expires:0,pending:null};
  const SHARED_TABLES=new Set(['transactions','stock_movements','transaction_proofs','debts_receivables','debt_payments','operational_transactions']);
  async function isAdmin(){
    const now=Date.now();
    if(now<adminCache.expires)return adminCache.value;
    if(adminCache.pending)return adminCache.pending;
    const sb=getClient();
    if(!sb)return false;
    adminCache.pending=(async()=>{try{const r=await sb.rpc('is_admin');const ok=!r?.error&&r.data===true;adminCache={value:ok,expires:Date.now()+15000,pending:null};return ok}catch(e){adminCache={value:false,expires:Date.now()+5000,pending:null};return false}})();
    return adminCache.pending;
  }
  function wrapClient(sb){
    if(!sb||sb.__barokahSharedDataWrapped)return sb;
    const originalFrom=sb.from.bind(sb);
    sb.from=function(table){
      const builder=originalFrom(table);
      if(!SHARED_TABLES.has(String(table)))return builder;
      let proxy;
      proxy=new Proxy(builder,{get(target,prop,recv){
        if(prop==='eq')return function(column,value){
          if(column==='user_id'&&adminCache.value===true)return proxy;
          const result=Reflect.apply(target.eq,target,[column,value]);
          return result===target?proxy:result;
        };
        const value=Reflect.get(target,prop,recv);
        if(typeof value==='function')return value.bind(target);
        return value;
      }});
      return proxy;
    };
    Object.defineProperty(sb,'__barokahSharedDataWrapped',{value:true,enumerable:false});
    return sb;
  }
  async function sync(){
    const sb=getClient();if(!sb)return;
    wrapClient(sb);
    await isAdmin();
    if(typeof window.barokahCloudSync==='function')await window.barokahCloudSync();
    if(window.barokahBuktiTransfer?.refresh)window.barokahBuktiTransfer.refresh();
    if(window.barokahSyncDebtDashboard)window.barokahSyncDebtDashboard();
  }
  window.barokahRefreshSharedData=sync;
  window.addEventListener('barokah:supabase-ready',()=>setTimeout(sync,100));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,1400),{once:true});else setTimeout(sync,1400);
  setInterval(()=>{if(window.barokahSupabase)sync().catch(console.error)},3000);
})();
