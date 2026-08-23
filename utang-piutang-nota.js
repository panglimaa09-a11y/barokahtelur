(function(){
  'use strict';
  const SB=()=>window.barokahSupabase;
  const fmt=n=>Number(n||0).toLocaleString('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0});
  const esc=v=>String(v==null?'':v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const dateId=v=>v?new Date(v+'T00:00:00').toLocaleDateString('id-ID'):'-';

  function style(){
    if(document.getElementById('barokahNotaCss'))return;
    const s=document.createElement('style');s.id='barokahNotaCss';
    s.textContent='.debt-nota{border:1px solid #d6ded8;border-radius:9px;background:#fff;color:#0d5b45;padding:7px 9px;font-weight:800;font-size:11px;margin-left:4px;white-space:nowrap;cursor:pointer}.debt-nota:hover{background:#edf8f1}.debt-table td:last-child{white-space:nowrap}.debt-table .debt-actions-cell{min-width:330px;contain:layout style}.debt-table{overflow-x:auto!important;overflow-y:hidden!important;overscroll-behavior-x:contain;touch-action:pan-x pan-y;-webkit-overflow-scrolling:touch;scroll-behavior:auto!important;overflow-anchor:none}';
    document.head.appendChild(s);
  }

  async function printNota(id){
    const sb=SB();
    if(!sb){alert('Supabase belum siap.');return;}
    try{
      const {data,error}=await sb.from('debts_receivables').select('*').eq('id',id).single();
      if(error)throw error;
      if(!data)throw new Error('Data nota tidak ditemukan.');
      const paid=Number(data.paid_amount||0),total=Number(data.total_amount||0);
      const st=paid>=total?'LUNAS':paid>0?'SEBAGIAN':'BELUM BAYAR';
      const kind=data.kind==='utang'?'UTANG SUPPLIER':'PIUTANG PELANGGAN';
      const html='<!doctype html><html><head><meta charset="utf-8"><title>Nota '+esc(data.reference_no||'')+'</title><style>@page{size:A5 portrait;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172018;margin:0}.head{text-align:center;border-bottom:2px solid #14532d;padding-bottom:10px}.logo{width:48px;height:48px;border-radius:50%;background:#14532d;color:#fff;display:flex;align-items:center;justify-content:center;margin:auto;font-weight:900;font-size:17px}.brand{font-size:19px;font-weight:900;color:#14532d;margin-top:6px}.sub{font-size:10px;color:#666}.box{border:1px solid #ddd;border-radius:8px;padding:10px;margin-top:12px}.row{display:flex;justify-content:space-between;gap:10px;padding:5px 0;font-size:11px}.label{color:#666}.value{font-weight:800;text-align:right}.total{border-top:1px solid #ddd;margin-top:7px;padding-top:8px;font-size:14px}.status{display:inline-block;margin-top:10px;padding:6px 10px;border-radius:999px;background:#edf8f1;color:#087344;font-weight:900;font-size:10px}.note{margin-top:12px;font-size:10px;color:#555}.sign{display:grid;grid-template-columns:1fr 1fr;gap:25px;margin-top:28px;text-align:center;font-size:10px}.line{border-top:1px solid #aaa;margin-top:32px;padding-top:5px}.foot{text-align:center;margin-top:18px;padding-top:8px;border-top:1px dashed #bbb;font-size:9px;color:#777}</style></head><body><div class="head"><div class="logo">BT</div><div class="brand">BAROKAH TELUR</div><div class="sub">'+esc(kind)+'</div></div><div class="box"><div class="row"><span class="label">No. Transaksi</span><span class="value">'+esc(data.reference_no||'-')+'</span></div><div class="row"><span class="label">Tanggal</span><span class="value">'+dateId(data.debt_date)+'</span></div><div class="row"><span class="label">Nama</span><span class="value">'+esc(data.party_name)+'</span></div><div class="row"><span class="label">No. WhatsApp</span><span class="value">'+esc(data.phone||'-')+'</span></div></div><div class="box"><div class="row total"><span class="label">Total</span><span class="value">'+fmt(data.total_amount)+'</span></div><div class="row"><span class="label">Sudah Dibayar</span><span class="value">'+fmt(data.paid_amount)+'</span></div><div class="row"><span class="label">Sisa</span><span class="value">'+fmt(Math.max(0,total-paid))+'</span></div><div class="status">'+st+'</div></div>'+(data.note?'<div class="box note"><b>Keterangan</b><br>'+esc(data.note)+'</div>':'')+'<div class="sign"><div><div class="line">Pelanggan / Supplier</div></div><div><div class="line">Barokah Telur</div></div></div><div class="foot">Nota ini dicetak dari Sistem Barokah Telur • '+new Date().toLocaleString('id-ID')+'</div></body></html>';
      let f=document.getElementById('barokahNotaPrintFrame');if(f)f.remove();
      f=document.createElement('iframe');f.id='barokahNotaPrintFrame';
      Object.assign(f.style,{position:'fixed',width:'1px',height:'1px',right:'0',bottom:'0',border:'0',opacity:'0',pointerEvents:'none'});
      document.body.appendChild(f);
      f.onload=()=>setTimeout(()=>{try{f.contentWindow.focus();f.contentWindow.print()}catch(e){alert('Cetak nota gagal: '+e.message)}finally{setTimeout(()=>f.remove(),1500)}},250);
      f.srcdoc=html;
    }catch(e){alert('Gagal membuat nota: '+(e.message||e));}
  }

  let syncing=false;
  function syncButtons(){
    if(syncing)return;
    const box=document.getElementById('debtTable');
    if(!box)return;
    const savedScroll=box.scrollLeft;
    const pending=[];
    box.querySelectorAll('[data-del]').forEach(del=>{
      const id=del.getAttribute('data-del');
      if(!id||del.parentElement.querySelector('[data-nota="'+id+'"]'))return;
      pending.push([del.parentElement,id]);
    });
    if(!pending.length)return;
    syncing=true;
    try{
      pending.forEach(([parent,id])=>{
        if(parent.querySelector('[data-nota="'+id+'"]'))return;
        const b=document.createElement('button');
        b.type='button';b.className='debt-nota';b.dataset.nota=id;b.textContent='🧾 Nota';
        parent.appendChild(b);
      });
    }finally{
      requestAnimationFrame(()=>{box.scrollLeft=savedScroll;syncing=false;});
    }
  }

  function init(){
    style();
    const start=()=>{
      const box=document.getElementById('debtTable');
      if(!box)return;
      const observer=new MutationObserver(()=>syncButtons());
      observer.observe(box,{childList:true,subtree:true});
      syncButtons();
    };
    if(document.getElementById('debtTable'))start();
    else setTimeout(start,500);
    document.addEventListener('click',function(e){
      const nota=e.target.closest&&e.target.closest('[data-nota]');
      if(nota){e.preventDefault();e.stopPropagation();printNota(nota.dataset.nota);}
    },false);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,350),{once:true});else setTimeout(init,350);
})();