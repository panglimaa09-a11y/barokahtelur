(function(){
  'use strict';
  const SB=()=>window.barokahSupabase;
  let ownerProfile=null;

  const css=`
  #btAccountFab{position:fixed;right:18px;bottom:82px;z-index:80;border:0;border-radius:999px;background:#0d3f2e;color:#fff;padding:12px 16px;font-weight:800;box-shadow:0 10px 25px rgba(0,0,0,.18);display:none}
  #btAccountModal{position:fixed;inset:0;z-index:90;background:rgba(15,25,20,.42);backdrop-filter:blur(5px);display:none;align-items:center;justify-content:center;padding:18px}
  #btAccountModal.open{display:flex}
  .bt-am-card{width:min(720px,100%);max-height:90vh;overflow:auto;background:#fff;border:1px solid #e1e7e2;border-radius:22px;box-shadow:0 25px 70px rgba(0,0,0,.22);padding:22px}
  .bt-am-head{display:flex;justify-content:space-between;gap:15px;align-items:center;margin-bottom:14px}.bt-am-head h2{margin:0;color:#136b48}.bt-am-close{border:0;background:#f1f4f1;border-radius:10px;width:40px;height:40px;font-size:20px}
  .bt-am-note{padding:11px 13px;background:#edf8f1;border-radius:12px;color:#24533e;font-size:12px;line-height:1.55;margin-bottom:14px}
  .bt-am-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.bt-am-field{display:grid;gap:6px}.bt-am-field.full{grid-column:1/-1}.bt-am-field label{font-size:12px;font-weight:800}.bt-am-field input{height:42px;border:1px solid #d6ded8;border-radius:10px;padding:0 11px;outline:none}.bt-am-actions{display:flex;gap:8px;margin-top:12px}.bt-am-btn{border:0;border-radius:10px;padding:11px 14px;font-weight:800}.bt-am-primary{background:#f4c126;color:#403000}.bt-am-ghost{background:#fff;border:1px solid #dfe5e0}.bt-am-msg{font-size:12px;margin-top:9px;min-height:18px}.bt-am-list{margin-top:20px;border-top:1px solid #edf0ed;padding-top:15px}.bt-am-user{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid #edf0ed}.bt-am-user b{display:block}.bt-am-user small{color:#6d776f}.bt-am-badge{font-size:10px;font-weight:900;padding:5px 8px;border-radius:999px;background:#edf8f1;color:#136b48}
  @media(max-width:600px){.bt-am-grid{grid-template-columns:1fr}.bt-am-field.full{grid-column:auto}.bt-am-card{padding:16px}}
  `;

  function inject(){
    if(document.getElementById('btAccountStyle'))return;
    const st=document.createElement('style');st.id='btAccountStyle';st.textContent=css;document.head.appendChild(st);
    const fab=document.createElement('button');fab.id='btAccountFab';fab.type='button';fab.textContent='👥 Akun';fab.onclick=openModal;document.body.appendChild(fab);
    const modal=document.createElement('div');modal.id='btAccountModal';modal.innerHTML=`<div class="bt-am-card" role="dialog" aria-modal="true"><div class="bt-am-head"><h2>👥 Akun Barokah Telur</h2><button class="bt-am-close" type="button" aria-label="Tutup">×</button></div><div class="bt-am-note">Semua akun memakai <b>database Barokah Telur yang sama</b>. Data transaksi, stok, riwayat, dan laporan tidak dipisahkan berdasarkan akun.</div><form id="btAccountForm"><div class="bt-am-grid"><div class="bt-am-field"><label>Nama karyawan</label><input id="btAccountName" required maxlength="80" placeholder="Contoh: Budi"></div><div class="bt-am-field"><label>Email login</label><input id="btAccountEmail" type="email" required placeholder="budi@email.com"></div><div class="bt-am-field full"><label>Password awal</label><input id="btAccountPassword" type="password" minlength="6" required placeholder="Minimal 6 karakter"></div></div><div class="bt-am-actions"><button class="bt-am-btn bt-am-primary" type="submit">+ Tambah Akun</button><button class="bt-am-btn bt-am-ghost" type="button" id="btAccountRefresh">Refresh</button></div><div id="btAccountMsg" class="bt-am-msg"></div></form><div class="bt-am-list"><b>Daftar akun</b><div id="btAccountList"><small>Memuat...</small></div></div></div>`;modal.querySelector('.bt-am-close').onclick=closeModal;modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});document.body.appendChild(modal);
    document.getElementById('btAccountForm').addEventListener('submit',createAccount);document.getElementById('btAccountRefresh').addEventListener('click',loadProfiles);
  }

  async function current(){const sb=SB();if(!sb)return null;const r=await sb.auth.getUser();return r.data&&r.data.user?r.data.user:null;}
  async function profile(u){const sb=SB();if(!sb||!u)return null;const r=await sb.from('profiles').select('id,full_name,email,role').eq('id',u.id).maybeSingle();if(r.error){console.warn('Profile akun:',r.error);return null;}return r.data||null;}
  async function isOwner(){const u=await current();const p=await profile(u);ownerProfile=p;return !!p&&String(p.role||'').toLowerCase()==='owner';}

  async function loadProfiles(){
    const list=document.getElementById('btAccountList');if(!list)return;list.innerHTML='<small>Memuat...</small>';
    const sb=SB();if(!sb){list.innerHTML='<small>Koneksi Supabase belum siap.</small>';return;}
    const r=await sb.from('profiles').select('id,full_name,email,role,created_at').order('created_at',{ascending:true});
    if(r.error){list.innerHTML='<small>'+esc(r.error.message)+'</small>';return;}
    list.innerHTML=(r.data||[]).map(p=>`<div class="bt-am-user"><div><b>${esc(p.full_name||'Tanpa nama')}</b><small>${esc(p.email||'Email belum tersimpan')}</small></div><span class="bt-am-badge">${esc(p.role||'employee')}</span></div>`).join('')||'<small>Belum ada akun.</small>';
  }

  async function createAccount(e){
    e.preventDefault();
    const sb=SB(),name=document.getElementById('btAccountName').value.trim(),email=document.getElementById('btAccountEmail').value.trim().toLowerCase(),password=document.getElementById('btAccountPassword').value,msg=document.getElementById('btAccountMsg');
    if(!(await isOwner())){msg.textContent='Hanya Owner yang dapat menambah akun.';return;}
    if(!name||!email||password.length<6){msg.textContent='Lengkapi nama, email, dan password minimal 6 karakter.';return;}
    const session=(await sb.auth.getSession()).data.session;
    msg.textContent='Membuat akun...';
    const r=await sb.auth.signUp({email,password,options:{data:{full_name:name,role:'employee'}}});
    if(r.error){msg.textContent=r.error.message;return;}
    if(session){const restored=await sb.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token});if(restored.error)console.warn('Pemulihan sesi owner:',restored.error);}
    document.getElementById('btAccountForm').reset();
    msg.textContent=r.data.session?'Akun berhasil dibuat dan sesi Owner tetap aktif.':'Akun dibuat. Jika konfirmasi email aktif, karyawan perlu verifikasi email terlebih dahulu.';
    await loadProfiles();
  }

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function openModal(){const m=document.getElementById('btAccountModal');if(m){m.classList.add('open');loadProfiles();}}
  function closeModal(){const m=document.getElementById('btAccountModal');if(m)m.classList.remove('open');}

  async function refresh(){
    inject();
    const fab=document.getElementById('btAccountFab');
    const ok=await isOwner();
    if(fab)fab.style.display=ok?'block':'none';
  }

  window.addEventListener('barokah:supabase-ready',()=>setTimeout(refresh,400));
  window.addEventListener('barokah:cloud-synced',()=>setTimeout(refresh,200));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,700));else setTimeout(refresh,700);
})();
