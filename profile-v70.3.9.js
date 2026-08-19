/* BAROKAH TELUR V70.3.9 - Profile Management */
(function(){
  'use strict';

  function getSB(){ return window.barokahSupabase || window.supabaseClient || window._supabase || null; }
  function esc(v){ return String(v ?? '').replace(/[&<>'"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[s])); }

  function ensureProfileUI(){
    const nav=document.querySelector('.nav');
    if(nav && !document.getElementById('nav-profile')){
      const b=document.createElement('button');
      b.id='nav-profile'; b.type='button'; b.textContent='👤 Profil';
      b.onclick=function(){ if(typeof window.showPage==='function') window.showPage('profile'); };
      nav.appendChild(b);
    }
    const wrap=document.querySelector('.wrap');
    if(wrap && !document.getElementById('page-profile')){
      const s=document.createElement('section');
      s.id='page-profile'; s.className='page';
      s.innerHTML='<div class="hero"><span class="eyebrow">AKUN & USAHA</span><h1>Profil</h1><p>Kelola data pengguna dan informasi usaha tanpa mengubah data transaksi.</p></div><div id="profileView" data-profile-view></div>';
      wrap.appendChild(s);
    }
  }

  async function currentUser(){
    const sb=getSB(); if(!sb) throw new Error('Koneksi Supabase belum siap.');
    const r=await sb.auth.getUser();
    if(r.error) throw r.error;
    return r.data && r.data.user;
  }

  async function loadProfile(){
    const sb=getSB(); const user=await currentUser(); if(!user) return null;
    const r=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();
    if(r.error) throw r.error;
    return {user,profile:r.data||{id:user.id}};
  }

  async function saveProfile(data){
    const sb=getSB(); const user=await currentUser(); if(!user) throw new Error('Sesi login tidak ditemukan.');
    const payload={id:user.id,full_name:data.full_name||null,phone:data.phone||null,business_name:data.business_name||null,business_address:data.business_address||null,logo_url:data.logo_url||null,updated_at:new Date().toISOString()};
    const r=await sb.from('profiles').upsert(payload,{onConflict:'id'}).select().single();
    if(r.error) throw r.error;
    return r.data;
  }

  function render(root,user,p){
    root.innerHTML=`<div class="barokah-profile-wrap"><div class="barokah-profile-card">
      <div class="barokah-profile-head"><div class="barokah-profile-avatar">${p.logo_url?`<img src="${esc(p.logo_url)}" alt="Logo usaha">`:esc((p.full_name||user.email||'U').slice(0,1).toUpperCase())}</div><div class="barokah-profile-title"><h2>Profil Pengguna & Usaha</h2><small>${esc(user.email||'')}</small></div></div>
      <form id="barokahProfileForm" autocomplete="off"><div class="barokah-profile-grid">
        <div class="barokah-field"><label>Nama Pengguna</label><input name="full_name" value="${esc(p.full_name)}" placeholder="Nama owner/karyawan" autocomplete="name"></div>
        <div class="barokah-field"><label>Nama Usaha</label><input name="business_name" value="${esc(p.business_name)}" placeholder="Barokah Telur" autocomplete="organization"></div>
        <div class="barokah-field"><label>Nomor WhatsApp</label><input name="phone" inputmode="tel" value="${esc(p.phone)}" placeholder="08xxxxxxxxxx" autocomplete="tel"></div>
        <div class="barokah-field barokah-field-full"><label>Alamat Usaha</label><textarea name="business_address" rows="3" placeholder="Alamat usaha">${esc(p.business_address)}</textarea></div>
        <div class="barokah-field barokah-field-full"><label>URL Logo Usaha</label><input name="logo_url" type="url" value="${esc(p.logo_url)}" placeholder="https://..."></div>
      </div><div class="barokah-profile-actions"><button class="barokah-btn barokah-btn-primary" type="submit">💾 Simpan Profil</button><button class="barokah-btn barokah-btn-secondary" type="button" id="barokahPasswordBtn">🔐 Kirim Link Reset Password</button></div><div id="barokahProfileMsg" class="barokah-profile-msg" role="status"></div></form>
    </div></div>`;
    if(!document.getElementById('barokahProfileResponsiveStyle')){
      const st=document.createElement('style');st.id='barokahProfileResponsiveStyle';st.textContent=`
      .barokah-profile-wrap{width:100%;max-width:960px;margin:0 auto;padding:clamp(10px,2vw,24px);box-sizing:border-box}.barokah-profile-card{width:100%;background:var(--card,#fff);border:1px solid #dfe7e1;border-radius:20px;padding:clamp(16px,2.5vw,28px);box-shadow:0 10px 30px rgba(18,42,29,.07);box-sizing:border-box}.barokah-profile-head{display:flex;align-items:center;gap:14px;margin-bottom:22px;min-width:0}.barokah-profile-avatar{width:64px;height:64px;min-width:64px;border-radius:50%;overflow:hidden;background:#f1f5f2;display:grid;place-items:center;font-weight:900;font-size:22px;color:#14532d}.barokah-profile-avatar img{width:100%;height:100%;object-fit:cover}.barokah-profile-title{min-width:0}.barokah-profile-title h2{margin:0 0 4px;font-size:clamp(20px,3vw,28px)}.barokah-profile-title small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#6d776f}.barokah-profile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.barokah-field{min-width:0}.barokah-field-full{grid-column:1/-1}.barokah-profile-card label{display:block;font-size:13px;font-weight:800;margin-bottom:7px}.barokah-profile-card input,.barokah-profile-card textarea{width:100%;box-sizing:border-box;padding:12px 13px;border:1px solid #d6ded8;border-radius:11px;background:#fff;color:#162019;font:inherit;outline:none}.barokah-profile-card input:focus,.barokah-profile-card textarea:focus{border-color:#136b48;box-shadow:0 0 0 3px rgba(19,107,72,.1)}.barokah-profile-card textarea{resize:vertical;min-height:90px}.barokah-profile-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}.barokah-btn{border:0;border-radius:11px;min-height:44px;padding:11px 16px;font-weight:800;cursor:pointer}.barokah-btn-primary{background:#f4c126;color:#403000}.barokah-btn-secondary{background:#0d3f2e;color:#fff}.barokah-btn:disabled{opacity:.6}.barokah-profile-msg{min-height:20px;margin-top:12px;font-size:13px;font-weight:700}.barokah-profile-wrap .barokah-profile-card{overflow:hidden}
      @media(max-width:700px){.barokah-profile-wrap{padding:8px 0}.barokah-profile-card{border-radius:16px;padding:15px}.barokah-profile-grid{grid-template-columns:1fr;gap:13px}.barokah-field-full{grid-column:auto}.barokah-profile-actions{flex-direction:column}.barokah-btn{width:100%}.barokah-profile-head{margin-bottom:18px}.barokah-profile-avatar{width:54px;height:54px;min-width:54px;font-size:19px}}
      `;document.head.appendChild(st);
    }
    const form=root.querySelector('#barokahProfileForm'),msg=root.querySelector('#barokahProfileMsg'),save=form.querySelector('button[type=submit]');
    form.onsubmit=async e=>{e.preventDefault();save.disabled=true;msg.textContent='Menyimpan...';try{const f=new FormData(form);await saveProfile(Object.fromEntries(f.entries()));msg.textContent='✓ Profil berhasil disimpan.';const x=await loadProfile();if(x)render(root,x.user,x.profile);}catch(err){msg.textContent='Gagal menyimpan: '+(err.message||err)}finally{save.disabled=false}};
    root.querySelector('#barokahPasswordBtn').onclick=async()=>{const sb=getSB(),user=await currentUser();const btn=root.querySelector('#barokahPasswordBtn');if(!user?.email){msg.textContent='Email akun tidak tersedia.';return}btn.disabled=true;msg.textContent='Mengirim link reset password...';try{const r=await sb.auth.resetPasswordForEmail(user.email,{redirectTo:location.origin+location.pathname});if(r.error)throw r.error;msg.textContent='✓ Link reset password dikirim ke '+user.email+'.'}catch(err){msg.textContent='Gagal: '+(err.message||err)}finally{btn.disabled=false}};
  }

  async function init(){
    ensureProfileUI();
    const root=document.getElementById('profileView');if(!root)return;
    try{const x=await loadProfile();if(x)render(root,x.user,x.profile);}catch(err){root.innerHTML='<div class="card" style="padding:18px">Gagal memuat profil: '+esc(err.message||err)+'</div>';}
  }
  window.barokahRefreshProfile=init;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else setTimeout(init,50);
})();