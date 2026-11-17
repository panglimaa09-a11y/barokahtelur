// Barokah Telur V70.4.3 — Print Riwayat (Uang Masuk / Uang Keluar / Semua)
// BERBEDA dengan Print Laporan (#barokahPrintBtn / barokahPrintReport):
// modul ini hanya mencetak daftar RIWAYAT, dan SEBELUM print selalu ada
// pilihan jenis: Uang Masuk, Uang Keluar, atau Semua. Print Laporan tetap
// mencetak laporan lengkap seperti biasa dan tidak disentuh modul ini.
(function(){
  'use strict';
  function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
  function rupiah(v){return 'Rp '+Number(v||0).toLocaleString('id-ID',{maximumFractionDigits:3,useGrouping:true});}
  function qtyFmt(v){return Number(v||0).toLocaleString('id-ID',{maximumFractionDigits:3,useGrouping:true});}
  // Data live yang sama seperti Print Laporan: array `state` global.
  // Jangan baca localStorage (bisa berisi array lama yang tidak terkait).
  function snapshot(){
    try{
      if(Array.isArray(window.stateForPrint))return window.stateForPrint.slice();
      if(typeof state!=='undefined'&&Array.isArray(state))return state.slice();
    }catch(e){}
    return [];
  }
  function sortRows(data){
    return data.slice().sort(function(a,b){
      return String(b.date||'').localeCompare(String(a.date||''))||((b.createdAt||0)-(a.createdAt||0));
    });
  }
  function printHistory(kind){
    kind=(kind==='income'||kind==='expense')?kind:'all';
    var data=sortRows(snapshot());
    var rows=kind==='all'?data:data.filter(function(x){return x.type===kind;});
    var totalIn=data.filter(function(x){return x.type==='income';}).reduce(function(a,x){return a+Number(x.total||0);},0);
    var totalOut=data.filter(function(x){return x.type==='expense';}).reduce(function(a,x){return a+Number(x.total||0);},0);
    var title=kind==='income'?'RIWAYAT UANG MASUK':kind==='expense'?'RIWAYAT UANG KELUAR':'RIWAYAT TRANSAKSI';
    var sub=kind==='income'?'Hanya uang masuk':kind==='expense'?'Hanya uang keluar':'Semua transaksi';
    var summary;
    if(kind==='income')summary='<div class="summary"><div class="card"><div class="label">TOTAL UANG MASUK</div><div class="value green">'+rupiah(totalIn)+'</div></div></div>';
    else if(kind==='expense')summary='<div class="summary"><div class="card"><div class="label">TOTAL UANG KELUAR</div><div class="value red">'+rupiah(totalOut)+'</div></div></div>';
    else summary='<div class="summary"><div class="card"><div class="label">TOTAL UANG MASUK</div><div class="value green">'+rupiah(totalIn)+'</div></div><div class="card"><div class="label">TOTAL UANG KELUAR</div><div class="value red">'+rupiah(totalOut)+'</div></div><div class="card"><div class="label">SELISIH</div><div class="value">'+rupiah(totalIn-totalOut)+'</div></div></div>';
    var table=rows.length?'<table><thead><tr><th>Tanggal</th><th>Keterangan</th><th>Harga</th><th>Satuan</th><th>Jumlah</th><th>Total</th></tr></thead><tbody>'+rows.map(function(x){
      return '<tr><td>'+esc(new Date((x.date||'')+'T00:00:00').toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}))+'</td><td>'+esc(x.note)+'</td><td class="right">'+rupiah(x.price)+'</td><td>'+esc(x.unit)+'</td><td class="right">'+qtyFmt(x.qty)+'</td><td class="right">'+rupiah(x.total)+'</td></tr>';
    }).join('')+'</tbody></table>':'<p>Belum ada data.</p>';
    var html='<!doctype html><html><head><meta charset="utf-8"><title>Barokah Telur - '+title+'</title><style>@page{size:A4 portrait;margin:10mm}body{font-family:Arial,sans-serif;color:#111;font-size:10px}h1{color:#14532d;margin:0}h2{margin:4px 0 15px;font-size:13px;color:#555}.head{text-align:center;border-bottom:2px solid #14532d;padding-bottom:10px;margin-bottom:12px}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}.summary:has(.card:only-child){grid-template-columns:1fr}.card{border:1px solid #ddd;border-radius:7px;padding:8px}.label{font-size:9px;color:#666}.value{font-size:14px;font-weight:800;margin-top:3px}.green{color:#087f3b}.red{color:#b42318}table{width:100%;border-collapse:collapse;font-size:9px}th{background:#14532d;color:#fff;padding:6px;text-align:left}td{border:1px solid #ddd;padding:5px;vertical-align:top}.right{text-align:right}.foot{margin-top:15px;border-top:1px solid #ddd;padding-top:7px;text-align:center;color:#777}</style></head><body><div class="head"><h1>BAROKAH TELUR</h1><h2>'+title+'</h2><div>'+esc(sub)+' &bull; '+esc(new Date().toLocaleString('id-ID',{dateStyle:'full',timeStyle:'short'}))+'</div></div>'+summary+table+'<div class="foot">Barokah Telur &mdash; riwayat dicetak dari data aplikasi.</div></body></html>';
    var frame=document.createElement('iframe');
    frame.style.cssText='position:fixed;width:1px;height:1px;right:0;bottom:0;border:0;opacity:0';
    document.body.appendChild(frame);
    frame.onload=function(){setTimeout(function(){try{frame.contentWindow.focus();frame.contentWindow.print();}catch(e){alert('Print gagal: '+(e.message||e));}setTimeout(function(){frame.remove();},1200);},200);};
    frame.srcdoc=html;
  }
  function showChoice(){
    var bar=document.getElementById('histPrintChoice');
    if(!bar)return;
    bar.style.display='block';
    if(bar.scrollIntoView)bar.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function hideChoice(){
    var bar=document.getElementById('histPrintChoice');
    if(bar)bar.style.display='none';
  }
  function wire(){
    var btn=document.getElementById('histPrintBtn');
    if(btn&&!btn.dataset.histPrintWired){btn.dataset.histPrintWired='1';btn.addEventListener('click',function(e){e.preventDefault();showChoice();});}
    var bar=document.getElementById('histPrintChoice');
    if(bar&&!bar.dataset.histPrintWired){
      bar.dataset.histPrintWired='1';
      var go=function(kind){hideChoice();printHistory(kind);};
      var bIn=document.getElementById('histPrintInBtn');if(bIn)bIn.addEventListener('click',function(){go('income');});
      var bOut=document.getElementById('histPrintOutBtn');if(bOut)bOut.addEventListener('click',function(){go('expense');});
      var bAll=document.getElementById('histPrintAllBtn');if(bAll)bAll.addEventListener('click',function(){go('all');});
      var bCancel=document.getElementById('histPrintCancelBtn');if(bCancel)bCancel.addEventListener('click',hideChoice);
    }
  }
  window.barokahPrintHistory=printHistory;
  window.barokahShowHistoryPrintChoice=showChoice;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});
  else wire();
  // Halaman Riwayat adalah HTML statis, tapi jaga-jaga bila modul dimuat
  // sebelum markup-nya ada: coba wiring ulang saat DOM berubah.
  if(typeof MutationObserver!=='undefined'){
    var done=false;
    var obs=new MutationObserver(function(){
      if(done)return;
      if(document.getElementById('histPrintBtn')){done=true;wire();obs.disconnect();}
    });
    obs.observe(document.documentElement,{childList:true,subtree:true});
    setTimeout(function(){obs.disconnect();},15000);
  }
})();
