(function(){
  'use strict';
  const SB=()=>window.barokahSupabase;
  const STOCK_RE=/\/rest\/v1\/stock_movements(?:\?|$)/i;
  const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  async function user(){
    const sb=SB();
    if(!sb)throw Error('Supabase belum siap.');
    const r=await sb.auth.getUser();
    if(r.error||!r.data?.user)throw Error('Sesi login tidak aktif.');
    return r.data.user;
  }
  async function isAdmin(){
    const sb=SB();
    if(!sb)return false;
    const r=await sb.rpc('is_admin');
    return !r.error&&r.data===true;
  }
  async function safeDelete(id,{ask=true,refresh=true}={}){
    await user();
    const sb=SB();
    if(!id||!UUID_RE.test(String(id)))throw Error('ID riwayat stok tidak valid.');
    if(ask&&!confirm('Hapus riwayat stok ini? Data yang dihapus tidak bisa dikembalikan dari aplikasi.'))return false;
    const rpc=await sb.rpc('delete_own_stock_movement',{p_id:String(id)});
    if(rpc.error)throw rpc.error;
    if(refresh&&typeof window.renderStock==='function')await window.renderStock();
    if(refresh&&typeof window.barokahCloudSync==='function')await window.barokahCloudSync();
    if(refresh&&typeof window.toast==='function')window.toast('Riwayat stok berhasil dihapus.');
    return true;
  }
  async function safeClear(){
    const sb=SB();
    const u=await user();
    if(!confirm('Hapus seluruh riwayat stok dan reset Stok Gudang?'))return false;
    const admin=await isAdmin();
    let q=sb.from('stock_movements').select('id').order('created_at',{ascending:true}).order('id',{ascending:true});
    if(!admin)q=q.eq('user_id',u.id);
    const r=await q;
    if(r.error)throw r.error;
    const ids=(r.data||[]).map(x=>String(x.id)).filter(x=>UUID_RE.test(x));
    for(const id of ids)await safeDelete(id,{ask:false,refresh:false});
    if(typeof window.barokahCloudSync==='function')await window.barokahCloudSync();
    if(typeof window.renderStock==='function')await window.renderStock();
    if(typeof window.toast==='function')window.toast('Seluruh riwayat stok berhasil dihapus.');
    else alert('Riwayat stok dan saldo stok sudah di-reset ke 0 Butir.');
    return true;
  }
  window.__barokahStockSafety={safeDelete,safeClear};
  window.clearStockHistory=async()=>{
    try{await safeClear();}
    catch(e){console.error('[STOCK CLEAR]',e);alert('Gagal menghapus riwayat stok: '+(e.message||e));}
  };

  // HARD GUARD: legacy handlers may still call .from('stock_movements').delete().
  // Convert a single-row REST DELETE into the canonical RPC before it reaches Supabase.
  // This makes the browser incapable of sending the old DELETE request for stock rows.
  if(!window.__barokahStockDeleteFetchGuard){
    window.__barokahStockDeleteFetchGuard=true;
    const nativeFetch=window.fetch.bind(window);
    window.fetch=async function(input,init){
      try{
        const method=String(init?.method||input?.method||'GET').toUpperCase();
        const rawUrl=typeof input==='string'?input:(input?.url||'');
        if(method==='DELETE'&&STOCK_RE.test(rawUrl)){
          const url=new URL(rawUrl,window.location.href);
          const idParam=url.searchParams.get('id')||'';
          const match=idParam.match(/^eq\.([0-9a-f-]{36})$/i);
          const id=match?match[1]:null;
          if(id&&UUID_RE.test(id)){
            const sb=SB();
            if(!sb)throw Error('Supabase belum siap.');
            const rpc=await sb.rpc('delete_own_stock_movement',{p_id:id});
            if(rpc.error)throw rpc.error;
            return new Response(JSON.stringify(rpc.data??{ok:true,deleted_id:id}),{status:200,headers:{'Content-Type':'application/json'}});
          }
          console.error('[STOCK DELETE BLOCKED] Legacy DELETE tanpa ID ditolak:',rawUrl);
          return new Response(JSON.stringify({message:'Penghapusan stok wajib menggunakan delete_own_stock_movement(p_id).'}),{status:400,headers:{'Content-Type':'application/json'}});
        }
      }catch(err){
        console.error('[STOCK DELETE GUARD]',err);
        throw err;
      }
      return nativeFetch(input,init);
    };
  }

  document.addEventListener('click',function(e){
    const del=e.target.closest?.('[data-stock-delete]');
    if(!del)return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if(del.dataset.stockSafetyBusy==='1')return;
    del.dataset.stockSafetyBusy='1';
    Promise.resolve(safeDelete(del.getAttribute('data-stock-delete'))).catch(err=>{console.error('[STOCK DELETE]',err);alert('Gagal menghapus stok: '+(err.message||err));}).finally(()=>{del.dataset.stockSafetyBusy='0';});
  },true);
  document.addEventListener('click',function(e){
    const del=e.target.closest?.('.stock53-delete');
    if(!del)return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if(del.dataset.stockSafetyBusy==='1')return;
    del.dataset.stockSafetyBusy='1';
    Promise.resolve(safeDelete(del.dataset.id)).catch(err=>{console.error('[STOCK53 DELETE GUARD]',err);alert('Gagal menghapus stok: '+(err.message||err));}).finally(()=>{del.dataset.stockSafetyBusy='0';});
  },true);
  setTimeout(function(){
    document.querySelectorAll('[onclick*="clearStockHistory"]').forEach(function(b){
      b.removeAttribute('onclick');
      b.addEventListener('click',function(){window.clearStockHistory();});
    });
  },1800);
})();