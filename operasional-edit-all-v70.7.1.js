/* Barokah Telur — Operational Edit All Columns
 * Preview-only patch for branch bugfix-v70.7-preview.
 * Edits: jenis, kategori, keterangan, tanggal, nominal, catatan.
 * No transaction number editing.
 */
(function(){
  'use strict';
  const SB = window.supabaseClient || window.supabase || window.barokahSupabase;
  if (!SB || !SB.from) return;
  function esc(v){ return String(v ?? '').replace(/[&<>\"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m])); }
  function id(){ return 'op-edit-all-modal'; }
  async function loadRow(rowId){
    const {data,error}=await SB.from('operational_transactions').select('*').eq('id',rowId).single();
    if(error) throw error; return data;
  }
  function open(row){
    document.getElementById(id())?.remove();
    const el=document.createElement('div'); el.id=id();
    el.innerHTML=`<div style="position:fixed;inset:0;background:#0008;z-index:99999;display:grid;place-items:center;padding:16px">
      <form id="op-edit-all-form" style="width:min(620px,100%);background:#fff;border-radius:16px;padding:20px;box-shadow:0 20px 60px #0004">
        <h3 style="margin:0 0 16px">Edit Transaksi Operasional</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <label>Jenis<select name="kind" style="width:100%;padding:9px"><option value="pemasukan" ${row.kind==='pemasukan'?'selected':''}>Pemasukan Operasional</option><option value="pengeluaran" ${row.kind==='pengeluaran'?'selected':''}>Pengeluaran Operasional</option></select></label>
          <label>Kategori<input name="category" value="${esc(row.category)}" style="width:100%;padding:9px"></label>
          <label style="grid-column:1/-1">Keterangan<input name="description" value="${esc(row.description ?? '')}" style="width:100%;padding:9px"></label>
          <label>Tanggal<input type="date" name="transaction_date" value="${esc(String(row.transaction_date ?? '').slice(0,10))}" style="width:100%;padding:9px"></label>
          <label>Nominal<input type="text" inputmode="numeric" name="amount" value="${Number(row.amount ?? 0).toLocaleString('id-ID')}" style="width:100%;padding:9px"></label>
          <label style="grid-column:1/-1">Catatan<textarea name="note" rows="3" style="width:100%;padding:9px">${esc(row.note ?? '')}</textarea></label>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button type="button" id="op-edit-cancel">Batal</button><button type="submit">Simpan Perubahan</button></div>
      </form></div>`;
    document.body.appendChild(el);
    const amount=el.querySelector('[name="amount"]');
    amount.addEventListener('input',()=>{const d=String(amount.value||'').replace(/\D/g,'');amount.value=d?d.replace(/\B(?=(\d{3})+(?!\d))/g,'.'):'';});
    el.querySelector('#op-edit-cancel').onclick=(e)=>{e.preventDefault();e.stopPropagation();el.remove();};
    el.querySelector('form').onsubmit=async e=>{
      e.preventDefault();
      const f=new FormData(e.currentTarget);
      const n=Number(String(f.get('amount')||'').replace(/\D/g,''));
      const patch={kind:String(f.get('kind')||'pengeluaran'),category:String(f.get('category')||'').trim(),description:String(f.get('description')||'').trim(),transaction_date:String(f.get('transaction_date')||''),amount:n,note:String(f.get('note')||'').trim()};
      if(!patch.description||!patch.transaction_date||!Number.isFinite(n)||n<=0){alert('Lengkapi keterangan, tanggal, dan nominal dengan benar.');return;}
      const {error}=await SB.from('operational_transactions').update(patch).eq('id',row.id);
      if(error){alert('Gagal menyimpan: '+error.message);return;}
      el.remove();
      window.dispatchEvent(new CustomEvent('barokah:operational-updated',{detail:{id:row.id}}));
      if(typeof window.loadOperationalData==='function') await window.loadOperationalData();
      else if(typeof window.renderOperational==='function') window.renderOperational();
    };
  }
  document.addEventListener('click',async e=>{
    const b=e.target.closest('[data-action="edit-operasional"],[data-edit-operational],[data-edit-id]');
    if(!b) return;
    const rowId=b.dataset.editId || b.dataset.id || b.dataset.operationalId;
    if(!rowId) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    try{ open(await loadRow(rowId)); }catch(err){ console.error(err); alert('Data operasional gagal dimuat.'); }
  },true);
})();
