(function(){
  'use strict';
  function clean(){
    // The print helper was previously leaked into the visible DOM as plain text.
    const markers=[
      'Do NOT use window.open/about:blank',
      'barokahReportPrintFrame',
      'Print iframe gagal',
      'document.getElementById(\'barokahPrintBtn\')'
    ];
    document.querySelectorAll('body *').forEach(function(el){
      if(el.tagName==='SCRIPT'||el.tagName==='STYLE'||el.tagName==='NOSCRIPT') return;
      const t=(el.textContent||'').trim();
      if(!t) return;
      if(markers.some(function(m){return t.includes(m);})){
        // Remove only the smallest visible container containing the leaked code.
        let target=el;
        if(target.children.length>0){
          const child=[...target.children].find(function(c){return (c.textContent||'').includes(markers.find(function(m){return (c.textContent||'').includes(m)})||'___');});
          if(child) target=child;
        }
        if(target!==document.body&&target!==document.documentElement) target.remove();
      }
    });
    // Revision/demo watermark must only exist on printed output, never in the app UI.
    document.querySelectorAll('.print-demo-watermark,.pr-demo-label').forEach(function(el){
      if(!el.closest('#printReport')) el.style.display='none';
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){clean();setTimeout(clean,250);setTimeout(clean,1000);});
  else {clean();setTimeout(clean,250);setTimeout(clean,1000);}
  window.barokahCleanUi=clean;
})();
