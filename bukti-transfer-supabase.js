(function(){
  'use strict';

  const BUCKET='bukti-transfer';
  const TABLE='transaction_proofs';
  const MAX=3;
  const MAX_SIZE=8*1024*1024;
  const TYPES=['image/jpeg','image/png','image/webp'];

  function sb(){
    const client=window.barokahSupabase;
    if(!client) throw new Error('Koneksi Supabase belum siap.');
    return client;
  }

  async function user(){
    const r=await sb().auth.getUser();
    if(r.error) throw r.error;
    if(!r.data||!r.data.user) throw new Error('Sesi login tidak aktif. Silakan login ulang.');
    return r.data.user;
  }

  function ext(file){
    if(file.type==='image/jpeg') return 'jpg';
    if(file.type==='image/png') return 'png';
    return 'webp';
  }

  function id(){
    if(window.crypto&&typeof window.crypto.randomUUID==='function') return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){const r=Math.random()*16|0,v=c==='x'?r:(r&3)|8;return v.toString(16);});
  }

  function safeName(name){
    return String(name||'bukti').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,120)||'bukti';
  }

  function toastSafe(message){
    if(typeof window.toast==='function') window.toast(message);
    else console.log(message);
  }

  async function listProofs(txId){
    const u=await user();
    const {data,error}=await sb().from(TABLE).select('*').eq('user_id',u.id).eq('transaction_id',txId).order('created_at',{ascending:true});
    if(error) throw error;
    const rows=data||[];
    const result=[];
    for(const row of rows){
      const signed=await sb().storage.from(BUCKET).createSignedUrl(row.storage_path,600);
      if(signed.error){console.warn('Signed URL gagal:',signed.error);continue;}
      result.push(Object.assign({},row,{url:signed.data&&signed.data.signedUrl}));
    }
    return result;
  }

  async function countByTransaction(){
    const u=await user();
    const {data,error}=await sb().from(TABLE).select('transaction_id').eq('user_id',u.id);
    if(error) throw error;
    const counts={};
    (data||[]).forEach(function(row){counts[String(row.transaction_id)]=(counts[String(row.transaction_id)]||0)+1;});
    return counts;
  }

  async function uploadProof(txId,file){
    if(!txId) throw new Error('ID transaksi tidak ditemukan.');
    if(!TYPES.includes(file.type)) throw new Error('Format harus JPG, PNG, atau WebP.');
    if(file.size>MAX_SIZE) throw new Error('Ukuran setiap file maksimal 8 MB.');
    const u=await user();
    const existing=await listProofs(txId);
    if(existing.length>=MAX) throw new Error('Maksimal 3 bukti transfer per transaksi.');

    const objectPath=u.id+'/'+txId+'/'+id()+'.'+ext(file);
    const upload=await sb().storage.from(BUCKET).upload(objectPath,file,{contentType:file.type,upsert:false});
    if(upload.error) throw upload.error;

    const row={
      user_id:u.id,
      transaction_id:txId,
      storage_path:objectPath,
      file_name:safeName(file.name),
      mime_type:file.type,
      file_size:file.size
    };
    const insert=await sb().from(TABLE).insert(row).select('*').single();
    if(insert.error){
      try{await sb().storage.from(BUCKET).remove([objectPath]);}catch(clean){console.warn('Cleanup upload gagal:',clean);}
      throw insert.error;
    }
    return insert.data;
  }

  async function deleteProof(proof){
    if(!proof||!proof.id||!proof.storage_path) throw new Error('Bukti transfer tidak valid.');
    const u=await user();
    if(proof.user_id!==u.id) throw new Error('Bukti transfer bukan milik akun ini.');
    const remove=await sb().storage.from(BUCKET).remove([proof.storage_path]);
    if(remove.error) throw remove.error;
    const del=await sb().from(TABLE).delete().eq('id',proof.id).eq('user_id',u.id);
    if(del.error) throw del.error;
  }

  function modal(txId){
    let root=document.getElementById('barokahProofModal');
    if(root) root.remove();
    root=document.createElement('div');
    root.id='barokahProofModal';
    root.innerHTML='<div class="btf-backdrop"></div><div class="btf-dialog" role="dialog" aria-modal="true" aria-labelledby="btfTitle"><div class="btf-head"><div><h3 id="btfTitle">📎 Bukti Transfer</h3><small>Transaksi #'+String(txId).slice(0,8)+'</small></div><button type="button" class="btf-close" aria-label="Tutup">×</button></div><div class="btf-body"><div class="btf-grid" id="btfGrid"><div class="btf-loading">Memuat bukti...</div></div><label class="btf-upload"><input id="btfInput" type="file" accept="image/jpeg,image/png,image/webp" multiple><span>＋ Tambah Bukti</span><small>Maks. 3 file · JPG/PNG/WebP · 8 MB/file</small></label></div><div class="btf-foot">Bukti disimpan permanen di Supabase Storage dan metadata transaksi di database Supabase.</div></div>';
    document.body.appendChild(root);

    function close(){root.remove();}
    root.querySelector('.btf-close').onclick=close;
    root.querySelector('.btf-backdrop').onclick=close;
    const input=root.querySelector('#btfInput');
    const grid=root.querySelector('#btfGrid');

    async function render(){
      grid.innerHTML='<div class="btf-loading">Memuat bukti...</div>';
      try{
        const proofs=await listProofs(txId);
        if(!proofs.length){grid.innerHTML='<div class="btf-empty">Belum ada bukti transfer.</div>';return;}
        grid.innerHTML='';
        proofs.forEach(function(p){
          const card=document.createElement('div');card.className='btf-item';
          const img=document.createElement('img');img.src=p.url;img.alt=p.file_name||'Bukti transfer';img.loading='lazy';
          img.onclick=function(){window.open(p.url,'_blank','noopener');};
          const meta=document.createElement('div');meta.className='btf-meta';
          const name=document.createElement('span');name.textContent=p.file_name||'Bukti transfer';
          const del=document.createElement('button');del.type='button';del.textContent='Hapus';del.onclick=async function(){if(!confirm('Hapus bukti transfer ini?'))return;del.disabled=true;try{await deleteProof(p);toastSafe('Bukti transfer dihapus.');await render();refreshButtons();}catch(e){alert('Gagal menghapus: '+(e.message||e));del.disabled=false;}};
          meta.append(name,del);card.append(img,meta);grid.appendChild(card);
        });
      }catch(e){grid.innerHTML='<div class="btf-error">Gagal memuat bukti: '+String(e.message||e)+'</div>';console.error(e);}
    }

    input.onchange=async function(){
      const files=Array.from(input.files||[]);if(!files.length)return;
      try{
        const current=await listProofs(txId);if(current.length+files.length>MAX)throw new Error('Maksimal 3 bukti transfer per transaksi.');
        for(const file of files){await uploadProof(txId,file);}
        toastSafe('Bukti transfer tersimpan di Supabase.');
        input.value='';await render();refreshButtons();
      }catch(e){alert('Gagal menyimpan bukti: '+String(e.message||e));input.value='';}
    };
    render();
  }

  function refreshButtons(){
    const body=document.getElementById('historyBody');if(!body)return;
    countByTransaction().then(function(counts){
      body.querySelectorAll('tr').forEach(function(row){
        const idEl=row.querySelector('[data-id]');if(!idEl)return;
        const txId=idEl.getAttribute('data-id');if(!txId)return;
        let btn=row.querySelector('.tx-proof');
        if(!btn){
          btn=document.createElement('button');btn.type='button';btn.className='btn ghost tx-proof';btn.title='Bukti transfer';btn.textContent='📎 Bukti';
          const del=row.querySelector('.tx-delete');
          if(del&&del.parentElement) del.parentElement.insertBefore(btn,del);else row.lastElementChild&&row.lastElementChild.appendChild(btn);
          btn.onclick=function(){modal(txId);};
        }
        const n=counts[String(txId)]||0;btn.textContent='📎 Bukti'+(n?' ('+n+')':'');btn.disabled=n>=MAX;btn.title=n>=MAX?'Maksimal 3 bukti tersimpan':'Kelola bukti transfer';
      });
    }).catch(function(e){console.warn('Jumlah bukti belum dapat dimuat:',e);});
  }

  function injectStyles(){
    if(document.getElementById('barokahProofStyles'))return;
    const style=document.createElement('style');style.id='barokahProofStyles';style.textContent='.tx-proof{min-height:34px!important;padding:0 10px!important;font-size:11px!important;margin-right:6px}.btf-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:100}.btf-dialog{position:fixed;z-index:101;left:50%;top:50%;transform:translate(-50%,-50%);width:min(760px,calc(100vw - 28px));max-height:88vh;overflow:auto;background:#fff;border-radius:20px;box-shadow:0 25px 70px rgba(0,0,0,.25)}.btf-head{display:flex;justify-content:space-between;align-items:center;padding:18px 20px;border-bottom:1px solid #e1e7e2}.btf-head h3{margin:0 0 3px}.btf-head small,.btf-foot,.btf-upload small{color:#6d776f;font-size:11px}.btf-close{border:0;background:#f2f5f2;border-radius:10px;width:38px;height:38px;font-size:24px}.btf-body{padding:18px 20px}.btf-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.btf-item{border:1px solid #e1e7e2;border-radius:14px;overflow:hidden;background:#fafcfb}.btf-item img{width:100%;height:190px;object-fit:cover;display:block;cursor:zoom-in;background:#eef2ee}.btf-meta{padding:9px;display:flex;gap:8px;align-items:center;justify-content:space-between}.btf-meta span{font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.btf-meta button{border:1px solid #f2cdc9;background:#fff0ee;color:#bd4037;border-radius:8px;padding:6px 8px;font-size:11px;font-weight:800}.btf-upload{margin-top:14px;border:1px dashed #b9c9bd;border-radius:13px;min-height:72px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;cursor:pointer;background:#f8fbf8}.btf-upload input{display:none}.btf-upload span{font-weight:850;color:#136b48}.btf-loading,.btf-empty,.btf-error{text-align:center;padding:30px;color:#6d776f;grid-column:1/-1}.btf-error{color:#bd4037}@media(max-width:600px){.btf-grid{grid-template-columns:1fr 1fr}.btf-item img{height:150px}}';document.head.appendChild(style);
  }

  function install(){
    injectStyles();
    const body=document.getElementById('historyBody');
    if(body&&!body.dataset.btfObserver){
      body.dataset.btfObserver='1';
      const observer=new MutationObserver(function(){refreshButtons();});
      observer.observe(body,{childList:true,subtree:true});
    }
    refreshButtons();
  }

  window.barokahBuktiTransfer={uploadProof,deleteProof,listProofs,refreshButtons};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(install,900);});else setTimeout(install,900);
})();
