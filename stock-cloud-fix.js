(function(){
  'use strict';
  let rows=[];
  const $=id=>document.getElementById(id);
  const factor=u=>{const k=String(u||'').trim().toLowerCase();if(k==='papan')return 30;if(k==='ikat')return 180;if(k==='butir')return 1;return 1;};
  const fmt=n=>Number(n||0).toLocaleString('id-ID',{maximumFractionDigits:10,useGrouping:true});
  const saldo=n=>fmt(Math.max(0,Number(n)||0))+' Butir';
  const esc=v=>String(v==null?'':v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const ordered=a=>a.slice().sort((x,y)=>new Date(x.created_at)-new Date(y.created_at)||String(x.id).localeCompare(String(y.id)));
  const running=a=>{let s=0;return ordered(a).map(r=>{s+=Number(r.delta_butir||0);return Object.assign({},r,{_saldo:s});});};
  const total=()=>rows.reduce((s,r)=>s+Number(r.delta_butir||0),0);
  const stockPage=()=>document.getElementById('page-stock');
  const operationalPage=()=>document.getElementById('page-operational');
  const visibleStockHistory=()=>{
    const page=stockPage();
    return page?.querySelector('#stockHistory')||document.querySelector('#page-stock #stockHistory');
  };
  function isOperationalVisible(){
    const page=operationalPage();
    return !!page && (page.classList.contains('active') || getComputedStyle(page).display!=='none');
  }
  function hideOrphanStockBlock(node){
    if(!node||node.closest('#page-stock'))return;
    const text=String(node.textContent||'').replace(/\s+/g,' ').trim();
    const looksLikeStock=text.includes('Riwayat Stok Gudang') || text.includes('Semua perubahan stok tercatat otomatis');
    if(!looksLikeStock)return;
    if(node.closest('#page-operational')){
      node.style.setProperty('display','none','important');
      node.setAttribute('data-stock-orphan-hidden','1');
      return;
    }
    node.style.setProperty('display','none','important');
    node.setAttribute('data-stock-orphan-hidden','1');
  }
  function isolateLegacyStockHistory(){
    const pageBox=visibleStockHistory();
    document.querySelectorAll('#stockHistory').forEach(box=>{
      if(pageBox&&box===pageBox)return;
      let node=box.parentElement;
      for(let i=0;i<8&&node;i++,node=node.parentElement){
        const text=String(node.textContent||'').replace(/\s+/g,' ');
        if(text.includes('Riwayat Stok Gudang')||text.includes('Hapus Riwayat Stok')){
          hideOrphanStockBlock(node);
          break;
        }
      }
    });
    if(isOperationalVisible()){
      document.querySelectorAll('body *').forEach(el=>{
        if(el.id==='page-stock'||el.closest('#page-stock'))return;
        if(el.dataset.stockOrphanHidden==='1')return;
        const text=String(el.textContent||'').replace(/\s+/g,' ').trim();
        if(text==='Riwayat Stok Gudang' || text==='Semua perubahan stok tercatat otomatis: stok masuk, stok keluar, dan telur retak/tidak layak.'){
          hideOrphanStockBlock(el.closest('.card,.stock-history-card,.panel,section,div')||el.parentElement);
        }
      });
    }
  }
  async function user(){const sb=window.barokahSupabase;if(!sb)return null;const r=await sb.auth.getUser();return r.data&&r.data.user?r.data.user:null;}
  async function load(){const sb=window.barokahSupabase,u=await user();if(!sb||!u)return;const r=await sb.from('stock_movements').select('*').eq('user_id',u.id).order('created_at',{ascending:true}).order('id',{ascending:true});if(r.error){console.error('Stock cloud load:',r.error);return;}rows=r.data||[];render();}
  function render(){
    isolateLegacyStockHistory();
    const rr=running(rows),n=total();
    if($('stockWarehouse'))$('stockWarehouse').textContent=saldo(n);
    if($('stockAutoPreview'))$('stockAutoPreview').textContent='Saldo saat ini: '+saldo(n)+'. Stok tersimpan di database online.';
    if($('badEggsInfo'))$('badEggsInfo').textContent='Total Telur Retak: '+fmt(rr.filter(r=>r.movement_type==='Retak').reduce((s,r)=>s+Number(r.qty||0)*factor(r.unit),0))+' Butir';
    if($('unfitEggsInfo'))$('unfitEggsInfo').textContent='Total Telur Tidak Layak: '+fmt(rr.filter(r=>r.movement_type==='Tidak Layak').reduce((s,r)=>s+Number(r.qty||0)*factor(r.unit),0))+' Butir';
    const box=visibleStockHistory();if(!box)return;
    if(!rr.length){box.innerHTML='<div class="stock-history-empty">Belum ada riwayat stok.</div>';return;}
    box.innerHTML='<div class="stock-table-wrap"><table class="stock-history-table"><thead><tr><th>Tanggal</th><th>Produk</th><th>Jenis</th><th>Jumlah</th><th>Konversi</th><th>Saldo Setelah</th><th>Keterangan</th></tr></thead><tbody>'+rr.slice().reverse().map(r=>{const d=Number(r.delta_butir||0),sg=d>=0?'+':'-',a=Math.abs(d),conv=a%30===0?sg+fmt(a/30)+' Papan | '+sg+fmt(a)+' Butir':sg+fmt(a)+' Butir';return '<tr><td>'+new Date(r.created_at).toLocaleDateString('id-ID')+'</td><td><b>'+esc(r.product||'Telur Ayam Ras')+'</b></td><td><b>'+esc(r.movement_type||'')+'</b></td><td>'+sg+fmt(Math.abs(Number(r.qty)||0))+' '+esc(r.unit||'')+'</td><td>'+conv+'</td><td><b>'+saldo(r._saldo)+'</b></td><td>'+esc(r.note||'-')+'</td></tr>';}).join('')+'</tbody></table></div>';
  }
  async function add(type){const sb=window.barokahSupabase,u=await user();if(!sb||!u){alert('Sesi database belum aktif. Silakan login ulang.');return;}let q,unit,note;if(type==='Masuk'){q=parseNum($('stockIn')?.value);unit=$('stockInUnit')?.value.trim();note=$('stockInNote')?.value.trim();}else if(type==='Keluar'){q=parseNum($('stockOut')?.value);unit=$('stockOutUnit')?.value.trim();note=$('stockOutNote')?.value.trim();}else if(type==='Retak'){q=parseNum($('badEggs')?.value);unit=$('badEggsUnit')?.value.trim()||'Butir';note='Telur retak';}else{q=parseNum($('unfitEggs')?.value);unit=$('unfitEggsUnit')?.value.trim()||'Butir';note='Telur tidak layak';}if(!Number.isFinite(q)||q<=0){alert('Masukkan jumlah yang benar.');return;}if(!unit){alert('Isi satuan.');return;}if((type==='Masuk'||type==='Keluar')&&!note){alert('Isi keterangan.');return;}const delta=q*factor(unit)*(type==='Masuk'?1:-1),current=total();if(type!=='Masuk'&&Math.abs(delta)>current){alert('Stok Gudang tidak mencukupi. Stok saat ini '+fmt(current)+' Butir.');return;}const after=current+delta;const r=await sb.from('stock_movements').insert({user_id:u.id,product:'Telur Ayam Ras',movement_type:type,qty:q,unit,delta_butir:delta,saldo_after_butir:after,note}).select('*').single();if(r.error){alert('Gagal menyimpan stok: '+r.error.message);return;}rows.push(r.data);render();if(type==='Masuk'){$('stockIn').value='';$('stockInNote').value='';}if(type==='Keluar'){$('stockOut').value='';$('stockOutNote').value='';}if(type==='Retak')$('badEggs').value='';if(type==='Tidak Layak')$('unfitEggs').value='';if(typeof toast==='function')toast('Perubahan stok tersimpan ke database.');}
  function parseNum(v){let s=String(v??'').trim().replace(/\s/g,'');if(!s)return NaN;if(s.includes(','))return Number(s.replace(/\./g,'').replace(',','.'));const p=s.split('.');if(p.length===1)return Number(s);return p[1].length===3?Number(p[0]+p[1]):Number(s);}
  async function clear(){const sb=window.barokahSupabase,u=await user();if(!sb||!u)return;if(!confirm('Hapus seluruh riwayat stok dan reset Stok Gudang?'))return;const r=await sb.from('stock_movements').delete().eq('user_id',u.id);if(r.error){alert('Gagal menghapus stok: '+r.error.message);return;}rows=[];render();alert('Riwayat stok dan saldo stok sudah di-reset ke 0 Butir.');}
  function print(){
    const rr=running(rows),n=total(),escP=esc;
    const rowsHtml=rr.slice().reverse().map(r=>{const d=Number(r.delta_butir||0),sg=d>=0?'+':'-',a=Math.abs(d),conv=a%30===0?sg+fmt(a/30)+' Papan | '+sg+fmt(a)+' Butir':sg+fmt(a)+' Butir';return '<tr><td>'+new Date(r.created_at).toLocaleDateString('id-ID')+'</td><td>'+escP(r.product||'Telur Ayam Ras')+'</td><td>'+escP(r.movement_type||'')+'</td><td>'+sg+fmt(Math.abs(Number(r.qty)||0))+' '+escP(r.unit||'')+'</td><td>'+conv+'</td><td><b>'+fmt(r._saldo)+' Butir</b></td><td>'+escP(r.note||'-')+'</td></tr>';}).join('');
    const html='<!doctype html><html><head><meta charset="utf-8"><title>Stok Gudang - Barokah Telur</title><style>@page{size:A4 portrait;margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Arial,sans-serif;color:#111;font-size:9px;margin:0}.head{text-align:center;border-bottom:2px solid #14532d;padding-bottom:10px;margin-bottom:12px}.title{font-size:20px;font-weight:900;color:#14532d}.sub{font-size:10px;color:#666;margin-top:2px}.summary{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}.card{border:1px solid #ddd;border-radius:7px;padding:8px}.label{font-size:8px;color:#666}.value{font-size:15px;font-weight:900;color:#14532d;margin-top:3px}h2{font-size:12px;margin:12px 0 6px;border-left:4px solid #14532d;padding-left:6px}table{width:100%;border-collapse:collapse;font-size:8px}th{background:#14532d;color:#fff;padding:5px;text-align:left}td{border:1px solid #ddd;padding:4px;vertical-align:top}.foot{text-align:center;border-top:1px dashed #777;margin-top:10px;padding-top:6px;color:#666;font-size:8px}</style></head><body><div class="head"><div class="title">BAROKAH TELUR</div><div class="sub">LAPORAN STOK GUDANG</div><div class="sub">'+escP(new Date().toLocaleString('id-ID'))+'</div></div><div class="summary"><div class="card"><div class="label">STOK GUDANG SAAT INI</div><div class="value">'+escP(saldo(n))+'</div></div><div class="card"><div class="label">RIWAYAT PERUBAHAN</div><div class="value">'+rr.length+' data</div></div></div><h2>Riwayat Stok Gudang</h2><table><thead><tr><th>Tanggal</th><th>Produk</th><th>Jenis</th><th>Jumlah</th><th>Konversi</th><th>Saldo Setelah</th><th>Keterangan</th></tr></thead><tbody>'+(rowsHtml||'<tr><td colspan="7" style="text-align:center">Belum ada riwayat stok.</td></tr>')+'</tbody></table><div class="foot">Data berasal dari Supabase — Barokah Telur</div></body></html>';
    let f=document.getElementById('barokahStockCloudPrintFrame');if(f)f.remove();f=document.createElement('iframe');f.id='barokahStockCloudPrintFrame';f.style.cssText='position:fixed;width:1px;height:1px;right:0;bottom:0;border:0;opacity:0';document.body.appendChild(f);f.onload=function(){setTimeout(function(){try{f.contentWindow.focus();f.contentWindow.print();}catch(e){alert('Print Stok Gudang gagal: '+e.message);}setTimeout(()=>f.remove(),1500);},200)};f.srcdoc=html;
  }
  function install(){window.addStockIn=()=>add('Masuk');window.addStockOut=()=>add('Keluar');window.addBadEggs=()=>add('Retak');window.addUnfitEggs=()=>add('Tidak Layak');window.clearStockHistory=clear;window.renderStock=render;window.getWarehouseStock=total;window.printStockReport=print;load();isolateLegacyStockHistory();}
  window.addEventListener('barokah:supabase-ready',install,{once:false});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,300),{once:true});else setTimeout(install,300);
  if(document.body){
    const mo=new MutationObserver(()=>isolateLegacyStockHistory());
    mo.observe(document.body,{childList:true,subtree:true});
    setInterval(isolateLegacyStockHistory,1000);
  }
})();
