(function(){
  'use strict';
  const SB=()=>window.barokahSupabase;
  let sharedStockRows=[];
  let sharedOwnerId=null;
  let editingId=null;

  function admin(){return SB()?.rpc('is_admin').then(r=>!r.error&&r.data===true).catch(()=>false);}
  function currentUser(){return SB()?.auth.getUser().then(r=>r.data?.user||null).catch(()=>null);}
  function factor(u){const k=String(u||'').trim().toLowerCase();return k==='papan'?30:k==='ikat'?180:1;}
  function sort(rows){return rows.slice().sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)||String(a.id).localeCompare(String(b.id)));}
  function saldo(rows){return rows.reduce((n,r)=>n+Number(r.delta_butir||0),0);}
  function running(rows){let n=0;return sort(rows).map(r=>{n+=Number(r.delta_butir||0);return {...r,calculated_saldo_after_butir:n};});}
  const fmt=x=>Number(x||0).toLocaleString('id-ID',{maximumFractionDigits:10});
  const esc=v=>String(v==null?'':v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));

  function ensureEditBanner(){
    if(document.getElementById('stockEditModeBanner'))return document.getElementById('stockEditModeBanner');
    const banner=document.createElement('div');
    banner.id='stockEditModeBanner';
    banner.style.cssText='display:none;margin:0 0 14px;padding:14px 16px;border:1px solid #e6c75a;border-radius:14px;background:#fff8d9;color:#5c4a00;font-size:13px;font-weight:700;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;';
    banner.innerHTML='<span>✏️ Mode Edit Stok — ubah data langsung pada layout Pergerakan Stok di atas, lalu tekan tombol simpan sesuai jenis stok.</span><button type="button" id="stockEditCancelTop" class="btn ghost" style="min-height:38px">Batal Edit</button>';
    const target=document.getElementById('stockIn')||document.getElementById('stockOut')||document.getElementById('badEggs')||document.getElementById('unfitEggs');
    if(target){const parent=target.closest('.card,.form-card,.grid-2,.grid-3,section')||target.parentElement;parent.parentNode.insertBefore(banner,parent);}
    else document.body.insertBefore(banner,document.body.firstChild);
    document.getElementById('stockEditCancelTop').onclick=cancelEdit;
    return banner;
  }

  function clearStockForms(){
    ['stockIn','stockInNote','stockOut','stockOutNote','badEggs','unfitEggs'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  }

  function populateEditForm(row){
    clearStockForms();
    const type=row.movement_type;
    const qty=String(row.qty??'');
    const unit=String(row.unit??'Butir');
    const note=String(row.note??'');
    if(type==='Masuk'){
      const q=document.getElementById('stockIn');if(q)q.value=qty;
      const u=document.getElementById('stockInUnit');if(u)u.value=unit;
      const n=document.getElementById('stockInNote');if(n)n.value=note;
    }else if(type==='Keluar'){
      const q=document.getElementById('stockOut');if(q)q.value=qty;
      const u=document.getElementById('stockOutUnit');if(u)u.value=unit;
      const n=document.getElementById('stockOutNote');if(n)n.value=note;
    }else if(type==='Retak'){
      const q=document.getElementById('badEggs');if(q)q.value=qty;
      const u=document.getElementById('badEggsUnit');if(u)u.value=unit;
    }else if(type==='Tidak Layak'){
      const q=document.getElementById('unfitEggs');if(q)q.value=qty;
      const u=document.getElementById('unfitEggsUnit');if(u)u.value=unit;
    }
  }

  function showEditMode(row){
    const banner=ensureEditBanner();
    banner.style.display='flex';
    populateEditForm(row);
    const target=document.getElementById(row.movement_type==='Masuk'?'stockIn':row.movement_type==='Keluar'?'stockOut':row.movement_type==='Retak'?'badEggs':'unfitEggs');
    target?.scrollIntoView({behavior:'smooth',block:'center'});
    setTimeout(()=>target?.focus(),350);
  }

  function hideEditMode(){
    const banner=document.getElementById('stockEditModeBanner');if(banner)banner.style.display='none';
    clearStockForms();
  }

  function beginEdit(id){
    const row=sharedStockRows.find(r=>String(r.id)===String(id));
    if(!row)return;
    editingId=id;
    showEditMode(row);
  }

  function cancelEdit(){editingId=null;hideEditMode();render();}

  function actionButtons(id){
    return '<button type="button" class="stock-action-edit" data-stock-edit="'+esc(id)+'" title="Edit stok">✏️ Edit</button> <button type="button" class="stock-action-delete" data-stock-delete="'+esc(id)+'" title="Hapus stok">🗑️ Hapus</button>';
  }

  function render(){
    const rows=running(sharedStockRows),n=saldo(sharedStockRows);
    const w=document.getElementById('stockWarehouse');if(w)w.textContent=fmt(n)+' Butir';
    const p=document.getElementById('stockAutoPreview');if(p)p.textContent='Saldo saat ini: '+fmt(n)+' Butir. Stok tersimpan di database online.';
    const bad=rows.filter(r=>r.movement_type==='Retak').reduce((a,r)=>a+Number(r.qty||0)*factor(r.unit),0);
    const unfit=rows.filter(r=>r.movement_type==='Tidak Layak').reduce((a,r)=>a+Number(r.qty||0)*factor(r.unit),0);
    const bi=document.getElementById('badEggsInfo');if(bi)bi.textContent='Total Telur Retak: '+fmt(bad)+' Butir';
    const ui=document.getElementById('unfitEggsInfo');if(ui)ui.textContent='Total Telur Tidak Layak: '+fmt(unfit)+' Butir';
    const box=document.getElementById('stockHistory');if(!box)return;
    if(!rows.length){box.innerHTML='<div class="stock-history-empty">Belum ada riwayat stok.</div>';return;}
    box.innerHTML='<div class="stock-table-wrap"><table class="stock-history-table"><thead><tr><th>Tanggal</th><th>Produk</th><th>Jenis</th><th>Jumlah</th><th>Konversi</th><th>Saldo Setelah</th><th>Keterangan</th><th>Aksi</th></tr></thead><tbody>'+rows.slice().reverse().map(r=>{
      const d=Number(r.delta_butir||0),sign=d>=0?'+':'-',a=Math.abs(d),conv=a%30===0?sign+fmt(a/30)+' Papan | '+sign+fmt(a)+' Butir':sign+fmt(a)+' Butir';
      return '<tr data-stock-row="'+esc(r.id)+'"><td>'+new Date(r.created_at).toLocaleDateString('id-ID')+'</td><td><b>'+esc(r.product||'Telur Ayam Ras')+'</b></td><td><b>'+esc(r.movement_type||'')+'</b></td><td>'+sign+fmt(Math.abs(Number(r.qty)||0))+' '+esc(r.unit||'')+'</td><td>'+conv+'</td><td><b>'+fmt(r.calculated_saldo_after_butir)+' Butir</b></td><td>'+esc(r.note||'-')+'</td><td>'+actionButtons(r.id)+'</td></tr>';
    }).join('')+'</tbody></table></div>';
  }

  async function load(){
    const sb=SB();if(!sb)return;const u=await currentUser();if(!u)return;
    if(await admin()){
      const {data,error}=await sb.from('stock_movements').select('*').order('created_at',{ascending:true}).order('id',{ascending:true});
      if(error)throw error;sharedStockRows=data||[];sharedOwnerId=sharedStockRows[0]?.user_id||u.id;
    }else{
      const {data,error}=await sb.from('stock_movements').select('*').eq('user_id',u.id).order('created_at',{ascending:true}).order('id',{ascending:true});
      if(error)throw error;sharedStockRows=data||[];sharedOwnerId=u.id;
    }
    try{localStorage.setItem('barokah_stock_history_v53',JSON.stringify(sharedStockRows));}catch(e){}
    render();
  }

  async function add(type){
    const sb=SB(),u=await currentUser();if(!sb||!u){alert('Sesi database belum aktif. Silakan login ulang.');return;}
    if(editingId){await saveEditFromForm(type);return;}
    const isA=await admin();let q,unit,note;
    if(type==='Masuk'){q=parseInputNumber(document.getElementById('stockIn')?.value);unit=document.getElementById('stockInUnit')?.value.trim();note=document.getElementById('stockInNote')?.value.trim();}
    else if(type==='Keluar'){q=parseInputNumber(document.getElementById('stockOut')?.value);unit=document.getElementById('stockOutUnit')?.value.trim();note=document.getElementById('stockOutNote')?.value.trim();}
    else if(type==='Retak'){q=parseInputNumber(document.getElementById('badEggs')?.value);unit=document.getElementById('badEggsUnit')?.value.trim()||'Butir';note='Telur retak';}
    else{q=parseInputNumber(document.getElementById('unfitEggs')?.value);unit=document.getElementById('unfitEggsUnit')?.value.trim()||'Butir';note='Telur tidak layak';}
    if(!Number.isFinite(q)||q<=0){alert('Masukkan jumlah yang benar.');return;}if(!unit){alert('Isi satuan.');return;}if((type==='Masuk'||type==='Keluar')&&!note){alert('Isi keterangan.');return;}
    const current=saldo(sharedStockRows),delta=q*factor(unit)*(type==='Masuk'?1:-1);if(type!=='Masuk'&&Math.abs(delta)>current){alert('Stok Gudang tidak mencukupi. Stok saat ini '+fmt(current)+' Butir.');return;}
    const owner=isA?(sharedOwnerId||u.id):u.id;
    try{const {data,error}=await sb.from('stock_movements').insert({user_id:owner,product:'Telur Ayam Ras',movement_type:type,qty:q,unit,delta_butir:delta,saldo_after_butir:current+delta,note}).select('*').single();if(error)throw error;sharedStockRows.push(data);await recalcBalances();render();
      if(type==='Masuk'){document.getElementById('stockIn').value='';document.getElementById('stockInNote').value='';}if(type==='Keluar'){document.getElementById('stockOut').value='';document.getElementById('stockOutNote').value='';}if(type==='Retak')document.getElementById('badEggs').value='';if(type==='Tidak Layak')document.getElementById('unfitEggs').value='';if(typeof toast==='function')toast('Perubahan stok tersimpan ke database.');
    }catch(err){alert('Gagal menyimpan stok: '+(err.message||err));}
  }

  async function saveEditFromForm(type){
    const sb=SB(),u=await currentUser();if(!sb||!u)return;
    const row=sharedStockRows.find(r=>String(r.id)===String(editingId));if(!row)return;
    let q,unit,note;
    if(type==='Masuk'){q=parseInputNumber(document.getElementById('stockIn')?.value);unit=document.getElementById('stockInUnit')?.value.trim();note=document.getElementById('stockInNote')?.value.trim();}
    else if(type==='Keluar'){q=parseInputNumber(document.getElementById('stockOut')?.value);unit=document.getElementById('stockOutUnit')?.value.trim();note=document.getElementById('stockOutNote')?.value.trim();}
    else if(type==='Retak'){q=parseInputNumber(document.getElementById('badEggs')?.value);unit=document.getElementById('badEggsUnit')?.value.trim()||'Butir';note='Telur retak';}
    else{q=parseInputNumber(document.getElementById('unfitEggs')?.value);unit=document.getElementById('unfitEggsUnit')?.value.trim()||'Butir';note='Telur tidak layak';}
    if(!Number.isFinite(q)||q<=0){alert('Masukkan jumlah yang benar.');return;}
    if(!unit){alert('Isi satuan.');return;}
    if((type==='Masuk'||type==='Keluar')&&!note){alert('Isi keterangan.');return;}
    const delta=q*factor(unit)*(type==='Masuk'?1:-1);
    const others=sharedStockRows.filter(r=>String(r.id)!==String(row.id));
    const otherSaldo=saldo(others);
    if(delta<0&&Math.abs(delta)>otherSaldo){alert('Stok Gudang tidak mencukupi untuk perubahan ini. Stok tersedia setelah mengabaikan data yang diedit: '+fmt(otherSaldo)+' Butir.');return;}
    try{
      let query=sb.from('stock_movements').update({qty:q,unit,movement_type:type,delta_butir:delta,note}).eq('id',row.id);
      if(!(await admin()))query=query.eq('user_id',u.id);
      const {error}=await query;if(error)throw error;
      row.qty=q;row.unit=unit;row.movement_type=type;row.delta_butir=delta;row.note=note;
      await recalcBalances();
      try{localStorage.setItem('barokah_stock_history_v53',JSON.stringify(sharedStockRows));}catch(e){}
      editingId=null;hideEditMode();render();
      if(typeof toast==='function')toast('Stok berhasil diedit melalui layout Pergerakan Stok.');
    }catch(err){alert('Gagal mengedit stok: '+(err.message||err));}
  }

  async function recalcBalances(){
    const sb=SB();if(!sb||!sharedStockRows.length)return;const ordered=sort(sharedStockRows);let runningSaldo=0;const updates=[];
    for(const row of ordered){runningSaldo+=Number(row.delta_butir||0);if(Number(row.saldo_after_butir||0)!==runningSaldo){updates.push({id:row.id,saldo_after_butir:runningSaldo});row.saldo_after_butir=runningSaldo;}}
    for(const item of updates){const {error}=await sb.from('stock_movements').update({saldo_after_butir:item.saldo_after_butir}).eq('id',item.id);if(error)throw error;}
  }

  async function remove(id){
    const sb=SB(),u=await currentUser();if(!sb||!u)return;const row=sharedStockRows.find(r=>String(r.id)===String(id));if(!row)return;
    if(!confirm('Hapus riwayat stok ini? Data yang dihapus tidak bisa dikembalikan dari aplikasi.'))return;
    try{let query=sb.from('stock_movements').delete().eq('id',id);if(!(await admin()))query=query.eq('user_id',u.id);const {error}=await query;if(error)throw error;sharedStockRows=sharedStockRows.filter(r=>String(r.id)!==String(id));await recalcBalances();try{localStorage.setItem('barokah_stock_history_v53',JSON.stringify(sharedStockRows));}catch(e){}render();if(typeof toast==='function')toast('Riwayat stok berhasil dihapus.');}
    catch(err){alert('Gagal menghapus stok: '+(err.message||err));}
  }

  async function clear(){const sb=SB(),u=await currentUser();if(!sb||!u)return;if(!confirm('Hapus seluruh riwayat stok dan reset Stok Gudang?'))return;try{let q=sb.from('stock_movements').delete();if(!(await admin()))q=q.eq('user_id',u.id);const {error}=await q;if(error)throw error;sharedStockRows=[];editingId=null;hideEditMode();render();alert('Riwayat stok dan saldo stok sudah di-reset ke 0 Butir.');}catch(err){alert('Gagal menghapus riwayat stok: '+err.message);}}

  const oldSync=window.barokahCloudSync;
  window.barokahCloudSync=async function(){if(typeof oldSync==='function')await oldSync();await load();};
  window.addStockIn=()=>add('Masuk');window.addStockOut=()=>add('Keluar');window.addBadEggs=()=>add('Retak');window.addUnfitEggs=()=>add('Tidak Layak');window.clearStockHistory=clear;
  window.editStockMovement=beginEdit;window.deleteStockMovement=remove;window.renderStock=render;window.getWarehouseStock=()=>saldo(sharedStockRows);
  const oldPrint=window.printStockReport;window.printStockReport=function(){if(typeof oldPrint==='function'){try{return oldPrint();}catch(e){console.error(e);}}};

  document.addEventListener('click',function(e){
    const editBtn=e.target.closest?.('[data-stock-edit]');if(editBtn){e.preventDefault();beginEdit(editBtn.getAttribute('data-stock-edit'));return;}
    const cancelTop=e.target.closest?.('#stockEditCancelTop');if(cancelTop){e.preventDefault();cancelEdit();return;}
    const deleteBtn=e.target.closest?.('[data-stock-delete]');if(deleteBtn){e.preventDefault();remove(deleteBtn.getAttribute('data-stock-delete'));return;}
  });
  setTimeout(load,1200);
})();
