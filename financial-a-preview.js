// Barokah Telur V70.4.0 — Financial Preview A
// Isolated module: only adds an Omzet preview card to Dashboard.
(function(){
  'use strict';
  var mounted=false, retryTimer=null;
  function sb(){return window.barokahSupabase||null;}
  function money(v){return 'Rp '+Number(v||0).toLocaleString('id-ID');}
  function esc(v){return String(v==null?'':v).replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c];});}
  function findDashboard(){return document.querySelector('#page-dashboard')||document.querySelector('.page.active')||null;}
  function mountShell(){
    var dash=findDashboard();
    if(!dash)return null;
    var existing=document.getElementById('financialPreviewA');
    if(existing)return existing;
    var anchor=dash.querySelector('.dashboard-top');
    var card=document.createElement('section');
    card.id='financialPreviewA';
    card.className='card';
    card.style.cssText='margin-top:16px;padding:20px;border-top:4px solid #24a36b;';
    card.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><div><div style="font-size:11px;color:#6d776f;font-weight:800;letter-spacing:.08em">TAHAP A · PREVIEW</div><h3 style="margin:6px 0 3px">Omzet Usaha</h3><div style="font-size:12px;color:#6d776f">Total penjualan dari transaksi yang tersimpan di database.</div></div><strong id="financialPreviewOmzet" style="font-size:26px;color:#0a7748">Memuat...</strong></div><div id="financialPreviewStatus" style="font-size:11px;color:#6d776f;margin-top:10px">Menunggu sinkronisasi akun...</div>';
    if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(card,anchor.nextSibling);
    else dash.insertBefore(card,dash.firstChild);
    return card;
  }
  async function sync(){
    var card=mountShell();
    if(!card)return false;
    var value=document.getElementById('financialPreviewOmzet');
    var status=document.getElementById('financialPreviewStatus');
    if(!value||!status)return false;
    var client=sb();
    if(!client){status.textContent='Menunggu koneksi Supabase...';return false;}
    try{
      var auth=await client.auth.getUser();
      var user=auth&&auth.data&&auth.data.user;
      if(!user){value.textContent='Rp 0';status.textContent='Belum ada sesi login. Silakan login lalu kembali ke Dashboard.';return false;}
      var result=await client.from('transactions').select('type,total').eq('user_id',user.id).eq('type','income');
      if(result.error)throw result.error;
      var total=(result.data||[]).reduce(function(sum,row){return sum+Number(row.total||0);},0);
      value.textContent=money(total);
      status.textContent='Sinkron dari '+(result.data||[]).length+' transaksi pemasukan.';
      return true;
    }catch(err){
      console.error('[Financial Preview A]',err);
      value.textContent='Rp 0';
      status.textContent='Gagal sinkronisasi omzet: '+esc(err.message||err);
      return false;
    }
  }
  function boot(){
    if(retryTimer)clearTimeout(retryTimer);
    sync().then(function(ok){if(!ok)retryTimer=setTimeout(boot,1200);});
  }
  function watch(){
    boot();
    var client=sb();
    if(client&&client.auth&&client.auth.onAuthStateChange){client.auth.onAuthStateChange(function(){setTimeout(boot,150);});}
    document.addEventListener('click',function(e){
      var b=e.target.closest&&e.target.closest('button');
      if(b&&/dashboard/i.test(b.textContent||''))setTimeout(boot,200);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
})();
