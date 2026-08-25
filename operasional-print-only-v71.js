(function(){
  'use strict';

  const SB=()=>window.barokahSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const money=v=>'Rp '+Number(v||0).toLocaleString('id-ID',{maximumFractionDigits:0,useGrouping:true});

  async function getUser(){
    const sb=SB();
    if(!sb)throw new Error('Koneksi Supabase belum siap.');
    const {data,error}=await sb.auth.getUser();
    if(error)throw error;
    if(!data?.user)throw new Error('Sesi login sudah berakhir. Silakan login kembali.');
    return data.user;
  }

  async function printOperationalReport(){
    let win=null;
    try{
      // Open immediately from the original click for mobile-browser popup rules.
      win=window.open('', '_blank');
      if(!win)throw new Error('Popup diblokir browser. Izinkan pop-up untuk situs ini lalu tekan Cetak lagi.');

      win.document.open();
      win.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Menyiapkan laporan...</title></head><body style="font-family:Arial,sans-serif;padding:28px;text-align:center;color:#333"><h3>BAROKAH TELUR</h3><p>Menyiapkan laporan operasional...</p></body></html>');
      win.document.close();

      const sb=SB();
      const user=await getUser();
      const {data,error}=await sb.from('operational_transactions')
        .select('*')
        .eq('user_id',user.id)
        .order('transaction_date',{ascending:false})
        .order('created_at',{ascending:false});
      if(error)throw error;

      const rows=data||[];
      const income=rows.filter(r=>r.kind==='pemasukan').reduce((s,r)=>s+Number(r.amount||0),0);
      const expense=rows.filter(r=>r.kind==='pengeluaran').reduce((s,r)=>s+Number(r.amount||0),0);
      const net=income-expense;

      const body=rows.length?rows.map(r=>
        '<tr><td>'+esc(r.reference_no||'-')+'</td>'+
        '<td>'+esc(r.transaction_date||'-')+'</td>'+
        '<td>'+esc(r.kind==='pemasukan'?'Pemasukan':'Pengeluaran')+'</td>'+
        '<td>'+esc(r.category||'-')+'</td>'+
        '<td><b>'+esc(r.description||'-')+'</b>'+(r.note?'<br><small>'+esc(r.note)+'</small>':'')+'</td>'+
        '<td class="num">'+money(r.amount)+'</td></tr>'
      ).join(''):'<tr><td colspan="6" class="empty">Belum ada transaksi operasional.</td></tr>';

      const html='<!doctype html><html><head><meta charset="utf-8"><title>Laporan Operasional - Barokah Telur</title><style>'+
        '@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}'+
        'body{font-family:Arial,sans-serif;color:#172018;margin:0;font-size:9px}'+
        '.head{text-align:center;border-bottom:2px solid #14532d;padding-bottom:10px;margin-bottom:12px}'+
        '.title{font-size:22px;font-weight:900;color:#14532d}.sub{font-size:11px;color:#666;margin-top:3px}.date{font-size:9px;color:#777;margin-top:5px}'+
        '.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}'+
        '.card{border:1px solid #ddd;border-radius:7px;padding:8px}.label{font-size:8px;color:#666}.value{font-size:14px;font-weight:900;margin-top:3px}.green{color:#087f3b}.red{color:#b42318}'+
        'table{width:100%;border-collapse:collapse;font-size:8px}th{background:#14532d;color:#fff;padding:6px;text-align:left}td{border:1px solid #ddd;padding:5px;vertical-align:top}.num{text-align:right;white-space:nowrap}.empty{text-align:center;padding:16px;color:#777}'+
        '.foot{text-align:center;margin-top:12px;border-top:1px solid #ddd;padding-top:7px;font-size:8px;color:#777}'+
        '</style></head><body>'+
        '<div class="head"><div class="title">BAROKAH TELUR</div><div class="sub">LAPORAN TRANSAKSI OPERASIONAL</div><div class="date">'+esc(new Date().toLocaleString('id-ID'))+'</div></div>'+
        '<div class="summary"><div class="card"><div class="label">TOTAL PEMASUKAN</div><div class="value green">'+money(income)+'</div></div><div class="card"><div class="label">TOTAL PENGELUARAN</div><div class="value red">'+money(expense)+'</div></div><div class="card"><div class="label">SALDO OPERASIONAL</div><div class="value">'+money(net)+'</div></div></div>'+
        '<table><thead><tr><th>No. Transaksi</th><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Keterangan</th><th>Nominal</th></tr></thead><tbody>'+body+'</tbody></table>'+
        '<div class="foot">Data diambil langsung dari Supabase saat tombol Cetak Operasional ditekan.</div>'+\
        '<script>window.addEventListener(\'load\',function(){setTimeout(function(){window.focus();window.print();},300);});<\\/script>'+\
        '</body></html>';

      win.document.open();
      win.document.write(html);
      win.document.close();
    }catch(err){
      if(win&&!win.closed){
        win.document.open();
        win.document.write('<!doctype html><html><body style="font-family:Arial;padding:28px"><h3>Gagal mencetak Operasional</h3><p>'+esc(err.message||err)+'</p></body></html>');
        win.document.close();
      }else{
        alert('Gagal mencetak Operasional: '+(err.message||err));
      }
    }
  }

  function install(){
    if(document.documentElement.dataset.opPrintOnlyV71==='1')return;
    document.documentElement.dataset.opPrintOnlyV71='1';

    // Capture only the Operasional list-print button. No renderer, form, table,
    // sync, edit, delete, note, or other navigation code is modified.
    document.addEventListener('click',function(e){
      const btn=e.target&&e.target.closest?e.target.closest('#opPrint'):null;
      if(!btn)return;
      e.preventDefault();
      e.stopImmediatePropagation();
      printOperationalReport();
    },true);

    window.BarokahOperationalPrint=printOperationalReport;
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();