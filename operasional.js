(function(){
  'use strict';
  const SB=()=>window.barokahSupabase;
  const fmt=n=>Number(n||0).toLocaleString('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0});
  const esc=v=>String(v==null?'':v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const today=()=>new Date().toISOString().slice(0,10);
  const digits=v=>String(v??'').replace(/\D/g,'');
  const rupiahInput=v=>{const d=digits(v);if(!d)return '';return (d.replace(/^0+(?=\d)/,'')||'0').replace(/\B(?=(\d{3})+(?!\d))/g,'.');};
  let rows=[];
  let filter='semua';

  function styles(){
    if(document.getElementById('barokahOperationalCss'))return;
    const s=document.createElement('style');s.id='barokahOperationalCss';
    s.textContent=`
      .op-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:18px 0}.op-stat{background:#fff;border:1px solid #e1e7e2;border-radius:18px;padding:17px;box-shadow:0 10px 30px rgba(18,42,29,.07)}.op-stat small{display:block;color:#6d776f;font-size:11px}.op-stat strong{display:block;font-size:21px;margin-top:8px}.op-stat.in{border-top:4px solid #24a36b}.op-stat.out{border-top:4px solid #bd4037}
      .op-panel{background:#fff;border:1px solid #e1e7e2;border-radius:20px;padding:18px;box-shadow:0 10px 30px rgba(18,42,29,.07);margin-top:16px}.op-form{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.op-field{display:grid;gap:6px}.op-field.full{grid-column:1/-1}.op-field label{font-size:12px;font-weight:800}.op-field input,.op-field select{height:42px;border:1px solid #d6ded8;border-radius:10px;padding:0 11px;background:#fff}.op-field input:focus,.op-field select:focus{outline:none;border-color:#7eb598;box-shadow:0 0 0 3px rgba(19,107,72,.08)}.op-help{font-size:11px;color:#6d776f;margin:4px 0 14px}.op-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
      .op-toolbar{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px}.op-toolbar input,.op-toolbar select{height:38px;border:1px solid #d6ded8;border-radius:9px;padding:0 10px;background:#fff}.op-table{overflow:auto}.op-table table{min-width:900px;width:100%;border-collapse:collapse}.op-table th,.op-table td{padding:12px;border-bottom:1px solid #edf0ed;text-align:left;font-size:12px}.op-table th{font-size:10px;text-transform:uppercase;color:#6d776f}.op-in{color:#087344;font-weight:850}.op-out{color:#b42318;font-weight:850}.op-ref{font-weight:800;color:#14532d}.op-actions-cell{white-space:nowrap}.op-del,.op-nota{border-radius:9px;padding:7px 9px;font-weight:800;font-size:11px;cursor:pointer}.op-del{border:1px solid #f2cdc9;background:#fff0ee;color:#bd4037}.op-nota{border:1px solid #d6e5dc;background:#edf8f1;color:#0d5b45;margin-left:4px}.op-empty{text-align:center;color:#6d776f;padding:28px}
      .op-dashboard{background:#fff;border:1px solid #e1e7e2;border-radius:20px;padding:18px;box-shadow:0 10px 30px rgba(18,42,29,.07)}.op-dashboard-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}.op-dashboard-item{border:1px solid #e5ebe6;border-radius:14px;padding:13px;background:#fafcfb}.op-dashboard-item small{display:block;color:#6d776f;font-size:10px}.op-dashboard-item strong{display:block;font-size:18px;margin-top:5px}.op-dashboard-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.op-debt{margin-top:16px}.op-debt-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}.op-debt-card{border-radius:14px;padding:13px;border:1px solid #e5ebe6;background:#fafcfb}.op-debt-card small{display:block;color:#6d776f;font-size:10px}.op-debt-card strong{display:block;font-size:18px;margin-top:5px}.op-debt-card.piutang{border-left:5px solid #24a36b}.op-debt-card.utang{border-left:5px solid #bd4037}.op-debt-card.open{border-left:5px solid #f4c126}.op-debt-card.paid{border-left:5px solid #8a918b}
      @media(max-width:850px){.op-summary{grid-template-columns:1fr 1fr}}@media(max-width:600px){.op-summary{grid-template-columns:1fr}.op-form{grid-template-columns:1fr}.op-field.full{grid-column:auto}.op-debt-grid,.op-dashboard-grid{grid-template-columns:1fr}.op-toolbar>div{width:100%}.op-toolbar input,.op-toolbar select{width:100%}.op-actions .btn{width:100%}}
    `;document.head.appendChild(s);
  }

  function page(){
    if(document.getElementById('page-operational'))return;
    const wrap=document.querySelector('.wrap');if(!wrap)return;
    const el=document.createElement('section');el.id='page-operational';el.className='page';
    el.innerHTML=`<div class="hero"><div class="eyebrow">KEUANGAN</div><h1>Transaksi Operasional</h1><p>Catat pemasukan dan pengeluaran operasional di kolom khusus, terpisah dari Riwayat Transaksi dan Utang Piutang.</p></div>
      <div class="op-summary"><div class="op-stat in"><small>Total Pemasukan Operasional</small><strong id="opTotalIn">Rp0</strong></div><div class="op-stat out"><small>Total Pengeluaran Operasional</small><strong id="opTotalOut">Rp0</strong></div><div class="op-stat"><small>Saldo Operasional</small><strong id="opNet">Rp0</strong></div><div class="op-stat"><small>Jumlah Catatan</small><strong id="opCount">0</strong></div></div>
      <div class="op-panel"><h2 style="margin:0 0 5px">Tambah Transaksi Operasional</h2><div class="op-help">No. transaksi dibuat otomatis oleh Supabase. Nominal dapat diketik 3000000 dan otomatis menjadi 3.000.000.</div>
        <form id="opForm"><div class="op-form"><div class="op-field"><label>Jenis</label><select id="opKind"><option value="pengeluaran">Pengeluaran Operasional</option><option value="pemasukan">Pemasukan Operasional</option></select></div><div class="op-field"><label>Kategori</label><select id="opCategory"><option>Listrik</option><option>Air</option><option>Bensin / Transportasi</option><option>Gaji</option><option>Sewa</option><option>Perawatan</option><option>ATK</option><option>Telepon / Internet</option><option>Pajak</option><option>Lainnya</option></select></div><div class="op-field"><label>Keterangan</label><input id="opDescription" required placeholder="Contoh: Bayar listrik toko"></div><div class="op-field"><label>No. Transaksi</label><input id="opRef" readonly placeholder="Dibuat otomatis oleh sistem"></div><div class="op-field"><label>Tanggal</label><input id="opDate" type="date" value="${today()}" required></div><div class="op-field"><label>Nominal</label><input id="opAmount" type="text" inputmode="numeric" autocomplete="off" required placeholder="Contoh: 3.000.000"></div><div class="op-field full"><label>Catatan</label><input id="opNote" placeholder="Catatan tambahan (opsional)"></div></div><div class="op-actions"><button class="btn primary" type="submit">+ Simpan Transaksi Operasional</button><button class="btn ghost" type="reset">Reset</button></div></form></div>
      <div class="op-panel"><div class="op-toolbar"><strong>Riwayat Transaksi Operasional</strong><div style="display:flex;gap:8px;flex-wrap:wrap"><select id="opFilter"><option value="semua">Semua</option><option value="pemasukan">Pemasukan</option><option value="pengeluaran">Pengeluaran</option></select><input id="opSearch" placeholder="Cari keterangan / nomor..."><button class="btn ghost" id="opPrint">ð¨ï¸ Cetak</button></div></div><div class="op-table" id="opTable"></div></div>`;
    wrap.appendChild(el);
    const amount=el.querySelector('#opAmount');
    amount.addEventListener('input',()=>{amount.value=rupiahInput(amount.value);});
    el.querySelector('#opFilter').addEventListener('change',e=>{filter=e.target.value;render();});
    el.querySelector('#opSearch').addEventListener('input',render);
    el.querySelector('#opForm').addEventListener('submit',save);
    el.querySelector('#opForm').addEventListener('reset',()=>setTimeout(()=>{el.querySelector('#opDate').value=today();amount.value='';},0));
    el.querySelector('#opPrint').addEventListener('click',printList);
  }

  function nav(){
    const n=document.querySelector('.nav');if(!n||document.getElementById('opNavBtn'))return;
    const b=document.createElement('button');b.id='opNavBtn';b.textContent='ð¸ Operasional';b.addEventListener('click',()=>{if(typeof showPage==='function')showPage('operational');else document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.getElementById('page-operational').classList.add('active');load();});n.appendChild(b);
  }

  async function user(){const sb=SB();if(!sb)throw new Error('Supabase belum siap.');const {data,error}=await sb.auth.getUser();if(error)throw error;if(!data.user)throw new Error('Sesi login tidak aktif.');return data.user;}

  async function load(){
    try{const u=await user();const {data,error}=await SB().from('operational_transactions').select('*').eq('user_id',u.id).order('transaction_date',{ascending:false}).order('created_at',{ascending:false});if(error)throw error;rows=data||[];render();}
    catch(e){console.error(e);const box=document.getElementById('opTable');if(box)box.innerHTML='<div class="op-empty">Modul belum siap: '+esc(e.message||e)+'<br><small>Jalankan migration V70.3.8 di Supabase terlebih dahulu.</small></div>';}
  }

  async function save(ev){
    ev.preventDefault();
    try{const u=await user();const amount=Number(digits(document.getElementById('opAmount').value));const description=document.getElementById('opDescription').value.trim();if(!description||!Number.isFinite(amount)||amount<=0){alert('Isi keterangan dan nominal yang benar.');return;}
      const payload={user_id:u.id,kind:document.getElementById('opKind').value,category:document.getElementById('opCategory').value,description,transaction_date:document.getElementById('opDate').value||today(),amount,note:document.getElementById('opNote').value.trim()};
      const {error}=await SB().from('operational_transactions').insert(payload);if(error)throw error;
      document.getElementById('opForm').reset();document.getElementById('opDate').value=today();document.getElementById('opAmount').value='';await load();await dashboard();alert('Transaksi operasional berhasil disimpan.');
    }catch(e){alert('Gagal menyimpan: '+(e.message||e));}
  }

  async function del(id){if(!confirm('Hapus transaksi operasional ini?'))return;try{const u=await user();const {error}=await SB().from('operational_transactions').delete().eq('id',id).eq('user_id',u.id);if(error)throw error;await load();await dashboard();}catch(e){alert('Gagal menghapus: '+(e.message||e));}}

  function render(){
    const ins=rows.filter(x=>x.kind==='pemasukan'),outs=rows.filter(x=>x.kind==='pengeluaran');
    const tin=ins.reduce((s,x)=>s+Number(x.amount||0),0),tout=outs.reduce((s,x)=>s+Number(x.amount||0),0);
    document.getElementById('opTotalIn').textContent=fmt(tin);document.getElementById('opTotalOut').textContent=fmt(tout);document.getElementById('opNet').textContent=fmt(tin-tout);document.getElementById('opCount').textContent=rows.length;
    const q=(document.getElementById('opSearch')?.value||'').toLowerCase();let list=filter==='semua'?rows:rows.filter(x=>x.kind===filter);if(q)list=list.filter(x=>(String(x.description)+' '+String(x.reference_no||'')+' '+String(x.category||'')).toLowerCase().includes(q));
    const box=document.getElementById('opTable');if(!list.length){box.innerHTML='<div class="op-empty">Belum ada transaksi operasional.</div>';return;}
    box.innerHTML='<table><thead><tr><th>No. Transaksi</th><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Keterangan</th><th>Nominal</th><th>Aksi</th></tr></thead><tbody>'+list.map(r=>'<tr><td class="op-ref">'+esc(r.reference_no||'-')+'</td><td>'+esc(r.transaction_date)+'</td><td><span class="'+(r.kind==='pemasukan'?'op-in':'op-out')+'">'+(r.kind==='pemasukan'?'Pemasukan':'Pengeluaran')+'</span></td><td>'+esc(r.category)+'</td><td><strong>'+esc(r.description)+'</strong><span class="sub">'+esc(r.note||'')+'</span></td><td class="'+(r.kind==='pemasukan'?'op-in':'op-out')+'">'+fmt(r.amount)+'</td><td class="op-actions-cell"><button class="op-del" data-op-del="'+r.id+'">Hapus</button><button class="op-nota" data-op-nota="'+r.id+'">ð§¾ Nota</button></td></tr>').join('')+'</tbody></table>';
    box.querySelectorAll('[data-op-del]').forEach(b=>b.addEventListener('click',()=>del(b.dataset.opDel)));box.querySelectorAll('[data-op-nota]').forEach(b=>b.addEventListener('click',()=>printNota(b.dataset.opNota)));
  }

  async function dashboard(){
    const host=document.getElementById('operationalDashboardCard');if(!host)return;
    try{const u=await user();const [opRes,debtRes]=await Promise.all([
      SB().from('operational_transactions').select('kind,amount').eq('user_id',u.id),
      SB().from('debts_receivables').select('kind,total_amount,paid_amount').eq('user_id',u.id)
    ]);if(opRes.error)throw opRes.error;
      const ops=opRes.data||[],ins=ops.filter(x=>x.kind==='pemasukan').reduce((s,x)=>s+Number(x.amount||0),0),outs=ops.filter(x=>x.kind==='pengeluaran').reduce((s,x)=>s+Number(x.amount||0),0);
      const ds=debtRes.error?[]:(debtRes.data||[]),piu=ds.filter(x=>x.kind==='piutang').reduce((s,x)=>s+Math.max(0,Number(x.total_amount||0)-Number(x.paid_amount||0)),0),utg=ds.filter(x=>x.kind==='utang').reduce((s,x)=>s+Math.max(0,Number(x.total_amount||0)-Number(x.paid_amount||0)),0),open=ds.filter(x=>Math.max(0,Number(x.total_amount||0)-Number(x.paid_amount||0))>0).length;
      host.innerHTML=`<div class="op-dashboard"><div class="eyebrow">RINGKASAN TAMBAHAN</div><h2 style="margin:5px 0 0">ð° Utang Piutang & ð¸ Operasional</h2><div class="op-debt"><div class="op-debt-grid"><div class="op-debt-card piutang"><small>Total Piutang</small><strong>${fmt(piu)}</strong></div><div class="op-debt-card utang"><small>Total Utang</small><strong>${fmt(utg)}</strong></div><div class="op-debt-card open"><small>Belum Lunas</small><strong>${open} catatan</strong></div><div class="op-debt-card paid"><small>Saldo Operasional</small><strong>${fmt(ins-outs)}</strong></div></div><div class="op-dashboard-actions"><button class="btn primary" type="button" id="dashboardDebtBtn">ð° Buka Utang Piutang</button><button class="btn ghost" type="button" id="dashboardOpBtn">ð¸ Buka Operasional</button></div></div><div class="op-dashboard-grid"><div class="op-dashboard-item"><small>Pemasukan Operasional</small><strong style="color:#087344">${fmt(ins)}</strong></div><div class="op-dashboard-item"><small>Pengeluaran Operasional</small><strong style="color:#b42318">${fmt(outs)}</strong></div></div></div>`;
      document.getElementById('dashboardDebtBtn').onclick=()=>{if(typeof showPage==='function')showPage('debt');};
      document.getElementById('dashboardOpBtn').onclick=()=>{if(typeof showPage==='function')showPage('operational');};
    }catch(e){console.warn('Dashboard tambahan belum siap:',e.message||e);host.innerHTML='<div class="op-dashboard"><div class="eyebrow">RINGKASAN TAMBAHAN</div><h2 style="margin:5px 0">ð° Utang Piutang & ð¸ Operasional</h2><p style="color:#6d776f;font-size:12px">Data akan muncul setelah sesi login dan migration operasional siap.</p></div>';}
  }

  async function printNota(id){try{const u=await user();const {data,error}=await SB().from('operational_transactions').select('*').eq('id',id).eq('user_id',u.id).single();if(error)throw error;const kind=data.kind==='pemasukan'?'PEMASUKAN OPERASIONAL':'PENGELUARAN OPERASIONAL';const html='<!doctype html><html><head><meta charset="utf-8"><title>Nota '+esc(data.reference_no)+'</title><style>@page{size:A5 portrait;margin:10mm}body{font-family:Arial,sans-serif;color:#172018;margin:0}.head{text-align:center;border-bottom:2px solid #14532d;padding-bottom:10px}.logo{width:48px;height:48px;border-radius:50%;background:#14532d;color:#fff;display:flex;align-items:center;justify-content:center;margin:auto;font-weight:900;font-size:17px}.brand{font-size:19px;font-weight:900;color:#14532d;margin-top:6px}.sub{font-size:10px;color:#666}.box{border:1px solid #ddd;border-radius:8px;padding:10px;margin-top:12px}.row{display:flex;justify-content:space-between;gap:10px;padding:5px 0;font-size:11px}.label{color:#666}.value{font-weight:800;text-align:right}.total{border-top:1px solid #ddd;margin-top:7px;padding-top:8px;font-size:14px}.sign{display:grid;grid-template-columns:1fr 1fr;gap:25px;margin-top:28px;text-align:center;font-size:10px}.line{border-top:1px solid #aaa;margin-top:32px;padding-top:5px}.foot{text-align:center;margin-top:18px;padding-top:8px;border-top:1px dashed #bbb;font-size:9px;color:#777}</style></head><body><div class="head"><div class="logo">BT</div><div class="brand">BAROKAH TELUR</div><div class="sub">'+kind+'</div></div><div class="box"><div class="row"><span class="label">No. Transaksi</span><span class="value">'+esc(data.reference_no||'-')+'</span></div><div class="row"><span class="label">Tanggal</span><span class="value">'+esc(data.transaction_date)+'</span></div><div class="row"><span class="label">Kategori</span><span class="value">'+esc(data.category)+'</span></div><div class="row"><span class="label">Keterangan</span><span class="value">'+esc(data.description)+'</span></div><div class="row total"><span class="label">Nominal</span><span class="value">'+fmt(data.amount)+'</span></div></div>'+(data.note?'<div class="box"><b>Catatan</b><br>'+esc(data.note)+'</div>':'')+'<div class="sign"><div><div class="line">Dibuat / Diterima</div></div><div><div class="line">Barokah Telur</div></div></div><div class="foot">Nota Transaksi Operasional â¢ '+new Date().toLocaleString('id-ID')+'</div></body></html>';let f=document.getElementById('barokahOperationalPrintFrame');if(f)f.remove();f=document.createElement('iframe');f.id='barokahOperationalPrintFrame';Object.assign(f.style,{position:'fixed',width:'1px',height:'1px',right:'0',bottom:'0',border:'0',opacity:'0',pointerEvents:'none'});document.body.appendChild(f);f.onload=()=>setTimeout(()=>{try{f.contentWindow.focus();f.contentWindow.print()}catch(e){alert('Cetak nota gagal: '+e.message)}finally{setTimeout(()=>f.remove(),1500)}},250);f.srcdoc=html;}catch(e){alert('Gagal membuat nota: '+(e.message||e));}}

  async function printList(){
    let printTab=null;
    try{
      // Open the print target immediately from the button click so mobile browsers
      // do not treat it as a delayed popup after the Supabase request.
      printTab=window.open('', '_blank');
      if(!printTab)throw new Error('Popup diblokir browser. Izinkan pop-up untuk situs ini lalu tekan Cetak lagi.');
      printTab.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Menyiapkan laporan...</title></head><body style="font-family:Arial;padding:30px">Menyiapkan laporan operasional...</body></html>');
      printTab.document.close();

      const u=await user();
      const {data,error}=await SB().from('operational_transactions').select('*').eq('user_id',u.id).order('transaction_date',{ascending:false}).order('created_at',{ascending:false});
      if(error)throw error;
      const list=data||[];
      const body=list.length?list.map(r=>'<tr><td>'+esc(r.reference_no||'-')+'</td><td>'+esc(r.transaction_date)+'</td><td>'+esc(r.kind==='pemasukan'?'Pemasukan':'Pengeluaran')+'</td><td>'+esc(r.category)+'</td><td>'+esc(r.description)+'</td><td>'+fmt(r.amount)+'</td></tr>').join(''):'<tr><td colspan="6" style="text-align:center">Belum ada transaksi operasional.</td></tr>';
      const html=`<!doctype html><html><head><meta charset="utf-8"><title>Transaksi Operasional - Barokah Telur</title><style>@page{size:A4 landscape;margin:10mm}body{font-family:Arial,sans-serif;color:#172018}h1{font-size:22px;margin-bottom:4px}h2{font-size:17px;margin:0 0 6px}p{font-size:12px;color:#666}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f1f4f1}tfoot td{font-weight:800}</style></head><body><h1>BAROKAH TELUR</h1><h2>Transaksi Operasional</h2><p>Semua data operasional â¢ Dicetak ${new Date().toLocaleString('id-ID')}</p><table><thead><tr><th>No. Transaksi</th><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Keterangan</th><th>Nominal</th></tr></thead><tbody>${body}</tbody></table><script>window.addEventListener('load',function(){setTimeout(function(){window.focus();window.print();},300);});<\/script></body></html>`;
      printTab.document.open();
      printTab.document.write(html);
      printTab.document.close();
    }catch(e){
      if(printTab&&!printTab.closed)printTab.close();
      alert('Gagal mencetak laporan operasional: '+(e.message||e));
    }
  }

  async function init(){styles();page();nav();await dashboard();setInterval(()=>dashboard(),30000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,500));else setTimeout(init,500);
})();
