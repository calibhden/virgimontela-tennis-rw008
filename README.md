# Portal Virgimontela RW 008

Portal warga multi-halaman yang dipersiapkan untuk domain `virgimontela.org`.

## Struktur

- `/` — portal utama Virgimontela
- `/tennis` — jadwal booking, daftar pemain, aturan, dan panel admin tennis
- `/tennis/aturan` — panduan lengkap penggunaan lapangan tennis
- `/clubhouse` — ketentuan penggunaan Ruang Dolphin dan fasilitas Club House
- `/tatatertib` — Panduan Tata Tertib Warga, edisi Januari 2026
- `/peraturanmembangun` — halaman yang disiapkan untuk dokumen berikutnya

## Data dan deployment

Situs ini berupa aplikasi statis yang diterbitkan melalui GitHub dan Vercel. Data tennis dan autentikasi admin menggunakan Supabase dengan Row Level Security.
