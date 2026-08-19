/* BAROKAH TELUR V70.3.9 - Profile Management
 * Add this script after the Supabase client and after the main app script.
 * It creates a self-contained profile editor when #profileView or #profileModal exists.
 */
(function(){
  'use strict';
  const supa = window.supabaseClient || window.supabase || window._supabase;
  if(!supa || !supa.auth || !supa.from) return;

  function esc(v){ return String(v ?? '').replace(/[&<>'"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[s])); }
  async function currentUser(){ const r=await supa.auth.getUser(); return r.data && r.data.user; }

  async function loadProfile(){
    const user=await currentUser(); if(!user) return null;
    const r=await supa.from('profiles').select('*').eq('id',user.id).maybeSingle();
    if(r.error) throw r.error;
    return {user, profile:r.data||{id:user.id}};
  }

  async function saveProfile(data){
    const user=await currentUser(); if(!user) throw new Error('Sesi login tidak ditemukan.');
    const payload={id:user.id, full_name:data.full_name||null, phone:data.phone||null, business_name:data.business_name||null, business_address:data.business_address||null, logo_url:data.logo_url||null, updated_at:new Date().toISOString()};
    const r=await supa.from('profiles').upsert(payload,{onConflict:'id'}).select().single();
    if(r.error) throw r.error;
    return r.data;
  }

  function render(root, user, p){
    root.innerHTML=`<div class="barokah-profile-card" style="max-width:720px;margin:auto;background:var(--card,#fff);border:1px solid rgba(0,0,0,.08);border-radius:18px;padding:20px;box-shadow:0 10px 30px rgba(0,0,0,.06)">
      <div style="display:flex;gap:14px;align-items:center;margin-bottom:18px"><div style="width:56px;height:56px;border-radius:50%;overflow:hidden;background:#f1f3f5;display:grid;place-items:center;font-weight:700">${p.logo_url?`<img src="${esc(p.logo_url)}" alt="Logo" style="width:100%;height:100%;object-fit:cover">`:esc((p.full_name||user.email||'U').slice(0,1).toUpperCase())}</div><div><h2 style="margin:0">Profil</h2><small>${esc(user.email||'')}</small></div></div>
      <form id="barokahProfileForm" autocomplete="off">
        <label>Nama Pengguna<input name="full_name" value="${esc(p.full_name)}" placeholder="Nama owner/karyawan"></label>
        <label>Nama Usaha<input name="business_name" value="${esc(p.business_name)}" placeholder="Barokah Telur"></label>
        <label>Nomor WhatsApp<input name="phone" inputmode="tel" value="${esc(p.phone)}" placeholder="08xxxxxxxxxx"></label>
        <label>Alamat Usaha<textarea name="business_address" rows="3" placeholder="Alamat usaha">${esc(p.business_address)}</textarea></label>
        <label>URL Logo Usaha<input name="logo_url" type="url" value="${esc(p.logo_url)}" placeholder="https://..."></label>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px"><button type="submit">Simpan Profil</button><button type="button" id="barokahPasswordBtn">Ubah Password</button></div>
        <div id="barokahProfileMsg" role="status" style="margin-top:12px"></div>
      </form>
    </div>`;
    const style=document.createElement('style'); style.textContent='.barokah-profile-card label{display:block;font-weight:600;margin:12px 0}.barokah-profile-card input,.barokah-profile-card textarea{display:block;width:100%;margin-top:6px;padding:11px 12px;border:1px solid #d7dce2;border-radius:10px;font:inherit}.barokah-profile-card button{border:0;border-radius:10px;padding:11px 16px;cursor:pointer;font-weight:700}'; document.head.appendChild(style);
    root.querySelector('#barokahProfileForm').onsubmit=async e=>{e.preventDefault(); const msg=root.querySelector('#barokahProfileMsg'); const f=new FormData(e.target); msg.textContent='Menyimpan...'; try{await saveProfile(Object.fromEntries(f.entries())); msg.textContent='✓ Profil berhasil disimpan.'; if(window.barokahRefreshProfile) window.barokahRefreshProfile();}catch(err){msg.textContent='Gagal menyimpan: '+(err.message||err)}};
    root.querySelector('#barokahPasswordBtn').onclick=async()=>{const email=user.email||''; const msg=root.querySelector('#barokahProfileMsg'); try{const r=await supa.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname}); if(r.error) throw r.error; msg.textContent='✓ Link ubah password dikirim ke email akun.';}catch(err){msg.textContent='Gagal mengirim link password: '+(err.message||err)}};
  }

  async function init(){
    const root=document.querySelector('#profileView,[data-profile-view]'); if(!root) return;
    try{const x=await loadProfile(); if(x) render(root,x.user,x.profile)}catch(err){root.innerHTML='<div style="padding:16px">Gagal memuat profil: '+esc(err.message||err)+'</div>';}
  }
  window.barokahRefreshProfile=init;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
