# Family Tree — Silsilah Keluarga

Aplikasi web **silsilah keluarga** berbasis Canvas 2D tanpa dependensi eksternal. Jalankan langsung di browser, data tersimpan otomatis di `localStorage`, dan dapat disimpan/dibuka sebagai berkas dengan ekstensi `.tree`.

## Fitur

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
  "title": "Silsilah Keluarga Santoso",
  "rootUnionId": "u1",
  "people": {
    "p1": { "id": "p1", "first": "Budi", "last": "Santoso", "gender": "male", "birth": 1940, "death": 2010, "birthPlace": "Yogyakarta", "occupation": "Guru Besar", "bio": "..." }
  },
  "unions": [
    { "id": "u1", "partners": ["p1", "p2"], "children": ["p3", "p5", "p7"], "marriage": 1963 }
  ]
}
```

- `people`: objek anggota, dikunci dengan `id` (mis. `p1`).
- `unions`: perkawinan/keluarga — `partners` (1 atau 2 orang), `children`, dan `marriage` (tahun perkawinan, opsional).
- Union legacy yang memiliki lebih dari 2 pasangan otomatis dipecah saat dibuka.

## Penyimpanan

- Data tersimpan otomatis di `localStorage` dengan kunci `family-tree:data:v2`.
- Untuk memindahkan data antar perangkat, gunakan **Simpan file** lalu **Buka file**.

## Teknis

| File      | Peran |
| --------- | ----- |
| `data.js` | Data awal (keluarga Santoso) dan objek `FAMILY` |
| `tree.js` | Kelas `FamilyTree`: layout, pengukuran, rendering Canvas, interaksi pointer |
| `app.js`  | Logika aplikasi: UI panel samping, modal, pengelolaan data, simpan/buka berkas |
| `index.html` | Struktur halaman |
| `styles.css` | Tampilan |

Tidak ada framework dan tidak ada dependensi — cukup HTML, CSS, dan JavaScript polos.