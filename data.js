const FAMILY = {
  rootUnionId: "u1",
  title: "Silsilah Keluarga Santoso",
  people: {
    p1: { id: "p1", first: "Budi", last: "Santoso", gender: "male", birth: 1940, death: 2010, birthPlace: "Yogyakarta", occupation: "Guru Besar", bio: "Pendiri keluarga Santoso. Mengabdikan hidupnya sebagai pendidik dan dikenal tegas namun penyayang." },
    p2: { id: "p2", first: "Siti", last: "Rahayu", gender: "female", birth: 1944, death: 2018, birthPlace: "Magelang", occupation: "Ibu Rumah Tangga", bio: "Sosok hangat yang menjadi perekat keluarga besar. Terkenal dengan masakan tradisionalnya." },

    p3: { id: "p3", first: "Andi", last: "Santoso", gender: "male", birth: 1965, death: null, birthPlace: "Yogyakarta", occupation: "Insinyur Sipil", bio: "Anak pertama. Bekerja di bidang konstruksi dan aktif dalam kegiatan sosial lingkungan." },
    p4: { id: "p4", first: "Dewi", last: "Lestari", gender: "female", birth: 1968, death: null, birthPlace: "Semarang", occupation: "Dokter", bio: "Dokter umum yang membuka praktik mandiri di kota kelahirannya." },
    p5: { id: "p5", first: "Rina", last: "Santoso", gender: "female", birth: 1968, death: null, birthPlace: "Yogyakarta", occupation: "Akuntan", bio: "Anak kedua, teliti dan terorganisir. Mengelola keuangan beberapa usaha keluarga." },
    p6: { id: "p6", first: "Hadi", last: "Pratama", gender: "male", birth: 1966, death: null, birthPlace: "Solo", occupation: "Wirausaha", bio: "Pemilik usaha kuliner yang telah berkembang di beberapa kota." },
    p7: { id: "p7", first: "Bayu", last: "Santoso", gender: "male", birth: 1971, death: null, birthPlace: "Yogyakarta", occupation: "Arsitek", bio: "Anak bungsu. Menekuni desain arsitektur ramah lingkungan." },
    p8: { id: "p8", first: "Maya", last: "Putri", gender: "female", birth: 1974, death: null, birthPlace: "Bandung", occupation: "Desainer Interior", bio: "Memadukan estetika dan fungsi dalam setiap proyek desainnya." },

    p9: { id: "p9", first: "Agus", last: "Santoso", gender: "male", birth: 1990, death: null, birthPlace: "Jakarta", occupation: "Software Engineer", bio: "Cucu pertama yang menekuni dunia teknologi informasi." },
    p10: { id: "p10", first: "Nadia", last: "Santoso", gender: "female", birth: 1993, death: null, birthPlace: "Jakarta", occupation: "Marketing Manager", bio: "Berpengalaman memimpin tim pemasaran produk digital." },
    p11: { id: "p11", first: "Fajar", last: "Pratama", gender: "male", birth: 1992, death: null, birthPlace: "Solo", occupation: "Chef", bio: "Melanjutkan usaha kuliner keluarga dengan sentuhan modern." },
    p12: { id: "p12", first: "Sari", last: "Pratama", gender: "female", birth: 1995, death: null, birthPlace: "Solo", occupation: "Guru", bio: "Mengajar di sekolah dasar dan aktif dalam komunitas literasi." },
    p13: { id: "p13", first: "Intan", last: "Santoso", gender: "female", birth: 2000, death: null, birthPlace: "Bandung", occupation: "Mahasiswa", bio: "Sedang menempuh studi desain komunikasi visual." },

    p14: { id: "p14", first: "Rizky", last: "Maulana", gender: "male", birth: 1989, death: null, birthPlace: "Surabaya", occupation: "Data Analyst", bio: "Menikah dengan Nadia dan tinggal di Jakarta." },
    p15: { id: "p15", first: "Lina", last: "Marlina", gender: "female", birth: 1991, death: null, birthPlace: "Bogor", occupation: "Perawat", bio: "Bekerja di rumah sakit umum daerah." },
    p16: { id: "p16", first: "Citra", last: "Anggraini", gender: "female", birth: 1994, death: null, birthPlace: "Solo", occupation: "Fotografer", bio: "Mendokumentasikan momen keluarga besar dalam karya visual." },

    p17: { id: "p17", first: "Kevin", last: "Santoso", gender: "male", birth: 2018, death: null, birthPlace: "Jakarta", occupation: "Pelajar", bio: "Generasi keempat keluarga Santoso." },
    p18: { id: "p18", first: "Alvin", last: "Santoso", gender: "male", birth: 2020, death: null, birthPlace: "Jakarta", occupation: "Pelajar", bio: "Generasi keempat keluarga Santoso." },
    p19: { id: "p19", first: "Alesha", last: "Maulana", gender: "female", birth: 2017, death: null, birthPlace: "Jakarta", occupation: "Pelajar", bio: "Generasi keempat keluarga Santoso." },
    p20: { id: "p20", first: "Raka", last: "Pratama", gender: "male", birth: 2019, death: null, birthPlace: "Solo", occupation: "Pelajar", bio: "Generasi keempat keluarga Santoso." }
  },
  unions: [
    { id: "u1", partners: ["p1", "p2"], children: ["p3", "p5", "p7"], marriage: 1963 },
    { id: "u2", partners: ["p3", "p4"], children: ["p9", "p10"], marriage: 1988 },
    { id: "u3", partners: ["p5", "p6"], children: ["p11", "p12"], marriage: 1991 },
    { id: "u4", partners: ["p7", "p8"], children: ["p13"], marriage: 1998 },
    { id: "u5", partners: ["p9", "p15"], children: ["p17", "p18"], marriage: 2016 },
    { id: "u6", partners: ["p10", "p14"], children: ["p19"], marriage: 2015 },
    { id: "u7", partners: ["p11", "p16"], children: ["p20"], marriage: 2018 }
  ]
};
