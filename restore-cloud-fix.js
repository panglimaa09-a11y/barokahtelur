(function(){
  'use strict';

  function toastSafe(m){if(typeof toast==='function')toast(m);else alert(m);}
  function getSB(){return window.barokahSupabase;}
  function makeId(){return crypto.randomUUID?crypto.randomUUID():null;}

  async function restoreToCloud(incoming){
    const sb=getSB();
    if(!sb)throw new Error('Koneksi Supabase belum siap.');
    const auth=await sb.auth.getUser();
    const user=auth.data&&auth.data.user;
    if(!user)throw new Error('Sesi login tidak aktif. Silakan login ulang.');
    if(!Array.isArray(incoming))throw new Error('Format backup tidak valid.');

    const rows=incoming.map(function(x){
      const id=makeId();
      if(!id)throw new Error('Browser tidak mendukung pembuatan ID transaksi.');
      const created=Number(x.createdAt);
      return {
        id:id,
        user_id:user.id,
        note:String(x.note==null?'':x.note),
        price:Number(x.price||0),
        unit:String(x.unit==null?'':x.unit),
        qty:Number(x.qty||0),
        total:Number(x.total||0),
        type:x.type==='expense'?'expense':'income',
        transaction_date:String(x.date||new Date().toISOString().slice(0,10)),
        created_at:Number.isFinite(created)&&created>0?new Date(created).toISOString():new Date().toISOString()
      };
    });

    // Restore is transactional at application level: insert the complete
    // backup first. Existing cloud rows are deleted only after every chunk
    // has been accepted by Supabase.
    const inserted=[];
    for(let i=0;i<rows.length;i+=100){
      const {data,error}=await sb.from('transactions').insert(rows.slice(i,i+100)).select('*');
      if(error)throw error;
      inserted.push.apply(inserted,data||[]);
    }

    const current=await sb.from('transactions').select('id').eq('user_id',user.id);
    if(current.error)throw current.error;
    const keep=new Set(inserted.map(r=>String(r.id)));
    const oldIds=(current.data||[]).map(r=>String(r.id)).filter(id=>!keep.has(id));
    for(let i=0;i<oldIds.length;i+=100){
      const {error}=await sb.from('transactions').delete().in('id',oldIds.slice(i,i+100)).eq('user_id',user.id);
      if(error)throw error;
    }

    try{localStorage.setItem('barokah_telur_owner_final_v1',JSON.stringify(inserted.map(function(r){return {id:r.id,note:r.note,price:Number(r.price),unit:r.unit,qty:Number(r.qty),total:Number(r.total),type:r.type,date:r.transaction_date,createdAt:new Date(r.created_at).getTime()};})));}catch(e){}
    // Reload from the same Supabase source used by production so the app's
    // lexical state is updated correctly.
    if(typeof window.barokahCloudSync==='function')await window.barokahCloudSync();
    else if(typeof render==='function')render();
    toastSafe('Backup berhasil dipulihkan dan disimpan ke Supabase.');
  }

  function install(){
    const btn=document.getElementById('restoreFileBtn');
    if(!btn||btn.dataset.cloudRestoreInstalled==='1')return;
    const fresh=btn.cloneNode(true);
    fresh.dataset.cloudRestoreInstalled='1';
    btn.parentNode.replaceChild(fresh,btn);
    fresh.addEventListener('click',function(){
      const input=document.createElement('input');
      input.type='file';input.accept='.json,application/json';
      input.onchange=function(){
        const file=input.files&&input.files[0];
        if(!file)return;
        const reader=new FileReader();
        reader.onload=async function(){
          try{
            const parsed=JSON.parse(reader.result);
            const incoming=Array.isArray(parsed)?parsed:parsed.transactions;
            if(!Array.isArray(incoming))throw new Error('Format data tidak valid.');
            if(!confirm('Pulihkan '+incoming.length+' transaksi ke database Supabase? Data transaksi yang sekarang akan digantikan setelah backup berhasil masuk.'))return;
            fresh.disabled=true;
            fresh.textContent='⏳ Memulihkan...';
            await restoreToCloud(incoming);
          }catch(e){
            console.error('Restore Supabase gagal:',e);
            alert('Gagal memulihkan ke Supabase: '+(e&&e.message?e.message:e));
          }finally{
            fresh.disabled=false;
            fresh.textContent='↩️ Pulihkan File';
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(install,150);});
  else setTimeout(install,150);
})();
