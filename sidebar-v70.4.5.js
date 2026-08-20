(function(){
  'use strict';
  if(window.__barokahSidebarV7045) return;
  window.__barokahSidebarV7045 = true;

  function init(){
    if(document.getElementById('barokahSidebar')) return;

    var style=document.createElement('style');
    style.id='barokahSidebarStyle';
    style.textContent=`
      :root{--bs-green:#14532d;--bs-green2:#0d3f2e;--bs-bg:#f6f8f5;--bs-line:#e1e7e2;--bs-muted:#6d776f}
      body{padding-left:270px}
      .top{position:sticky!important;top:0!important;margin-left:-270px;padding-left:292px!important}
      .nav{display:none!important}
      #adminLoginBtn,#barokahPrintBtn,.top>.nav-item[data-page="research"]{display:none!important}
      #barokahSidebar{position:fixed;left:0;top:0;bottom:0;width:270px;z-index:1000;background:linear-gradient(180deg,#0d3f2e 0%,#14532d 100%);color:#fff;display:flex;flex-direction:column;padding:18px 14px;box-shadow:8px 0 30px rgba(18,42,29,.12)}
      .bs-brand{display:flex;align-items:center;gap:11px;padding:7px 9px 20px;border-bottom:1px solid rgba(255,255,255,.14);margin-bottom:14px}
      .bs-logo{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:linear-gradient(135deg,#f4c126,#ffe18a);color:#403000;font-weight:950;box-shadow:0 7px 18px rgba(0,0,0,.12)}
      .bs-brand strong{display:block;font-size:16px;letter-spacing:-.02em}.bs-brand span{display:block;font-size:10px;color:rgba(255,255,255,.65);margin-top:2px}
      .bs-section{font-size:9px;font-weight:900;letter-spacing:.16em;color:rgba(255,255,255,.48);padding:10px 10px 7px;text-transform:uppercase}
      .bs-menu{display:grid;gap:4px}
      .bs-btn{width:100%;border:1px solid transparent;background:transparent;color:rgba(255,255,255,.82);min-height:45px;border-radius:12px;padding:0 12px;display:flex;align-items:center;gap:11px;text-align:left;font-weight:750;font-size:13px;transition:.16s;cursor:pointer}
      .bs-btn:hover{background:rgba(255,255,255,.10);color:#fff;transform:translateX(2px)}
      .bs-btn.active{background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.12);color:#fff;box-shadow:inset 3px 0 #f4c126}
      .bs-icon{width:25px;text-align:center;font-size:17px;flex:0 0 25px}.bs-label{flex:1}.bs-arrow{opacity:.45;font-size:12px}
      .bs-bottom{margin-top:auto;border-top:1px solid rgba(255,255,255,.14);padding-top:12px;display:grid;gap:4px}
      .bs-user{padding:9px 10px;color:rgba(255,255,255,.55);font-size:10px;line-height:1.5}
      .bs-toggle{display:none;position:fixed;left:14px;top:14px;z-index:1101;width:44px;height:44px;border:1px solid #dce5df;background:#fff;border-radius:12px;box-shadow:0 8px 24px rgba(18,42,29,.12);font-size:20px}
      .bs-overlay{display:none;position:fixed;inset:0;background:rgba(15,23,42,.42);z-index:999}
      @media(max-width:900px){
        body{padding-left:0}.top{margin-left:0!important;padding-left:72px!important}.bs-toggle{display:block}#barokahSidebar{transform:translateX(-105%);transition:transform .22s ease}.bs-overlay.open{display:block}#barokahSidebar.open{transform:translateX(0)}
      }
      @media(min-width:901px){.bs-btn[data-page="dashboard"]{margin-bottom:2px}}
    `;
    document.head.appendChild(style);

    var side=document.createElement('aside');
    side.id='barokahSidebar';
    side.innerHTML=`
      <div class="bs-brand"><div class="bs-logo">BT</div><div><strong>Barokah Telur</strong><span>Pembukuan & Manajemen Usaha</span></div></div>
      <div class="bs-section">Menu Utama</div>
      <div class="bs-menu">
        <button class="bs-btn active" data-page="dashboard"><span class="bs-icon">🏠</span><span class="bs-label">Dashboard</span></button>
        <button class="bs-btn" data-page="stock"><span class="bs-icon">📦</span><span class="bs-label">Stok Gudang</span></button>
        <button class="bs-btn" data-page="income"><span class="bs-icon">💰</span><span class="bs-label">Uang Masuk</span></button>
        <button class="bs-btn" data-page="expense"><span class="bs-icon">💸</span><span class="bs-label">Uang Keluar</span></button>
        <button class="bs-btn" data-page="history"><span class="bs-icon">🧾</span><span class="bs-label">Riwayat</span></button>
        <button class="bs-btn" data-page="debt"><span class="bs-icon">🤝</span><span class="bs-label">Utang Piutang</span></button>
        <button class="bs-btn" data-page="operasional"><span class="bs-icon">🏢</span><span class="bs-label">Operasional</span></button>
      </div>
      <div class="bs-section">Pengaturan & Analisis</div>
      <div class="bs-menu">
        <button class="bs-btn" data-page="profile"><span class="bs-icon">👤</span><span class="bs-label">Profil</span></button>
        <button class="bs-btn" data-action="admin"><span class="bs-icon">🔐</span><span class="bs-label">Admin</span></button>
        <button class="bs-btn" data-page="research"><span class="bs-icon">🔎</span><span class="bs-label">Riset Data</span></button>
      </div>
      <div class="bs-bottom"><div class="bs-user">Sistem Pembukuan & Manajemen Usaha<br>Barokah Telur</div></div>`;
    document.body.appendChild(side);

    var toggle=document.createElement('button');toggle.className='bs-toggle';toggle.type='button';toggle.setAttribute('aria-label','Buka menu');toggle.textContent='☰';document.body.appendChild(toggle);
    var overlay=document.createElement('div');overlay.className='bs-overlay';document.body.appendChild(overlay);

    function close(){side.classList.remove('open');overlay.classList.remove('open')}
    function go(page){
      if(typeof window.showPage==='function') window.showPage(page);
      else document.querySelectorAll('.page').forEach(function(p){p.classList.toggle('active',p.id==='page-'+page)});
      document.querySelectorAll('.bs-btn[data-page]').forEach(function(b){b.classList.toggle('active',b.dataset.page===page)});
      close();
    }
    side.querySelectorAll('.bs-btn[data-page]').forEach(function(b){b.addEventListener('click',function(){go(b.dataset.page)})});
    side.querySelector('[data-action="admin"]').addEventListener('click',function(){if(typeof window.openAdminLogin==='function')window.openAdminLogin();close()});
    toggle.addEventListener('click',function(){side.classList.add('open');overlay.classList.add('open')});
    overlay.addEventListener('click',close);

    // Keep the sidebar active when existing buttons/scripts call showPage directly.
    var originalShow=window.showPage;
    if(typeof originalShow==='function' && !originalShow.__bsWrapped){
      function wrapped(page){originalShow.apply(this,arguments);document.querySelectorAll('.bs-btn[data-page]').forEach(function(b){b.classList.toggle('active',b.dataset.page===page)});if(window.innerWidth<=900)close()}
      wrapped.__bsWrapped=true;window.showPage=wrapped;
    } else {
      var tries=0;var timer=setInterval(function(){
        tries++;if(typeof window.showPage==='function'){
          clearInterval(timer);var fn=window.showPage;if(fn.__bsWrapped)return;function wrapped(page){fn.apply(this,arguments);document.querySelectorAll('.bs-btn[data-page]').forEach(function(b){b.classList.toggle('active',b.dataset.page===page)});if(window.innerWidth<=900)close()}wrapped.__bsWrapped=true;window.showPage=wrapped;
        }if(tries>100)clearInterval(timer);
      },100);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();