(function(){
  'use strict';
  const TX_LOCAL='barokah_telur_owner_final_v1';
  const SB=()=>window.barokahSupabase;
  let refreshing=false;

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function factor(u){const k=String(u||'').trim().toLowerCase();return k==='papan'?30:k==='ikat'?180:1;}
  function sorted(rows){return rows.slice().sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)||String(a.id).localeCompare(String(b.id)));}
  function running(rows){let s=0;return sorted(rows).map(r=>{s+=Number(r.delta_butir||0);return Object.assign({},r,{calculated_saldo_after_butir:s});});}
  async function user(){const sb=SB();if(!sb)return null;const r=await sb.auth.getUser();return r.data&&r.data.user?r.data.user:null;}

  async function syncTransactions(){
    const sb=SB();if(!sb)return;
    const u=await user();if(!u)return;
    const r=await sb.from('transactions').select('*').order('transaction_date',{ascending:false}).order('created_at',{ascending:false});
    if(r.error){console.warn('Shared transactions:',r.error);return;}
    window.state=(r.data||[]).map(x=>({id:x.id,note:x.note,price:Number(x.price||0),unit:x.unit,qty:Number(x.qty||0),total:Number(x.total||0),type:x.type,date:x.transaction_date,createdAt:new Date(x.created_at).getTime()}));
    try{localStorage.setItem(TX_LOCAL,JSON.stringify(window.state));}catch(e){}
    if(typeof window.render==='function')window.render();
  }

  async function syncStock(){
    const sb=SB();if(!sb)return;
    const u=await user();if(!u)return;
    const r=await sb.from('stock_movements').select('*').order('created_at',{ascending:true}).order('id',{ascending:true});
    if(r.error){console.warn('Shared stock:',r.error);return;}
    const rows=running(r.data||[]), total=rows.reduce((a,x)=>a+Number(x.delta_butir||0),0),fmt=x=>Number(x||0).toLocaleString('id-ID',{maximumFractionDigits:10});
    const w=document.getElementById('stockWarehouse');if(w)w.textContent=fmt(total)+' Butir';
    const p=document.getElementById('stockAutoPreview');if(p)p.textContent='Saldo saat ini: '+fmt(total)+' Butir. Stok tersimpan di database online.';
    const bad=rows.filter(x=>x.movement_type==='Retak').reduce((a,x)=>a+Number(x.qty||0)*factor(x.unit),0);
    const unfit=rows.filter(x=>x.movement_type==='Tidak Layak').reduce((a,x)=>a+Number(x.qty||0)*factor(x.unit),0);
    const bi=document.getElementById('badEggsInfo');if(bi)bi.textContent='Total Telur Retak: '+fmt(bad)+' Butir';
    const ui=document.getElementById('unfitEggsInfo');if(ui)ui.textContent='Total Telur Tidak Layak: '+fmt(unfit)+' Butir';
    const box=document.getElementById('stockHistory');if(!box)return;
    if(!rows.length){box.innerHTML='<div class="stock-history-empty">Belum ada riwayat stok.</div>';return;}
    box.innerHTML='<div class="stock-table-wrap"><table class="stock-history-table"><thead><tr><th>Tanggal</th><th>Produk</th><th>Jenis</th><th>Jumlah</th><th>Konversi</th><th>Saldo Setelah</th><th>Keterangan</th></tr></thead><tbody>'+rows.slice().reverse().map(x=>{const d=Number(x.delta_butir||0),sg=d>=0?'+':'-',a=Math.abs(d),conv=a%30===0?sg+fmt(a/30)+' Papan | '+sg+fmt(a)+' Butir':sg+fmt(a)+' Butir';return '<tr><td>'+new Date(x.created_at).toLocaleDateString('id-ID')+'</td><td><b>'+esc(x.product||'Telur Ayam Ras')+'</b></td><td><b>'+esc(x.movement_type||'')+'</b></td><td>'+sg+fmt(Math.abs(Number(x.qty)||0))+' '+esc(x.unit||'')+'</td><td>'+conv+'</td><td><b>'+fmt(x.calculated_saldo_after_butir)+' Butir</b></td><td>'+esc(x.note||'-')+'</td></tr>';}).join('')+'</tbody></table></div>';
    window.__barokahSharedStockRows=rows;
  }

  async function syncAll(){
    if(refreshing)return;refreshing=true;
    try{await syncTransactions();await syncStock();}finally{refreshing=false;}
  }

  async function addStock(type){
    const sb=SB(),u=await user();if(!sb||!u){alert('Sesi database belum aktif. Silakan login ulang.');return;}
    let q,unit,note;
    if(type==='Masuk'){q=parseNum(document.getElementById('stockIn')?.value);unit=document.getElementById('stockInUnit')?.value.trim();note=document.getElementById('stockInNote')?.value.trim();}
    else if(type==='Keluar'){q=parseNum(document.getElementById('stockOut')?.value);unit=document.getElementById('stockOutUnit')?.value.trim();note=document.getElementById('stockOutNote')?.value.trim();}
    else if(type==='Retak'){q=parseNum(document.getElementById('badEggs')?.value);unit=document.getElementById('badEggsUnit')?.value.trim()||'Butir';note='Telur retak';}
    else{q=parseNum(document.getElementById('unfitEggs')?.value);unit=document.getElementById('unfitEggsUnit')?.value.trim()||'Butir';note='Telur tidak layak';}
    if(!Number.isFinite(q)||q<=0){alert('Masukkan jumlah yang benar.');return;}if(!unit){alert('Isi satuan.');return;}if((type==='Masuk'||type==='Keluar')&&!note){alert('Isi keterangan.');return;}
    const existing=window.__barokahSharedStockRows||[];const current=existing.reduce((a,x)=>a+Number(x.delta_butir||0),0);const delta=q*factor(unit)*(type==='Masuk'?1:-1);if(type!=='Masuk'&&Math.abs(delta)>current){alert('Stok Gudang tidak mencukupi. Stok saat ini '+current.toLocaleString('id-ID')+' Butir.');return;}
    const after=current+delta;const r=await sb.from('stock_movements').insert({user_id:u.id,product:'Telur Ayam Ras',movement_type:type,qty:q,unit,delta_butir:delta,saldo_after_butir:after,note}).select('*').single();if(r.error){alert('Gagal menyimpan stok: '+r.error.message);return;}
    if(type==='Masuk'){document.getElementById('stockIn').value='';document.getElementById('stockInNote').value='';}
    if(type==='Keluar'){document.getElementById('stockOut').value='';document.getElementById('stockOutNote').value='';}
    if(type==='Retak')document.getElementById('badEggs').value='';if(type==='Tidak Layak')document.getElementById('unfitEggs').value='';
    await syncStock();if(typeof toast==='function')toast('Perubahan stok tersimpan ke database bersama.');
  }

  function parseNum(v){let s=String(v??'').trim().replace(/\s/g,'');if(!s)return NaN;if(s.includes(','))return Number(s.replace(/\./g,'').replace(',','.'));const p=s.split('.');return p.length===2&&p[1].length===3?Number(p[0]+p[1]):Number(s);}

  function printStock(){
    const rows=window.__barokahSharedStockRows||[],total=rows.reduce((a,x)=>a+Number(x.delta_butir||0),0),fmt=x=>Number(x||0).toLocaleString('id-ID',{maximumFractionDigits:10,useGrouping:true}),escP=esc;
    const body=rows.slice().reverse().map(x=>{const d=Number(x.delta_butir||0),sg=d>=0?'+':'-',a=Math.abs(d),conv=a%30===0?sg+fmt(a/30)+' Papan | '+sg+fmt(a)+' Butir':sg+fmt(a)+' Butir';return '<tr><td>'+new Date(x.created_at).toLocaleDateString('id-ID')+'</td><td>'+escP(x.product||'Telur Ayam Ras')+'</td><td>'+escP(x.movement_type||'')+'</td><td>'+sg+fmt(Math.abs(Number(x.qty)||0))+' '+escP(x.unit||'')+'</td><td>'+conv+'</td><td><b>'+fmt(x.calculated_saldo_after_butir)+' Butir</b></td><td>'+escP(x.note||'-')+'</td></tr>';}).join('');
    const html='<!doctype html><html><head><meta charset="utf-8"><title>Barokah Telur - Stok Gudang</title><style>@page{size:A4 portrait;margin:10mm}body{font-family:Arial,sans-serif;font-size:9px;color:#111}h1{color:#14532d;margin:0}.head{text-align:center;border-bottom:2px solid #14532d;padding-bottom:10px;margin-bottom:12px}.sum{border:1px solid #ddd;padding:9px;margin-bottom:12px}.v{font-size:16px;font-weight:800;color:#14532d}table{width:100%;border-collapse:collapse}th{background:#14532d;color:#fff;padding:5px;text-align:left}td{border:1px solid #ddd;padding:4px}</style></head><body><div class="head"><h1>BAROKAH TELUR</h1><div>LAPORAN STOK GUDANG</div><small>'+escP(new Date().toLocaleString('id-ID'))+'</small></div><div class="sum">STOK GUDANG SAAT INI<div class="v">'+fmt(total)+' Butir</div></div><table><thead><tr><th>Tanggal</th><th>Produk</th><th>Jenis</th><th>Jumlah</th><th>Konversi</th><th>Saldo Setelah</th><th>Keterangan</th></tr></thead><tbody>'+(body||'<tr><td colspan="7">Belum ada riwayat stok.</td></tr>')+'</tbody></table></body></html>';
    let f=document.getElementById('btSharedStockPrint');if(f)f.remove();f=document.createElement('iframe');f.id='btSharedStockPrint';f.style.cssText='position:fixed;width:1px;height:1px;right:0;bottom:0;border:0;opacity:0;pointer-events:none';document.body.appendChild(f);f.onload=()=>setTimeout(()=>{try{f.contentWindow.focus();f.contentWindow.print();}catch(e){alert('Print Stok Gudang gagal: '+e.message);}setTimeout(()=>f.remove(),1500)},200);f.srcdoc=html;
  }

  function install(){
    const original=window.barokahCloudSync;
    if(original&&!original.__sharedWrapped){
      const wrapped=async function(){const r=await original.apply(this,arguments);await syncAll();return r;};wrapped.__sharedWrapped=true;window.barokahCloudSync=wrapped;
    }
    window.addStockIn=()=>addStock('Masuk');window.addStockOut=()=>addStock('Keluar');window.addBadEggs=()=>addStock('Retak');window.addUnfitEggs=()=>addStock('Tidak Layak');window.printStockReport=printStock;
    setTimeout(syncAll,800);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncAll();});
    window.addEventListener('focus',()=>syncAll());
    setInterval(()=>{if(!document.hidden)syncAll();},15000);
  }

  window.addEventListener('barokah:supabase-ready',()=>setTimeout(install,500));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,900));else setTimeout(install,900);
})();
