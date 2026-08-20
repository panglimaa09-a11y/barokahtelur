(function(){
  'use strict';
  const SB=()=>window.barokahSupabase;
  const fmt=n=>Number(n||0).toLocaleString('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0});
  const digits=v=>String(v??'').replace(/\D/g,'');
  const rupiah=v=>{const d=digits(v);return d?(d.replace(/^0+(?=\d)/,'')||'0').replace(/\B(?=(\d{3})+(?!\d))/g,'.'):'';};
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  let observerTimer=null;

  function css(){
    if(document.getElementById('barokahOperationalEditCss'))return;
    const s=document.createElement('style');s.id='barokahOperationalEditCss';
    s.textContent=`
      .op-edit{border:1px solid #d8e4dc;background:#f4faf6;color:#17603f;border-radius:9px;padding:7px 9px;font-weight:800;font-size:11px;cursor:pointer;margin-left:4px}.op-edit:hover{background:#e9f5ed}
      .op-modal-backdrop{position:fixed;inset:0;background:rgba(10,20,14,.48);z-index:99999;display:flex;align-items:center;justify-content:center;padding:18px}
      .op-modal{width:min(620px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:20px;box-shadow:0 24px 80px rgba(0,0,0,.25);padding:22px}.op-modal h3{margin:0}.op-modal-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px}.op-modal-field{display:grid;gap:6px}.op-modal-field.full{grid-column:1/-1}.op-modal-field label{font-size:12px;font-weight:800}.op-modal-field input,.op-modal-field select{height:42px;border:1px solid #d6ded8;border-radius:10px;padding:0 11px;width:100%;background:#fff}.op-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px;flex-wrap:wrap}.op-modal-actions button{border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer}.op-modal-cancel{border:1px solid #d6ded8;background:#fff}.op-modal-save{border:0;background:#17603f;color:#fff}@media(max-width:600px){.op-modal-grid{grid-template-columns:1fr}.op-modal-field.full{grid-column:auto}}
    `;document.head.appendChild(s);
  }

  async function user(){
    const sb=SB(); if(!sb) throw new Error('Supabase belum siap.');
    const {data,error}=await sb.auth.getUser(); if(error)throw error;
    if(!data.user)throw new Error('Sesi login tidak aktif.'); return data.user;
  }

  async function getRow(id){
    const u=await user();
    const {data,error}=await SB().from('operational_transactions').select('*').eq('id',id).eq('user_id',u.id).maybeSingle();
    if(error)throw error; if(!data)throw new Error('Transaksi tidak ditemukan.'); return data;
  }

  function ensureEditButtons(){
    const box=document.getElementById('opTable'); if(!box)return;
    box.querySelectorAll('[data-op-del]').forEach(del=>{
      const id=del.getAttribute('data-op-del'); if(!id||del.parentElement.querySelector('[data-op-edit]'))return;
      const b=document.createElement('button'); b.className='op-edit'; b.type='button'; b.textContent='Edit'; b.dataset.opEdit=id;
      del.parentElement.insertBefore(b,del.nextSibling);
    });
  }

  function openModal(row){
    closeModal();
    const back=document.createElement('div'); back.className='op-modal-backdrop'; back.id='opEditModal';
    back.innerHTML=`<div class="op-modal" role="dialog" aria-modal="true"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><h3>Edit Transaksi Operasional</h3><div style="font-size:12px;color:#6d776f;margin-top:4px">No. Transaksi: <strong>${esc(row.reference_no||'-')}</strong></div></div><button type="button" class="op-modal-cancel" data-op-close>✕</button></div>
      <form id="opEditForm"><div class="op-modal-grid"><div class="op-modal-field"><label>Jenis</label><select id="opEditKind"><option value="pengeluaran">Pengeluaran Operasional</option><option value="pemasukan">Pemasukan Operasional</option></select></div><div class="op-modal-field"><label>Kategori</label><input id="opEditCategory" value="${esc(row.category||'')}" required></div><div class="op-modal-field full"><label>Keterangan</label><input id="opEditDescription" value="${esc(row.description||'')}" required></div><div class="op-modal-field"><label>Tanggal</label><input id="opEditDate" type="date" value="${esc(row.transaction_date||'')}" required></div><div class="op-modal-field"><label>Nominal</label><input id="opEditAmount" type="text" inputmode="numeric" value="${rupiah(row.amount)}" required></div><div class="op-modal-field full"><label>Catatan</label><input id="opEditNote" value="${esc(row.note||'')}" placeholder="Catatan tambahan (opsional)"></div></div><div class="op-modal-actions"><button type="button" class="op-modal-cancel" data-op-close>Batal</button><button type="submit" class="op-modal-save">Simpan Perubahan</button></div></form></div>`;
    document.body.appendChild(back);
    back.querySelector('#opEditKind').value=row.kind||'pengeluaran';
    const amount=back.querySelector('#opEditAmount'); amount.addEventListener('input',()=>amount.value=rupiah(amount.value));
    back.querySelectorAll('[data-op-close]').forEach(b=>b.addEventListener('click',closeModal));
    back.addEventListener('click',e=>{if(e.target===back)closeModal();});
    back.querySelector('#opEditForm').addEventListener('submit',e=>saveEdit(e,row.id));
  }

  function closeModal(){document.getElementById('opEditModal')?.remove();}

  async function saveEdit(ev,id){
    ev.preventDefault();
    const btn=ev.submitter; if(btn)btn.disabled=true;
    try{
      const u=await user();
      const amount=Number(digits(document.getElementById('opEditAmount').value));
      const description=document.getElementById('opEditDescription').value.trim();
      if(!description||!Number.isFinite(amount)||amount<=0)throw new Error('Keterangan dan nominal harus diisi dengan benar.');
      const payload={kind:document.getElementById('opEditKind').value,category:document.getElementById('opEditCategory').value.trim(),description,transaction_date:document.getElementById('opEditDate').value,note:document.getElementById('opEditNote').value.trim(),amount};
      const {error}=await SB().from('operational_transactions').update(payload).eq('id',id).eq('user_id',u.id);
      if(error)throw error;
      closeModal();
      if(typeof window.barokahOperationalReload==='function')await window.barokahOperationalReload();
      else location.reload();
    }catch(e){alert('Gagal menyimpan perubahan: '+(e.message||e));if(btn)btn.disabled=false;}
  }

  async function edit(id){try{openModal(await getRow(id));}catch(e){alert('Gagal memuat transaksi: '+(e.message||e));}}

  function observe(){
    css();
    const box=document.getElementById('opTable');
    if(box && !box.dataset.editObserver){
      box.dataset.editObserver='1';
      new MutationObserver(()=>{clearTimeout(observerTimer);observerTimer=setTimeout(ensureEditButtons,30);}).observe(box,{childList:true,subtree:true});
    }
    ensureEditButtons();
    if(!document.body.dataset.opEditDelegated){
      document.body.dataset.opEditDelegated='1';
      document.addEventListener('click',e=>{const b=e.target.closest?.('[data-op-edit]');if(b){e.preventDefault();edit(b.dataset.opEdit);}});
    }
  }

  function boot(){observe();setTimeout(observe,500);setTimeout(observe,1500);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();