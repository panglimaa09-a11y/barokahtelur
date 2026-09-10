(function(){
  'use strict';
  const SB=()=>window.barokahSupabase;
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  async function getUser(){
    const sb=SB();
    if(!sb)throw Error('Supabase belum siap.');
    const r=await sb.auth.getUser();
    if(r.error||!r.data?.user)throw Error('Sesi login tidak aktif.');
    return r.data.user;
  }

  async function isAdmin(){
    const sb=SB();
    const r=await sb.rpc('is_admin');
    return !r.error&&r.data===true;
  }

  async function deleteOne(id){
    if(!UUID.test(String(id)))throw Error('ID riwayat stok tidak valid.');
    const sb=SB();
    const r=await sb.rpc('delete_own_stock_movement',{p_id:String(id)});
    if(r.error)throw r.error;
    return r.data;
  }

  async function clearAll(){
    const sb=SB();
    const u=await getUser();
    if(!confirm('Hapus seluruh riwayat stok dan reset Stok Gudang?'))return false;
    const admin=await isAdmin();
    let q=sb.from('stock_movements').select('id').order('created_at',{ascending:true}).order('id',{ascending:true});
    if(!admin)q=q.eq('user_id',u.id);
    const r=await q;
    if(r.error)throw r.error;
    const ids=(r.data||[]).map(x=>String(x.id)).filter(x=>UUID.test(x));
    for(const id of ids)await deleteOne(id);
    if(typeof window.renderStock==='function')await window.renderStock();
    if(typeof window.barokahCloudSync==='function')await window.barokahCloudSync();
    if(typeof window.toast==='function')window.toast('Seluruh riwayat stok berhasil dihapus.');
    else alert('Riwayat stok dan saldo stok sudah di-reset ke 0 Butir.');
    return true;
  }

  window.__barokahStockRpcEnforcer={deleteOne,clearAll};
  window.deleteStockMovement=async function(id){
    if(!confirm('Hapus riwayat stok ini? Data yang dihapus tidak bisa dikembalikan dari aplikasi.'))return;
    try{
      await deleteOne(id);
      if(typeof window.renderStock==='function')await window.renderStock();
      if(typeof window.barokahCloudSync==='function')await window.barokahCloudSync();
      if(typeof window.toast==='function')window.toast('Riwayat stok berhasil dihapus.');
    }catch(e){console.error('[STOCK RPC ENFORCER DELETE]',e);alert('Gagal menghapus stok: '+(e.message||e));}
  };
  window.clearStockHistory=async function(){
    try{await clearAll();}
    catch(e){console.error('[STOCK RPC ENFORCER CLEAR]',e);alert('Gagal menghapus riwayat stok: '+(e.message||e));}
  };

  // This capture handler runs before legacy shared-stock-sync listeners.
  // It prevents legacy .delete() calls from ever reaching Supabase.
  document.addEventListener('click',function(e){
    const del=e.target.closest?.('[data-stock-delete],.stock-action-delete,.stock53-delete');
    if(del){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      if(del.dataset.rpcEnforcerBusy==='1')return;
      del.dataset.rpcEnforcerBusy='1';
      Promise.resolve(window.deleteStockMovement(del.getAttribute('data-stock-delete')||del.getAttribute('data-id'))).finally(()=>{del.dataset.rpcEnforcerBusy='0';});
      return;
    }
    const clearBtn=e.target.closest?.('[onclick*="clearStockHistory"],[data-stock-clear],#clearStockHistoryBtn,#clearStockBtn');
    if(clearBtn){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      if(clearBtn.dataset.rpcEnforcerBusy==='1')return;
      clearBtn.dataset.rpcEnforcerBusy='1';
      Promise.resolve(window.clearStockHistory()).finally(()=>{clearBtn.dataset.rpcEnforcerBusy='0';});
    }
  },true);

  console.log('[Barokah] Stock RPC Enforcer v1 active — legacy stock DELETE disabled.');
})();
