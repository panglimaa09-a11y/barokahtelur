(function(){
  'use strict';

  const SB=()=>window.barokahSupabase;
  const today=()=>new Date().toISOString().slice(0,10);
  let saving=false;

  // Accept both raw numbers (50000) and the UI format (50.000 / Rp 50.000).
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
      const kind=document.getElementById('debtKind')?.value||'piutang';
      const party=document.getElementById('debtParty')?.value.trim()||'';
      const total=numberValue(document.getElementById('debtTotal')?.value);
      const paid=numberValue(document.getElementById('debtPaid')?.value);
      const quantity=Number(document.getElementById('debtQty')?.value||1);
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
        due_date:document.getElementById('debtDue')?.value||null,
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
      const date=document.getElementById('debtDate');
      if(date)date.value=today();
      const paidEl=document.getElementById('debtPaid');
      if(paidEl)paidEl.value='0';
      const qty=document.getElementById('debtQty');
      if(qty)qty.value='1';
      const unitEl=document.getElementById('debtUnit');
      if(unitEl)unitEl.value='Paket';

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

  function boot(){
    install();
    const timer=setInterval(()=>{
      if(document.getElementById('debtForm'))install();
    },250);
    setTimeout(()=>clearInterval(timer),30000);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
