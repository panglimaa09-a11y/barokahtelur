BAROKAH TELUR V70.3 — CLOUD READ FIX
Basis: V70 index.
Fix:
- Data Supabase sudah tersimpan, tetapi halaman Incognito masih menampilkan state
  LocalStorage karena startup/render lama berjalan setelah cloud hydration.
- Cloud hydration sekarang dijalankan setelah DOMContentLoaded + jeda kecil sehingga
  data dari Supabase menjadi tampilan terakhir.
- pageshow juga melakukan refresh dari Supabase.
- Tidak menghapus data Supabase.
