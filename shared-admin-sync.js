(function(){'use strict';
const c=()=>window.barokahSupabase;
async function syncShared(){const db=c();if(!db)return;const a=await db.rpc('is_admin');if(a.error||a.data!==true)return;const r=await db.from('transactions').select('*').order('transaction_date',{ascending:false}).order('created_at',{ascending:false});if(r.error)throw r.error;window.state=(r.data||[]).map(x=>({id:x.id,note:x.note,price:Number(x.price),unit:x.unit,qty:Number(x.qty),total:Number(x.total),type:x.type,date:x.transaction_date,createdAt:new Date(x.created_at).getTime()}));try{localStorage.setItem('barokah_telur_owner_final_v1',JSON.stringify(window.state));}catch(e){}if(typeof window.render==='function')window.render();}
window.barokahCloudSync=syncShared;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(syncShared,900));else setTimeout(syncShared,900);
})();
