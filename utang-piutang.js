(function(){
  'use strict';
  const SB=()=>window.barokahSupabase;
  const fmt=n=>Number(n||0).toLocaleString('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0});
  const esc=v=>String(v==null?'':v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const today=()=>new Date().toISOString().slice(0,10);
  let rows=[];
  let tab='piutang';
  let editingId=null;

  function css(){
    if(document.getElementById('barokahDebtCss'))return;
    const s=document.createElement('style');s.id='barokahDebtCss';
    s.textContent=`
      #page-debt{overflow-x:hidden}
      #page-debt .debt-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:18px 0}
      #page-debt .debt-stat{background:#fff;border:1px solid #e1e7e2;border-radius:18px;padding:17px;box-shadow:0 10px 30px rgba(18,42,29,.07)}
      #page-debt .debt-stat small{display:block;color:#6d776f;font-size:11px}#page-debt .debt-stat strong{display:block;font-size:22px;margin-top:8px}
      #page-debt .debt-stat.piutang{border-top:4px solid #24a36b}#page-debt .debt-stat.utang{border-top:4px solid #bd4037}
      #page-debt .debt-panel{background:#fff;border:1px solid #e1e7e2;border-radius:20px;padding:18px;box-shadow:0 10px 30px rgba(18,42,29,.07);margin-top:16px}
      #page-debt .debt-tabs{display:flex;gap:8px;margin-bottom:15px;flex-wrap:wrap}#page-debt .debt-tabs button{border:1px solid #dce5df;background:#fff;border-radius:10px;padding:10px 14px;font-weight:800;color:#4d5a52}#page-debt .debt-tabs button.active{background:#0d5b45;color:#fff;border-color:#0d5b45}
      #page-debt .debt-form{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.debt-field{display:grid;gap:6px}.debt-field.full{grid-column:1/-1}.debt-field label{font-size:12px;font-weight:800}.debt-field input,.debt-field select{height:42px;border:1px solid #d6ded8;border-radius:10px;padding:0 11px;background:#fff}.debt-actions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}
      #page-debt .debt-table{overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;touch-action:pan-x pan-y;-webkit-overflow-scrolling:touch}
      #page-debt table{min-width:1060px;width:100%;border-collapse:collapse;table-layout:auto}#page-debt th,#page-debt td{padding:12px;border-bottom:1px solid #edf0ed;text-align:left;font-size:12px;vertical-align:middle}#page-debt th{font-size:10px;text-transform:uppercase;color:#6d776f;white-space:nowrap}.debt-status{display:inline-block;padding:5px 8px;border-radius:999px;font-size:10px;font-weight:900;white-space:nowrap}.debt-status.lunas{background:#edf8f1;color:#087344}.debt-status.sebagian{background:#fff7d5;color:#725900}.debt-status.belum{background:#fff0ee;color:#a72e28}.debt-pay,.debt-edit,.debt-nota{border:0;border-radius:9px;background:#0d5b45;color:#fff;padding:8px 10px;font-weight:800;font-size:11px;white-space:nowrap;cursor:pointer}.debt-edit{background:#245b8a}.debt-nota{background:#fff;color:#0d5b45;border:1px solid #d6ded8}.debt-del{border:1px solid #f2cdc9;border-radius:9px;background:#fff0ee;color:#bd4037;padding:7px 9px;font-weight:800;font-size:11px;white-space:nowrap;cursor:pointer}.debt-toolbar{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px}.debt-toolbar input{height:38px;border:1px solid #d6ded8;border-radius:9px;padding:0 10px;min-width:220px}.debt-empty{text-align:center;color:#6d776f;padding:28px}.debt-help{font-size:11px;color:#6d776f;margin:4px 0 14px}.debt-actions-cell{display:flex;gap:5px;flex-wrap:wrap;align-items:center;min-width:260px}
      .barokah-debt-modal{position:fixed;inset:0;background:rgba(10,25,18,.48);display:none;align-items:center;justify-content:center;padding:16px;z-index:99999}.barokah-debt-modal.open{display:flex}.barokah-debt-dialog{width:min(620px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:20px;padding:20px;box-shadow:0 25px 70px rgba(0,0,0,.25)}.barokah-debt-dialog h3{margin:0 0 4px;font-size:22px}.barokah-debt-dialog .modal-help{font-size:12px;color:#6d776f;margin-bottom:16px}.barokah-debt-dialog .modal-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.barokah-debt-dialog .modal-field{display:grid;gap:6px}.barokah-debt-dialog .modal-field.full{grid-column:1/-1}.barokah-debt-dialog label{font-size:12px;font-weight:800}.barokah-debt-dialog input,.barokah-debt-dialog select{height:42px;border:1px solid #d6ded8;border-radius:10px;padding:0 11px;background:#fff;width:100%;box-sizing:border-box}.barokah-debt-dialog .modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap}
      @media(max-width:850px){#page-debt .debt-summary{grid-template-columns:1fr 1fr}}@media(max-width:600px){#page-debt .debt-summary{grid-template-columns:1fr}.debt-form{grid-template-columns:1fr!important}.debt-field.full{grid-column:auto}.debt-toolbar input{width:100%;min-width:0}.barokah-debt-dialog .modal-grid{grid-template-columns:1fr}.barokah-debt-dialog .modal-field.full{grid-column:auto}}
    `;document.head.appendChild(s);
  }

  function status(r){const paid=Number(r.paid_amount||0),total=Number(r.total_amount||0);if(paid>=total)return ['Lunas','lunas'];if(paid>0)return ['Sebagian','sebagian'];return ['Belum Bayar','belum'];}
  function balance(r){return Math.max(0,Number(r.total_amount||0)-Number(r.paid_amount||0));}

  function page(){
    if(document.getElementById('page-debt'))return;
    const wrap=document.querySelector('.wrap');if(!wrap)return;
    const el=document.createElement('section');el.id='page-debt';el.className='page';
    el.innerHTML=`<div class="hero"><div class="eyebrow">KEUANGAN</div><h1>Utang Piutang</h1><p>Kelola utang kepada supplier dan piutang pelanggan secara terpisah dari Riwayat Transaksi.</p></div>
      <div class="debt-summary"><div class="debt-stat piutang"><small>Total Piutang</small><strong id="debtTotalPiutang">Rp0</strong></div><div class="debt-stat utang"><small>Total Utang</small><strong id="debtTotalUtang">Rp0</strong></div><div class="debt-stat"><small>Belum Lunas</small><strong id="debtCountOpen">0</strong></div><div class="debt-stat"><small>Pembayaran Tercatat</small><strong id="debtPaidTotal">Rp0</strong></div></div>
      <div class="debt-panel"><h2 style="margin:0 0 5px">Tambah Catatan</h2><div class="debt-help">Catatan ini disimpan di tabel Utang Piutang dan tidak masuk ke Riwayat Transaksi.</div>
        <form id="debtForm"><div class="debt-form"><div class="debt-field"><label>Jenis</label><select id="debtKind"><option value="piutang">Piutang Pelanggan</option><option value="utang">Utang Supplier</option></select></div><div class="debt-field"><label>Nama</label><input id="debtParty" required placeholder="Nama pelanggan / supplier"></div><div class="debt-field"><label>No. WhatsApp</label><input id="debtPhone" placeholder="Opsional"></div><div class="debt-field"><label>No. Transaksi / Referensi</label><input id="debtRef" placeholder="Contoh: INV-001"></div><div class="debt-field"><label>Tanggal</label><input id="debtDate" type="date" value="${today()}" required></div><div class="debt-field"><label>Jatuh Tempo (opsional)</label><input id="debtDue" type="date"></div><div class="debt-field"><label>Total</label><input id="debtTotal" type="number" min="1" step="1" required placeholder="0"></div><div class="debt-field"><label>Sudah Dibayar</label><input id="debtPaid" type="number" min="0" step="1" value="0"></div><div class="debt-field full"><label>Keterangan</label><input id="debtNote" placeholder="Catatan tambahan"></div></div><div class="debt-actions"><button class="btn primary" type="submit">+ Simpan Utang/Piutang</button><button class="btn ghost" type="reset">Reset</button></div></form></div>
      <div class="debt-panel"><div class="debt-tabs"><button type="button" data-debt-tab="piutang" class="active">Piutang Pelanggan</button><button type="button" data-debt-tab="utang">Utang Supplier</button></div><div class="debt-toolbar"><strong id="debtListTitle">Daftar Piutang</strong><div style="display:flex;gap:8px;flex-wrap:wrap"><input id="debtSearch" placeholder="Cari nama / referensi..."><button type="button" class="btn ghost" id="debtPrint">🖨️ Cetak</button></div></div><div class="debt-table" id="debtTable"></div></div>
      <div class="barokah-debt-modal" id="debtEditModal" aria-hidden="true"><div class="barokah-debt-dialog" role="dialog" aria-modal="true"><h3>Edit Utang/Piutang</h3><div class="modal-help">Semua kolom dapat diedit. Perubahan disimpan langsung ke Supabase Barokah Telur.</div><form id="debtEditForm"><div class="modal-grid"><div class="modal-field"><label>Jenis</label><select id="editDebtKind"><option value="piutang">Piutang Pelanggan</option><option value="utang">Utang Supplier</option></select></div><div class="modal-field"><label>Nama</label><input id="editDebtParty" required></div><div class="modal-field"><label>No. WhatsApp</label><input id="editDebtPhone"></div><div class="modal-field"><label>No. Transaksi / Referensi</label><input id="editDebtRef"></div><div class="modal-field"><label>Tanggal</label><input id="editDebtDate" type="date" required></div><div class="modal-field"><label>Jatuh Tempo</label><input id="editDebtDue" type="date"></div><div class="modal-field"><label>Total</label><input id="editDebtTotal" type="number" min="1" step="1" required></div><div class="modal-field"><label>Sudah Dibayar</label><input id="editDebtPaid" type="number" min="0" step="1" required></div><div class="modal-field full"><label>Keterangan</label><input id="editDebtNote"></div></div><div class="modal-actions"><button type="button" class="btn ghost" id="debtEditCancel">Batal</button><button type="submit" class="btn primary">💾 Simpan Perubahan</button></div></form></div></div>`;
    wrap.appendChild(el);
    el.querySelectorAll('[data-debt-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.debtTab;el.querySelectorAll('[data-debt-tab]').forEach(x=>x.classList.toggle('active',x===b));render();}));
    el.querySelector('#debtSearch').addEventListener('input',render);
    el.querySelector('#debtForm').addEventListener('submit',addDebt);
    el.querySelector('#debtPrint').addEventListener('click',printList);
    el.querySelector('#debtEditForm').addEventListener('submit',saveEdit);
    el.querySelector('#debtEditCancel').addEventListener('click',closeEdit);
    el.querySelector('#debtEditModal').addEventListener('click',e=>{if(e.target.id==='debtEditModal')closeEdit();});
  }

  function nav(){
    const n=document.querySelector('.nav');if(!n||document.getElementById('debtNavBtn'))return;
    const b=document.createElement('button');b.id='debtNavBtn';b.type='button';b.textContent='💰 Utang Piutang';b.addEventListener('click',()=>{if(typeof showPage==='function')showPage('debt');else document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.getElementById('page-debt').classList.add('active');load();});n.appendChild(b);
  }

  async function user(){const sb=SB();if(!sb)throw new Error('Supabase belum siap.');const {data,error}=await sb.auth.getUser();if(error)throw error;if(!data.user)throw new Error('Sesi login tidak aktif.');return data.user;}
  function changed(){document.dispatchEvent(new CustomEvent('barokah:debt-changed'));}

  async function load(){
    try{const u=await user();const {data,error}=await SB().from('debts_receivables').select('*').eq('user_id',u.id).order('debt_date',{ascending:false}).order('created_at',{ascending:false});if(error)throw error;rows=data||[];render();}
    catch(e){console.error(e);const box=document.getElementById('debtTable');if(box)box.innerHTML='<div class="debt-empty">Modul belum siap: '+esc(e.message||e)+'<br><small>Pastikan migration V70.3.7 sudah dijalankan di Supabase.</small></div>';}
  }

  async function addDebt(ev){ev.preventDefault();try{const u=await user(),kind=document.getElementById('debtKind').value,party=document.getElementById('debtParty').value.trim(),total=Number(document.getElementById('debtTotal').value),paid=Number(document.getElementById('debtPaid').value||0);if(!party||!Number.isFinite(total)||total<=0||!Number.isFinite(paid)||paid<0||paid>total){alert('Periksa nama, total, dan jumlah pembayaran.');return;}const payload={user_id:u.id,kind,party_type:kind==='piutang'?'pelanggan':'supplier',party_name:party,phone:document.getElementById('debtPhone').value.trim(),reference_no:document.getElementById('debtRef').value.trim(),debt_date:document.getElementById('debtDate').value||today(),due_date:document.getElementById('debtDue').value||null,total_amount:total,paid_amount:paid,note:document.getElementById('debtNote').value.trim()};const {error}=await SB().from('debts_receivables').insert(payload);if(error)throw error;document.getElementById('debtForm').reset();document.getElementById('debtDate').value=today();await load();changed();alert('Utang/piutang berhasil disimpan.');}catch(e){alert('Gagal menyimpan: '+(e.message||e));}}

  function openEdit(id){
    const r=rows.find(x=>String(x.id)===String(id));if(!r)return;
    editingId=r.id;
    document.getElementById('editDebtKind').value=r.kind||'piutang';
    document.getElementById('editDebtParty').value=r.party_name||'';
    document.getElementById('editDebtPhone').value=r.phone||'';
    document.getElementById('editDebtRef').value=r.reference_no||'';
    document.getElementById('editDebtDate').value=r.debt_date||today();
    document.getElementById('editDebtDue').value=r.due_date||'';
    document.getElementById('editDebtTotal').value=Number(r.total_amount||0);
    document.getElementById('editDebtPaid').value=Number(r.paid_amount||0);
    document.getElementById('editDebtNote').value=r.note||'';
    const m=document.getElementById('debtEditModal');m.classList.add('open');m.setAttribute('aria-hidden','false');
    setTimeout(()=>document.getElementById('editDebtParty').focus(),30);
  }
  function closeEdit(){editingId=null;const m=document.getElementById('debtEditModal');if(m){m.classList.remove('open');m.setAttribute('aria-hidden','true');}}

  async function saveEdit(ev){
    ev.preventDefault();if(!editingId)return;
    try{
      const u=await user();
      const total=Number(document.getElementById('editDebtTotal').value),paid=Number(document.getElementById('editDebtPaid').value||0);
      if(!Number.isFinite(total)||total<=0||!Number.isFinite(paid)||paid<0||paid>total){alert('Total dan pembayaran tidak valid.');return;}
      const kind=document.getElementById('editDebtKind').value;
      const payload={kind,party_type:kind==='piutang'?'pelanggan':'supplier',party_name:document.getElementById('editDebtParty').value.trim(),phone:document.getElementById('editDebtPhone').value.trim(),reference_no:document.getElementById('editDebtRef').value.trim(),debt_date:document.getElementById('editDebtDate').value||today(),due_date:document.getElementById('editDebtDue').value||null,total_amount:total,paid_amount:paid,note:document.getElementById('editDebtNote').value.trim()};
      if(!payload.party_name){alert('Nama wajib diisi.');return;}
      const {error}=await SB().from('debts_receivables').update(payload).eq('id',editingId).eq('user_id',u.id);if(error)throw error;
      closeEdit();await load();changed();alert('Perubahan utang/piutang berhasil disimpan.');
    }catch(e){alert('Gagal mengedit: '+(e.message||e));}
  }

  async function pay(id){try{const r=rows.find(x=>x.id===id);if(!r)return;const left=balance(r);if(left<=0){alert('Catatan ini sudah lunas.');return;}const amount=Number(prompt('Masukkan nominal pembayaran:\nSisa '+fmt(left),'0'));if(!Number.isFinite(amount)||amount<=0||amount>left){alert('Nominal pembayaran tidak valid.');return;}const note=prompt('Keterangan pembayaran (opsional):','')||'';const u=await user();const {data:p,error:pe}=await SB().from('debt_payments').insert({debt_id:id,user_id:u.id,payment_date:today(),amount,note}).select('*').single();if(pe)throw pe;const paidBefore=Number(r.paid_amount||0),total=Number(r.total_amount||0),paid=Math.min(total,paidBefore+amount);const {error:ue}=await SB().from('debts_receivables').update({paid_amount:paid}).eq('id',id).eq('user_id',u.id);if(ue){await SB().from('debt_payments').delete().eq('id',p.id).eq('user_id',u.id);throw ue;}await load();changed();alert(paid>=total?'Pembayaran berhasil dicatat. Piutang/utang sudah LUNAS.':'Pembayaran berhasil dicatat.');}catch(e){alert('Gagal mencatat pembayaran: '+(e.message||e));}}

  async function del(id){if(!confirm('Hapus catatan utang/piutang beserta riwayat pembayarannya?'))return;try{const u=await user();const {error}=await SB().from('debts_receivables').delete().eq('id',id).eq('user_id',u.id);if(error)throw error;await load();changed();}catch(e){alert('Gagal menghapus: '+(e.message||e));}}

  function render(){
    const p=rows.filter(x=>x.kind==='piutang'),u=rows.filter(x=>x.kind==='utang');
    document.getElementById('debtTotalPiutang').textContent=fmt(p.reduce((s,x)=>s+balance(x),0));document.getElementById('debtTotalUtang').textContent=fmt(u.reduce((s,x)=>s+balance(x),0));document.getElementById('debtCountOpen').textContent=rows.filter(x=>balance(x)>0).length;document.getElementById('debtPaidTotal').textContent=fmt(rows.reduce((s,x)=>s+Math.min(Number(x.total_amount||0),Number(x.paid_amount||0)),0));
    const search=(document.getElementById('debtSearch')?.value||'').toLowerCase();let list=rows.filter(x=>x.kind===tab);if(search)list=list.filter(x=>(String(x.party_name)+' '+String(x.reference_no||'')+' '+String(x.phone||'')).toLowerCase().includes(search));
    document.getElementById('debtListTitle').textContent=tab==='piutang'?'Daftar Piutang Pelanggan':'Daftar Utang Supplier';const box=document.getElementById('debtTable');if(!list.length){box.innerHTML='<div class="debt-empty">Belum ada '+(tab==='piutang'?'piutang pelanggan.':'utang supplier.')+'</div>';return;}
    box.innerHTML='<table><thead><tr><th>Nama</th><th>Tanggal</th><th>Referensi</th><th>Total</th><th>Dibayar</th><th>Sisa</th><th>Jatuh Tempo</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+list.map(r=>{const st=status(r);return '<tr><td><strong>'+esc(r.party_name)+'</strong><span class="sub">'+esc(r.phone||r.party_type)+'</span></td><td>'+esc(r.debt_date)+'</td><td>'+esc(r.reference_no||'-')+'</td><td>'+fmt(r.total_amount)+'</td><td>'+fmt(r.paid_amount)+'</td><td><strong>'+fmt(balance(r))+'</strong></td><td>'+esc(r.due_date||'-')+'</td><td><span class="debt-status '+st[1]+'">'+st[0]+'</span></td><td><div class="debt-actions-cell"><button type="button" class="debt-edit" data-edit="'+r.id+'">✏️ Edit</button><button type="button" class="debt-nota" data-nota="'+r.id+'">🧾 Nota</button><button type="button" class="debt-pay" data-pay="'+r.id+'">'+(st[0]==='Lunas'?'Lunas':'Bayar')+'</button><button type="button" class="debt-del" data-del="'+r.id+'">Hapus</button></div></td></tr>';}).join('')+'</tbody></table>';
    box.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openEdit(b.dataset.edit);}));
    box.querySelectorAll('[data-pay]').forEach(b=>b.addEventListener('click',()=>pay(b.dataset.pay)));box.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',()=>del(b.dataset.del)));
  }

  async function printList(){
    try{
      const u=await user();
      const {data,error}=await SB().from('debts_receivables').select('*').eq('user_id',u.id).eq('kind',tab).order('debt_date',{ascending:false}).order('created_at',{ascending:false});
      if(error)throw error;
      const list=data||[];const title=tab==='piutang'?'Laporan Piutang Pelanggan':'Laporan Utang Supplier';const body=list.map(r=>'<tr><td>'+esc(r.party_name)+'</td><td>'+esc(r.debt_date)+'</td><td>'+esc(r.reference_no||'-')+'</td><td>'+fmt(r.total_amount)+'</td><td>'+fmt(r.paid_amount)+'</td><td>'+fmt(balance(r))+'</td><td>'+esc(r.due_date||'-')+'</td><td>'+status(r)[0]+'</td></tr>').join('');const html='<!doctype html><html><head><meta charset="utf-8"><title>'+title+' - Barokah Telur</title><style>@page{size:A4 landscape;margin:10mm}body{font-family:Arial,sans-serif;color:#172018}h1{font-size:22px}p{font-size:12px;color:#666}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #ddd;padding:7px;text-align:left}th{background:#f1f4f1}</style></head><body><h1>BAROKAH TELUR</h1><h2>'+title+'</h2><p>Dicetak '+new Date().toLocaleString('id-ID')+' • Data diambil langsung dari Supabase</p><table><thead><tr><th>Nama</th><th>Tanggal</th><th>Referensi</th><th>Total</th><th>Dibayar</th><th>Sisa</th><th>Jatuh Tempo</th><th>Status</th></tr></thead><tbody>'+body+'</tbody></table></body></html>';
      let f=document.getElementById('barokahDebtPrintFrame');if(f)f.remove();f=document.createElement('iframe');f.id='barokahDebtPrintFrame';Object.assign(f.style,{position:'fixed',width:'1px',height:'1px',right:'0',bottom:'0',border:'0',opacity:'0',pointerEvents:'none'});document.body.appendChild(f);f.onload=()=>setTimeout(()=>{try{f.contentWindow.focus();f.contentWindow.print();}finally{setTimeout(()=>f.remove(),1200);}},200);f.srcdoc=html;
    }catch(e){alert('Gagal mencetak: '+(e.message||e));}
  }

  function init(){css();page();nav();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,250));else setTimeout(init,250);
})();