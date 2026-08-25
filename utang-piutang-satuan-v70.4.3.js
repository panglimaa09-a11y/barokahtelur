(function(){
  'use strict';
  const SB=()=>window.barokahSupabase;
  const today=()=>new Date().toISOString().slice(0,10);
  const esc=v=>String(v==null?'':v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  let debtPatched=false;

  async function user(){
    const sb=SB();
    if(!sb)throw new Error('Supabase belum siap.');
    const {data,error}=await sb.auth.getUser();
    if(error)throw error;
    if(!data.user)throw new Error('Sesi login tidak aktif.');
    return data.user;
  }

  function removeDueDateUI(){
    const form=document.getElementById('debtForm');
    if(form){
      const due=document.getElementById('debtDue');
      if(due){
        const field=due.closest('.debt-field');
        if(field)field.remove();
      }
    }
    const table=document.getElementById('debtTable');
    if(table){
      const t=table.querySelector('table');
      if(t){
        const head=t.querySelector('thead tr');
        if(head){
          [...head.children].forEach((th,i)=>{if((th.textContent||'').trim().toLowerCase()==='jatuh tempo')th.remove();});
        }
        t.querySelectorAll('tbody tr').forEach(tr=>{
          const cells=[...tr.children];
          if(cells.length>=8){
            const idx=cells.findIndex(td=>td.dataset.removedDue==='1');
            if(idx>=0)return;
            if(cells.length===9)cells[6]?.remove();
          }
        });
      }
    }
  }

  async function saveDebt(ev){
    ev.preventDefault();
    ev.stopImmediatePropagation();
    try{
      const u=await user();
      const kind=document.getElementById('debtKind')?.value||'piutang';
      const party=document.getElementById('debtParty')?.value.trim();
      const total=Number(document.getElementById('debtTotal')?.value||0);
      const paid=Number(document.getElementById('debtPaid')?.value||0);
      const quantity=Number(document.getElementById('debtQuantity')?.value||1);
      const unit=(document.getElementById('debtUnit')?.value||'Paket').trim()||'Paket';
      if(!party||!Number.isFinite(total)||total<=0||!Number.isFinite(paid)||paid<0||paid>total||!Number.isFinite(quantity)||quantity<=0){
        alert('Periksa nama, jumlah, total, dan pembayaran.');
        return;
      }
      const payload={
        user_id:u.id,
        kind,
        party_type:kind==='piutang'?'pelanggan':'supplier',
        party_name:party,
        phone:document.getElementById('debtPhone')?.value.trim()||'',
        reference_no:document.getElementById('debtRef')?.value.trim()||'',
        debt_date:document.getElementById('debtDate')?.value||today(),
        total_amount:total,
        paid_amount:paid,
        quantity,
        unit,
        note:document.getElementById('debtNote')?.value.trim()||''
      };
      const {error}=await SB().from('debts_receivables').insert(payload);
      if(error)throw error;
      const form=document.getElementById('debtForm');
      if(form)form.reset();
      const date=document.getElementById('debtDate');if(date)date.value=today();
      const q=document.getElementById('debtQuantity');if(q)q.value='1';
      const un=document.getElementById('debtUnit');if(un)un.value='Paket';
      removeDueDateUI();
      document.getElementById('debtNavBtn')?.click();
      setTimeout(removeDueDateUI,200);
      alert('Utang/piutang berhasil disimpan.');
    }catch(e){alert('Gagal menyimpan: '+(e.message||e));}
  }

  function patchDebtForm(){
    const form=document.getElementById('debtForm');
    if(!form)return false;
    if(form.dataset.finalFix==='1'){
      removeDueDateUI();
      return true;
    }
    const clone=form.cloneNode(true);
    clone.dataset.finalFix='1';
    form.replaceWith(clone);
    clone.addEventListener('submit',saveDebt);
    removeDueDateUI();
    debtPatched=true;
    return true;
  }

  function cleanDebtEditModal(){
    const due=document.getElementById('b44Due');
    if(due){
      due.value='';
      const field=due.closest('.b44-field');
      if(field)field.style.display='none';
    }
    const help=document.querySelector('.b44-help');
    if(help && /Jatuh Tempo|jatuh tempo/i.test(help.textContent||'')){
      help.textContent='Edit ini mengubah data utama catatan. Riwayat pembayaran tetap tersimpan.';
    }
  }

  function patchStockEditModal(){
    const modal=document.getElementById('stockIntegratedModal53');
    if(!modal)return;
    const unit=document.getElementById('stock53Unit');
    if(unit && unit.dataset.finalFix!=='1'){
      unit.dataset.finalFix='1';
      unit.placeholder='Kg / Papan / Ikat';
      unit.addEventListener('input',function(){
        if(/^butir$/i.test(unit.value.trim())){
          unit.value='';
          const err=document.getElementById('stock53Error');
          if(err)err.textContent='Satuan Butir tidak digunakan. Gunakan Kg, Papan, atau Ikat.';
        }
      });
    }
  }

  function boot(){
    patchDebtForm();
    removeDueDateUI();
    cleanDebtEditModal();
    patchStockEditModal();
  }

  const observer=new MutationObserver(function(){
    if(!debtPatched)patchDebtForm();
    removeDueDateUI();
    cleanDebtEditModal();
    patchStockEditModal();
  });

  function start(){
    boot();
    observer.observe(document.body,{childList:true,subtree:true});
    setInterval(boot,1500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.addEventListener('barokah:supabase-ready',()=>setTimeout(boot,300));
})();
