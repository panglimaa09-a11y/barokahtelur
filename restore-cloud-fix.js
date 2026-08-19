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
    if(incoming.length===0)throw new Error('Backup tidak berisi transaksi. Data lama tidak diubah.');
    const rows=incoming.map(function(x){const id=makeId();if(!id)throw new Error('Browser tidak mendukung pembuatan ID transaksi.');const created=Number(x.createdAt);return {id:id,user_id:user.id,note:String(x.note==null?'':x.note),price:Number(x.price||0),unit:String(x.unit==null?'':x.unit),qty:Number(x.qty||0),total:Number(x.total||0),type:x.type==='expense'?'expense':'income',transaction_date:String(x.date||new Date().toISOString().slice(0,10)),created_at:Number.isFinite(created)&&created>0?new Date(created).toISOString():new Date().toISOString()};});
    const inserted=[];
    for(let i=0;i<rows.length;i+=100){const {data,error}=await sb.from('transactions').insert(rows.slice(i,i+100)).select('*');if(error)throw error;inserted.push.apply(inserted,data||[]);}
    const insertedIds=inserted.map(r=>String(r.id));
    if(insertedIds.length!==rows.length)throw new Error('Supabase hanya menerima '+insertedIds.length+' dari '+rows.length+' transaksi. Data lama tidak dihapus.');
    const verify=await sb.from('transactions').select('id,user_id').eq('user_id',user.id).in('id',insertedIds);if(verify.error)throw verify.error;const verifiedIds=new Set((verify.data||[]).map(r=>String(r.id)));
    if(verifiedIds.size!==insertedIds.length){try{await sb.from('transactions').delete().eq('user_id',user.id).in('id',insertedIds);}catch(cleanErr){console.error('Cleanup restore gagal:',cleanErr);}throw new Error('Verifikasi Supabase gagal: data backup belum dapat dibaca kembali. Data lama tetap dipertahankan.');}
    const current=await sb.from('transactions').select('id').eq('user_id',user.id);if(current.error)throw current.error;const keep=new Set(insertedIds);const oldIds=(current.data||[]).map(r=>String(r.id)).filter(id=>!keep.has(id));
    for(let i=0;i<oldIds.length;i+=100){const {error}=await sb.from('transactions').delete().in('id',oldIds.slice(i,i+100)).eq('user_id',user.id);if(error)throw error;}
    const finalRead=await sb.from('transactions').select('*').eq('user_id',user.id).order('transaction_date',{ascending:false}).order('created_at',{ascending:false});if(finalRead.error)throw finalRead.error;const finalRows=finalRead.data||[];
    if(finalRows.length!==rows.length)throw new Error('Verifikasi akhir gagal: Supabase membaca '+finalRows.length+' transaksi, seharusnya '+rows.length+'.');
    const normalized=finalRows.map(function(r){return {id:r.id,note:r.note,price:Number(r.price),unit:r.unit,qty:Number(r.qty),total:Number(r.total),type:r.type,date:r.transaction_date,createdAt:new Date(r.created_at).getTime()};});
    try{localStorage.setItem('barokah_telur_owner_final_v1',JSON.stringify(normalized));}catch(e){console.warn('Cache local gagal:',e);}
    if(typeof window.barokahCloudSync==='function')await window.barokahCloudSync();else if(typeof render==='function')render();
    toastSafe('Backup berhasil dipulihkan, diverifikasi, dan disimpan ke Supabase.');
  }

  function install(){
    const btn=document.getElementById('restoreFileBtn');if(!btn||btn.dataset.cloudRestoreInstalled==='1')return;const fresh=btn.cloneNode(true);fresh.dataset.cloudRestoreInstalled='1';btn.parentNode.replaceChild(fresh,btn);
    fresh.addEventListener('click',function(){const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=function(){const file=input.files&&input.files[0];if(!file)return;const reader=new FileReader();reader.onload=async function(){try{const parsed=JSON.parse(reader.result);const incoming=Array.isArray(parsed)?parsed:parsed.transactions;if(!Array.isArray(incoming))throw new Error('Format data tidak valid.');if(!incoming.length)throw new Error('Backup tidak berisi transaksi.');if(!confirm('Pulihkan '+incoming.length+' transaksi ke database Supabase? Data lama hanya akan diganti setelah backup berhasil disimpan dan diverifikasi kembali dari Supabase.'))return;fresh.disabled=true;fresh.textContent='⏳ Memverifikasi & memulihkan...';await restoreToCloud(incoming);}catch(e){console.error('Restore Supabase gagal:',e);alert('Gagal memulihkan ke Supabase: '+(e&&e.message?e.message:e));}finally{fresh.disabled=false;fresh.textContent='↩️ Pulihkan File';}};reader.readAsText(file);};input.click();});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(install,150);});else setTimeout(install,150);
  // V70.3.7: load the standalone Utang Piutang module without mixing it into transactions.
  function loadDebtModule(){if(document.querySelector('script[data-barokah-debt]'))return;var s=document.createElement('script');s.src='utang-piutang.js';s.dataset.barokahDebt='1';s.onload=function(){console.log('Barokah Utang Piutang V70.3.7 loaded');};s.onerror=function(){console.error('Gagal memuat utang-piutang.js');};document.head.appendChild(s);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(loadDebtModule,300);});else setTimeout(loadDebtModule,300);
})();