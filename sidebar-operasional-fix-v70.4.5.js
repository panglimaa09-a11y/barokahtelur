(function(){
  'use strict';
  function syncOperational(){
    try{
      window.dispatchEvent(new CustomEvent('barokah:operational-open'));
      if(window.BarokahOperationalSync && typeof window.BarokahOperationalSync.sync==='function'){
        window.BarokahOperationalSync.sync();
      }
    }catch(e){console.warn('Operational sync trigger failed:',e);}
  }
  function init(){
    var side=document.getElementById('barokahSidebar');
    if(!side)return false;
    var menu=side.querySelector('.bs-menu');
    if(!menu)return false;

    var old=side.querySelector('[data-page="operasional"]');
    if(old)old.remove();

    var existing=side.querySelector('[data-page="operational"]');
    if(existing){
      existing.onclick=function(){
        if(typeof window.showPage==='function')window.showPage('operational');
        var p=document.getElementById('page-operational');
        if(p){document.querySelectorAll('.page').forEach(function(x){x.classList.remove('active')});p.classList.add('active');}
        side.querySelectorAll('.bs-btn[data-page]').forEach(function(x){x.classList.toggle('active',x.dataset.page==='operational')});
        setTimeout(syncOperational,50);
      };
      return true;
    }

    var b=document.createElement('button');
    b.className='bs-btn';
    b.dataset.page='operational';
    b.innerHTML='<span class="bs-icon">🏢</span><span class="bs-label">Operasional</span>';
    b.style.cssText='border-left:3px solid #f4c126!important;background:rgba(255,255,255,.08)!important;color:#fff!important';
    b.addEventListener('click',function(){
      function openPage(){
        if(typeof window.showPage==='function')window.showPage('operational');
        var p=document.getElementById('page-operational');
        if(p){document.querySelectorAll('.page').forEach(function(x){x.classList.remove('active')});p.classList.add('active');}
        side.querySelectorAll('.bs-btn[data-page]').forEach(function(x){x.classList.toggle('active',x.dataset.page==='operational')});
        setTimeout(syncOperational,50);
      }
      if(document.getElementById('page-operational')){openPage();return;}
      var s=document.createElement('script');
      s.src='operasional.js?v=70.4.8-route-fix';
      s.async=false;
      s.onload=function(){setTimeout(openPage,150)};
      s.onerror=function(){alert('Modul Operasional gagal dimuat. Periksa file operasional.js.');};
      document.head.appendChild(s);
    });
    menu.appendChild(b);
    return true;
  }
  var tries=0;
  function wait(){if(init())return;if(++tries<100)setTimeout(wait,100)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait,{once:true});else wait();
})();