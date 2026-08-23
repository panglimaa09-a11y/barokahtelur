(function(){
  'use strict';
  const SB=()=>window.barokahSupabase||null;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const money=v=>'Rp '+Number(v||0).toLocaleString('id-ID');
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  let busyOp=false,busyDebt=false;

  async function getUser(){
    const sb=SB(); if(!sb)return null;
    const r=await sb.auth.getUser();
    if(r.error)throw r.error;
    return r.data&&r.data.user?r.data.user:null;
  }

  function activePage(id){return document.getElementById(id)?.classList.contains('active');}

  async function syncOperational(){
    if(busyOp||!activePage('page-operational'))return;
    const sb=SB(); if(!sb)return;
    busyOp=true;
    try{
      const u=await getUser(); if(!u)return;
      const q=await sb.from('operational_transactions').select('*').eq('user_id',u.id).order('transaction_date',{ascending:false}).order('created_at',{ascending:false});
      if(q.error)throw q.error;
      const rows=q.data||[];
      const income=rows.filter(r=>r.kind==='pemasukan').reduce((a,r)=>a+Number(r.amount||0),0);
      const expense=rows.filter(r=>r.kind==='pengeluaran').reduce((a,r)=>a+Number(r.amount||0),0);
      const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v;};
      set('opTotalIn',money(income));set('opTotalOut',money(expense));set('opNet',money(income-expense));set('opCount',rows.length);
      const box=document.getElementById('opTable'); if(!box)return;
      const filter=document.getElementById('opFilter')?.value||'semua';
      const term=(document.getElementById('opSearch')?.value||'').trim().toLowerCase();
      let list=filter==='semua'?rows:rows.filter(r=>r.kind===filter);
      if(term)list=list.filter(r=>[r.description,r.reference_no,r.category,r.note].map(x=>String(x||'')).join(' ').toLowerCase().includes(term));
      if(!list.length){box.innerHTML='<div class="op-empty">Belum ada transaksi operasional.</div>';return;}
      box.innerHTML='<table><thead><tr><th>No. Transaksi</th><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Keterangan</th><th>Nominal</th><th>Aksi</th></tr></thead><tbody>'+list.map(r=>{
        const kind=r.kind==='pemasukan'?'Pemasukan':'Pengeluaran';
        const cls=r.kind==='pemasukan'?'op-in':'op-out';
        return '<tr><td class="op-ref">'+esc(r.reference_no||'-')+'</td><td>'+esc(r.transaction_date||'-')+'</td><td><span class="'+cls+'">'+kind+'</span></td><td>'+esc(r.category||'-')+'</td><td><strong>'+esc(r.description||'-')+'</strong><span class="sub">'+esc(r.note||'')+'</span></td><td class="'+cls+'">'+money(r.amount)+'</td><td class="op-actions-cell"><button type="button" class="op-edit v707-edit" data-op-edit="'+esc(r.id)+'">✏️ Edit</button> <button type="button" class="op-del v707-del" data-op-del-v707="'+esc(r.id)+'">Hapus</button> <button type="button" class="op-nota v707-print" data-op-print-v707="'+esc(r.id)+'">🧾 Nota</button></td></tr>';
      }).join('')+'</tbody></table>';
      box.querySelectorAll('[data-op-edit]').forEach(b=>b.onclick=()=>editOperational(rid(b.dataset.opEdit)));
      box.querySelectorAll('[data-op-del-v707]').forEach(b=>b.onclick=()=>deleteOperational(rid(b.dataset.opDelV707)));
      box.querySelectorAll('[data-op-print-v707]').forEach(b=>b.onclick=()=>printOperationalOne(rid(b.dataset.opPrintV707)));
    }catch(e){console.warn('[Barokah V70.7] operational sync',e);}
    finally{busyOp=false;}
  }
  const rid=v=>String(v||'');

  async function editOperational(id){
    const sb=SB();const u=await getUser();if(!sb||!u)return;
    const q=await sb.from('operational_transactions').select('*').eq('id',id).eq('user_id',u.id).single();
    if(q.error){alert('Gagal membuka edit: '+q.error.message);return;}
    const r=q.data;
    const amount=prompt('Nominal:',String(Number(r.amount||0)));
    if(amount===null)return;
    const description=prompt('Keterangan:',r.description||'');
    if(description===null)return;
    const n=Number(String(amount).replace(/\D/g,''));
    if(!Number.isFinite(n)||n<=0||!description.trim()){alert('Nominal dan keterangan wajib benar.');return;}
    const payload={kind:r.kind,category:r.category||'',description:description.trim(),transaction_date:r.transaction_date,amount:n,note:r.note||''};
    const u2=await sb.from('operational_transactions').update(payload).eq('id',id).eq('user_id',u.id);
    if(u2.error){alert('Gagal menyimpan edit: '+u2.error.message);return;}
    alert('Transaksi operasional berhasil diperbarui.');
    await syncOperational();
    document.dispatchEvent(new CustomEvent('barokah:operational-changed'));
  }

  async function deleteOperational(id){
    if(!confirm('Hapus transaksi operasional ini?'))return;
    const sb=SB();const u=await getUser();if(!sb||!u)return;
    const q=await sb.from('operational_transactions').delete().eq('id',id).eq('user_id',u.id);
    if(q.error){alert('Gagal menghapus: '+q.error.message);return;}
    await syncOperational();
  }

  async function printOperationalOne(id){
    const sb=SB();const u=await getUser();if(!sb||!u)return;
    const q=await sb.from('operational_transactions').select('*').eq('id',id).eq('user_id',u.id).single();
    if(q.error){alert('Gagal mengambil data: '+q.error.message);return;}
    const r=q.data;
    const html='<!doctype html><html><head><meta charset="utf-8"><title>Nota Operasional</title><style>@page{size:80mm auto;margin:5mm}body{font-family:Arial,sans-serif;font-size:11px;color:#111}.head{text-align:center;border-bottom:1px dashed #333;padding-bottom:8px}.title{font-size:17px;font-weight:900;color:#14532d}.row{display:flex;justify-content:space-between;gap:10px;margin:6px 0}.row span{color:#666}.total{border-top:1px dashed #333;margin-top:9px;padding-top:8px;display:flex;justify-content:space-between;font-weight:900;font-size:14px}.foot{text-align:center;border-top:1px dashed #333;margin-top:10px;padding-top:8px;font-size:9px;color:#666}</style></head><body><div class="head"><div class="title">BAROKAH TELUR</div><div>NOTA OPERASIONAL</div></div><div class="row"><span>No. Transaksi</span><b>'+esc(r.reference_no||'-')+'</b></div><div class="row"><span>Tanggal</span><b>'+esc(r.transaction_date||'-')+'</b></div><div class="row"><span>Jenis</span><b>'+esc(r.kind==='pemasukan'?'Pemasukan':'Pengeluaran')+'</b></div><div class="row"><span>Kategori</span><b>'+esc(r.category||'-')+'</b></div><div class="row"><span>Keterangan</span><b>'+esc(r.description||'-')+'</b></div><div class="row"><span>Catatan</span><b>'+esc(r.note||'-')+'</b></div><div class="total"><span>NOMINAL</span><span>'+money(r.amount)+'</span></div><div class="foot">Barokah Telur</div><script>window.onload=function(){setTimeout(function(){window.focus();window.print()},250)}<\/script></body></html>';
    const f=document.createElement('iframe');f.style.cssText='position:fixed;width:1px;height:1px;right:0;bottom:0;border:0;opacity:0';document.body.appendChild(f);f.onload=()=>setTimeout(()=>{try{f.contentWindow.focus();f.contentWindow.print()}finally{setTimeout(()=>f.remove(),1200)}},200);f.srcdoc=html;
  }

  async function printOperationalAll(){
    const sb=SB();const u=await getUser();if(!sb||!u)return;
    const q=await sb.from('operational_transactions').select('*').eq('user_id',u.id).order('transaction_date',{ascending:false}).order('created_at',{ascending:false});
    if(q.error){alert('Gagal mencetak operasional: '+q.error.message);return;}
    const rows=q.data||[];
    const income=rows.filter(r=>r.kind==='pemasukan').reduce((a,r)=>a+Number(r.amount||0),0);
    const expense=rows.filter(r=>r.kind==='pengeluaran').reduce((a,r)=>a+Number(r.amount||0),0);
    const table=rows.length?'<table><thead><tr><th>No</th><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Keterangan</th><th>Nominal</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+esc(r.reference_no||'-')+'</td><td>'+esc(r.transaction_date||'-')+'</td><td>'+esc(r.kind==='pemasukan'?'Pemasukan':'Pengeluaran')+'</td><td>'+esc(r.category||'-')+'</td><td>'+esc(r.description||'-')+(r.note?'<br><small>'+esc(r.note)+'</small>':'')+'</td><td class="r">'+money(r.amount)+'</td></tr>').join('')+'</tbody></table>':'<p>Belum ada transaksi operasional.</p>';
    const html='<!doctype html><html><head><meta charset="utf-8"><title>Laporan Operasional</title><style>@page{size:A4 portrait;margin:10mm}body{font-family:Arial,sans-serif;font-size:9px;color:#111}h1{font-size:21px;color:#14532d;margin:0}.head{text-align:center;border-bottom:2px solid #14532d;padding-bottom:9px;margin-bottom:10px}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:10px 0}.card{border:1px solid #ddd;padding:7px;border-radius:6px}.label{font-size:8px;color:#666}.value{font-size:13px;font-weight:800;margin-top:3px}.green{color:#087f3b}.red{color:#b42318}table{width:100%;border-collapse:collapse;font-size:8px}th{background:#14532d;color:#fff;padding:5px;text-align:left}td{border:1px solid #ddd;padding:4px;vertical-align:top}.r{text-align:right}.foot{text-align:center;margin-top:12px;border-top:1px solid #ddd;padding-top:6px;color:#777}</style></head><body><div class="head"><h1>BAROKAH TELUR</h1><div>LAPORAN TRANSAKSI OPERASIONAL</div><div>'+esc(new Date().toLocaleString('id-ID'))+'</div></div><div class="summary"><div class="card"><div class="label">PEMASUKAN</div><div class="value green">'+money(income)+'</div></div><div class="card"><div class="label">PENGELUARAN</div><div class="value red">'+money(expense)+'</div></div><div class="card"><div class="label">SALDO</div><div class="value">'+money(income-expense)+'</div></div></div>'+table+'<div class="foot">Data operasional dari Supabase.</div></body></html>';
    const f=document.createElement('iframe');f.style.cssText='position:fixed;width:1px;height:1px;right:0;bottom:0;border:0;opacity:0';document.body.appendChild(f);f.onload=()=>setTimeout(()=>{try{f.contentWindow.focus();f.contentWindow.print()}finally{setTimeout(()=>f.remove(),1500)}},200);f.srcdoc=html;
  }

  async function syncDebt(){
    if(busyDebt||!activePage('page-debt'))return;
    const sb=SB();if(!sb)return;busyDebt=true;
    try{
      const u=await getUser();if(!u)return;
      const q=await sb.from('debts_receivables').select('id,kind,party_name,phone,reference_no,debt_date,total_amount,paid_amount,quantity,unit,note').eq('user_id',u.id).order('debt_date',{ascending:false}).order('created_at',{ascending:false});
      if(q.error)throw q.error;
      const rows=q.data||[];
      const buttons=[...document.querySelectorAll('#page-debt button')].filter(b=>/Piutang Pelanggan|Utang Supplier/i.test(b.textContent||''));
      const active=buttons.find(b=>b.classList.contains('active'))||buttons[0];
      const kind=active&&/Utang Supplier/i.test(active.textContent||'')?'utang':'piutang';
      const data=rows.filter(r=>r.kind===kind);
      const box=document.getElementById('debtTable');if(!box)return;
      if(!data.length){box.innerHTML='<div class="empty">Belum ada '+(kind==='piutang'?'piutang pelanggan':'utang supplier')+'.</div>';return;}
      box.innerHTML='<div class="v707-debt-wrap"><div class="table-wrap"><table><thead><tr><th>Nama</th><th>Tanggal</th><th>Jumlah</th><th>Total</th><th>Dibayar</th><th>Sisa</th><th>Keterangan</th><th>Aksi</th></tr></thead><tbody>'+data.map(r=>{const total=Number(r.total_amount||0),paid=Math.min(total,Math.max(0,Number(r.paid_amount||0))),bal=Math.max(0,total-paid);return '<tr><td><strong>'+esc(r.party_name)+'</strong><span class="sub">'+esc(r.phone||'')+'</span></td><td>'+esc(r.debt_date||'-')+'</td><td>'+esc(r.quantity||1)+' '+esc(r.unit||'Paket')+'</td><td>'+money(total)+'</td><td>'+money(paid)+'</td><td><strong>'+money(bal)+'</strong></td><td>'+esc(r.note||r.reference_no||'-')+'</td><td><button type="button" class="btn ghost v707-debt-edit" data-id="'+esc(r.id)+'">✏️ Edit</button> <button type="button" class="btn danger v707-debt-del" data-id="'+esc(r.id)+'">Hapus</button></td></tr>';}).join('')+'</tbody></table></div></div>';
      box.querySelectorAll('.v707-debt-edit').forEach(b=>b.onclick=()=>editDebt(rid(b.dataset.id)));
      box.querySelectorAll('.v707-debt-del').forEach(b=>b.onclick=()=>deleteDebt(rid(b.dataset.id)));
    }catch(e){console.warn('[Barokah V70.7] debt sync',e);}
    finally{busyDebt=false;}
  }

  async function editDebt(id){
    const sb=SB();const u=await getUser();if(!sb||!u)return;
    const q=await sb.from('debts_receivables').select('*').eq('id',id).eq('user_id',u.id).single();
    if(q.error){alert('Gagal membuka edit: '+q.error.message);return;}
    const r=q.data;
    const party=prompt('Nama:',r.party_name||'');if(party===null)return;
    const totalText=prompt('Total tagihan:',String(Number(r.total_amount||0)));if(totalText===null)return;
    const paidText=prompt('Sudah dibayar:',String(Number(r.paid_amount||0)));if(paidText===null)return;
    const total=Number(String(totalText).replace(/\D/g,'')),paid=Number(String(paidText).replace(/\D/g,''));
    if(!party.trim()||!Number.isFinite(total)||total<=0||!Number.isFinite(paid)||paid<0||paid>total){alert('Data tidak valid.');return;}
    const u2=await sb.from('debts_receivables').update({party_name:party.trim(),total_amount:total,paid_amount:paid}).eq('id',id).eq('user_id',u.id);
    if(u2.error){alert('Gagal menyimpan edit: '+u2.error.message);return;}
    alert('Piutang/utang berhasil diperbarui.');
    await syncDebt();
    document.dispatchEvent(new CustomEvent('barokah:debt-changed'));
  }
  async function deleteDebt(id){
    if(!confirm('Hapus catatan utang/piutang ini?'))return;
    const sb=SB();const u=await getUser();if(!sb||!u)return;
    const q=await sb.from('debts_receivables').delete().eq('id',id).eq('user_id',u.id);if(q.error){alert('Gagal menghapus: '+q.error.message);return;}
    await syncDebt();document.dispatchEvent(new CustomEvent('barokah:debt-changed'));
  }

  function install(){
    const style=document.createElement('style');style.textContent='.v707-debt-wrap{margin-top:10px}.v707-debt-wrap table{min-width:900px}.v707-edit,.v707-del,.v707-print{font-size:11px}.v707-debt-edit{white-space:nowrap}.v707-debt-del{white-space:nowrap}';document.head.appendChild(style);
    const opPrint=document.getElementById('opPrint');if(opPrint){opPrint.onclick=e=>{e.preventDefault();printOperationalAll();};}
    syncOperational();syncDebt();
    setInterval(syncOperational,1500);setInterval(syncDebt,1500);
    document.addEventListener('barokah:operational-changed',syncOperational);
    document.addEventListener('barokah:debt-changed',syncDebt);
    window.addEventListener('focus',()=>{syncOperational();syncDebt();});
    window.addEventListener('barokah:supabase-ready',()=>{setTimeout(()=>{syncOperational();syncDebt();},300);});
    window.BarokahV707={syncOperational,syncDebt,printOperationalAll};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();