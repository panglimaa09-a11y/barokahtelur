(function(){
  'use strict';

  const SB=()=>window.barokahSupabase;
  const today=()=>new Date().toISOString().slice(0,10);

  function parseMoney(value){
    const raw=String(value==null?'':value).trim();
    if(!raw) return 0;
    // Indonesian grouping: 500.000 / 1.500.000
    if(/^\d{1,3}(\.\d{3})+$/.test(raw)) return Number(raw.replace(/\./g,''));
    if(/^\d{1,3}(,\d{3})+$/.test(raw)) return Number(raw.replace(/,/g,''));
    // Mixed formatting: 1.500.000,50
    if(raw.includes('.') && raw.includes(',')){
      return Number(raw.replace(/\./g,'').replace(',','.')) || 0;
    }
    // Plain integer / decimal.
    const n=Number(raw.replace(/,/g,'.'));
    return Number.isFinite(n) ? n : 0;
  }

  function getText(ids){
    for(const id of ids){
      const el=document.getElementById(id);
      if(el && String(el.value||'').trim()) return String(el.value).trim();
    }
    return '';
  }

  function error(msg){
    console.error('[Barokah Telur][Debt Save]',msg);
    alert(msg);
  }

  async function save(ev){
    ev.preventDefault();
    ev.stopImmediatePropagation();

    const sb=SB();
    if(!sb){ error('Koneksi Supabase belum siap.'); return; }

    const {data:auth,error:authError}=await sb.auth.getUser();
    if(authError) throw authError;
    const u=auth?.user;
    if(!u){ error('Sesi database sudah berakhir. Silakan login ulang.'); return; }

    const kind=document.getElementById('debtKind')?.value||'piutang';
    const party=getText(['debtParty','debtName']);
    const total=parseMoney(getText(['debtTotal']));
    const paid=parseMoney(getText(['debtPaid']))||0;
    const quantity=Number(getText(['debtQuantity','debtQty'])||1);
    const unit=getText(['debtUnit'])||'Paket';

    const problems=[];
    if(!party) problems.push('nama pelanggan/supplier');
    if(!Number.isFinite(total)||total<=0) problems.push('total');
    if(!Number.isFinite(paid)||paid<0||paid>total) problems.push('pembayaran');
    if(!Number.isFinite(quantity)||quantity<=0) problems.push('jumlah');

    if(problems.length){
      error('Periksa: '+problems.join(', ')+'.');
      return;
    }

    const payload={
      user_id:u.id,
      kind,
      party_type:kind==='piutang'?'pelanggan':'supplier',
      party_name:party,
      phone:getText(['debtPhone']),
      reference_no:getText(['debtRef']),
      debt_date:getText(['debtDate'])||today(),
      due_date:getText(['debtDue'])||null,
      total_amount:total,
      paid_amount:paid,
      quantity,
      unit,
      note:getText(['debtNote'])
    };

    const first=await sb.from('debts_receivables').insert(payload);
    if(first.error){
      const msg=String(first.error.message||first.error.details||'');
      if(/quantity|unit|schema cache|PGRST204/i.test(msg)){
        const base={...payload};
        delete base.quantity;
        delete base.unit;
        const retry=await sb.from('debts_receivables').insert(base);
        if(retry.error) throw retry.error;
      }else{
        throw first.error;
      }
    }

    const form=document.getElementById('debtForm');
    if(form) form.reset();
    const date=document.getElementById('debtDate');
    if(date) date.value=today();
    const q=document.getElementById('debtQuantity');
    if(q) q.value='1';
    const q2=document.getElementById('debtQty');
    if(q2) q2.value='1';
    const un=document.getElementById('debtUnit');
    if(un) un.value='Paket';

    document.dispatchEvent(new CustomEvent('barokah:debt-changed'));
    document.getElementById('debtNavBtn')?.click();

    // Force the visible list to refresh from Supabase after the insert.
    setTimeout(()=>{
      document.getElementById('debtNavBtn')?.click();
    },120);

    alert('Utang/piutang berhasil disimpan.');
  }

  function install(){
    const form=document.getElementById('debtForm');
    if(!form || form.dataset.productionDebtFix==='1') return false;

    // Remove competing submit listeners from older debt fixes.
    const clone=form.cloneNode(true);
    clone.dataset.productionDebtFix='1';
    form.replaceWith(clone);
    clone.addEventListener('submit',e=>{
      save(e).catch(err=>{
        console.error('[Barokah Telur][Debt Save]',err);
        error('Gagal menyimpan ke database: '+(err?.message||err?.details||err));
      });
    },false);
    return true;
  }

  function boot(){
    install();
  }

  const observer=new MutationObserver(install);
  function start(){
    boot();
    observer.observe(document.body,{childList:true,subtree:true});
    setInterval(boot,1000);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else{
    start();
  }
  window.addEventListener('barokah:supabase-ready',()=>setTimeout(install,300));
})();