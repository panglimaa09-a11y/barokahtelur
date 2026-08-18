(function(){
  'use strict';

  function clean(){
    const markers=[
      'Do NOT use window.open/about:blank',
      'barokahReportPrintFrame',
      'Print iframe gagal',
      'document.getElementById(\'barokahPrintBtn\')',
      'Print Laporan gagal:'
    ];

    // The previous print patch accidentally contained literal </script> tags
    // inside another script string. The browser therefore exposed the rest of
    // that script as plain text in the page. Remove only those leaked text nodes.
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const nodes=[];
    let node;
    while((node=walker.nextNode())) nodes.push(node);
    nodes.forEach(function(textNode){
      const value=textNode.nodeValue||'';
      if(!markers.some(function(m){return value.includes(m);} )) return;
      const parent=textNode.parentElement;
      if(parent && (parent.tagName==='SCRIPT'||parent.tagName==='STYLE'||parent.tagName==='NOSCRIPT')) return;
      textNode.remove();
    });

    // If the leaked code was wrapped into a normal element, remove that empty
    // wrapper as well, but never remove an application section/card containing
    // legitimate content.
    document.querySelectorAll('body *').forEach(function(el){
      if(el.tagName==='SCRIPT'||el.tagName==='STYLE'||el.tagName==='NOSCRIPT') return;
      const text=(el.textContent||'').trim();
      if(!text) return;
      if(markers.some(function(m){return text.includes(m);} )){
        const hasAppContent=el.querySelector('button,input,select,table,.card,.page,.nav');
        if(!hasAppContent && el!==document.body && el!==document.documentElement) el.remove();
      }
    });

    // Revision/demo watermark must only exist on printed output, never in app UI.
    document.querySelectorAll('.print-demo-watermark,.pr-demo-label').forEach(function(el){
      if(!el.closest('#printReport')) el.style.display='none';
    });

    // The revision footer is development-only and must not be visible to the owner.
    document.querySelectorAll('footer').forEach(function(el){
      if((el.textContent||'').includes('Tahap Revisi')) el.style.display='none';
    });
  }

  function start(){
    clean();
    setTimeout(clean,250);
    setTimeout(clean,1000);
    setTimeout(clean,2500);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start);
  else start();
  window.barokahCleanUi=clean;
})();
