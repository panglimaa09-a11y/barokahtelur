/* Barokah Telur — Operational Edit All Columns
 * Preview-only patch for branch bugfix-v70.7-preview.
 * Edits: jenis, kategori, keterangan, tanggal, nominal, catatan.
 * No transaction number editing.
 */
(function(){
  'use strict';
  const SB = window.supabaseClient || window.supabase;
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
          <label>Jenis<select name="type" style="width:100%;padding:9px"><option value="income" ${row.type==='income'?'selected':''}>Pemasukan</option><option value="expense" ${row.type==='expense'?'selected':''}>Pengeluaran</option></select></label>
          <label>Kategori<input name="category" value="${esc(row.category)}" style="width:100%;padding:9px"></label>
          <label style="grid-column:1/-1">Keterangan<input name="description" value="${esc(row.description ?? row.keterangan)}" style="width:100%;padding:9px"></label>
          <label>Tanggal<input type="date" name="date" value="${esc(String(row.date ?? '').slice(0,10))}" style="width:100%;padding:9px"></label>
          <label>Nominal<input type="number" min="0" step="1" name="amount" value="${Number(row.amount ?? row.nominal ?? 0)}" style="width:100%;padding:9px"></label>
          <label style="grid-column:1/-1">Catatan<textarea name="notes" rows="3" style="width:100%;padding:9px">${esc(row.notes ?? row.catatan)}</textarea></label>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button type="button" id="op-edit-cancel">Batal</button><button type="submit">Simpan Perubahan</button></div>
      </form></div>`;
    document.body.appendChild(el);
    el.querySelector('#op-edit-cancel').onclick=()=>el.remove();
    el.querySelector('form').onsubmit=async e=>{
      e.preventDefault(); const f=new FormData(e.currentTarget);
      const patch={type:f.get('type'),category:f.get('category'),description:f.get('description'),date:f.get('date'),amount:Number(f.get('amount')||0),notes:f.get('notes')};
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
    try{ open(await loadRow(rowId)); }catch(err){ console.error(err); alert('Data operasional gagal dimuat.'); }
  },true);
})();
