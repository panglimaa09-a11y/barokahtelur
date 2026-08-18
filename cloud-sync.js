(function(){
  "use strict";
  const SB=()=>window.barokahSupabase;
  const SESSION="barokah_admin_logged_in_v1";
  const TX_LOCAL="barokah_telur_owner_final_v1";
  const STOCK_LOCAL="barokah_stock_history_v53";

  function toastSafe(m){if(typeof toast==='function')toast(m);}
  function loginError(m){const e=document.getElementById('adminEntryMessage');if(e){e.textContent=m;e.className='admin-gate-error';}}
  function gate(open){const g=document.getElementById('adminEntryGate');if(g)g.classList.toggle('hidden',!open);document.body.classList.toggle('admin-entry-locked',open);}
  async function currentUser(){const sb=SB();if(!sb)return null;const {data,error}=await sb.auth.getUser();if(error)return null;return data.user||null;}
  function requireClient(){const sb=SB();if(!sb)throw new Error('Koneksi Supabase belum siap.');return sb;}
  function validUuid(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''));}
  function uuid(){return crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2);}
  function stockFactor(u){const k=String(u||'').trim().toLowerCase();if(k==='papan')return 30;if(k==='ikat')return 180;if(k==='butir')return 1;return 1;}
  function sortStock(rows){return rows.slice().sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)||String(a.id).localeCompare(String(b.id)));}
  function runningStock(rows){let saldo=0;return sortStock(rows).map(r=>{saldo+=Number(r.delta_butir||0);return {...r,calculated_saldo_after_butir:saldo};});}
  function stockSaldo(rows){return rows.reduce((n,r)=>n+Number(r.delta_butir||0),0);}

  async function signIn(email,password){const sb=requireClient();const {data,error}=await sb.auth.signInWithPassword({email,password});if(error)throw error;sessionStorage.setItem(SESSION,'1');gate(false);return data.user;}
  window.adminEntryLogin=async function(e){e.preventDefault();const email=document.getElementById('entryAdminEmail').value.trim().toLowerCase();const password=document.getElementById('entryAdminPassword').value;const msg=document.getElementById('adminEntryMessage');msg.textContent='Memeriksa akun...';try{await signIn(email,password);msg.textContent='Login berhasil.';msg.className='admin-gate-error admin-gate-success';await window.barokahCloudSync();}catch(err){console.error(err);loginError(err.message||'Login gagal.');}};
  window.loginAdmin=async function(e){e.preventDefault();const email=document.getElementById('adminEmail').value.trim().toLowerCase();const password=document.getElementById('adminPassword').value;const box=document.getElementById('adminLoginMessage');try{const u=await signIn(email,password);document.getElementById('adminLoginForm').style.display='none';document.getElementById('adminPanel').style.display='block';document.getElementById('newAdminEmail').value=u.email||email;box.textContent='Login admin berhasil.';box.classList.add('ok');await window.barokahCloudSync();}catch(err){console.error(err);box.textContent=err.message||'Login admin gagal.';}};
  window.logoutAdmin=async function(){try{if(SB())await SB().auth.signOut();}catch(e){console.error(e)}sessionStorage.removeItem(SESSION);gate(true);if(typeof closeAdminLogin==='function')closeAdminLogin();};
  window.changeAdminCredentials=async function(e){e.preventDefault();const sb=requireClient(),u=await currentUser();if(!u){alert('Sesi admin sudah berakhir. Silakan login lagi.');return;}const em=document.getElementById('newAdminEmail').value.trim().toLowerCase(),pw=document.getElementById('newAdminPassword').value,cf=document.getElementById('confirmAdminPassword').value,box=document.getElementById('adminChangeMessage');if(!em||!pw){box.textContent='Lengkapi email dan password.';return;}if(pw!==cf){box.textContent='Konfirmasi password tidak sama.';return;}if(pw.length<6){box.textContent='Password minimal 6 karakter.';return;}const payload={password:pw};if(em!==String(u.email||'').toLowerCase())payload.email=em;const {error}=await sb.auth.updateUser(payload);if(error){box.textContent=error.message;return;}box.textContent=payload.email?'Perubahan disimpan. Jika konfirmasi email aktif, cek email baru.':'Password admin berhasil diubah.';box.classList.add('ok');document.getElementById('newAdminPassword').value='';document.getElementById('confirmAdminPassword').value='';};

  async function loadTransactions(){const sb=requireClient(),u=await currentUser();if(!u)return;const {data,error}=await sb.from('transactions').select('*').eq('user_id',u.id).order('transaction_date',{ascending:false}).order('created_at',{ascending:false});if(error)throw error;state=(data||[]).map(r=>({id:r.id,note:r.note,price:Number(r.price),unit:r.unit,qty:Number(r.qty),total:Number(r.total),type:r.type,date:r.transaction_date,createdAt:new Date(r.created_at).getTime()}));localStorage.setItem(TX_LOCAL,JSON.stringify(state));render();}

  window.submit=async function(type){
    const pre=type==='income'?'income':'expense';const note=$(pre+'Note').value.trim(),price=parsePriceInput($(pre+'Price').value),unit=$(pre+'Unit').value,qty=parseInputNumber($(pre+'Qty').value),date=$(pre+'Date').value;
    if(!note){alert('Keterangan belum diisi.');return;}if(!date){alert('Tanggal belum diisi.');return;}if(!Number.isFinite(price)||price<0){alert('Harga belum diisi atau format harga tidak valid.');return;}if(!Number.isFinite(qty)||qty<=0){alert('Jumlah belum diisi atau format jumlah tidak valid.');return;}if((unit==='Ikat'||unit==='Butir')&&!Number.isInteger(qty)){alert('Jumlah untuk Ikat atau Butir harus berupa angka bulat.');return;}
    const sb=requireClient(),u=await currentUser();if(!u){alert('Sesi database sudah berakhir. Silakan login ulang.');return;}
    const editId=type==='income'?editingIncome:editingExpense;const payload={type,note,price,unit,qty,total:Number((price*qty).toFixed(3)),transaction_date:date,user_id:u.id};
    try{
      if(editId){const {data,error}=await sb.from('transactions').update(payload).eq('id',editId).eq('user_id',u.id).select('*').single();if(error)throw error;const idx=state.findIndex(x=>String(x.id)===String(editId));if(idx>=0)state[idx]={id:data.id,note:data.note,price:Number(data.price),unit:data.unit,qty:Number(data.qty),total:Number(data.total),type:data.type,date:data.transaction_date,createdAt:new Date(data.created_at).getTime()};}
      else{const {data,error}=await sb.from('transactions').insert(payload).select('*').single();if(error)throw error;state.push({id:data.id,note:data.note,price:Number(data.price),unit:data.unit,qty:Number(data.qty),total:Number(data.total),type:data.type,date:data.transaction_date,createdAt:new Date(data.created_at).getTime()});}
      localStorage.setItem(TX_LOCAL,JSON.stringify(state));if(type==='income')resetIncomeForm();else resetExpenseForm();render();showPage('history');toastSafe(editId?'Catatan berhasil diperbarui.':(type==='income'?'Uang masuk tersimpan.':'Uang keluar tersimpan.'));
    }catch(err){console.error(err);alert('Gagal menyimpan ke database: '+(err.message||err));}
  };

  window.delTx=async function(id){const sb=requireClient(),u=await currentUser();const item=state.find(x=>String(x.id)===String(id));if(!item)return;if(!confirm('Hapus catatan ini?'))return;try{const {error}=await sb.from('transactions').delete().eq('id',id).eq('user_id',u.id);if(error)throw error;state=state.filter(x=>String(x.id)!==String(id));localStorage.setItem(TX_LOCAL,JSON.stringify(state));render();toastSafe('Catatan berhasil dihapus.');}catch(err){alert('Gagal menghapus dari database: '+err.message);}};
  window.deleteTransaction=window.delTx;
  window.deleteAllTransactions=async function(){const sb=requireClient(),u=await currentUser();if(!state.length){alert('Belum ada data yang bisa dihapus.');return;}if(!confirm('Hapus SEMUA data transaksi dari database? Pastikan sudah backup.'))return;try{const {error}=await sb.from('transactions').delete().eq('user_id',u.id);if(error)throw error;state=[];localStorage.setItem(TX_LOCAL,'[]');render();toastSafe('Semua data transaksi berhasil dihapus.');}catch(err){alert('Gagal menghapus transaksi: '+err.message);}};

  let cloudStockRows=[];
  async function loadStock(){const sb=requireClient(),u=await currentUser();if(!u)return;const {data,error}=await sb.from('stock_movements').select('*').eq('user_id',u.id).order('created_at',{ascending:true}).order('id',{ascending:true});if(error)throw error;cloudStockRows=data||[];renderCloudStock();}
  function renderCloudStock(){const rows=runningStock(cloudStockRows),n=stockSaldo(cloudStockRows),fmt=x=>Number(x||0).toLocaleString('id-ID',{maximumFractionDigits:10}),saldo=x=>fmt(x)+' Butir';const w=$('stockWarehouse');if(w)w.textContent=saldo(n);const p=$('stockAutoPreview');if(p)p.textContent='Saldo saat ini: '+saldo(n)+'. Stok tersimpan di database online.';const bad=rows.filter(r=>r.movement_type==='Retak').reduce((a,r)=>a+Number(r.qty||0)*stockFactor(r.unit),0),unfit=rows.filter(r=>r.movement_type==='Tidak Layak').reduce((a,r)=>a+Number(r.qty||0)*stockFactor(r.unit),0);const bi=$('badEggsInfo');if(bi)bi.textContent='Total Telur Retak: '+fmt(bad)+' Butir';const ui=$('unfitEggsInfo');if(ui)ui.textContent='Total Telur Tidak Layak: '+fmt(unfit)+' Butir';const box=$('stockHistory');if(!box)return;if(!rows.length){box.innerHTML='<div class="stock-history-empty">Belum ada riwayat stok.</div>';return;}box.innerHTML='<div class="stock-table-wrap"><table class="stock-history-table"><thead><tr><th>Tanggal</th><th>Produk</th><th>Jenis</th><th>Jumlah</th><th>Konversi</th><th>Saldo Setelah</th><th>Keterangan</th></tr></thead><tbody>'+rows.slice().reverse().map(r=>{const d=Number(r.delta_butir||0),sign=d>=0?'+':'-',a=Math.abs(d),conv=a%30===0?sign+fmt(a/30)+' Papan | '+sign+fmt(a)+' Butir':sign+fmt(a)+' Butir',saldoAfter=r.calculated_saldo_after_butir;return '<tr><td>'+new Date(r.created_at).toLocaleDateString('id-ID')+'</td><td><b>'+escapeHtml(r.product||'Telur Ayam Ras')+'</b></td><td><b>'+escapeHtml(r.movement_type)+'</b></td><td>'+sign+fmt(Math.abs(Number(r.qty)||0))+' '+escapeHtml(r.unit||'')+'</td><td>'+conv+'</td><td><b>'+saldo(saldoAfter)+'</b></td><td>'+escapeHtml(r.note||'-')+'</td></tr>';}).join('')+'</tbody></table></div>';}
  window.renderStock=renderCloudStock;
  window.getWarehouseStock=()=>stockSaldo(cloudStockRows);

  async function addMovement(type){const sb=requireClient(),u=await currentUser();if(!u){alert('Sesi database belum aktif. Silakan login ulang.');return;}let q,unit,note;if(type==='Masuk'){q=parseInputNumber($('stockIn')?.value);unit=$('stockInUnit')?.value.trim();note=$('stockInNote')?.value.trim();}else if(type==='Keluar'){q=parseInputNumber($('stockOut')?.value);unit=$('stockOutUnit')?.value.trim();note=$('stockOutNote')?.value.trim();}else if(type==='Retak'){q=parseInputNumber($('badEggs')?.value);unit=$('badEggsUnit')?.value.trim()||'Butir';note='Telur retak';}else{q=parseInputNumber($('unfitEggs')?.value);unit=$('unfitEggsUnit')?.value.trim()||'Butir';note='Telur tidak layak';}if(!Number.isFinite(q)||q<=0){alert('Masukkan jumlah yang benar.');return;}if(!unit){alert('Isi satuan.');return;}if((type==='Masuk'||type==='Keluar')&&!note){alert('Isi keterangan.');return;}const current=stockSaldo(cloudStockRows),delta=q*stockFactor(unit)*(type==='Masuk'?1:-1);if(type!=='Masuk'&&Math.abs(delta)>current){alert('Stok Gudang tidak mencukupi. Stok saat ini '+current.toLocaleString('id-ID')+' Butir.');return;}const after=current+delta;try{const {data,error}=await sb.from('stock_movements').insert({user_id:u.id,product:'Telur Ayam Ras',movement_type:type,qty:q,unit,delta_butir:delta,saldo_after_butir:after,note}).select('*').single();if(error)throw error;cloudStockRows.push(data);renderCloudStock();if(type==='Masuk'){$('stockIn').value='';$('stockInNote').value='';}if(type==='Keluar'){$('stockOut').value='';$('stockOutNote').value='';}if(type==='Retak')$('badEggs').value='';if(type==='Tidak Layak')$('unfitEggs').value='';toastSafe('Perubahan stok tersimpan ke database.');}catch(err){alert('Gagal menyimpan stok: '+err.message);}}
  window.addStockIn=()=>addMovement('Masuk');window.addStockOut=()=>addMovement('Keluar');window.addBadEggs=()=>addMovement('Retak');window.addUnfitEggs=()=>addMovement('Tidak Layak');
  window.clearStockHistory=async function(){const sb=requireClient(),u=await currentUser();if(!confirm('Hapus seluruh riwayat stok dan reset Stok Gudang?'))return;try{const {error}=await sb.from('stock_movements').delete().eq('user_id',u.id);if(error)throw error;cloudStockRows=[];renderCloudStock();alert('Riwayat stok dan saldo stok sudah di-reset ke 0 Butir.');}catch(err){alert('Gagal menghapus riwayat stok: '+err.message);}};

  // FIX: Print Stok Gudang must use the same live cloudStockRows that are
  // loaded from Supabase. The previous implementation in index.html read
  // localStorage keys, so a production print could show stale/empty data.
  window.printStockReport=function(){
    try{
      const rows=runningStock(cloudStockRows);
      const saldoNow=stockSaldo(cloudStockRows);
      const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
      const fmt=v=>Number(v||0).toLocaleString('id-ID',{maximumFractionDigits:10,useGrouping:true});
      const dateText=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?esc(v||'-'):d.toLocaleDateString('id-ID');};
      const rowsHtml=rows.slice().reverse().map(r=>{
        const delta=Number(r.delta_butir||0),sign=delta>=0?'+':'-',abs=Math.abs(delta);
        const conv=abs%30===0?sign+fmt(abs/30)+' Papan | '+sign+fmt(abs)+' Butir':sign+fmt(abs)+' Butir';
        const qty=sign+fmt(Math.abs(Number(r.qty)||0))+' '+esc(r.unit||'');
        const after=Number(r.calculated_saldo_after_butir||0);
        return '<tr><td>'+dateText(r.created_at)+'</td><td>'+esc(r.product||'Telur Ayam Ras')+'</td><td>'+esc(r.movement_type||'')+'</td><td>'+qty+'</td><td>'+conv+'</td><td><b>'+fmt(after)+' Butir</b></td><td>'+esc(r.note||'-')+'</td></tr>';
      }).join('');
      const html='<!doctype html><html><head><meta charset="utf-8"><title>Stok Gudang - Barokah Telur</title><style>@page{size:A4 portrait;margin:10mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Arial,sans-serif;color:#111;font-size:9px;margin:0}.head{text-align:center;border-bottom:2px solid #14532d;padding-bottom:10px;margin-bottom:12px}.title{font-size:20px;font-weight:900;color:#14532d}.sub{font-size:10px;color:#666;margin-top:2px}.summary{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}.card{border:1px solid #ddd;border-radius:7px;padding:8px}.label{font-size:8px;color:#666}.value{font-size:15px;font-weight:900;color:#14532d;margin-top:3px}h2{font-size:12px;margin:12px 0 6px;border-left:4px solid #14532d;padding-left:6px}table{width:100%;border-collapse:collapse;font-size:8px}th{background:#14532d;color:#fff;padding:5px;text-align:left}td{border:1px solid #ddd;padding:4px;vertical-align:top}.foot{text-align:center;border-top:1px dashed #777;margin-top:10px;padding-top:6px;color:#666;font-size:8px}</style></head><body><div class="head"><div class="title">BAROKAH TELUR</div><div class="sub">LAPORAN STOK GUDANG</div><div class="sub">'+esc(new Date().toLocaleString('id-ID'))+'</div></div><div class="summary"><div class="card"><div class="label">STOK GUDANG SAAT INI</div><div class="value">'+fmt(saldoNow)+' Butir</div></div><div class="card"><div class="label">RIWAYAT PERUBAHAN</div><div class="value">'+rows.length+' data</div></div></div><h2>Riwayat Stok Gudang</h2><table><thead><tr><th>Tanggal</th><th>Produk</th><th>Jenis</th><th>Jumlah</th><th>Konversi</th><th>Saldo Setelah</th><th>Keterangan</th></tr></thead><tbody>'+(rowsHtml||'<tr><td colspan="7" style="text-align:center">Belum ada riwayat stok.</td></tr>')+'</tbody></table><div class="foot">Data diambil langsung dari database online saat tombol Print Stok Gudang ditekan.</div></body></html>';
      const w=window.open('','_blank');
      if(!w){alert('Izinkan pop-up untuk membuka Print Stok Gudang.');return;}
      w.document.open();w.document.write(html);w.document.close();
      setTimeout(()=>{w.focus();w.print();},500);
    }catch(err){console.error('Print Stok Gudang gagal:',err);alert('Print Stok Gudang gagal: '+(err.message||err));}
  };

  window.barokahCloudSync=async function(){const sb=SB();if(!sb)return;const u=await currentUser();if(!u){gate(true);return;}gate(false);try{await loadTransactions();await loadStock();}catch(err){console.error(err);if(typeof showError==='function')showError('Database online gagal dimuat: '+(err.message||err));}};

  async function boot(){try{const sb=requireClient();const {data}=await sb.auth.getSession();if(data.session){sessionStorage.setItem(SESSION,'1');gate(false);await window.barokahCloudSync();}else gate(true);sb.auth.onAuthStateChange(function(event,session){if(session){sessionStorage.setItem(SESSION,'1');gate(false);window.barokahCloudSync();}else{sessionStorage.removeItem(SESSION);gate(true);}});}catch(e){console.error(e);gate(true);}}
  function bootAfterDom(){
    if(window.__barokahCloudBooted)return;
    window.__barokahCloudBooted=true;
    setTimeout(function(){boot();},50);
  }
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",bootAfterDom,{once:true});
  }else{
    bootAfterDom();
  }
  window.addEventListener("barokah:supabase-ready",bootAfterDom,{once:true});
  window.addEventListener("pageshow",function(){if(window.barokahSupabaseReady)setTimeout(function(){window.barokahCloudSync();},50);});
})();
