(function(){
  'use strict';
  const BUCKET='bukti-transfer',TABLE='transaction_proofs',MAX=3,MAX_SIZE=8*1024*1024,TYPES=['image/jpeg','image/png','image/webp'];
  function sb(){if(!window.barokahSupabase)throw new Error('Koneksi Supabase belum siap.');return window.barokahSupabase;}
  async function user(){const r=await sb().auth.getUser();if(r.error)throw r.error;if(!r.data||!r.data.user)throw new Error('Sesi login tidak aktif. Silakan login ulang.');return r.data.user;}
  function id(){return window.crypto&&crypto.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3)|8;return v.toString(16);});}
  function ext(f){return f.type==='image/jpeg'?'jpg':f.type==='image/png'?'png':'webp';}
  function safeName(n){return String(n||'bukti').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,120)||'bukti';}
  function toastSafe(m){if(typeof window.toast==='function')window.toast(m);else console.log(m);}

  async function listProofs(txId){
    const u=await user();
    const r=await sb().from(TABLE).select('*').eq('user_id',u.id).eq('transaction_id',txId).order('created_at',{ascending:true});
    if(r.error)throw r.error;
    const out=[];
    for(const row of (r.data||[])){const s=await sb().storage.from(BUCKET).createSignedUrl(row.storage_path,600);if(!s.error)out.push({...row,url:s.data&&s.data.signedUrl});}
    return out;
  }
  async function counts(){
    const u=await user(),r=await sb().from(TABLE).select('transaction_id').eq('user_id',u.id);if(r.error)throw r.error;
    const c={};(r.data||[]).forEach(x=>c[String(x.transaction_id)]=(c[String(x.transaction_id)]||0)+1);return c;
  }
  async function uploadProof(txId,file){
    if(!txId)throw new Error('ID transaksi tidak ditemukan.');
    if(!TYPES.includes(file.type))throw new Error('Format harus JPG, PNG, atau WebP.');
    if(file.size>MAX_SIZE)throw new Error('Ukuran setiap file maksimal 8 MB.');
    const u=await user(),existing=await listProofs(txId);if(existing.length>=MAX)throw new Error('Maksimal 3 bukti transfer per transaksi.');
    const path=u.id+'/'+txId+'/'+id()+'.'+ext(file);
    const up=await sb().storage.from(BUCKET).upload(path,file,{contentType:file.type,upsert:false});if(up.error)throw up.error;
    const ins=await sb().from(TABLE).insert({user_id:u.id,transaction_id:txId,storage_path:path,file_name:safeName(file.name),mime_type:file.type,file_size:file.size}).select('*').single();
    if(ins.error){try{await sb().storage.from(BUCKET).remove([path]);}catch(e){}throw ins.error;}return ins.data;
  }
  async function deleteProof(p){const u=await user();if(!p||p.user_id!==u.id)throw new Error('Bukti transfer tidak valid.');const r=await sb().storage.from(BUCKET).remove([p.storage_path]);if(r.error)throw r.error;const d=await sb().from(TABLE).delete().eq('id',p.id).eq('user_id',u.id);if(d.error)throw d.error;}

  function modal(txId){
    const old=document.getElementById('barokahProofModal');if(old)old.remove();
    const root=document.createElement('div');root.id='barokahProofModal';
    root.innerHTML='<div class="btf-backdrop"></div><div class="btf-dialog" role="dialog" aria-modal="true"><div class="btf-head"><div><h3>📎 Bukti Transfer</h3><small>Transaksi #'+String(txId).slice(0,8)+'</small></div><button class="btf-close" type="button">×</button></div><div class="btf-body"><div class="btf-grid" id="btfGrid"><div class="btf-loading">Memuat bukti...</div></div><label class="btf-upload"><input id="btfInput" type="file" accept="image/jpeg,image/png,image/webp" multiple><span>＋ Tambah Bukti</span><small>Maks. 3 file · JPG/PNG/WebP · 8 MB/file</small></label></div><div class="btf-foot">Bukti transfer disimpan di Supabase Storage dan metadata transaksi di database Supabase.</div></div>';
    document.body.appendChild(root);
    const close=()=>root.remove();root.querySelector('.btf-close').onclick=close;root.querySelector('.btf-backdrop').onclick=close;
    const grid=root.querySelector('#btfGrid'),input=root.querySelector('#btfInput');
    async function render(){
      grid.innerHTML='<div class="btf-loading">Memuat bukti...</div>';
      try{const ps=await listProofs(txId);if(!ps.length){grid.innerHTML='<div class="btf-empty">Belum ada bukti transfer.</div>';return;}grid.innerHTML='';ps.forEach(p=>{const card=document.createElement('div');card.className='btf-item';const img=document.createElement('img');img.src=p.url;img.alt=p.file_name||'Bukti transfer';img.onclick=()=>window.open(p.url,'_blank','noopener');const meta=document.createElement('div');meta.className='btf-meta';const name=document.createElement('span');name.textContent=p.file_name||'Bukti transfer';const del=document.createElement('button');del.type='button';del.textContent='Hapus';del.onclick=async()=>{if(!confirm('Hapus bukti transfer ini?'))return;try{del.disabled=true;await deleteProof(p);toastSafe('Bukti transfer dihapus.');await render();refreshButtons();}catch(e){alert('Gagal menghapus: '+(e.message||e));del.disabled=false;}};meta.append(name,del);card.append(img,meta);grid.append(card);});}catch(e){grid.innerHTML='<div class="btf-error">Gagal memuat bukti: '+String(e.message||e)+'</div>';console.error(e);}
    }
    input.onchange=async()=>{const files=Array.from(input.files||[]);if(!files.length)return;try{const current=await listProofs(txId);if(current.length+files.length>MAX)throw new Error('Maksimal 3 bukti transfer per transaksi.');for(const f of files)await uploadProof(txId,f);toastSafe('Bukti transfer tersimpan di Supabase.');input.value='';await render();refreshButtons();}catch(e){alert('Gagal menyimpan bukti: '+(e.message||e));input.value='';}};
    render();
  }

  function getTxId(row){
    if(row.dataset&&row.dataset.id)return row.dataset.id;
    const el=row.querySelector('[data-id]');if(el&&el.dataset.id)return el.dataset.id;
    const candidates=row.querySelectorAll('button,a,[data-id]');
    for(const el of candidates){const v=el.getAttribute('data-id');if(v)return v;}
    return null;
  }
  function refreshButtons(){
    const body=document.getElementById('historyBody');if(!body)return;
    counts().then(c=>{
      body.querySelectorAll('tr').forEach(row=>{
        const txId=getTxId(row);if(!txId)return;
        let btn=row.querySelector('.tx-proof');
        if(!btn){
          btn=document.createElement('button');btn.type='button';btn.className='btn ghost tx-proof';btn.title='Upload / lihat bukti transfer';btn.onclick=()=>modal(txId);
          const cells=row.querySelectorAll('td');const target=cells[cells.length-1]||row.lastElementChild;
          if(target)target.insertBefore(btn,target.firstChild);else row.appendChild(btn);
        }
        const n=c[String(txId)]||0;btn.textContent=n?'📎 Bukti TF ('+n+'/3)':'📎 Bukti TF';btn.classList.toggle('has-proof',n>0);btn.disabled=n>=MAX;btn.title=n>=MAX?'Maksimal 3 bukti tersimpan':'Upload / lihat bukti transfer';
      });
    }).catch(e=>console.warn('Jumlah bukti belum dapat dimuat:',e));
  }
  function styles(){if(document.getElementById('barokahProofStyles'))return;const s=document.createElement('style');s.id='barokahProofStyles';s.textContent='.tx-proof{min-height:34px!important;padding:0 10px!important;font-size:11px!important;margin-right:6px}.tx-proof.has-proof{background:#edf8f1!important;color:#0d5b45!important}.btf-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100}.btf-dialog{position:fixed;z-index:101;left:50%;top:50%;transform:translate(-50%,-50%);width:min(760px,calc(100vw - 28px));max-height:88vh;overflow:auto;background:#fff;border-radius:20px;box-shadow:0 25px 70px rgba(0,0,0,.25)}.btf-head{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid #e1e7e2}.btf-head h3{margin:0 0 3px}.btf-head small,.btf-foot,.btf-upload small{color:#6d776f;font-size:11px}.btf-close{border:0;background:#f2f5f2;border-radius:10px;width:38px;height:38px;font-size:24px}.btf-body{padding:18px 20px}.btf-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.btf-item{border:1px solid #e1e7e2;border-radius:14px;overflow:hidden;background:#fafcfb}.btf-item img{width:100%;height:190px;object-fit:cover;display:block;cursor:zoom-in;background:#eef2ee}.btf-meta{padding:9px;display:flex;gap:8px;align-items:center;justify-content:space-between}.btf-meta span{font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.btf-meta button{border:1px solid #f2cdc9;background:#fff0ee;color:#bd4037;border-radius:8px;padding:6px 8px;font-size:11px;font-weight:800}.btf-upload{margin-top:14px;border:1px dashed #b9c9bd;border-radius:13px;min-height:72px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;background:#f8fbf8}.btf-upload input{display:none}.btf-upload span{font-weight:850;color:#136b48}.btf-loading,.btf-empty,.btf-error{text-align:center;padding:30px;color:#6d776f;grid-column:1/-1}.btf-error{color:#bd4037}@media(max-width:600px){.btf-grid{grid-template-columns:1fr 1fr}.btf-item img{height:150px}}';document.head.appendChild(s);}
  function install(){styles();const body=document.getElementById('historyBody');if(body&&!body.dataset.btfObserver){body.dataset.btfObserver='1';new MutationObserver(()=>refreshButtons()).observe(body,{childList:true,subtree:true});}refreshButtons();}
  window.barokahBuktiTransfer={uploadProof,deleteProof,listProofs,refreshButtons};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,900));else setTimeout(install,900);
})();
