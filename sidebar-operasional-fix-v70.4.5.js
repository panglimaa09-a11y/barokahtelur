(function(){
  'use strict';
  function init(){
    var side=document.getElementById('barokahSidebar');
    if(!side)return false;
    var menu=side.querySelector('.bs-menu');
    if(!menu)return false;
    if(side.querySelector('[data-page="operational"]'))return true;
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
      }
      if(document.getElementById('page-operational')){openPage();return;}
      var s=document.createElement('script');s.src='operasional.js?v=70.4.5-fix';s.async=false;s.onload=function(){setTimeout(openPage,80)};s.onerror=function(){alert('Modul Operasional gagal dimuat. Periksa file operasional.js.');};document.head.appendChild(s);
    });
    menu.appendChild(b);
    return true;
  }
  var tries=0;
  function wait(){if(init())return;if(++tries<100)setTimeout(wait,100)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait,{once:true});else wait();
})();