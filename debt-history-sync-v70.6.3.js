(function(){
  'use strict';
  const SB=()=>window.barokahSupabase||null;
  const esc=v=>String(v==null?'':v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  const money=v=>'Rp '+Number(v||0).toLocaleString('id-ID');
  const date=v=>{if(!v)return '-';const p=String(v).split('-');return p.length===3?p[2]+'-'+p[1]+'-'+p[0]:String(v)};
  let rows=[]; let kind='piutang'; let bound=false; let rendering=false;

  async function user(){const sb=SB();if(!sb)return null;const r=await sb.auth.getUser();return r.data&&r.data.user?r.data.user:null;}
  async function load(){
    const sb=SB();const u=await user();if(!sb||!u)return [];
    const q=await sb.from('debts_receivables').select('id,kind,party_type,party_name,phone,reference_no,debt_date,total_amount,paid_amount,quantity,unit,note').eq('user_id',u.id).order('debt_date',{ascending:false}).order('created_at',{ascending:false});
    if(q.error)throw q.error;return q.data||[];
  }
  function activeKind(){
    const p=document.querySelector('#page-debt');if(!p)return kind;
    const active=[...p.querySelectorAll('button')].find(b=>b.classList.contains('active') && /Piutang Pelanggan|Utang Supplier/i.test(b.textContent||''));
    if(active) return /Utang Supplier/i.test(active.textContent)?'utang':'piutang';
    return kind;
  }
  function css(){
    if(document.getElementById('debtHistory63Css'))return;
    const s=document.createElement('style');s.id='debtHistory63Css';s.textContent=`
      .b63-history{padding:0 18px 18px}.b63-tools{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}.b63-tools input{height:40px;flex:1;min-width:180px;border:1px solid #d6ded8;border-radius:10px;padding:0 12px}.b63-table-wrap{overflow:auto;border:1px solid #e5ebe6;border-radius:14px}.b63-table{width:100%;min-width:720px;border-collapse:collapse}.b63-table th,.b63-table td{padding:12px;border-bottom:1px solid #edf0ed;text-align:left;font-size:12px}.b63-table th{font-size:10px;color:#6d776f;text-transform:uppercase}.b63-table tr:last-child td{border-bottom:0}.b63-amount{font-weight:850;color:#0a7748}.b63-balance{font-weight:850}.b63-actions{white-space:nowrap}.b63-actions button{margin-right:5px}.b63-empty{padding:28px;text-align:center;color:#6d776f;border:1px dashed #d6ded8;border-radius:14px}.b63-badge{display:inline-block;padding:4px 8px;border-radius:999px;background:#edf8f1;color:#0d5b45;font-size:10px;font-weight:800}
      @media(max-width:600px){.b63-history{padding:0 10px 14px}.b63-table{min-width:680px}}
    `;document.head.appendChild(s);
  }
  function render(){
    if(rendering)return;const box=document.getElementById('debtTable');if(!box)return;rendering=true;
    kind=activeKind();
    const filtered=rows.filter(r=>r.kind===kind);
    const existing=box.querySelector('.b63-history');if(existing)existing.remove();
    const wrap=document.createElement('div');wrap.className='b63-history';
    wrap.innerHTML='<div class="b63-tools"><input id="b63Search" type="search" placeholder="Cari nama / referensi..."><span class="b63-badge">'+(kind==='piutang'?'Piutang Pelanggan':'Utang Supplier')+'</span></div><div id="b63List"></div>';
    box.appendChild(wrap);
    const list=wrap.querySelector('#b63List');
    function paint(query){
      const q=String(query||'').trim().toLowerCase();
      const data=filtered.filter(r=>!q||[r.party_name,r.reference_no,r.phone,r.note].some(v=>String(v||'').toLowerCase().includes(q)));
      if(!data.length){list.innerHTML='<div class="b63-empty">'+(filtered.length?'Data tidak ditemukan.':'Belum ada '+(kind==='piutang'?'piutang pelanggan':'utang supplier')+'.')+'</div>';return;}
      let h='<div class="b63-table-wrap"><table class="b63-table"><thead><tr><th>Nama</th><th>Tanggal</th><th>Jumlah</th><th>Total</th><th>Dibayar</th><th>Sisa</th><th>Keterangan</th><th>Aksi</th></tr></thead><tbody>';
      data.forEach(r=>{const total=Number(r.total_amount||0),paid=Math.min(total,Math.max(0,Number(r.paid_amount||0))),bal=Math.max(0,total-paid);h+='<tr><td><strong>'+esc(r.party_name)+'</strong><span class="sub">'+esc(r.phone||'')+'</span></td><td>'+esc(date(r.debt_date))+'</td><td>'+esc(r.quantity||1)+' '+esc(r.unit||'Paket')+'</td><td class="b63-amount">'+money(total)+'</td><td>'+money(paid)+'</td><td class="b63-balance">'+money(bal)+'</td><td>'+esc(r.note||r.reference_no||'-')+'</td><td class="b63-actions"><button type="button" class="b44-edit" data-b44-debt-edit="'+esc(r.id)+'">✏️ Edit</button><button type="button" class="btn danger" data-del="'+esc(r.id)+'">Hapus</button></td></tr>';});
      h+='</tbody></table></div>';list.innerHTML=h;
    }
    const input=wrap.querySelector('#b63Search');input.addEventListener('input',()=>paint(input.value));paint('');rendering=false;
  }
  async function sync(){try{rows=await load();render();}catch(e){console.warn('[Barokah] debt history sync v70.6.3',e)}}
  function bind(){
    if(bound)return;bound=true;
    const p=document.getElementById('page-debt');if(!p){bound=false;return;}
    p.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const t=b.textContent||'';if(/Piutang Pelanggan|Utang Supplier/i.test(t)){kind=/Utang Supplier/i.test(t)?'utang':'piutang';setTimeout(render,120)}});
    document.addEventListener('barokah:debt-changed',()=>setTimeout(sync,80));
    window.addEventListener('focus',()=>setTimeout(sync,100));
    setInterval(()=>{if(document.getElementById('page-debt')?.classList.contains('active'))sync()},5000);
  }
  function boot(){css();bind();sync();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
