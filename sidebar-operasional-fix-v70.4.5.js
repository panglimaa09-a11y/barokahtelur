(function(){
  'use strict';

  function activateOperationalPage(){
    if(typeof window.showPage==='function'){
      try{window.showPage('operational');}catch(e){console.warn('showPage operational failed',e);}
    }
    document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
    var page=document.getElementById('page-operational');
    if(page){
      page.classList.add('active');
      return true;
    }
    return false;
  }

  function loadOperationalModule(done){
    if(document.getElementById('page-operational')){done();return;}
    var existing=document.querySelector('script[data-barokah-operational-loader="1"]');
    if(existing){
      existing.addEventListener('load',done,{once:true});
      setTimeout(done,250);
      return;
    }
    var s=document.createElement('script');
    s.src='operasional.js?v=70.4.9-route-stable';
    s.async=false;
    s.dataset.barokahOperationalLoader='1';
    s.onload=done;
    s.onerror=function(){console.warn('Barokah Telur: operasional.js gagal dimuat.');};
    document.head.appendChild(s);
  }

  function openOperational(){
    if(activateOperationalPage()){
      window.dispatchEvent(new CustomEvent('barokah:operational-open'));
      if(window.BarokahOperationalSync&&typeof window.BarokahOperationalSync.sync==='function'){
        setTimeout(function(){window.BarokahOperationalSync.sync();},80);
      }
      return;
    }
    loadOperationalModule(function(){
      activateOperationalPage();
      window.dispatchEvent(new CustomEvent('barokah:operational-open'));
      if(window.BarokahOperationalSync&&typeof window.BarokahOperationalSync.sync==='function'){
        setTimeout(function(){window.BarokahOperationalSync.sync();},80);
      }
    });
  }

  function isOperationalButton(el){
    if(!el||!el.closest)return false;
    var b=el.closest('#barokahSidebar .bs-btn, #barokahSidebar button, .sidebar .bs-btn');
    if(!b)return false;
    var text=(b.textContent||'').trim().toLowerCase();
    return text==='operasional'||text.indexOf('operasional')!==-1;
  }

  function install(){
    if(window.__barokahOperationalRouteStable)return;
    window.__barokahOperationalRouteStable=true;

    document.addEventListener('click',function(ev){
      if(!isOperationalButton(ev.target))return;
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      openOperational();
    },true);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',install,{once:true});
  }else{
    install();
  }
})();
