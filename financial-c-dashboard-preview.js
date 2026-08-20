// Barokah Telur V70.4.1 — Financial Stage C Preview
// Isolated Dashboard-only summary for Utang & Piutang.
// Does not modify the existing Utang/Piutang module.
(function(){
  'use strict';
  var retryTimer=null;
  function sb(){return window.barokahSupabase||null;}
  function money(v){return 'Rp '+Number(v||0).toLocaleString('id-ID');}
  function dash(){return document.querySelector('#page-dashboard')||document.querySelector('.page.active');}
  function mount(){
    var d=dash(); if(!d)return null;
    var card=document.getElementById('financialPreviewC'); if(card)return card;
    card=document.createElement('section');
    card.id='financialPreviewC';
    card.className='card';
    card.style.cssText='margin-top:16px;padding:20px;border-top:4px solid #7b4fc5;';
    card.innerHTML='<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">'+
      '<div><div style="font-size:11px;color:#6d776f;font-weight:800;letter-spacing:.08em">TAHAP C · PREVIEW</div>'+\
      '<h3 style="margin:6px 0 3px">Utang & Piutang</h3>'+\
      '<div style="font-size:12px;color:#6d776f">Saldo tagihan dihitung dari total tagihan dikurangi pembayaran.</div></div>'+\
      '<strong id="financialPreviewCTotalOpen" style="font-size:24px;color:#6841a5">Memuat...</strong></div>'+\
      '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:14px">'+\
      '<div style="padding:12px;border:1px solid #e5ebe6;border-radius:12px"><small style="color:#6d776f">Piutang Tersisa</small><strong id="financialPreviewCReceivable" style="display:block;margin-top:5px">Rp 0</strong></div>'+\
      '<div style="padding:12px;border:1px solid #e5ebe6;border-radius:12px"><small style="color:#6d776f">Utang Tersisa</small><strong id="financialPreviewCPayable" style="display:block;margin-top:5px">Rp 0</strong></div>'+\
      '<div style="padding:12px;border:1px solid #e5ebe6;border-radius:12px"><small style="color:#6d776f">Piutang Terbuka</small><strong id="financialPreviewCReceivableCount" style="display:block;margin-top:5px">0</strong></div>'+\
      '<div style="padding:12px;border:1px solid #e5ebe6;border-radius:12px"><small style="color:#6d776f">Utang Terbuka</small><strong id="financialPreviewCPayableCount" style="display:block;margin-top:5px">0</strong></div></div>'+\
      '<div id="financialPreviewCStatus" style="font-size:11px;color:#6d776f;margin-top:10px">Menunggu sinkronisasi akun...</div>';
    var anchor=d.querySelector('#financialPreviewB')||d.querySelector('#financialPreviewA')||d.querySelector('.dashboard-top');
    if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(card,anchor.nextSibling); else d.insertBefore(card,d.firstChild);
    return card;
  }
  async function sync(){
    var card=mount(); if(!card)return false;
    var client=sb(); if(!client)return false;
    var totalOpen=document.getElementById('financialPreviewCTotalOpen');
    var rec=document.getElementById('financialPreviewCReceivable');
    var pay=document.getElementById('financialPreviewCPayable');
    var recCount=document.getElementById('financialPreviewCReceivableCount');
    var payCount=document.getElementById('financialPreviewCPayableCount');
    var status=document.getElementById('financialPreviewCStatus');
    if(!totalOpen||!rec||!pay||!recCount||!payCount||!status)return false;
    try{
      var auth=await client.auth.getUser();
      var user=auth&&auth.data&&auth.data.user;
      if(!user){status.textContent='Belum ada sesi login. Silakan login lalu kembali ke Dashboard.';return false;}
      var r=await client.from('debts_receivables').select('kind,total_amount,paid_amount').eq('user_id',user.id);
      if(r.error)throw r.error;
      var rows=r.data||[];
      var piutang=0,utang=0,piutangCount=0,utangCount=0;
      rows.forEach(function(x){
        var remaining=Math.max(0,Number(x.total_amount||0)-Number(x.paid_amount||0));
        if(x.kind==='piutang'){piutang+=remaining;if(remaining>0)piutangCount++;}
        if(x.kind==='utang'){utang+=remaining;if(remaining>0)utangCount++;}
      });
      var open=piutang+utang;
      rec.textContent=money(piutang);
      pay.textContent=money(utang);
      recCount.textContent=String(piutangCount);
      payCount.textContent=String(utangCount);
      totalOpen.textContent=money(open);
      status.textContent='Sinkron dari '+rows.length+' catatan utang/piutang. Sisa dihitung dari total − sudah dibayar.';
      return true;
    }catch(e){
      console.error('[Financial Stage C]',e);
      totalOpen.textContent='Rp 0';
      status.textContent='Gagal sinkronisasi utang/piutang: '+(e.message||e);
      return false;
    }
  }
  function boot(){if(retryTimer)clearTimeout(retryTimer);sync().then(function(ok){if(!ok)retryTimer=setTimeout(boot,1200);});}
  function init(){
    boot();
    var client=sb();
    if(client&&client.auth&&client.auth.onAuthStateChange)client.auth.onAuthStateChange(function(){setTimeout(boot,200);});
    document.addEventListener('click',function(e){
      var b=e.target.closest&&e.target.closest('button');
      if(b&&/dashboard/i.test(b.textContent||''))setTimeout(boot,250);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
