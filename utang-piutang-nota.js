(function(){
  'use strict';
  const SB=()=>window.barokahSupabase;
  const fmt=n=>Number(n||0).toLocaleString('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0});
  const esc=v=>String(v==null?'':v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const dateId=v=>v?new Date(v+'T00:00:00').toLocaleDateString('id-ID'):'-';
  function style(){if(document.getElementById('barokahNotaCss'))return;const s=document.createElement('style');s.id='barokahNotaCss';s.textContent='.debt-nota{border:1px solid #d6ded8;border-radius:9px;background:#fff;color:#0d5b45;padding:7px 9px;font-weight:800;font-size:11px;margin-left:4px}.debt-nota:hover{background:#edf8f1}';document.head.appendChild(s)}
  function autoHint(){const form=document.getElementById('debtForm'),ref=document.getElementById('debtRef');if(!form||!ref||ref.dataset.autoReady==='1')return;ref.dataset.autoReady='1';ref.readOnly=true;ref.placeholder='Nomor transaksi dibuat otomatis';ref.title='Nomor transaksi dibuat otomatis oleh database Supabase';const help=document.createElement('small');help.className='debt-help';help.textContent='Nomor transaksi dibuat otomatis dan tidak perlu diketik manual.';ref.parentElement.appendChild(help)}
  async function printNota(id){const sb=SB();if(!sb){alert('Supabase belum siap.');return}try{const {data,error}=await sb.from('debts_receivables').select('*').eq('id',id).single();if(error)throw error;if(!data)throw new Error('Data nota tidak ditemukan.');const paid=Number(data.paid_amount||0),total=Number(data.total_amount||0),st=paid>=total?'LUNAS':paid>0?'SEBAGIAN':'BELUM BAYAR',kind=data.kind==='utang'?'UTANG SUPPLIER':'PIUTANG PELANGGAN';const html='<!doctype html><html><head><meta charset="utf-8"><title>Nota '+esc(data.reference_no||'')+'</title><style>@page{size:A5 portrait;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172018;margin:0}.head{text-align:center;border-bottom:2px solid #14532d;padding-bottom:10px}.logo{width:48px;height:48px;border-radius:50%;background:#14532d;color:#fff;display:flex;align-items:center;justify-content:center;margin:auto;font-weight:900;font-size:17px}.brand{font-size:19px;font-weight:900;color:#14532d;margin-top:6px}.sub{font-size:10px;color:#666}.box{border:1px solid #ddd;border-radius:8px;padding:10px;margin-top:12px}.row{display:flex;justify-content:space-between;gap:10px;padding:5px 0;font-size:11px}.label{color:#666}.value{font-weight:800;text-align:right}.total{border-top:1px solid #ddd;margin-top:7px;padding-top:8px;font-size:14px}.status{display:inline-block;margin-top:10px;padding:6px 10px;border-radius:999px;background:#edf8f1;color:#087344;font-weight:900;font-size:10px}.note{margin-top:12px;font-size:10px;color:#555}.sign{display:grid;grid-template-columns:1fr 1fr;gap:25px;margin-top:28px;text-align:center;font-size:10px}.line{border-top:1px solid #aaa;margin-top:32px;padding-top:5px}.foot{text-align:center;margin-top:18px;padding-top:8px;border-top:1px dashed #bbb;font-size:9px;color:#777}</style></head><body><div class="head"><div class="logo">BT</div><div class="brand">BAROKAH TELUR</div><div class="sub">'+esc(kind)+'</div></div><div class="box"><div class="row"><span class="label">No. Transaksi</span><span class="value">'+esc(data.reference_no||'-')+'</span></div><div class="row"><span class="label">Tanggal</span><span class="value">'+dateId(data.debt_date)+'</span></div><div class="row"><span class="label">Nama</span><span class="value">'+esc(data.party_name)+'</span></div><div class="row"><span class="label">No. WhatsApp</span><span class="value">'+esc(data.phone||'-')+'</span></div></div><div class="box"><div class="row total"><span class="label">Total</span><span class="value">'+fmt(data.total_amount)+'</span></div><div class="row"><span class="label">Sudah Dibayar</span><span class="value">'+fmt(data.paid_amount)+'</span></div><div class="row"><span class="label">Sisa</span><span class="value">'+fmt(Math.max(0,total-paid))+'</span></div><div class="status">'+st+'</div></div>'+(data.note?'<div class="box note"><b>Keterangan</b><br>'+esc(data.note)+'</div>':'')+'<div class="sign"><div><div class="line">Pelanggan / Supplier</div></div><div><div class="line">Barokah Telur</div></div></div><div class="foot">Nota ini dicetak dari Sistem Barokah Telur • '+new Date().toLocaleString('id-ID')+'</div></body></html>';let f=document.getElementById('barokahNotaPrintFrame');if(f)f.remove();f=document.createElement('iframe');f.id='barokahNotaPrintFrame';Object.assign(f.style,{position:'fixed',width:'1px',height:'1px',right:'0',bottom:'0',border:'0',opacity:'0',pointerEvents:'none'});document.body.appendChild(f);f.onload=()=>setTimeout(()=>{try{f.contentWindow.focus();f.contentWindow.print()}catch(e){alert('Cetak nota gagal: '+e.message)}finally{setTimeout(()=>f.remove(),1500)}},250);f.srcdoc=html}catch(e){alert('Gagal membuat nota: '+(e.message||e))}}
  function addNotaButtons(){const box=document.getElementById('debtTable');if(!box)return;box.querySelectorAll('[data-del]').forEach(del=>{const id=del.getAttribute('data-del');if(!id||del.parentElement.querySelector('[data-nota="'+id+'"]'))return;const b=document.createElement('button');b.type='button';b.className='debt-nota';b.dataset.nota=id;b.textContent='🧾 Nota';b.addEventListener('click',()=>printNota(id));del.parentElement.appendChild(b)})}
  function init(){style();autoHint();addNotaButtons();const obs=new MutationObserver(()=>{autoHint();addNotaButtons()});obs.observe(document.body,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,350));else setTimeout(init,350);
})();

/* ===== V70.3.7.2 — Rupiah input formatter for Utang Piutang ===== */
(function(){
  'use strict';
  function digitsOnly(v){ return String(v ?? '').replace(/\D/g,''); }
  function formatRupiahInput(el){
    if(!el) return;
    const digits=digitsOnly(el.value);
    if(!digits){ el.value=''; return; }
    const normalized=digits.replace(/^0+(?=\d)/,'') || '0';
    el.value=normalized.replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  }
  function bind(){
    const form=document.getElementById('debtForm');
    if(!form || form.dataset.rupiahReady==='1') return;
    form.dataset.rupiahReady='1';
    const total=document.getElementById('debtTotal');
    const paid=document.getElementById('debtPaid');
    [total,paid].forEach(function(el){
      if(!el) return;
      // Text input is required so the dots can be displayed while typing.
      el.type='text';
      el.inputMode='numeric';
      el.autocomplete='off';
      el.placeholder=el.id==='debtTotal'?'Contoh: 3.000.000':'Contoh: 1.000.000';
      el.addEventListener('input',function(){ formatRupiahInput(el); });
      el.addEventListener('blur',function(){ formatRupiahInput(el); });
      formatRupiahInput(el);
    });
    // The original submit handler reads Number(value). Capture phase strips
    // separators first, so the database still receives a numeric value.
    form.addEventListener('submit',function(){
      [total,paid].forEach(function(el){
        if(el) el.value=digitsOnly(el.value);
      });
    },true);
  }
  function watch(){
    bind();
    if(!window.__barokahDebtRupiahObserver){
      window.__barokahDebtRupiahObserver=new MutationObserver(bind);
      window.__barokahDebtRupiahObserver.observe(document.body,{childList:true,subtree:true});
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',watch);
  else watch();
})();
