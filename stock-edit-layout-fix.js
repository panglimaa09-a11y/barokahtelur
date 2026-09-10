(function(){
  'use strict';
  const SB=()=>window.barokahSupabase;
  const $=id=>document.getElementById(id);
  const factor=u=>{const k=String(u||'').trim().toLowerCase();return k==='papan'?30:k==='ikat'?180:1;};
  const fmt=n=>Number(n||0).toLocaleString('id-ID',{maximumFractionDigits:10});

  function formIds(type){
    if(type==='Masuk')return ['stockIn','stockInUnit','stockInNote'];
    if(type==='Keluar')return ['stockOut','stockOutUnit','stockOutNote'];
    if(type==='Retak')return ['badEggs','badEggsUnit'];
    return ['unfitEggs','unfitEggsUnit'];
  }

  function findStockSection(){
    const labels=[...document.querySelectorAll('h2,h3,h4,strong,label')];
    const heading=labels.find(el=>/pergerakan stok/i.test(el.textContent||''));
    if(!heading)return null;
    return heading.closest('.card,.form-card,section')||heading.parentElement;
  }

  function banner(){
    let b=$('stockEditLayoutBanner');
    if(b)return b;
    b=document.createElement('div');
    b.id='stockEditLayoutBanner';
    b.style.cssText='display:none;margin:0 0 14px;padding:14px 16px;border:1px solid #e6c75a;border-radius:14px;background:#fff8d9;color:#5c4a00;font-size:13px;font-weight:800;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;';
    b.innerHTML='<span id="stockEditLayoutText">✏️ Mode Edit Stok</span><button type="button" id="stockEditLayoutCancel" class="btn ghost">Batal Edit</button>';
    const section=findStockSection();
    if(section&&section.parentNode)section.parentNode.insertBefore(b,section);
    else document.body.insertBefore(b,document.body.firstChild);
    $('stockEditLayoutCancel').onclick=function(){
      b.style.display='none';
      if(typeof window.stockEditLayoutCancelHook==='function')window.stockEditLayoutCancelHook();
    };
    return b;
  }

  function setSaveButtons(type,editing){
    const map={Masuk:'addStockIn',Keluar:'addStockOut',Retak:'addBadEggs','Tidak Layak':'addUnfitEggs'};
    Object.keys(map).forEach(t=>{
      document.querySelectorAll('[onclick]').forEach(btn=>{
        const onclick=String(btn.getAttribute('onclick')||'');
        if(onclick.indexOf(map[t]+'(')<0)return;
        if(!btn.dataset.stockEditOriginalText)btn.dataset.stockEditOriginalText=btn.textContent;
        if(editing){
          btn.disabled=t!==type;
          btn.style.opacity=t===type?'1':'.45';
          if(t===type)btn.textContent='💾 Simpan Perubahan';
        }else{
          btn.disabled=false;btn.style.opacity='';
          if(btn.dataset.stockEditOriginalText)btn.textContent=btn.dataset.stockEditOriginalText;
        }
      });
    });
  }

  function clearFields(){
    ['stockIn','stockInNote','stockOut','stockOutNote','badEggs','unfitEggs'].forEach(id=>{const e=$(id);if(e)e.value='';});
  }

  function projected(row,type){
    const sb=SB();
    if(!sb)return;
    const ids=formIds(type),q=$(ids[0]),u=$(ids[1]);
    if(!q||!u)return;
    const qty=Number(String(q.value||'').replace(/[^0-9.,-]/g,'').replace(/\.(?=.*\.)/g,'').replace(',','.'))||0;
    const delta=qty*factor(u.value)*(type==='Masuk'?1:-1);
    const current=Number(row.saldo_after_butir||0)-Number(row.delta_butir||0);
    const preview=$('stockAutoPreview');
    if(preview)preview.textContent='Saldo Setelah (perkiraan): '+fmt(current+delta)+' Butir. Tekan Simpan Perubahan untuk menerapkan.';
  }

  async function openEdit(id){
    const sb=SB();
    if(!sb)return;
    try{
      const {data,error}=await sb.from('stock_movements').select('*').eq('id',id).single();
      if(error)throw error;
      const row=data;
      clearFields();
      const type=row.movement_type;
      const ids=formIds(type);
      const q=$(ids[0]),u=$(ids[1]),n=ids[2]?$(ids[2]):null;
      if(q)q.value=String(row.qty??'');
      if(u)u.value=String(row.unit??'Butir');
      if(n)n.value=String(row.note??'');

      const b=banner();
      b.style.display='flex';
      $('stockEditLayoutText').textContent='✏️ Sedang Edit: '+type+' — data di bawah adalah data riwayat yang dipilih. Edit langsung di form Pergerakan Stok, lalu tekan Simpan Perubahan.';
      setSaveButtons(type,true);
      projected(row,type);
      q?.scrollIntoView({behavior:'smooth',block:'center'});
      setTimeout(()=>q?.focus(),350);
      [q,u,n].filter(Boolean).forEach(el=>{el.addEventListener('input',()=>projected(row,type));el.addEventListener('change',()=>projected(row,type));});
    }catch(e){console.error('Stock edit layout fix:',e);alert('Gagal membuka data stok untuk diedit: '+(e.message||e));}
  }

  function hook(){
    document.addEventListener('click',function(e){
      const btn=e.target.closest?.('[data-stock-edit]');
      if(!btn)return;
      setTimeout(()=>openEdit(btn.getAttribute('data-stock-edit')),50);
    },true);
    window.stockEditLayoutCancelHook=function(){
      setSaveButtons('',false);
      clearFields();
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(hook,1300));
  else setTimeout(hook,1300);
})();
