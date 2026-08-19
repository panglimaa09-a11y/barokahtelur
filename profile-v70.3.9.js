/* BAROKAH TELUR V70.3.9 - Profile Management
 * Responsive for desktop, tablet and mobile.
 * Add this script after the Supabase client and after the main app script.
 * It creates a self-contained profile editor when #profileView or [data-profile-view] exists.
 */
(function(){
  'use strict';
  const supa = window.supabaseClient || window.supabase || window._supabase;
  if(!supa || !supa.auth || !supa.from) return;

  function esc(v){ return String(v ?? '').replace(/[&<>'"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[s])); }
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
    root.innerHTML=`
      <div class="barokah-profile-wrap">
        <div class="barokah-profile-card">
          <div class="barokah-profile-head">
            <div class="barokah-profile-avatar">
              ${p.logo_url ? `<img src="${esc(p.logo_url)}" alt="Logo usaha">` : esc((p.full_name||user.email||'U').slice(0,1).toUpperCase())}
            </div>
            <div class="barokah-profile-title">
              <h2>Profil</h2>
              <small>${esc(user.email||'')}</small>
            </div>
          </div>

          <form id="barokahProfileForm" autocomplete="off" novalidate>
            <div class="barokah-profile-grid">
              <div class="barokah-field">
                <label for="barokahFullName">Nama Pengguna</label>
                <input id="barokahFullName" name="full_name" value="${esc(p.full_name)}" placeholder="Nama owner/karyawan" autocomplete="name">
              </div>

              <div class="barokah-field">
                <label for="barokahBusinessName">Nama Usaha</label>
                <input id="barokahBusinessName" name="business_name" value="${esc(p.business_name)}" placeholder="Barokah Telur" autocomplete="organization">
              </div>

              <div class="barokah-field">
                <label for="barokahPhone">Nomor WhatsApp</label>
                <input id="barokahPhone" name="phone" inputmode="tel" value="${esc(p.phone)}" placeholder="08xxxxxxxxxx" autocomplete="tel">
              </div>

              <div class="barokah-field barokah-field-full">
                <label for="barokahAddress">Alamat Usaha</label>
                <textarea id="barokahAddress" name="business_address" rows="3" placeholder="Alamat usaha" autocomplete="street-address">${esc(p.business_address)}</textarea>
              </div>

              <div class="barokah-field barokah-field-full">
                <label for="barokahLogo">URL Logo Usaha</label>
                <input id="barokahLogo" name="logo_url" type="url" value="${esc(p.logo_url)}" placeholder="https://..." inputmode="url">
              </div>
            </div>

            <div class="barokah-profile-actions">
              <button class="barokah-btn barokah-btn-primary" type="submit">Simpan Profil</button>
              <button class="barokah-btn barokah-btn-secondary" type="button" id="barokahPasswordBtn">Ubah Password</button>
            </div>
            <div id="barokahProfileMsg" class="barokah-profile-msg" role="status" aria-live="polite"></div>
          </form>
        </div>
      </div>`;

    if(!document.getElementById('barokahProfileResponsiveStyle')){
      const style=document.createElement('style');
      style.id='barokahProfileResponsiveStyle';
      style.textContent=`
        .barokah-profile-wrap{width:100%;max-width:960px;margin:0 auto;padding:clamp(12px,2vw,24px);box-sizing:border-box}
        .barokah-profile-card{width:100%;box-sizing:border-box;background:var(--card,#fff);border:1px solid rgba(0,0,0,.08);border-radius:20px;padding:clamp(16px,2.5vw,28px);box-shadow:0 10px 30px rgba(0,0,0,.06)}
        .barokah-profile-head{display:flex;align-items:center;gap:14px;margin-bottom:22px;min-width:0}
        .barokah-profile-avatar{width:64px;height:64px;min-width:64px;border-radius:50%;overflow:hidden;background:#f1f3f5;display:grid;place-items:center;font-weight:800;font-size:22px;color:#495057}
        .barokah-profile-avatar img{width:100%;height:100%;object-fit:cover;display:block}
        .barokah-profile-title{min-width:0}.barokah-profile-title h2{margin:0 0 4px;font-size:clamp(20px,2.5vw,28px);line-height:1.15}.barokah-profile-title small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#6c757d}
        .barokah-profile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
        .barokah-field{min-width:0}.barokah-field-full{grid-column:1/-1}
        .barokah-profile-card label{display:block;font-weight:700;margin:0 0 7px;font-size:14px;color:inherit}
        .barokah-profile-card input,.barokah-profile-card textarea{display:block;width:100%;box-sizing:border-box;margin:0;padding:12px 13px;border:1px solid #d7dce2;border-radius:11px;background:inherit;color:inherit;font:inherit;outline:none;transition:border-color .18s,box-shadow .18s}
        .barokah-profile-card input:focus,.barokah-profile-card textarea:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.12)}
        .barokah-profile-card textarea{resize:vertical;min-height:90px}
        .barokah-profile-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px}
        .barokah-btn{border:0;border-radius:11px;padding:12px 18px;cursor:pointer;font-weight:800;min-height:44px;transition:transform .15s,opacity .15s}.barokah-btn:active{transform:scale(.98)}.barokah-btn:disabled{opacity:.6;cursor:not-allowed}
        .barokah-btn-primary{background:#2563eb;color:#fff}.barokah-btn-secondary{background:#eef2f7;color:#172033}
        .barokah-profile-msg{margin-top:12px;min-height:20px;font-size:14px}
        @media (max-width:700px){
          .barokah-profile-wrap{padding:10px 8px}.barokah-profile-card{border-radius:16px;padding:15px}.barokah-profile-grid{grid-template-columns:1fr;gap:13px}.barokah-field-full{grid-column:auto}.barokah-profile-actions{flex-direction:column}.barokah-btn{width:100%}.barokah-profile-head{margin-bottom:18px}.barokah-profile-avatar{width:54px;height:54px;min-width:54px;font-size:19px}
        }
        @media (min-width:701px) and (max-width:1000px){.barokah-profile-wrap{padding:16px}}
      `;
      document.head.appendChild(style);
    }

    const form=root.querySelector('#barokahProfileForm');
    const msg=root.querySelector('#barokahProfileMsg');
    const submit=form.querySelector('button[type="submit"]');
    form.onsubmit=async e=>{
      e.preventDefault();
      const f=new FormData(e.target);
      msg.textContent='Menyimpan...'; submit.disabled=true;
      try{await saveProfile(Object.fromEntries(f.entries())); msg.textContent='✓ Profil berhasil disimpan.'; if(window.barokahRefreshProfile) window.barokahRefreshProfile();}
      catch(err){msg.textContent='Gagal menyimpan: '+(err.message||err)}
      finally{submit.disabled=false;}
    };
    root.querySelector('#barokahPasswordBtn').onclick=async()=>{
      const email=user.email||'';
      if(!email){msg.textContent='Email akun tidak tersedia.';return;}
      const btn=root.querySelector('#barokahPasswordBtn'); btn.disabled=true; msg.textContent='Mengirim link reset password...';
      try{const r=await supa.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname}); if(r.error) throw r.error; msg.textContent='✓ Link ubah password dikirim ke email akun.';}
      catch(err){msg.textContent='Gagal mengirim link password: '+(err.message||err)}
      finally{btn.disabled=false;}
    };
  }

  async function init(){
    const root=document.querySelector('#profileView,[data-profile-view]'); if(!root) return;
    try{const x=await loadProfile(); if(x) render(root,x.user,x.profile)}catch(err){root.innerHTML='<div style="padding:16px">Gagal memuat profil: '+esc(err.message||err)+'</div>';}
  }
  window.barokahRefreshProfile=init;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
