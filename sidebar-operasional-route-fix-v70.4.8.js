(function(){
  'use strict';
  function init(){
    var side=document.getElementById('barokahSidebar');
    if(!side || side.__opRouteFixed) return;
    side.__opRouteFixed=true;
    var btn=side.querySelector('.bs-btn[data-page="operasional"]');
    if(!btn) return;
    btn.addEventListener('click',function(ev){
      ev.preventDefault();
      ev.stopImmediatePropagation();
      var page=document.getElementById('page-operational');
      if(typeof window.showPage==='function'){
        window.showPage('operational');
      }
      document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
      page=document.getElementById('page-operational');
      if(page) page.classList.add('active');
      document.querySelectorAll('.bs-btn[data-page]').forEach(function(b){b.classList.toggle('active',b===btn);});
      window.dispatchEvent(new CustomEvent('barokah:operational-open'));
      if(window.BarokahOperationalSync && typeof window.BarokahOperationalSync.sync==='function'){
        setTimeout(function(){window.BarokahOperationalSync.sync();},100);
      }
    },true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(init,300);},{once:true});
  else setTimeout(init,300);
})();
