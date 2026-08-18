(function(){
  'use strict';

  function esc(v){return String(v==null?'':v).replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c];});}
  function rupiah(v){return 'Rp '+Number(v||0).toLocaleString('id-ID',{maximumFractionDigits:3,useGrouping:true});}
  function qty(v){return Number(v||0).toLocaleString('id-ID',{maximumFractionDigits:3,useGrouping:true});}

  async function getTransactions(){
    var sb=window.barokahSupabase;
    if(!sb) throw new Error('Koneksi Supabase belum siap.');
    var auth=await sb.auth.getUser();
    var user=auth.data&&auth.data.user;
    if(!user) throw new Error('Sesi login sudah berakhir. Silakan login ulang.');
    var res=await sb.from('transactions').select('*').eq('user_id',user.id).order('transaction_date',{ascending:false}).order('created_at',{ascending:false});
    if(res.error) throw res.error;
    return (res.data||[]).map(function(r){return {id:r.id,note:r.note,price:Number(r.price||0),unit:r.unit,qty:Number(r.qty||0),total:Number(r.total||0),type:r.type,date:r.transaction_date,createdAt:new Date(r.created_at).getTime()};});
  }

  function table(arr){
    if(!arr.length) return '<div class="pr-empty">Belum ada data.</div>';
    var h='<table class="pr-table"><thead><tr><th>Tanggal</th><th>Keterangan</th><th>Harga</th><th>Satuan</th><th>Jumlah</th><th>Nominal</th></tr></thead><tbody>';
    arr.forEach(function(x){
      h+='<tr><td>'+esc(new Date(x.date+'T00:00:00').toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}))+'</td><td>'+esc(x.note)+'</td><td class="pr-right">'+rupiah(x.price)+'</td><td>'+esc(x.unit)+'</td><td class="pr-right">'+qty(x.qty)+'</td><td class="pr-right">'+rupiah(x.total)+'</td></tr>';
    });
    return h+'</tbody></table>';
  }

  async function printReport(){
    try{
      var data=await getTransactions();
      var ins=data.filter(function(x){return x.type==='income';});
      var outs=data.filter(function(x){return x.type==='expense';});
      var totalIn=ins.reduce(function(a,x){return a+Number(x.total||0);},0);
      var totalOut=outs.reduce(function(a,x){return a+Number(x.total||0);},0);

      var report=document.getElementById('printReport');
      if(report){
        var el=function(id){return document.getElementById(id);};
        if(el('prIn'))el('prIn').textContent=rupiah(totalIn);
        if(el('prOut'))el('prOut').textContent=rupiah(totalOut);
        if(el('prNet'))el('prNet').textContent=rupiah(totalIn-totalOut);
        if(el('prIncoming'))el('prIncoming').innerHTML=table(ins);
        if(el('prOutgoing'))el('prOutgoing').innerHTML=table(outs);
        if(el('prHistory'))el('prHistory').innerHTML=table(data);
        if(el('prDate'))el('prDate').textContent=new Date().toLocaleString('id-ID',{dateStyle:'full',timeStyle:'short'});
      }

      var html='<!doctype html><html><head><meta charset="utf-8"><title>Barokah Telur - Laporan</title><style>@page{size:A4 portrait;margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Arial,sans-serif;color:#111;background:#fff;margin:0;font-size:9px}.head{text-align:center;border-bottom:2px solid #14532d;padding-bottom:10px;margin-bottom:12px}.logo{width:58px;height:58px;border-radius:50%;margin:0 auto 6px;background:#14532d;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px}.title{font-size:22px;font-weight:800;color:#14532d}.sub{font-size:11px;color:#555;margin-top:2px}.date{font-size:10px;color:#666;margin-top:5px}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:10px 0}.card{border:1px solid #ddd;border-radius:7px;padding:8px}.label{font-size:9px;color:#666}.value{font-size:14px;font-weight:800;margin-top:3px}.green{color:#087f3b}.red{color:#b42318}.section{margin-top:12px}.section h3{font-size:13px;margin:0 0 6px;border-left:4px solid #14532d;padding-left:7px}.table{width:100%;border-collapse:collapse;font-size:9px}.table th{background:#14532d;color:#fff;padding:5px;text-align:left}.table td{border:1px solid #ddd;padding:4px;vertical-align:top}.right{text-align:right}.empty{text-align:center;padding:10px;color:#777;border:1px dashed #bbb}.foot{margin-top:15px;padding-top:7px;border-top:1px solid #ddd;font-size:9px;color:#777;text-align:center}</style></head><body>'+
        '<div class="head"><div class="logo">BT</div><div class="title">BAROKAH TELUR</div><div class="sub">LAPORAN PEMBUKUAN USAHA</div><div class="date">'+esc(new Date().toLocaleString('id-ID',{dateStyle:'full',timeStyle:'short'}))+'</div></div>'+
        '<div class="summary"><div class="card"><div class="label">UANG MASUK</div><div class="value green">'+rupiah(totalIn)+'</div></div><div class="card"><div class="label">UANG KELUAR</div><div class="value red">'+rupiah(totalOut)+'</div></div><div class="card"><div class="label">LABA BERSIH</div><div class="value">'+rupiah(totalIn-totalOut)+'</div></div></div>'+
        '<div class="section"><h3>CATATAN UANG MASUK</h3>'+table(ins).replace(/class="pr-table"/g,'class="table"').replace(/class="pr-right"/g,'class="right"').replace(/class="pr-empty"/g,'class="empty"')+'</div>'+
        '<div class="section"><h3>CATATAN UANG KELUAR</h3>'+table(outs).replace(/class="pr-table"/g,'class="table"').replace(/class="pr-right"/g,'class="right"').replace(/class="pr-empty"/g,'class="empty"')+'</div>'+
        '<div class="section"><h3>RIWAYAT TRANSAKSI</h3>'+table(data).replace(/class="pr-table"/g,'class="table"').replace(/class="pr-right"/g,'class="right"').replace(/class="pr-empty"/g,'class="empty"')+'</div>'+
        '<div class="foot">Barokah Telur — Laporan dibuat dari data Supabase saat tombol Print ditekan.</div></body></html>';

      var frame=document.getElementById('barokahReportPrintFrame');
      if(frame)frame.remove();
      frame=document.createElement('iframe');
      frame.id='barokahReportPrintFrame';
      frame.style.cssText='position:fixed;width:1px;height:1px;right:0;bottom:0;border:0;opacity:0;pointer-events:none';
      document.body.appendChild(frame);
      frame.onload=function(){setTimeout(function(){try{frame.contentWindow.focus();frame.contentWindow.print();}catch(e){console.error(e);alert('Print Laporan gagal: '+(e.message||e));}setTimeout(function(){if(frame&&frame.parentNode)frame.remove();},1500);},250);};
      frame.srcdoc=html;
    }catch(err){console.error('Print Laporan:',err);alert('Print Laporan gagal: '+(err.message||err));}
  }

  function install(){
    window.barokahPrintReport=printReport;
    var btn=document.getElementById('barokahPrintBtn');
    if(btn){
      var fresh=btn.cloneNode(true);
      btn.parentNode.replaceChild(fresh,btn);
      fresh.removeAttribute('onclick');
      fresh.addEventListener('click',function(e){e.preventDefault();printReport();});
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(install,100);});
  else setTimeout(install,100);
})();
