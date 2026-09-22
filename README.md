# Family Tree — Silsilah Keluarga

Aplikasi web **silsilah keluarga** berbasis Canvas 2D tanpa dependensi eksternal. Aplikasi memulai dengan **tanpa data awal** — hanya satu kartu permulaan; data tersimpan otomatis di `localStorage`, dan dapat disimpan/dibuka sebagai berkas dengan ekstensi `.tree`.

Demo: [family.swatizen.com](https://family.swatizen.com)

## Fitur

- **Mulai dari satu kartu permulaan**: tidak ada data keluarga bawaan — bangun silsilah dari satu anggota pertama.
- **Rendering pohon keluarga** di Canvas 2D (pan, zoom dengan roda/touch pinch).
- **Panel detail anggota**: riwayat hidup, tempat lahir, pekerjaan, biografi, dan hubungan keluarga (orang tua, pasangan, anak, saudara).
- **Tambah/ubah/hapus anggota**:
  - Tambah pasangan disertai **tahun perkawinan** (opsional).
  - Tambah anak, saudara kandung, dan orang tua.
  - Hapus anggota dengan konfirmasi; bila anggota adalah bagian dari pasangan, anaknya **tetap menjadi anak pasangan yang tersisa**.
- **Garis perkawinan kronologis**: kartu pasangan diurutkan dari perkawinan terdahulu hingga terkemudian; garis perkawinan terdahulu digambar paling bawah.
- **Leluhur otomatis**: orang tua yang ditambahkan digambar di atas kartu anak — pasangan ditampilkan sebagai blok keluarga, orang tua tunggal dengan garis lurus tanpa garis perkawinan.
- **Judul silsilah** yang dapat diubah langsung di bilah atas.
- **Hover titik hub** pada garis perkawinan menampilkan tahun perkawinan; **klik ganda** untuk mengubah tahun tersebut.
- **Simpan ke file** (`.tree`) dan **buka file** — portabel antar perangkat.
- **Kosongkan** kanvas untuk memulai silsilah baru dari satu kartu permulaan.
- **Pencarian** anggota, pengaturan **fokus silsilah**, dan tombol **fit/zoom**.

## Cara Menjalankan

Tidak ada build step maupun dependensi. Buka `index.html` langsung di browser, atau jalankan server statis:

```bash
# opsi 1: buka langsung
# buka index.html di browser

# opsi 2: server sederhana (Python)
python3 -m http.server 8000
# lalu buka http://localhost:8000
```

## Format File `.tree`

Berkas hasil "Simpan file" adalah JSON dengan struktur:

```json
{
  "app": "family-tree",
  "version": 2,
  "title": "Silsilah Keluarga Baru",
  "rootUnionId": "u1",
  "people": {
    "p1": { "id": "p1", "first": "Anggota", "last": "Baru", "gender": "unknown", "birth": 1980, "death": null, "birthPlace": "", "occupation": "", "bio": "Mulai silsilah keluarga Anda dari anggota pertama ini." }
  },
  "unions": [
    { "id": "u1", "partners": ["p1"], "children": [], "marriage": 2005 }
  ]
}
```

- `people`: objek anggota, dikunci dengan `id` (mis. `p1`).
- `unions`: perkawinan/keluarga — `partners` (1 atau 2 orang), `children`, dan `marriage` (tahun perkawinan, opsional).
- Union legacy yang memiliki lebih dari 2 pasangan otomatis dipecah saat dibuka.

## Penyimpanan

- Data tersimpan otomatis di `localStorage` dengan kunci `family-tree:data:v2`.
- Untuk memindahkan data antar perangkat, gunakan **Simpan file** lalu **Buka file**.
- Jika sebelumnya pernah memakai aplikasi ini, data lama di `localStorage` tetap dimuat — gunakan tombol **Kosongkan** untuk kembali ke keadaan satu kartu permulaan.

## Teknis

| File      | Peran |
| --------- | ----- |
| `data.js` | Keadaan awal: satu kartu permulaan, satu union, judul default — serta objek `FAMILY` |
| `tree.js` | Kelas `FamilyTree`: layout, pengukuran, rendering Canvas, interaksi pointer |
| `app.js`  | Logika aplikasi: UI panel samping, modal, pengelolaan data, simpan/buka berkas |
| `index.html` | Struktur halaman |
| `styles.css` | Tampilan |

Tidak ada framework dan tidak ada dependensi — cukup HTML, CSS, dan JavaScript polos.

## Kredit

Dibuat oleh: Emanuel Setio Dewo dengan Vibe Coding

Tools: OpenCode + Big Pickle
