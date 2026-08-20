// Barokah Telur V70.4.1 — Financial Stage C Preview
// Dashboard-only, isolated from the existing Utang/Piutang module.
(function(){
  'use strict';

  var retryTimer = null;
  var observer = null;

  function sb(){ return window.barokahSupabase || null; }
  function money(v){ return 'Rp ' + Number(v || 0).toLocaleString('id-ID'); }

  function dashboard(){
    return document.getElementById('page-dashboard') ||
      document.querySelector('.page.active') ||
      document.querySelector('.dashboard-top')?.closest('.page');
  }

  function mount(){
    var d = dashboard();
    if(!d) return null;
    var old = document.getElementById('financialPreviewC');
    if(old && d.contains(old)) return old;
    if(old) old.remove();

    var card = document.createElement('section');
    card.id = 'financialPreviewC';
    card.className = 'card financial-stage-c';
    card.style.marginTop = '16px';
    card.style.padding = '20px';
    card.style.borderTop = '4px solid #7b4fc5';

    card.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">' +
        '<div>' +
          '<div style="font-size:11px;color:#6d776f;font-weight:800;letter-spacing:.08em">TAHAP C · PREVIEW</div>' +
          '<h3 style="margin:6px 0 3px">Utang &amp; Piutang</h3>' +
          '<div style="font-size:12px;color:#6d776f">Sisa tagihan = total tagihan dikurangi pembayaran.</div>' +
        '</div>' +
        '<strong id="financialPreviewCTotalOpen" style="font-size:24px;color:#6841a5">Memuat...</strong>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:14px">' +
        '<div style="padding:12px;border:1px solid #e5ebe6;border-radius:12px"><small style="color:#6d776f">Piutang Tersisa</small><strong id="financialPreviewCReceivable" style="display:block;margin-top:5px">Rp 0</strong></div>' +
        '<div style="padding:12px;border:1px solid #e5ebe6;border-radius:12px"><small style="color:#6d776f">Utang Tersisa</small><strong id="financialPreviewCPayable" style="display:block;margin-top:5px">Rp 0</strong></div>' +
        '<div style="padding:12px;border:1px solid #e5ebe6;border-radius:12px"><small style="color:#6d776f">Piutang Terbuka</small><strong id="financialPreviewCReceivableCount" style="display:block;margin-top:5px">0</strong></div>' +
        '<div style="padding:12px;border:1px solid #e5ebe6;border-radius:12px"><small style="color:#6d776f">Utang Terbuka</small><strong id="financialPreviewCPayableCount" style="display:block;margin-top:5px">0</strong></div>' +
      '</div>' +
      '<div id="financialPreviewCStatus" style="font-size:11px;color:#6d776f;margin-top:10px">Menunggu sinkronisasi akun...</div>';

    var anchor = d.querySelector('.dashboard-top') || d.querySelector('.kpis');
    if(anchor && anchor.parentNode){
      anchor.parentNode.insertBefore(card, anchor.nextSibling);
    }else{
      d.appendChild(card);
    }
    return card;
  }

  async function sync(){
    var card = mount();
    if(!card) return false;

    var client = sb();
    if(!client || !client.auth) return false;

    var totalOpen = card.querySelector('#financialPreviewCTotalOpen');
    var rec = card.querySelector('#financialPreviewCReceivable');
    var pay = card.querySelector('#financialPreviewCPayable');
    var recCount = card.querySelector('#financialPreviewCReceivableCount');
    var payCount = card.querySelector('#financialPreviewCPayableCount');
    var status = card.querySelector('#financialPreviewCStatus');
    if(!totalOpen || !rec || !pay || !recCount || !payCount || !status) return false;

    try{
      var auth = await client.auth.getUser();
      var user = auth && auth.data && auth.data.user;
      if(!user){
        totalOpen.textContent = 'Rp 0';
        status.textContent = 'Login diperlukan untuk memuat utang/piutang.';
        return false;
      }

      var result = await client
        .from('debts_receivables')
        .select('kind,total_amount,paid_amount')
        .eq('user_id', user.id);

      if(result.error) throw result.error;

      var rows = result.data || [];
      var piutang = 0;
      var utang = 0;
      var piutangCount = 0;
      var utangCount = 0;

      rows.forEach(function(row){
        var remaining = Math.max(0, Number(row.total_amount || 0) - Number(row.paid_amount || 0));
        if(row.kind === 'piutang'){
          piutang += remaining;
          if(remaining > 0) piutangCount++;
        }else if(row.kind === 'utang'){
          utang += remaining;
          if(remaining > 0) utangCount++;
        }
      });

      rec.textContent = money(piutang);
      pay.textContent = money(utang);
      recCount.textContent = String(piutangCount);
      payCount.textContent = String(utangCount);
      totalOpen.textContent = money(piutang + utang);
      status.textContent = 'Sinkron dari ' + rows.length + ' catatan. Sisa = total tagihan − sudah dibayar.';
      return true;
    }catch(error){
      console.error('[Financial Stage C]', error);
      totalOpen.textContent = 'Rp 0';
      status.textContent = 'Gagal sinkronisasi: ' + (error.message || error);
      return false;
    }
  }

  function boot(){
    if(retryTimer) clearTimeout(retryTimer);
    sync().then(function(ok){
      if(!ok) retryTimer = setTimeout(boot, 1200);
    });
  }

  function init(){
    boot();
    var client = sb();
    if(client && client.auth && client.auth.onAuthStateChange){
      client.auth.onAuthStateChange(function(){ setTimeout(boot, 250); });
    }
    if(!observer && window.MutationObserver){
      observer = new MutationObserver(function(){
        if(!document.getElementById('financialPreviewC')) boot();
      });
      observer.observe(document.body, {childList:true, subtree:true});
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  }else{
    init();
  }
})();