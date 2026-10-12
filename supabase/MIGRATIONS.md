# Panduan Migrasi Database — Barokah Telur

File SQL di folder ini **tidak otomatis jalan** saat di-push ke GitHub.
Setiap file harus dijalankan manual di **Supabase Dashboard → SQL Editor**.

## Urutan wajib (sekali saja, berurutan)

| # | File | Fungsi |
|---|------|--------|
| 1 | `supabase-migration-v70.5.1-rpc-stock-delete.sql` | `delete_own_stock_movement(p_id)` — hapus 1 baris riwayat |
| 2 | `supabase-migration-v71.1.0-clear-stock-history-rpc.sql` | `clear_own_stock_movements()` — hapus SEMUA riwayat (atomik) |
| 3 | `supabase-migration-v71.0.0-business-bundle.sql` | Modul business bundle |
| 4 | `shared-admin.sql`, `shared-business-admin-final.sql`, `shared-business-data.sql` | Akses data lintas cabang |
| 5 | `fix-shared-business-uid-e62dd6fe.sql` | Perbaikan UID bisnis |

## Perbaikan cepat

Jika tombol **"Hapus Riwayat Stok"** error `DELETE requires a WHERE clause`:

1. Buka `FIX-HAPUS-RIWAYAT-STOK.sql` di folder ini
2. Copy seluruh isinya
3. Paste di Supabase SQL Editor → **Run**
4. Selesai — tidak perlu ubah aplikasi

## Catatan

- Aplikasi punya **fallback otomatis**: jika fungsi RPC belum diperbarui,
  aplikasi tetap bisa menghapus via jalur cadangan (REST berfilter).
  Tapi menjalankan SQL di atas adalah perbaikan permanen yang disarankan.
- `transaction-proofs.sql` = sisa fitur Bukti Transfer yang sudah dihapus
  (10 Okt 2026) — **jangan dijalankan**.
