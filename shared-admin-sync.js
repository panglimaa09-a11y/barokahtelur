(function(){'use strict';
const c=()=>window.barokahSupabase;
let syncing=false;
let lastSignature='';
async function syncShared(){
  const db=c();
  if(!db||syncing)return;
  syncing=true;
  try{
    const a=await db.rpc('is_admin');
    if(a.error||a.data!==true)return;
    const r=await db.from('transactions').select('*').order('transaction_date',{ascending:false}).order('created_at',{ascending:false});
    if(r.error)throw r.error;
    const rows=r.data||[];
    const signature=rows.map(x=>[x.id,x.updated_at||'',x.created_at,x.transaction_date,x.type,x.qty,x.price,x.total,x.note].join('|')).join('||');
    if(signature===lastSignature)return;
    lastSignature=signature;
    window.state=rows.map(x=>({id:x.id,note:x.note,price:Number(x.price),unit:x.unit,qty:Number(x.qty),total:Number(x.total),type:x.type,date:x.transaction_date,createdAt:new Date(x.created_at).getTime()}));
    if(rows.length){try{localStorage.setItem('barokah_telur_shared_cache_v1',JSON.stringify(window.state));}catch(e){}}
    if(typeof window.render==='function')window.render();
    if(window.barokahBuktiTransfer&&typeof window.barokahBuktiTransfer.refresh==='function')window.barokahBuktiTransfer.refresh();
  }catch(e){console.error('Shared transaction sync:',e);}finally{syncing=false;}
}
window.barokahCloudSync=syncShared;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(syncShared,900));else setTimeout(syncShared,900);
// Keep both admin sessions in sync even when one admin changes data in another browser/device.
setInterval(syncShared,2000);
})();