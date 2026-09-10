(function(){
  'use strict';
  const ZERO='00000000-0000-0000-0000-000000000000';
  const SB=()=>window.barokahSupabase;
  async function user(){const r=await SB().auth.getUser();if(r.error||!r.data?.user)throw Error('Sesi login tidak aktif.');return r.data.user;}
  async function isAdmin(){const r=await SB().rpc('is_admin');return !r.error&&r.data===true;}
  function sorted(rows){return rows.slice().sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)||String(a.id).localeCompare(String(b.id)));}
  function running(rows){let n=0;const out=[];for(const r of sorted(rows)){n+=Number(r.delta_butir||0);out.push({...r,next:n});}return out;}
  async function safeDelete(id){
    const sb=SB(),u=await user();
    const admin=await isAdmin();
    let q=sb.from('stock_movements').select('id,user_id,created_at,delta_butir,saldo_after_butir').order('created_at',{ascending:true}).order('id',{ascending:true});
    if(!admin)q=q.eq('user_id',u.id);
    const r=await q;if(r.error)throw r.error;
    const rows=(r.data||[]).filter(x=>String(x.id)!==String(id));
    const bad=running(rows).find(x=>Number(x.next)<0);
    if(bad)throw Error('Riwayat ini tidak bisa dihapus karena akan membuat saldo stok historis menjadi negatif. Tambahkan stok masuk terlebih dahulu atau hapus transaksi pengeluaran yang terkait.');
    let d=sb.from('stock_movements').delete().eq('id',id);if(!admin)d=d.eq('user_id',u.id);const dr=await d;if(dr.error)throw dr.error;
    let n=0;for(const x of sorted(rows)){n+=Number(x.delta_butir||0);let up=sb.from('stock_movements').update({saldo_after_butir:n}).eq('id',x.id);if(!admin)up=up.eq('user_id',u.id);const ur=await up;if(ur.error)throw ur.error;}
    if(typeof window.renderStock==='function')window.renderStock();
    if(typeof window.barokahCloudSync==='function')await window.barokahCloudSync();
    if(typeof window.toast==='function')window.toast('Riwayat stok berhasil dihapus.');
  }
  async function safeClear(){
    const sb=SB(),u=await user();if(!confirm('Hapus seluruh riwayat stok dan reset Stok Gudang?'))return;
    let q=sb.from('stock_movements').delete().neq('id',ZERO);if(!(await isAdmin()))q=q.eq('user_id',u.id);
    const r=await q;if(r.error)throw r.error;
    if(typeof window.barokahCloudSync==='function')await window.barokahCloudSync();
    if(typeof window.renderStock==='function')window.renderStock();
    alert('Riwayat stok dan saldo stok sudah di-reset ke 0 Butir.');
  }
  window.__barokahStockSafety={safeDelete,safeClear};
  window.clearStockHistory=async()=>{try{await safeClear()}catch(e){alert('Gagal menghapus riwayat stok: '+(e.message||e));}};
  document.addEventListener('click',async function(e){
    const del=e.target.closest?.('[data-stock-delete]');if(!del)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    if(!confirm('Hapus riwayat stok ini? Data yang dihapus tidak bisa dikembalikan dari aplikasi.'))return;
    del.disabled=true;try{await safeDelete(del.getAttribute('data-stock-delete'));}catch(err){alert('Gagal menghapus stok: '+(err.message||err));}finally{del.disabled=false;}
  },true);
  setTimeout(function(){
    const buttons=document.querySelectorAll('[onclick*="clearStockHistory"]');buttons.forEach(b=>{b.removeAttribute('onclick');b.addEventListener('click',()=>window.clearStockHistory());});
  },1800);
})();
