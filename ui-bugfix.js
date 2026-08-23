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
    document.querySelectorAll('body *').forEach(function(el){
      if(el.tagName==='SCRIPT'||el.tagName==='STYLE'||el.tagName==='NOSCRIPT') return;
      const text=(el.textContent||'').trim();
      if(!text) return;
      if(markers.some(function(m){return text.includes(m);} )){
        const hasAppContent=el.querySelector('button,input,select,table,.card,.page,.nav');
        if(!hasAppContent && el!==document.body && el!==document.documentElement) el.remove();
      }
    });
    document.querySelectorAll('.print-demo-watermark,.pr-demo-label').forEach(function(el){
      if(!el.closest('#printReport')) el.style.display='none';
    });
    document.querySelectorAll('footer').forEach(function(el){
      if((el.textContent||'').includes('Tahap Revisi')) el.style.display='none';
    });
  }

  function loadStableDebt(){
    if(window.__stableDebtRendererLoaded)return;
    window.__stableDebtRendererLoaded=true;
    const s=document.createElement('script');
    s.src='/debt-stable-render-v70.8-preview.js?v=1';
    s.async=false;
    s.onload=function(){window.dispatchEvent(new Event('barokah:stable-debt-ready'));};
    document.head.appendChild(s);
  }

  function start(){
    clean();
    loadStableDebt();
    setTimeout(clean,250);
    setTimeout(clean,1000);
    setTimeout(clean,2500);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start);
  else start();
  window.barokahCleanUi=clean;
})();