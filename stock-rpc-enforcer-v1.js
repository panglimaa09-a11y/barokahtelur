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

  async function deleteOne(id){
    if(!UUID.test(String(id)))throw Error('ID riwayat stok tidak valid.');
    const sb=SB();
    const r=await sb.rpc('delete_own_stock_movement',{p_id:String(id)});
    if(r.error)throw r.error;
    return r.data;
  }

  function resetLocalStockState(){
    const keys=[
      'barokah_stock_v53_butir',
      'barokah_stock_v51_butir',
      'barokah_stock_v50',
      'barokah_stock_history_v53',
      'barokah_stock_history_v51',
      'barokah_stock_history_v50',
      'barokah_stock_history_v49',
      'barokah_bad_v59',
      'barokah_unfit_v59',
      'barokah_bad_eggs_v1'
    ];
    try{
      keys.forEach(k=>localStorage.removeItem(k));
      localStorage.setItem('barokah_stock_v53_butir','0');
      localStorage.setItem('barokah_stock_history_v53','[]');
      localStorage.setItem('barokah_bad_v59','0');
      localStorage.setItem('barokah_unfit_v59','0');
    }catch(e){}
  }

  // Bulk reset uses one atomic RPC. After the database is emptied, also purge
  // every legacy local-storage stock cache so an old browser state cannot
  // repopulate the screen after refresh.
  async function clearAllSafe(){
    const sb=SB();
    await getUser();
    if(!confirm('Hapus seluruh riwayat stok dan reset Stok Gudang?'))return false;

    const r=await sb.rpc('clear_own_stock_movements');
    if(r.error)throw r.error;

    // Clear browser caches immediately and again after cloud refresh.
    resetLocalStockState();
    if(typeof window.barokahCloudSync==='function')await window.barokahCloudSync();
    resetLocalStockState();
    if(typeof window.renderStock==='function')await window.renderStock();

    if(typeof window.toast==='function')window.toast('Seluruh riwayat stok berhasil dihapus. Stok Gudang kembali 0 Butir.');
    else alert('Riwayat stok dan saldo stok sudah di-reset ke 0 Butir.');
    return true;
  }

  async function safeDeleteHandler(id){
    if(!confirm('Hapus riwayat stok ini? Data yang dihapus tidak bisa dikembalikan dari aplikasi.'))return;
    try{
      await deleteOne(id);
      if(typeof window.renderStock==='function')await window.renderStock();
      if(typeof window.barokahCloudSync==='function')await window.barokahCloudSync();
      if(typeof window.toast==='function')window.toast('Riwayat stok berhasil dihapus.');
    }catch(e){console.error('[STOCK RPC ENFORCER DELETE]',e);alert('Gagal menghapus stok: '+(e.message||e));}
  }

  async function safeClearHandler(){
    try{await clearAllSafe();}
    catch(e){console.error('[STOCK RPC ENFORCER CLEAR]',e);alert('Gagal menghapus riwayat stok: '+(e.message||e));}
  }

  function installGlobals(){
    window.__barokahStockRpcEnforcer={deleteOne,clearAll:clearAllSafe};
    window.deleteStockMovement=safeDeleteHandler;
    window.clearStockHistory=safeClearHandler;
  }
  installGlobals();
  setTimeout(installGlobals,500);
  setTimeout(installGlobals,1500);
  setTimeout(installGlobals,3000);

  document.addEventListener('click',function(e){
    const el=e.target?.closest?.('button,a,[role="button"]');
    if(!el)return;
    const text=String(el.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
    const del=el.closest?.('[data-stock-delete],.stock-action-delete,.stock53-delete')||
      (el.matches?.('[data-stock-delete],.stock-action-delete,.stock53-delete')?el:null);
    const bulk=el.closest?.('[data-stock-clear],#clearStockHistoryBtn,#clearStockBtn')||
      (el.matches?.('[data-stock-clear],#clearStockHistoryBtn,#clearStockBtn')?el:null)||
      (/hapus\s+seluruh\s+riwayat\s+stok/.test(text)||/reset\s+stok\s+gudang/.test(text));
    if(del){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      if(del.dataset.rpcEnforcerBusy==='1')return;
      del.dataset.rpcEnforcerBusy='1';
      const id=del.getAttribute('data-stock-delete')||del.getAttribute('data-id');
      Promise.resolve(safeDeleteHandler(id)).finally(()=>{del.dataset.rpcEnforcerBusy='0';});
      return;
    }
    if(bulk){
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      if(el.dataset.rpcEnforcerBusy==='1')return;
      el.dataset.rpcEnforcerBusy='1';
      Promise.resolve(safeClearHandler()).finally(()=>{el.dataset.rpcEnforcerBusy='0';});
    }
  },true);

  if(window.MutationObserver){
    const observer=new MutationObserver(()=>installGlobals());
    observer.observe(document.documentElement||document,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),10000);
  }
  console.log('[Barokah] Stock RPC Enforcer v5 active — atomic reset + local cache purge.');
})();
