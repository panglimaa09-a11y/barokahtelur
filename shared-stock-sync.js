(function(){
  'use strict';
  const SB=()=>window.barokahSupabase;
  let sharedStockRows=[];
  let sharedOwnerId=null;

  function admin(){return SB()?.rpc('is_admin').then(r=>!r.error&&r.data===true).catch(()=>false);}
  function currentUser(){return SB()?.auth.getUser().then(r=>r.data?.user||null).catch(()=>null);}
  function factor(u){const k=String(u||'').trim().toLowerCase();return k==='papan'?30:k==='ikat'?180:1;}
  function sort(rows){return rows.slice().sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)||String(a.id).localeCompare(String(b.id)));}
  function saldo(rows){return rows.reduce((n,r)=>n+Number(r.delta_butir||0),0);}
  function running(rows){let n=0;return sort(rows).map(r=>{n+=Number(r.delta_butir||0);return {...r,calculated_saldo_after_butir:n};});}
  const fmt=x=>Number(x||0).toLocaleString('id-ID',{maximumFractionDigits:10});
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function render(){
    const rows=running(sharedStockRows), n=saldo(sharedStockRows);
    const w=document.getElementById('stockWarehouse');if(w)w.textContent=fmt(n)+' Butir';
    const p=document.getElementById('stockAutoPreview');if(p)p.textContent='Saldo saat ini: '+fmt(n)+' Butir. Stok tersimpan di database online.';
    const bad=rows.filter(r=>r.movement_type==='Retak').reduce((a,r)=>a+Number(r.qty||0)*factor(r.unit),0);
    const unfit=rows.filter(r=>r.movement_type==='Tidak Layak').reduce((a,r)=>a+Number(r.qty||0)*factor(r.unit),0);
    const bi=document.getElementById('badEggsInfo');if(bi)bi.textContent='Total Telur Retak: '+fmt(bad)+' Butir';
    const ui=document.getElementById('unfitEggsInfo');if(ui)ui.textContent='Total Telur Tidak Layak: '+fmt(unfit)+' Butir';
    const box=document.getElementById('stockHistory');if(!box)return;
    if(!rows.length){box.innerHTML='<div class="stock-history-empty">Belum ada riwayat stok.</div>';return;}
    box.innerHTML='<div class="stock-table-wrap"><table class="stock-history-table"><thead><tr><th>Tanggal</th><th>Produk</th><th>Jenis</th><th>Jumlah</th><th>Konversi</th><th>Saldo Setelah</th><th>Keterangan</th></tr></thead><tbody>'+rows.slice().reverse().map(r=>{const d=Number(r.delta_butir||0),sign=d>=0?'+':'-',a=Math.abs(d),conv=a%30===0?sign+fmt(a/30)+' Papan | '+sign+fmt(a)+' Butir':sign+fmt(a)+' Butir';return '<tr><td>'+new Date(r.created_at).toLocaleDateString('id-ID')+'</td><td><b>'+esc(r.product||'Telur Ayam Ras')+'</b></td><td><b>'+esc(r.movement_type||'')+'</b></td><td>'+sign+fmt(Math.abs(Number(r.qty)||0))+' '+esc(r.unit||'')+'</td><td>'+conv+'</td><td><b>'+fmt(r.calculated_saldo_after_butir)+' Butir</b></td><td>'+esc(r.note||'-')+'</td></tr>';}).join('')+'</tbody></table></div>';
  }

  async function load(){
    const sb=SB();if(!sb)return;
    const u=await currentUser();if(!u)return;
    if(await admin()){
      const {data,error}=await sb.from('stock_movements').select('*').order('created_at',{ascending:true}).order('id',{ascending:true});
      if(error)throw error;
      sharedStockRows=data||[];
      sharedOwnerId=sharedStockRows[0]?.user_id||u.id;
    }else{
      const {data,error}=await sb.from('stock_movements').select('*').eq('user_id',u.id).order('created_at',{ascending:true}).order('id',{ascending:true});
      if(error)throw error;
      sharedStockRows=data||[];sharedOwnerId=u.id;
    }
    try{localStorage.setItem('barokah_stock_history_v53',JSON.stringify(sharedStockRows));}catch(e){}
    render();
  }

  async function add(type){
    const sb=SB(),u=await currentUser();if(!sb||!u){alert('Sesi database belum aktif. Silakan login ulang.');return;}
    const isA=await admin();let q,unit,note;
    if(type==='Masuk'){q=parseInputNumber(document.getElementById('stockIn')?.value);unit=document.getElementById('stockInUnit')?.value.trim();note=document.getElementById('stockInNote')?.value.trim();}
    else if(type==='Keluar'){q=parseInputNumber(document.getElementById('stockOut')?.value);unit=document.getElementById('stockOutUnit')?.value.trim();note=document.getElementById('stockOutNote')?.value.trim();}
    else if(type==='Retak'){q=parseInputNumber(document.getElementById('badEggs')?.value);unit=document.getElementById('badEggsUnit')?.value.trim()||'Butir';note='Telur retak';}
    else{q=parseInputNumber(document.getElementById('unfitEggs')?.value);unit=document.getElementById('unfitEggsUnit')?.value.trim()||'Butir';note='Telur tidak layak';}
    if(!Number.isFinite(q)||q<=0){alert('Masukkan jumlah yang benar.');return;}
    if(!unit){alert('Isi satuan.');return;}
    if((type==='Masuk'||type==='Keluar')&&!note){alert('Isi keterangan.');return;}
    const current=saldo(sharedStockRows),delta=q*factor(unit)*(type==='Masuk'?1:-1);
    if(type!=='Masuk'&&Math.abs(delta)>current){alert('Stok Gudang tidak mencukupi. Stok saat ini '+fmt(current)+' Butir.');return;}
    const owner=isA?(sharedOwnerId||u.id):u.id;
    try{
      const {data,error}=await sb.from('stock_movements').insert({user_id:owner,product:'Telur Ayam Ras',movement_type:type,qty:q,unit,delta_butir:delta,saldo_after_butir:current+delta,note}).select('*').single();
      if(error)throw error;
      sharedStockRows.push(data);render();
      if(type==='Masuk'){document.getElementById('stockIn').value='';document.getElementById('stockInNote').value='';}
      if(type==='Keluar'){document.getElementById('stockOut').value='';document.getElementById('stockOutNote').value='';}
      if(type==='Retak')document.getElementById('badEggs').value='';
      if(type==='Tidak Layak')document.getElementById('unfitEggs').value='';
      if(typeof toast==='function')toast('Perubahan stok tersimpan ke database.');
    }catch(err){alert('Gagal menyimpan stok: '+(err.message||err));}
  }

  async function clear(){
    const sb=SB(),u=await currentUser();if(!sb||!u)return;
    if(!confirm('Hapus seluruh riwayat stok dan reset Stok Gudang?'))return;
    try{let q=sb.from('stock_movements').delete();if(!(await admin()))q=q.eq('user_id',u.id);const {error}=await q;if(error)throw error;sharedStockRows=[];render();alert('Riwayat stok dan saldo stok sudah di-reset ke 0 Butir.');}catch(err){alert('Gagal menghapus riwayat stok: '+err.message);}
  }

  const oldSync=window.barokahCloudSync;
  window.barokahCloudSync=async function(){if(typeof oldSync==='function')await oldSync();await load();};
  window.addStockIn=()=>add('Masuk');window.addStockOut=()=>add('Keluar');window.addBadEggs=()=>add('Retak');window.addUnfitEggs=()=>add('Tidak Layak');window.clearStockHistory=clear;
  window.renderStock=render;window.getWarehouseStock=()=>saldo(sharedStockRows);
  const oldPrint=window.printStockReport;
  window.printStockReport=function(){if(typeof oldPrint==='function'){try{return oldPrint();}catch(e){console.error(e);}}};
  setTimeout(load,1200);
})();
