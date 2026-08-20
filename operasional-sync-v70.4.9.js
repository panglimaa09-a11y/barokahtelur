(function(){'use strict';
const SB=()=>window.barokahSupabase;
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const fmt=n=>Number(n||0).toLocaleString('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0});
let timer=null,running=false,started=false;
async function getSessionUser(){
  const sb=SB(); if(!sb)return null;
  const s=await sb.auth.getSession();
  if(s.error)throw s.error;
  if(s.data&&s.data.session&&s.data.session.user)return s.data.session.user;
  const u=await sb.auth.getUser();
  if(u.error)throw u.error;
  return u.data&&u.data.user?u.data.user:null;
}
function setStatus(text){const box=document.getElementById('opTable');if(box&&!box.querySelector('table'))box.innerHTML='<div class="op-empty">'+esc(text)+'</div>';}
async function sync(){
  if(running)return;
  const page=document.getElementById('page-operational'),box=document.getElementById('opTable');
  if(!page||!page.classList.contains('active')||!box)return;
  const sb=SB(); if(!sb){setStatus('Menunggu koneksi database...');return;}
  running=true;
  try{
    const u=await getSessionUser();
    if(!u){setStatus('Menunggu sesi login...');return;}
    const result=await sb.from('operational_transactions').select('*').eq('user_id',u.id).order('transaction_date',{ascending:false}).order('created_at',{ascending:false});
    if(result.error)throw result.error;
    const rows=result.data||[];
    const ins=rows.filter(x=>x.kind==='pemasukan').reduce((s,x)=>s+Number(x.amount||0),0);
    const outs=rows.filter(x=>x.kind==='pengeluaran').reduce((s,x)=>s+Number(x.amount||0),0);
    const a=document.getElementById('opTotalIn'),b=document.getElementById('opTotalOut'),c=document.getElementById('opNet'),d=document.getElementById('opCount');
    if(a)a.textContent=fmt(ins);if(b)b.textContent=fmt(outs);if(c)c.textContent=fmt(ins-outs);if(d)d.textContent=rows.length;
    const filter=document.getElementById('opFilter')?.value||'semua',q=(document.getElementById('opSearch')?.value||'').toLowerCase().trim();
    let list=filter==='semua'?rows:rows.filter(x=>x.kind===filter);
    if(q)list=list.filter(x=>(String(x.description||'')+' '+String(x.reference_no||'')+' '+String(x.category||'')+' '+String(x.note||'')).toLowerCase().includes(q));
    if(!list.length){box.innerHTML='<div class="op-empty">Belum ada transaksi operasional.</div>';}
    else{box.innerHTML='<table><thead><tr><th>No. Transaksi</th><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Keterangan</th><th>Nominal</th><th>Aksi</th></tr></thead><tbody>'+list.map(r=>'<tr><td class="op-ref">'+esc(r.reference_no||'-')+'</td><td>'+esc(r.transaction_date||'-')+'</td><td><span class="'+(r.kind==='pemasukan'?'op-in':'op-out')+'">'+(r.kind==='pemasukan'?'Pemasukan':'Pengeluaran')+'</span></td><td>'+esc(r.category||'-')+'</td><td><strong>'+esc(r.description||'-')+'</strong><span class="sub">'+esc(r.note||'')+'</span></td><td class="'+(r.kind==='pemasukan'?'op-in':'op-out')+'">'+fmt(r.amount)+'</td><td class="op-actions-cell"><button class="op-del" data-op-del="'+esc(r.id)+'">Hapus</button><button class="op-nota" data-op-nota="'+esc(r.id)+'">🧾 Nota</button></td></tr>').join('')+'</tbody></table>';}
    window.dispatchEvent(new CustomEvent('barokah:operational-synced',{detail:{rows,userId:u.id}}));
  }catch(e){console.error('Operasional sync gagal:',e);setStatus('Gagal memuat riwayat operasional: '+(e.message||e));}
  finally{running=false;}
}
function start(){
  if(started)return;started=true;if(timer)clearInterval(timer);sync();timer=setInterval(sync,5000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
  window.addEventListener('barokah:operational-open',sync);
  window.addEventListener('barokah:supabase-ready',sync);
  if(SB()&&SB().auth)SB().auth.onAuthStateChange((event)=>{if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED'||event==='USER_UPDATED'||event==='SIGNED_OUT')setTimeout(sync,100);});
}
window.BarokahOperationalSync={sync,start};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();