# BAROKAH TELUR — V70.3.5 FINAL

Project web aplikasi pembukuan BAROKAH TELUR.

## File utama
- `index.html` — aplikasi + Print Laporan V70.3.5
- `cloud-sync.js` — sinkronisasi Supabase
- `supabase-client.js` — client Supabase
- `config.js` — konfigurasi project
- `supabase-schema.sql` — schema database
- `supabase-migration-v70-1.sql` — migration

## Catatan deployment
Jangan menghapus file pendamping. `index.html` bergantung pada file JS/config di repository ini.

Versi baseline: V70.3.5
Fokus fix V70.3.5: Print Laporan menggunakan iframe, tanpa `window.open()`/`about:blank`.
