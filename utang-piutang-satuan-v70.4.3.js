(function(){
  'use strict';

  const SB=()=>window.barokahSupabase;
  const today=()=>new Date().toISOString().slice(0,10);
  let saving=false;

  function el(...ids){
    for(const id of ids){const node=document.getElementById(id);if(node)return node;}
    return null;
  }

  // Accept raw numbers and Indonesian UI formats such as 50.000 / Rp 50.000.
  function numberValue(value){
    const raw=String(value==null?'':value).trim();
    if(!raw)return 0;
    const digits=raw.replace(/\D/g,'');
    return digits?Number(digits):0;
  }

  async function getUser(){
    const sb=SB();
    if(!sb)throw new Error('Supabase belum siap.');
    const {data,error}=await sb.auth.getUser();
    if(error)throw error;
    if(!data.user)throw new Error('Sesi login tidak aktif.');
    return data.user;
  }

  async function saveDebt(ev){
    ev.preventDefault();
    ev.stopImmediatePropagation();
    if(saving)return;
    saving=true;

    try{
      const u=await getUser();
      const kind=el('debtKind')?.value||'piutang';
      const party=(el('debtParty','debtName')?.value||'').trim();
      const total=numberValue(el('debtTotal')?.value);
      const paid=numberValue(el('debtPaid')?.value);
      const quantity=Number(el('debtQty','debtQuantity')?.value||1);
      const unit=(el('debtUnit')?.value||'Paket').trim()||'Paket';

      if(!party||total<=0||!Number.isFinite(total)||paid<0||paid>total||!Number.isFinite(paid)||!Number.isFinite(quantity)||quantity<=0){
        alert('Periksa nama, jumlah, total, dan pembayaran.');
        return;
      }

      const payload={
        user_id:u.id,
        kind,
        party_type:kind==='piutang'?'pelanggan':'supplier',
        party_name:party,
        phone:(el('debtPhone')?.value||'').trim(),
        reference_no:(el('debtRef')?.value||'').trim(),
        debt_date:el('debtDate')?.value||today(),
        due_date:el('debtDue')?.value||null,
        total_amount:total,
        paid_amount:paid,
        quantity,
        unit,
        note:(el('debtNote')?.value||'').trim()
      };

      const {error}=await SB().from('debts_receivables').insert(payload);
      if(error)throw error;

      const form=document.getElementById('debtForm');
      if(form)form.reset();
      const date=el('debtDate');if(date)date.value=today();
      const paidEl=el('debtPaid');if(paidEl)paidEl.value='0';
      const qty=el('debtQty','debtQuantity');if(qty)qty.value='1';
      const unitEl=el('debtUnit');if(unitEl)unitEl.value='Paket';

      document.dispatchEvent(new CustomEvent('barokah:debt-changed'));
      alert('Utang/piutang berhasil disimpan.');
    }catch(e){
      alert('Gagal menyimpan: '+(e.message||e));
    }finally{
      saving=false;
    }
  }

  function install(){
    const form=document.getElementById('debtForm');
    if(!form||form.dataset.unitSaveFix==='1')return;
    form.addEventListener('submit',saveDebt,true);
    form.dataset.unitSaveFix='1';
  }

  function boot(){install();}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  // Other legacy preview fixes may replace the dynamic debt form. Rebind only
  // to the replacement; never alter the production branch or other modules.
  const observer=new MutationObserver(()=>install());
  if(document.body)observer.observe(document.body,{childList:true,subtree:true});
})();