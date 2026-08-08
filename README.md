# Tennis RW 008 Virgimontela

Website jadwal booking, daftar pemain warga, aturan penggunaan lapangan, dan panel admin Tennis RW 008 Virgimontela.

## Fitur

- Jadwal dua lapangan dalam tampilan mendatar
- Daftar nama pemain untuk publik
- Aturan penggunaan lapangan
- Login Admin Global dan Admin Penjadwalan
- Pengelolaan booking dengan pencegahan jadwal berbenturan
- Data privat pemain dilindungi oleh Row Level Security di Supabase

## Deployment

Situs ini adalah aplikasi statis yang dapat langsung diimpor ke Vercel. Tidak ada build command atau environment variable rahasia yang diperlukan. `app.js` menggunakan Supabase publishable key; akses data tetap dibatasi oleh kebijakan database.

## Struktur

- `index.html` — halaman utama
- `app.js` — jadwal, pemain, dan panel admin
- `styles.css` — tampilan responsif
- `aturan.html` — panduan lengkap
- `supabase/` — migrasi struktur dan kebijakan keamanan database

