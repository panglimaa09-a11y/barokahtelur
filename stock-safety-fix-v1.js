(function(){
  'use strict';
  const SB=()=>window.barokahSupabase;
  async function user(){
    const sb=SB();
    if(!sb)throw Error('Supabase belum siap.');
    const r=await sb.auth.getUser();
    if(r.error||!r.data?.user)throw Error('Sesi login tidak aktif.');
    return r.data.user;
  }
  async function isAdmin(){
    const r=await SB().rpc('is_admin');
    return !r.error&&r.data===true;
  }
  async function safeDelete(id){
    await user();
    const sb=SB();
    if(!id)throw Error('ID riwayat stok tidak valid.');

    // Deletion is now performed by PostgreSQL in one transaction.
    // Do not delete/update rows sequentially in the browser: that was the
    // source of saldo_after_butir_check failures and race conditions.
    const rpc=await sb.rpc('delete_own_stock_movement',{p_id:id});
    if(rpc.error)throw rpc.error;

    if(typeof window.renderStock==='function')await window.renderStock();
    if(typeof window.barokahCloudSync==='function')await window.barokahCloudSync();
    if(typeof window.toast==='function')window.toast('Riwayat stok berhasil dihapus.');
  }
  async function safeClear(){
    const sb=SB(),u=await user();
    if(!confirm('Hapus seluruh riwayat stok dan reset Stok Gudang?'))return;

    // Keep an explicit WHERE clause to avoid Supabase/PostgREST rejecting
    // an unrestricted DELETE. The RPC is intentionally used for single-row
    // deletion; clear-all remains scoped to the signed-in user unless admin.
    let q=sb.from('stock_movements').delete().not('id','is',null);
    if(!(await isAdmin()))q=q.eq('user_id',u.id);
    const r=await q;
    if(r.error)throw r.error;

    if(typeof window.barokahCloudSync==='function')await window.barokahCloudSync();
    if(typeof window.renderStock==='function')await window.renderStock();
    alert('Riwayat stok dan saldo stok sudah di-reset ke 0 Butir.');
  }
  window.__barokahStockSafety={safeDelete,safeClear};
  window.clearStockHistory=async()=>{
    try{await safeClear();}
    catch(e){alert('Gagal menghapus riwayat stok: '+(e.message||e));}
  };
  document.addEventListener('click',async function(e){
    const del=e.target.closest?.('[data-stock-delete]');
    if(!del)return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    if(!confirm('Hapus riwayat stok ini? Data yang dihapus tidak bisa dikembalikan dari aplikasi.'))return;
    del.disabled=true;
    try{await safeDelete(del.getAttribute('data-stock-delete'));}
    catch(err){alert('Gagal menghapus stok: '+(err.message||err));}
    finally{del.disabled=false;}
  },true);
  setTimeout(function(){
    const buttons=document.querySelectorAll('[onclick*="clearStockHistory"]');
    buttons.forEach(b=>{
      b.removeAttribute('onclick');
      b.addEventListener('click',()=>window.clearStockHistory());
    });
  },1800);
})();
