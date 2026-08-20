(function(){
  'use strict';
  const SB=()=>window.barokahSupabase;
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const today=()=>new Date().toISOString().slice(0,10);
  let syncing=false;

  function css(){
    if(document.getElementById('barokahDebtUnitCss'))return;
    const s=document.createElement('style');s.id='barokahDebtUnitCss';
    s.textContent='.debt-unit-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;grid-column:1/-1}.debt-unit-grid .debt-field{grid-column:auto}@media(max-width:600px){.debt-unit-grid{grid-template-columns:1fr}}.debt-unit-badge{font-weight:800;color:#14532d}.debt-qty-cell{white-space:nowrap}';
    document.head.appendChild(s);
  }

  async function getUser(){
    const sb=SB(); if(!sb) throw new Error('Supabase belum siap.');
    const {data,error}=await sb.auth.getUser(); if(error)throw error;
    if(!data.user)throw new Error('Sesi login tidak aktif.'); return data.user;
  }

  function installForm(){
    const form=document.getElementById('debtForm'); if(!form||form.dataset.unitInstalled)return false;
    const note=document.getElementById('debtNote')?.closest('.debt-field');
    const grid=form.querySelector('.debt-form'); if(!grid)return false;
    const wrap=document.createElement('div');wrap.className='debt-unit-grid';
    wrap.innerHTML='<div class="debt-field"><label>Jumlah</label><input id="debtQuantity" type="number" min="0.001" step="0.001" value="1" required placeholder="Contoh: 10"></div><div class="debt-field"><label>Satuan</label><input id="debtUnit" list="debtUnitList" type="text" value="Paket" required placeholder="Kg / Rak / Papan / Butir / custom"></div>';
    if(note)grid.insertBefore(wrap,note);else grid.appendChild(wrap);
    if(!document.getElementById('debtUnitList')){
      const dl=document.createElement('datalist');dl.id='debtUnitList';['Butir','Kg','Rak','Papan','Ikat','Peti','Tray','Paket'].forEach(x=>{const o=document.createElement('option');o.value=x;dl.appendChild(o)});document.body.appendChild(dl);
    }
    form.addEventListener('submit',saveWithUnit,true);
    form.dataset.unitInstalled='1';
    return true;
  }

  async function saveWithUnit(ev){
    ev.preventDefault();ev.stopImmediatePropagation();
    if(syncing)return; syncing=true;
    try{
      const u=await getUser();
      const kind=document.getElementById('debtKind')?.value;
      const party=document.getElementById('debtParty')?.value.trim();
      const total=Number(document.getElementById('debtTotal')?.value);
      const paid=Number(document.getElementById('debtPaid')?.value||0);
      const quantity=Number(document.getElementById('debtQuantity')?.value||0);
      const unit=(document.getElementById('debtUnit')?.value||'').trim()||'Paket';
      if(!party||!Number.isFinite(total)||total<=0||!Number.isFinite(paid)||paid<0||paid>total||!Number.isFinite(quantity)||quantity<=0){alert('Periksa nama, jumlah, total, dan pembayaran.');return;}
      const payload={user_id:u.id,kind,party_type:kind==='piutang'?'pelanggan':'supplier',party_name:party,phone:document.getElementById('debtPhone')?.value.trim()||'',reference_no:document.getElementById('debtRef')?.value.trim()||'',debt_date:document.getElementById('debtDate')?.value||today(),due_date:document.getElementById('debtDue')?.value||null,total_amount:total,paid_amount:paid,quantity,unit,note:document.getElementById('debtNote')?.value.trim()||''};
      const {error}=await SB().from('debts_receivables').insert(payload);if(error)throw error;
      const f=document.getElementById('debtForm');if(f)f.reset();const d=document.getElementById('debtDate');if(d)d.value=today();const q=document.getElementById('debtQuantity');if(q)q.value='1';const un=document.getElementById('debtUnit');if(un)un.value='Paket';
      document.getElementById('debtNavBtn')?.click();
      alert('Utang/piutang berhasil disimpan.');
    }catch(e){alert('Gagal menyimpan: '+(e.message||e));}
    finally{syncing=false;}
  }

  async function decorateTable(){
    const table=document.querySelector('#debtTable table');if(!table)return;
    const thead=table.querySelector('thead tr');if(!thead||thead.querySelector('[data-unit-head]'))return;
    const th=document.createElement('th');th.dataset.unitHead='1';th.textContent='Jumlah / Satuan';thead.insertBefore(th,thead.children[3]||null);
    try{
      const u=await getUser();
      const {data,error}=await SB().from('debts_receivables').select('party_name,debt_date,reference_no,quantity,unit').eq('user_id',u.id);
      if(error)throw error;
      const all=data||[];
      table.querySelectorAll('tbody tr').forEach(tr=>{
        const cells=tr.children;if(cells.length<9)return;
        const name=cells[0]?.querySelector('strong')?.textContent?.trim()||'';
        const date=cells[1]?.textContent?.trim()||'';
        const ref=cells[2]?.textContent?.trim()||'';
        const r=all.find(x=>String(x.party_name||'')===name&&String(x.debt_date||'')===date&&String(x.reference_no||'-')===ref);
        const td=document.createElement('td');td.className='debt-qty-cell';td.innerHTML=r?'<span class="debt-unit-badge">'+esc(r.quantity||1)+' '+esc(r.unit||'Paket')+'</span>':'-';tr.insertBefore(td,cells[3]||null);
      });
    }catch(e){console.warn('Gagal memuat satuan utang/piutang:',e);}
  }

  function watch(){
    const page=document.getElementById('page-debt');if(!page)return;
    installForm();
    const table=document.getElementById('debtTable');if(table&&!table.dataset.unitObserver){
      const mo=new MutationObserver(()=>{if(!table.dataset.unitDecorating){table.dataset.unitDecorating='1';setTimeout(()=>{decorateTable().finally(()=>delete table.dataset.unitDecorating)},30)}});mo.observe(table,{childList:true,subtree:true});table.dataset.unitObserver='1';
    }
    setTimeout(decorateTable,80);
  }

  function boot(){
    css();
    const timer=setInterval(()=>{if(document.getElementById('page-debt'))watch();},250);
    setTimeout(()=>clearInterval(timer),30000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
