(function(){
  'use strict';

  const DB_NAME='barokah_telur_bukti_tf_v1';
  const STORE='proofs';
  const MAX=3;
  const MAX_SIZE=8*1024*1024;
  const ACCEPT=['image/jpeg','image/png','image/webp'];
  let dbPromise=null;

  function openDb(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains(STORE)){
          const store=db.createObjectStore(STORE,{keyPath:'id',autoIncrement:true});
          store.createIndex('tx_id','tx_id',{unique:false});
        }
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||new Error('Gagal membuka penyimpanan bukti TF.'));
    });
    return dbPromise;
  }

  async function listProofs(txId){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      const out=[];const req=db.transaction(STORE,'readonly').objectStore(STORE).index('tx_id').openCursor(IDBKeyRange.only(String(txId)));
      req.onsuccess=()=>{const c=req.result;if(c){out.push(c.value);c.continue();}else resolve(out.sort((a,b)=>a.created_at-b.created_at));};
      req.onerror=()=>reject(req.error);
    });
  }

  async function putProof(row){
    const db=await openDb();
    return new Promise((resolve,reject)=>{const req=db.transaction(STORE,'readwrite').objectStore(STORE).add(row);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  }

  async function deleteProof(id){
    const db=await openDb();
    return new Promise((resolve,reject)=>{const req=db.transaction(STORE,'readwrite').objectStore(STORE).delete(id);req.onsuccess=()=>resolve();req.onerror=()=>reject(req.error);});
  }

  function esc(v){return String(v==null?'':v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));}

  function injectStyles(){
    if(document.getElementById('buktiTfStyle'))return;
    const s=document.createElement('style');s.id='buktiTfStyle';s.textContent=`
      .tx-proof{background:#fff7d6!important;color:#725600!important;border:1px solid #ead27b!important}
      .tx-proof.has-proof{background:#edf8f1!important;color:#0d5b45!important;border-color:#b8dcc8!important}
      .bukti-tf-modal{position:fixed;inset:0;z-index:10000;background:rgba(8,24,16,.58);display:flex;align-items:center;justify-content:center;padding:18px}
      .bukti-tf-dialog{width:min(760px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:20px;box-shadow:0 25px 80px rgba(0,0,0,.25);padding:20px}
      .bukti-tf-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:14px}
      .bukti-tf-head h3{margin:0;font-size:20px}.bukti-tf-head p{margin:5px 0 0;color:#6d776f;font-size:12px}
      .bukti-tf-close{border:0;background:#f1f4f2;border-radius:10px;width:38px;height:38px;font-size:18px}
      .bukti-tf-upload{border:2px dashed #bfd2c6;border-radius:14px;padding:18px;text-align:center;background:#f8fbf9;margin-bottom:15px}
      .bukti-tf-upload input{display:block;margin:10px auto 0;max-width:100%}
      .bukti-tf-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
      .bukti-tf-card{border:1px solid #dfe7e2;border-radius:14px;overflow:hidden;background:#fff}
      .bukti-tf-card img{width:100%;height:170px;object-fit:cover;display:block;background:#f1f3f1;cursor:zoom-in}
      .bukti-tf-meta{padding:10px;font-size:11px;color:#6d776f}.bukti-tf-meta b{display:block;color:#162019;margin-bottom:5px}
      .bukti-tf-delete{width:100%;border:0;border-top:1px solid #eee;background:#fff0ee;color:#b42318;padding:9px;font-weight:800;cursor:pointer}
      .bukti-tf-empty{text-align:center;color:#6d776f;padding:25px;border:1px dashed #d7dfda;border-radius:12px}
      .bukti-tf-foot{margin-top:14px;color:#6d776f;font-size:11px}
      @media(max-width:650px){.bukti-tf-grid{grid-template-columns:1fr}.bukti-tf-card img{height:220px}}
    `;document.head.appendChild(s);
  }

  function closeModal(){document.querySelector('.bukti-tf-modal')?.remove();}

  async function refreshModal(txId,title){
    const modal=document.querySelector('.bukti-tf-modal');if(!modal)return;
    const grid=modal.querySelector('.bukti-tf-grid');
    const proofs=await listProofs(txId);
    const input=modal.querySelector('input[type=file]');
    if(input){input.disabled=proofs.length>=MAX;input.title=proofs.length>=MAX?'Maksimal 3 bukti transfer':'';}
    modal.querySelector('.bukti-tf-count').textContent=`${proofs.length}/${MAX} bukti tersimpan`;
    if(!proofs.length){grid.innerHTML='<div class="bukti-tf-empty" style="grid-column:1/-1">Belum ada bukti transfer.</div>';return;}
    grid.innerHTML=proofs.map((p,i)=>{
      const url=URL.createObjectURL(p.blob);
      return `<div class="bukti-tf-card"><img src="${url}" alt="Bukti transfer ${i+1}" data-proof-open="${p.id}"><div class="bukti-tf-meta"><b>Bukti ${i+1}</b>${esc(p.name)}<br>${(p.size/1024/1024).toFixed(2)} MB</div><button type="button" class="bukti-tf-delete" data-proof-delete="${p.id}">🗑️ Hapus Bukti</button></div>`;
    }).join('');
    grid.querySelectorAll('[data-proof-open]').forEach(img=>img.addEventListener('click',async()=>{
      const p=proofs.find(x=>String(x.id)===String(img.dataset.proofOpen));if(!p)return;
      const url=URL.createObjectURL(p.blob);const w=window.open('', '_blank');
      if(w){w.document.write(`<title>${esc(p.name)}</title><body style="margin:0;background:#111;display:grid;place-items:center;min-height:100vh"><img src="${url}" style="max-width:100%;max-height:100vh;object-fit:contain"></body>`);w.document.close();}
    }));
    grid.querySelectorAll('[data-proof-delete]').forEach(btn=>btn.addEventListener('click',async()=>{
      if(!confirm('Hapus bukti transfer ini?'))return;
      await deleteProof(Number(btn.dataset.proofDelete));
      await refreshModal(txId,title);refreshButtons();
    }));
  }

  async function openModal(txId){
    injectStyles();closeModal();
    const tx=(Array.isArray(window.state)?window.state:[]).find(x=>String(x.id)===String(txId));
    const title=tx?.note||'Transaksi';
    const modal=document.createElement('div');modal.className='bukti-tf-modal';modal.innerHTML=`
      <div class="bukti-tf-dialog" role="dialog" aria-modal="true">
        <div class="bukti-tf-head"><div><h3>📎 Bukti Transfer</h3><p>${esc(title)}</p><p class="bukti-tf-count">0/3 bukti tersimpan</p></div><button type="button" class="bukti-tf-close">✕</button></div>
        <div class="bukti-tf-upload"><b>Tambah bukti transfer</b><div style="font-size:11px;color:#6d776f;margin-top:4px">Maksimal 3 gambar, masing-masing 8 MB. JPG, PNG, atau WebP.</div><input type="file" accept="image/jpeg,image/png,image/webp" multiple></div>
        <div class="bukti-tf-grid"></div>
        <div class="bukti-tf-foot">Untuk pengujian localhost, file disimpan aman di IndexedDB browser dan tidak mengubah data transaksi.</div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.bukti-tf-close').onclick=closeModal;
    modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
    const input=modal.querySelector('input[type=file]');
    input.addEventListener('change',async()=>{
      try{
        let proofs=await listProofs(txId);let files=[...input.files];
        if(proofs.length+files.length>MAX){alert(`Maksimal ${MAX} bukti transfer. Slot tersisa ${MAX-proofs.length}.`);input.value='';return;}
        for(const file of files){
          if(!ACCEPT.includes(file.type)){alert('Format tidak didukung: '+file.name);continue;}
          if(file.size>MAX_SIZE){alert('Ukuran terlalu besar: '+file.name+' (maksimal 8 MB).');continue;}
          await putProof({tx_id:String(txId),name:file.name,type:file.type,size:file.size,created_at:Date.now(),blob:file});
        }
        input.value='';await refreshModal(txId,title);refreshButtons();
      }catch(err){console.error(err);alert('Gagal menyimpan bukti transfer: '+(err.message||err));}
    });
    await refreshModal(txId,title);
  }

  async function countProofs(txId){try{return (await listProofs(txId)).length}catch(e){return 0;}}

  async function refreshButtons(){
    document.querySelectorAll('#historyBody tr').forEach(async row=>{
      const edit=row.querySelector('[data-id]');if(!edit)return;
      const id=edit.dataset.id;if(!id)return;
      let btn=row.querySelector('.tx-proof');
      if(!btn){
        const del=row.querySelector('.tx-delete');if(!del)return;
        btn=document.createElement('button');btn.type='button';btn.className='btn tx-proof';btn.dataset.id=id;btn.title='Upload / lihat bukti transfer';
        del.parentNode.insertBefore(btn,del);
        btn.addEventListener('click',()=>openModal(btn.dataset.id));
      }
      const n=await countProofs(id);btn.textContent=n?`📎 Bukti TF (${n}/3)`:'📎 Bukti TF';btn.classList.toggle('has-proof',n>0);
    });
  }

  function hook(){
    injectStyles();
    if(typeof window.renderHistory==='function'&&!window.__buktiTfRenderHook){
      const original=window.renderHistory;
      window.renderHistory=function(){const r=original.apply(this,arguments);setTimeout(refreshButtons,0);return r;};
      window.__buktiTfRenderHook=true;
    }
    refreshButtons();
  }

  window.barokahBuktiTransfer={open:openModal,refresh:refreshButtons,list:listProofs};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(hook,100));else setTimeout(hook,100);
  document.addEventListener('click',e=>{if(e.target.closest('#nav-history'))setTimeout(refreshButtons,150);});
})();
