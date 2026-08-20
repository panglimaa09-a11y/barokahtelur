// Barokah Telur V70.4.0 — Financial Preview B
// Isolated Dashboard-only operational summary. Does not replace existing modules.
(function(){
  'use strict';
  var timer=null;
  function sb(){return window.barokahSupabase||null;}
  function money(v){return 'Rp '+Number(v||0).toLocaleString('id-ID');}
  function dashboard(){return document.querySelector('#page-dashboard')||document.querySelector('.page.active');}
  function mount(){
    var dash=dashboard(); if(!dash)return null;
    var card=document.getElementById('financialPreviewB'); if(card)return card;
    card=document.createElement('section'); card.id='financialPreviewB'; card.className='card';
    card.style.cssText='margin-top:16px;padding:20px;border-top:4px solid #bd4037;';
    card.innerHTML='<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap"><div><h3 style="margin:0 0 3px">Biaya Operasional</h3><div style="font-size:12px;color:#6d776f">Ringkasan biaya operasional terpisah dari transaksi penjualan.</div></div><strong id="financialPreviewBOut" style="font-size:26px;color:#b42318">Memuat...</strong></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px"><div style="padding:12px;border:1px solid #e5ebe6;border-radius:12px"><small style="color:#6d776f">Pengeluaran</small><strong id="financialPreviewBOut2" style="display:block;margin-top:5px">Rp 0</strong></div><div style="padding:12px;border:1px solid #e5ebe6;border-radius:12px"><small style="color:#6d776f">Pemasukan Operasional</small><strong id="financialPreviewBIn" style="display:block;margin-top:5px">Rp 0</strong></div><div style="padding:12px;border:1px solid #e5ebe6;border-radius:12px"><small style="color:#6d776f">Saldo Operasional</small><strong id="financialPreviewBNet" style="display:block;margin-top:5px">Rp 0</strong></div></div><div id="financialPreviewBStatus" style="font-size:11px;color:#6d776f;margin-top:10px">Menunggu sinkronisasi akun...</div>';
    var anchor=dash.querySelector('#financialPreviewA')||dash.querySelector('.dashboard-top');
    if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(card,anchor.nextSibling); else dash.insertBefore(card,dash.firstChild);
    return card;
  }
  async function sync(){
    var card=mount(); if(!card)return false;
    var client=sb(); if(!client)return false;
    try{
      var auth=await client.auth.getUser(), user=auth&&auth.data&&auth.data.user;
      if(!user){document.getElementById('financialPreviewBStatus').textContent='Belum ada sesi login. Silakan login lalu kembali ke Dashboard.';return false;}
      var r=await client.from('operational_transactions').select('kind,amount').eq('user_id',user.id);
      if(r.error)throw r.error;
      var rows=r.data||[], out=rows.filter(function(x){return x.kind==='pengeluaran';}).reduce(function(s,x){return s+Number(x.amount||0);},0);
      var input=rows.filter(function(x){return x.kind==='pemasukan';}).reduce(function(s,x){return s+Number(x.amount||0);},0);
      document.getElementById('financialPreviewBOut').textContent=money(out);
      document.getElementById('financialPreviewBOut2').textContent=money(out);
      document.getElementById('financialPreviewBIn').textContent=money(input);
      document.getElementById('financialPreviewBNet').textContent=money(input-out);
      document.getElementById('financialPreviewBStatus').textContent='Sinkron dari '+rows.length+' transaksi operasional.';
      return true;
    }catch(e){
      console.error('[Financial Preview B]',e);
      document.getElementById('financialPreviewBStatus').textContent='Gagal sinkronisasi operasional: '+(e.message||e);
      return false;
    }
  }
  function boot(){if(timer)clearTimeout(timer);sync().then(function(ok){if(!ok)timer=setTimeout(boot,1200);});}
  function init(){boot();var c=sb();if(c&&c.auth&&c.auth.onAuthStateChange)c.auth.onAuthStateChange(function(){setTimeout(boot,200);});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
