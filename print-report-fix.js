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
        '<div class="section"><h3>CATATAN UANG MASUK</h3>'+table(ins).replace(/pr-table/g,'table').replace(/pr-right/g,'right').replace(/pr-empty/g,'empty')+'</div>'+
        '<div class="section"><h3>CATATAN UANG KELUAR</h3>'+table(outs).replace(/pr-table/g,'table').replace(/pr-right/g,'right').replace(/pr-empty/g,'empty')+'</div>'+
        '<div class="section"><h3>RIWAYAT TRANSAKSI</h3>'+table(data).replace(/pr-table/g,'table').replace(/pr-right/g,'right').replace(/pr-empty/g,'empty')+'</div>'+
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

// V70.7 preview bugfix loader. Production is untouched.
(function(){
  function load(){
    if(document.getElementById('barokah-v707-script'))return;
    var s=document.createElement('script');
    s.id='barokah-v707-script';
    s.src='barokah-bugfix-v70.7.js';
    s.defer=false;
    document.head.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();

// Stable debt/receivable print override.
// This replaces the older debt print handler after all app scripts load.
(function(){
  'use strict';
  function esc(v){return String(v==null?'':v).replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c];});}
  function money(v){return 'Rp '+Number(v||0).toLocaleString('id-ID',{maximumFractionDigits:0,useGrouping:true});}
  function normalize(q){return Number(q||0).toLocaleString('id-ID',{maximumFractionDigits:3,useGrouping:true});}
  async function printDebtReport(tab){
    var w=window.open('','_blank');
    if(!w){alert('Izinkan pop-up untuk membuka cetak Utang Piutang.');return;}
    w.document.open();
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Menyiapkan laporan...</title><style>body{font-family:Arial,sans-serif;padding:30px;color:#333;text-align:center}p{color:#777}</style></head><body><h3>BAROKAH TELUR</h3><p>Mengambil data Utang/Piutang terbaru...</p></body></html>');
    w.document.close();
    try{
      var sb=window.barokahSupabase;
      if(!sb)throw new Error('Koneksi Supabase belum siap.');
      var auth=await sb.auth.getUser();
      var user=auth.data&&auth.data.user;
      if(!user)throw new Error('Sesi login sudah berakhir.');
      var res=await sb.from('debts_receivables').select('*').eq('user_id',user.id).eq('kind',tab).order('debt_date',{ascending:false}).order('created_at',{ascending:false});
      if(res.error)throw res.error;
      var list=res.data||[];
      var title=tab==='piutang'?'LAPORAN PIUTANG PELANGGAN':'LAPORAN UTANG SUPPLIER';
      var rows=list.map(function(r){
        var total=Number(r.total_amount||0),paid=Number(r.paid_amount||0),bal=Math.max(0,total-paid);
        return '<tr><td>'+esc(r.party_name)+'</td><td>'+esc(r.debt_date||'-')+'</td><td>'+normalize(r.quantity||1)+' '+esc(r.unit||'Paket')+'</td><td>'+money(total)+'</td><td>'+money(paid)+'</td><td>'+money(bal)+'</td><td>'+esc(r.note||r.reference_no||'-')+'</td></tr>';
      }).join('');
      if(!rows)rows='<tr><td colspan="7" style="text-align:center;padding:16px">Belum ada data '+(tab==='piutang'?'piutang pelanggan':'utang supplier')+'.</td></tr>';
      var html='<!doctype html><html><head><meta charset="utf-8"><title>'+title+' - Barokah Telur</title><style>@page{size:A4 portrait;margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Arial,sans-serif;color:#172018;margin:0;font-size:10px}.head{text-align:center;border-bottom:2px solid #14532d;padding-bottom:10px;margin-bottom:12px}.title{font-size:22px;font-weight:900;color:#14532d}.sub{font-size:11px;color:#666;margin-top:3px}.date{font-size:10px;color:#666;margin-top:5px}table{width:100%;border-collapse:collapse;font-size:9px;margin-top:10px}th{background:#14532d;color:#fff;padding:6px;text-align:left}td{border:1px solid #ddd;padding:6px;vertical-align:top}.summary{margin:10px 0;padding:8px;border:1px solid #ddd;border-radius:7px}.foot{text-align:center;margin-top:14px;padding-top:7px;border-top:1px dashed #aaa;font-size:9px;color:#777}</style></head><body><div class="head"><div class="title">BAROKAH TELUR</div><div class="sub">'+title+'</div><div class="date">'+esc(new Date().toLocaleString('id-ID'))+'</div></div><div class="summary">Total catatan: <b>'+list.length+'</b></div><table><thead><tr><th>Nama</th><th>Tanggal</th><th>Jumlah</th><th>Total</th><th>Dibayar</th><th>Sisa</th><th>Keterangan</th></tr></thead><tbody>'+rows+'</tbody></table><div class="foot">Data diambil langsung dari Supabase saat tombol Cetak ditekan.</div><script>window.onload=function(){setTimeout(function(){window.focus();window.print();},300)};<\/script></body></html>';
      w.document.open();w.document.write(html);w.document.close();
    }catch(err){
      w.document.open();w.document.write('<!doctype html><html><body style="font-family:Arial;padding:30px"><h3>Gagal mencetak</h3><p>'+esc(err.message||err)+'</p></body></html>');w.document.close();
    }
  }
  function installDebt(){
    var btn=document.getElementById('debtPrint');
    if(!btn||btn.dataset.stablePrintInstalled==='1')return;
    var fresh=btn.cloneNode(true);
    fresh.id='debtPrint';
    fresh.dataset.stablePrintInstalled='1';
    btn.parentNode.replaceChild(fresh,btn);
    fresh.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var active=document.querySelector('[data-debt-tab].active');var tab=active?active.getAttribute('data-debt-tab'):'piutang';printDebtReport(tab);});
  }
  function boot(){installDebt();setTimeout(installDebt,300);setTimeout(installDebt,800);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

// V71: Operasional list-print only. This listener touches only #opPrint.
(function(){
  'use strict';
  function opEsc(v){return String(v==null?'':v).replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c];});}
  function opMoney(v){return 'Rp '+Number(v||0).toLocaleString('id-ID',{maximumFractionDigits:0,useGrouping:true});}
  async function opUser(){
    var sb=window.barokahSupabase;
    if(!sb)throw new Error('Koneksi Supabase belum siap.');
    var a=await sb.auth.getUser();
    if(a.error)throw a.error;
    if(!a.data||!a.data.user)throw new Error('Sesi login sudah berakhir. Silakan login kembali.');
    return a.data.user;
  }
  async function opPrintAll(){
    var w=window.open('','_blank');
    if(!w){alert('Popup diblokir browser. Izinkan pop-up untuk situs ini lalu tekan Cetak lagi.');return;}
    w.document.open();
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Menyiapkan laporan operasional...</title></head><body style="font-family:Arial;padding:30px;text-align:center"><h3>BAROKAH TELUR</h3><p>Menyiapkan laporan operasional...</p></body></html>');
    w.document.close();
    try{
      var sb=window.barokahSupabase, user=await opUser();
      var q=await sb.from('operational_transactions').select('*').eq('user_id',user.id).order('transaction_date',{ascending:false}).order('created_at',{ascending:false});
      if(q.error)throw q.error;
      var rows=q.data||[];
      var income=rows.filter(function(r){return r.kind==='pemasukan';}).reduce(function(s,r){return s+Number(r.amount||0);},0);
      var expense=rows.filter(function(r){return r.kind==='pengeluaran';}).reduce(function(s,r){return s+Number(r.amount||0);},0);
      var body=rows.length?rows.map(function(r){return '<tr><td>'+opEsc(r.reference_no||'-')+'</td><td>'+opEsc(r.transaction_date||'-')+'</td><td>'+opEsc(r.kind==='pemasukan'?'Pemasukan':'Pengeluaran')+'</td><td>'+opEsc(r.category||'-')+'</td><td>'+opEsc(r.description||'-')+(r.note?'<br><small>'+opEsc(r.note)+'</small>':'')+'</td><td class="n">'+opMoney(r.amount)+'</td></tr>';}).join(''):'<tr><td colspan="6" style="text-align:center;padding:16px">Belum ada transaksi operasional.</td></tr>';
      var html='<!doctype html><html><head><meta charset="utf-8"><title>Laporan Operasional - Barokah Telur</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Arial,sans-serif;color:#172018;margin:0;font-size:9px}.head{text-align:center;border-bottom:2px solid #14532d;padding-bottom:10px;margin-bottom:12px}.title{font-size:22px;font-weight:900;color:#14532d}.sub{font-size:11px;color:#666;margin-top:3px}.date{font-size:9px;color:#777;margin-top:5px}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}.card{border:1px solid #ddd;border-radius:7px;padding:8px}.label{font-size:8px;color:#666}.value{font-size:14px;font-weight:900;margin-top:3px}.green{color:#087f3b}.red{color:#b42318}table{width:100%;border-collapse:collapse;font-size:8px}th{background:#14532d;color:#fff;padding:6px;text-align:left}td{border:1px solid #ddd;padding:5px;vertical-align:top}.n{text-align:right;white-space:nowrap}.foot{text-align:center;margin-top:12px;border-top:1px solid #ddd;padding-top:7px;font-size:8px;color:#777}</style></head><body><div class="head"><div class="title">BAROKAH TELUR</div><div class="sub">LAPORAN TRANSAKSI OPERASIONAL</div><div class="date">'+opEsc(new Date().toLocaleString('id-ID'))+'</div></div><div class="summary"><div class="card"><div class="label">TOTAL PEMASUKAN</div><div class="value green">'+opMoney(income)+'</div></div><div class="card"><div class="label">TOTAL PENGELUARAN</div><div class="value red">'+opMoney(expense)+'</div></div><div class="card"><div class="label">SALDO OPERASIONAL</div><div class="value">'+opMoney(income-expense)+'</div></div></div><table><thead><tr><th>No. Transaksi</th><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Keterangan</th><th>Nominal</th></tr></thead><tbody>'+body+'</tbody></table><div class="foot">Data operasional diambil langsung dari Supabase saat tombol Cetak Operasional ditekan.</div><script>window.onload=function(){setTimeout(function(){window.focus();window.print();},300)};<\/script></body></html>';
      w.document.open();w.document.write(html);w.document.close();
    }catch(err){
      w.document.open();w.document.write('<!doctype html><html><body style="font-family:Arial;padding:30px"><h3>Gagal mencetak Operasional</h3><p>'+opEsc(err.message||err)+'</p></body></html>');w.document.close();
    }
  }
  function install(){
    if(window.__barokahOperationalPrintV71)return;
    window.__barokahOperationalPrintV71=true;
    document.addEventListener('click',function(e){
      var btn=e.target&&e.target.closest?e.target.closest('#opPrint'):null;
      if(!btn)return;
      e.preventDefault();
      e.stopImmediatePropagation();
      opPrintAll();
    },true);
    window.BarokahOperationalPrint=opPrintAll;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
