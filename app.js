/**
 * ==========================================================================
 * ENVIROMINE MONITOR — LIMBAH B3 V1.1 (PT. ETAM MANUNGGAL JAYA)
 * Frontend Single Page Application Engine (GitHub Pages & GAS Compatible)
 * Versi V1.1.2 (Studio TTD Online, Auto Nomor Neraca, Filter Periode, Left KOP)
 * ==========================================================================
 */

// Global State
const STATE = {
  gasApiUrl: localStorage.getItem('enviromine_gas_url') || '',
  currentUser: null,
  activeView: 'dashboard',
  sidebarCollapsed: false,
  signatureTarget: null, // { neracaId, role }
  chartInstance: null,
  tempProfilePhoto: null
};

// 8 Items Checklist Fasilitas K3L TPS LB3 01 PT EMJ (Sesuai Rintek)
const INSPEKSI_ITEMS_DEFAULT = [
  'Alat Pemadam Api Ringan (APAR)',
  'Fasilitas Eyewash Station',
  'Rambu-rambu K3L & APD Wajib',
  'Kondisi Lantai Concrete Kedap Air & Kemiringan 1-5%',
  'Saluran Drainase Ceceran & Bak Oil Catcher (50x50x50 cm)',
  'Penunjuk Arah Angin (Wind Sock)',
  'Emergency Spill Kit (Absorbent Pad & Sawdust)',
  'Kotak Pertolongan Pertama Pada Kecelakaan (P3K)'
];

const BULAN_NAMA = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

// Helper: Memastikan URL TTD (khususnya data SVG) aman dari tanda kutip mentah yang merusak atribut HTML
function safeSignatureUrl(dataUrl) {
  if (!dataUrl) return '';
  if (typeof dataUrl !== 'string') return '';
  if (dataUrl.startsWith('data:image/svg+xml')) {
    if (dataUrl.includes('<svg') || dataUrl.includes('"')) {
      const match = dataUrl.match(/<svg[\s\S]*<\/svg>/i);
      if (match) {
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(match[0]);
      }
    }
  }
  return dataUrl;
}

// ==========================================================================
// 1. INITIALIZATION & DATABASE SEEDING
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initLocalDatabase();
  applyCompanySettingsUI();
  checkAuthSession();
  updateGasStatusBadge();
  setupGlobalShortcuts();

  // Background ping status jika URL GAS sudah terkonfigurasi
  if (STATE.gasApiUrl) {
    checkGasStatusBackground();
  }

  // Resize listener untuk mobile responsiveness
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      closeMobileSidebar();
    }
    if (STATE.activeView === 'ttd-online' && typeof initStudioCanvas === 'function') {
      initStudioCanvas();
    }
  });
});

function initLocalDatabase() {
  // 1. Master Rintek PT EMJ (9 Item Resmi Rintek)
  if (!localStorage.getItem('db_rintek')) {
    const defaultRintek = [
      { kodeLimbah: 'A102d', namaLimbah: 'Aki/baterai bekas', sumber: 'Sumber tidak spesifik', karakteristik: 'Korosif, Beracun', jenisWadah: 'Palet (2x1.5m)', kapasitasWadah: 1800, satuan: 'Kg', batasSimpanHari: 90 },
      { kodeLimbah: 'B104d', namaLimbah: 'Kemasan bekas B3', sumber: 'Sumber tidak spesifik', karakteristik: 'Beracun, Padatan mudah terbakar', jenisWadah: 'Palet (2x1.5m)', kapasitasWadah: 180, satuan: 'Kg', batasSimpanHari: 365 },
      { kodeLimbah: 'B105d', namaLimbah: 'Minyak pelumas bekas (Oli hidrolik/mesin/gear)', sumber: 'Sumber tidak spesifik', karakteristik: 'Beracun, Cairan mudah menyala', jenisWadah: 'Drum / IBC / Tangki', kapasitasWadah: 200, satuan: 'Liter', batasSimpanHari: 90 },
      { kodeLimbah: 'B107d', namaLimbah: 'Limbah elektronik (CRT, lampu TL, PCB)', sumber: 'Sumber tidak spesifik', karakteristik: 'Beracun, Berbahaya lingkungan', jenisWadah: 'Drum', kapasitasWadah: 200, satuan: 'Kg', batasSimpanHari: 365 },
      { kodeLimbah: 'B109d', namaLimbah: 'Filter bekas fasilitas pencemaran udara', sumber: 'Sumber tidak spesifik', karakteristik: 'Beracun', jenisWadah: 'Drum', kapasitasWadah: 200, satuan: 'Kg', batasSimpanHari: 365 },
      { kodeLimbah: 'B110d', namaLimbah: 'Kain majun bekas (used rags)', sumber: 'Sumber tidak spesifik', karakteristik: 'Beracun, Padatan mudah terbakar', jenisWadah: 'Drum', kapasitasWadah: 200, satuan: 'Kg', batasSimpanHari: 365 },
      { kodeLimbah: 'B321-4', namaLimbah: 'Kemasan bekas tinta / cartridge printer', sumber: 'Sumber spesifik umum', karakteristik: 'Beracun, Berbahaya lingkungan', jenisWadah: 'Drum', kapasitasWadah: 200, satuan: 'Kg', batasSimpanHari: 365 },
      { kodeLimbah: 'A332-1', namaLimbah: 'Sludge dari oil treatment / fasilitas penyimpanan', sumber: 'Sumber spesifik umum', karakteristik: 'Beracun, Padatan mudah menyala', jenisWadah: 'Drum', kapasitasWadah: 200, satuan: 'Kg', batasSimpanHari: 90 },
      { kodeLimbah: 'A337-1', namaLimbah: 'Limbah klinis / medis berkarakteristik infeksius', sumber: 'Sumber spesifik umum', karakteristik: 'Infeksius', jenisWadah: 'Medical waste cold storage', kapasitasWadah: 1.5, satuan: 'Kg', batasSimpanHari: 90 }
    ];
    localStorage.setItem('db_rintek', JSON.stringify(defaultRintek));
  }

  // 2. Master Pihak Ketiga (PT Berkat Jaya Sukses)
  if (!localStorage.getItem('db_pihak_ketiga')) {
    const defaultPihakKetiga = [
      { id: 'PK-001', namaPerusahaan: 'PT. Berkat Jaya Sukses', noIzin: 'SK.06/MENLHK/PLB3/2022', alamat: 'Jl. Trans Kalimantan Km 18, Balikpapan', kontak: '0542-882910 / info@berkatjayasukses.co.id' }
    ];
    localStorage.setItem('db_pihak_ketiga', JSON.stringify(defaultPihakKetiga));
  }

  // 3. Master Users (4 Roles)
  if (!localStorage.getItem('db_users')) {
    const defaultUsers = [
      { id: 'USR-01', nama: 'Operator Lapangan TPS', username: 'operator', password: 'operator123', role: 'Operator', status: 'Aktif', fotoProfil: '' },
      { id: 'USR-02', nama: 'Penanggung Jawab TPS (Hermanto)', username: 'penanggung_jawab', password: 'pj12345', role: 'Penanggung Jawab', status: 'Aktif', fotoProfil: '' },
      { id: 'USR-03', nama: 'Administrator HSE Lingkungan', username: 'admin_hse', password: 'admin123', role: 'Admin HSE', status: 'Aktif', fotoProfil: '' },
      { id: 'USR-04', nama: 'Kepala Teknik Tambang (KTT)', username: 'ktt', password: 'ktt12345', role: 'Manajemen / KTT', status: 'Aktif', fotoProfil: '' }
    ];
    localStorage.setItem('db_users', JSON.stringify(defaultUsers));
  }

  // 4. Sample Transaksi Limbah Masuk
  if (!localStorage.getItem('db_limbah_masuk')) {
    const sampleMasuk = [
      {
        id: 'IN-20260901-0830',
        tanggalMasuk: '2026-09-01 08:30',
        kodeLimbah: 'B105d',
        namaLimbah: 'Minyak pelumas bekas (Oli hidrolik/mesin/gear)',
        sumber: 'Workshop Alat Berat',
        jumlah: 1200,
        satuan: 'Liter',
        fotoUrl: '',
        statusRintek: 'Terdaftar',
        batasSimpanHari: 90,
        tanggalJatuhTempo: '2026-11-30',
        operator: 'Operator Lapangan',
        statusStok: 'Tersedia'
      },
      {
        id: 'IN-20260905-1015',
        tanggalMasuk: '2026-09-05 10:15',
        kodeLimbah: 'A102d',
        namaLimbah: 'Aki/baterai bekas',
        sumber: 'Workshop Elektrik',
        jumlah: 450,
        satuan: 'Kg',
        fotoUrl: '',
        statusRintek: 'Terdaftar',
        batasSimpanHari: 90,
        tanggalJatuhTempo: '2026-12-04',
        operator: 'Operator Lapangan',
        statusStok: 'Tersedia'
      },
      {
        id: 'IN-20260910-1400',
        tanggalMasuk: '2026-09-10 14:00',
        kodeLimbah: 'B104d',
        namaLimbah: 'Kemasan bekas B3',
        sumber: 'Gudang Pelumas & Kimia',
        jumlah: 85,
        satuan: 'Kg',
        fotoUrl: '',
        statusRintek: 'Terdaftar',
        batasSimpanHari: 365,
        tanggalJatuhTempo: '2027-09-10',
        operator: 'Operator Lapangan',
        statusStok: 'Tersedia'
      },
      {
        id: 'IN-20260625-0900',
        tanggalMasuk: '2026-06-25 09:00',
        kodeLimbah: 'B109d',
        namaLimbah: 'Filter bekas fasilitas pencemaran udara',
        sumber: 'Area Genset Powerhouse',
        jumlah: 70,
        satuan: 'Kg',
        fotoUrl: '',
        statusRintek: 'Terdaftar',
        batasSimpanHari: 90,
        tanggalJatuhTempo: '2026-09-23',
        operator: 'Operator Lapangan',
        statusStok: 'Tersedia'
      }
    ];
    localStorage.setItem('db_limbah_masuk', JSON.stringify(sampleMasuk));
  }

  // 5. Limbah Keluar
  if (!localStorage.getItem('db_limbah_keluar')) {
    const sampleKeluar = [
      {
        id: 'OUT-20260820-1100',
        refIdMasuk: 'IN-SAMPLE-000',
        tanggalKeluar: '2026-08-20 11:00',
        kodeLimbah: 'B105d',
        namaLimbah: 'Minyak pelumas bekas',
        jumlah: 1000,
        satuan: 'Liter',
        tujuanPihakKetiga: 'PT. Berkat Jaya Sukses',
        suratJalan: 'SJ/EMJ/2026/08/01',
        manifes: 'FEST-202608-99120',
        operator: 'Operator Lapangan',
        status: 'Keluar Terkonfirmasi'
      }
    ];
    localStorage.setItem('db_limbah_keluar', JSON.stringify(sampleKeluar));
  }

  // 6. Penanganan Khusus
  if (!localStorage.getItem('db_penanganan_khusus')) {
    localStorage.setItem('db_penanganan_khusus', JSON.stringify([]));
  }

  // 7. Inspeksi TPS
  if (!localStorage.getItem('db_inspeksi')) {
    const sampleInspeksi = [
      { id: 'INSP-20260918-01', tanggal: '2026-09-18 09:00', itemChecklist: 'Alat Pemadam Api Ringan (APAR)', kondisi: 'Baik', catatan: 'Pressure gauge di zona hijau, pin segel utuh', operator: 'Operator Lapangan' },
      { id: 'INSP-20260918-02', tanggal: '2026-09-18 09:05', itemChecklist: 'Fasilitas Eyewash Station', kondisi: 'Baik', catatan: 'Aliran air bersih mengalir normal', operator: 'Operator Lapangan' },
      { id: 'INSP-20260918-03', tanggal: '2026-09-18 09:10', itemChecklist: 'Saluran Drainase Ceceran & Bak Oil Catcher (50x50x50 cm)', kondisi: 'Baik', catatan: 'Bersih dari sumbatan pasir/kotoran', operator: 'Operator Lapangan' }
    ];
    localStorage.setItem('db_inspeksi', JSON.stringify(sampleInspeksi));
  }

  // 8. Neraca Limbah B3 (Sample Awal dengan Nomor Resmi & Dokumen Kontrol)
  if (!localStorage.getItem('db_neraca')) {
    const sampleNeraca = [
      {
        id: 'NERACA-2026-09',
        nomorDokumen: '001/PLB3/ENV-HSE/IX/2026',
        namaPerusahaan: 'PT. Etam Manunggal Jaya',
        bidangUsaha: 'Pertambangan Batubara',
        periode: 'September 2026',
        bulan: 9,
        tahun: 2026,
        dokumenKontrol: 'Melampirkan Manifes Festronik',
        dataA: '2.805',
        dataB: {
          disimpan: '1.805',
          dimanfaatkan: '0.000',
          diolah: '0.000',
          ditimbun: '0.000',
          diserahkanPihakKetiga: '1.000',
          ekspor: '0.000',
          lainnya: '0.000'
        },
        dataC: '0.000',
        dataD: '0.000',
        kinerja: '100.00%',
        status: 'Menunggu Pengesahan KTT',
        ttdOperator: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="140" height="50" viewBox="0 0 140 50"><text x="10" y="34" font-family="Brush Script MT, cursive, sans-serif" font-size="24" font-weight="bold" fill="#0f172a">Operator</text></svg>'),
        ttdPJ: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="140" height="50" viewBox="0 0 140 50"><text x="10" y="34" font-family="Brush Script MT, cursive, sans-serif" font-size="24" font-weight="bold" fill="#0f172a">Hermanto</text></svg>'),
        ttdKTT: '',
        createdAt: '2026-09-15'
      }
    ];
    localStorage.setItem('db_neraca', JSON.stringify(sampleNeraca));
  }

  // Migrasi otomatis data neraca lama agar tidak bocor akibat tanda kutip SVG
  try {
    const rawNeraca = localStorage.getItem('db_neraca');
    if (rawNeraca) {
      const parsedNeraca = JSON.parse(rawNeraca);
      let needsUpdate = false;
      parsedNeraca.forEach(item => {
        if (item.ttdOperator && (item.ttdOperator.includes('<svg') || item.ttdOperator.includes('"'))) {
          item.ttdOperator = safeSignatureUrl(item.ttdOperator);
          needsUpdate = true;
        }
        if (item.ttdPJ && (item.ttdPJ.includes('<svg') || item.ttdPJ.includes('"'))) {
          item.ttdPJ = safeSignatureUrl(item.ttdPJ);
          needsUpdate = true;
        }
        if (item.ttdKTT && (item.ttdKTT.includes('<svg') || item.ttdKTT.includes('"'))) {
          item.ttdKTT = safeSignatureUrl(item.ttdKTT);
          needsUpdate = true;
        }
      });
      if (needsUpdate) {
        localStorage.setItem('db_neraca', JSON.stringify(parsedNeraca));
      }
    }
  } catch(e) {}

  // 9. Audit Logs
  if (!localStorage.getItem('db_audit')) {
    const sampleAudit = [
      { id: 'LOG-01', user: 'System', aksi: 'SETUP_DATABASE', timestamp: '2026-09-01 08:00', keterangan: 'Database TPS LB3 01 berhasil diinisialisasi' }
    ];
    localStorage.setItem('db_audit', JSON.stringify(sampleAudit));
  }

  // 10. Pengaturan Identitas Perusahaan
  if (!localStorage.getItem('db_settings')) {
    const defaultSettings = {
      namaPerusahaan: 'PT. Etam Manunggal Jaya',
      bidangUsaha: 'Pertambangan Batubara',
      alamatKantor: 'Jalan S. Parman No. 6, Kota Samarinda, Kalimantan Timur',
      telpPerusahaan: '0541-748920',
      emailPerusahaan: 'info@etammanunggal.co.id',
      lokasiTps: 'Desa Batuah, Kec. Loa Janan, Kab. Kutai Kartanegara, Kaltim (00°48\'04,6" LS / 117°04\'41,9" BT)',
      luasTps: '52.5 m²',
      kapasitasMaksTon: '20',
      pjTeknis: 'Hermanto (Direktur / PJ TPS)',
      logoBase64: '',
      loginBgBase64: ''
    };
    localStorage.setItem('db_settings', JSON.stringify(defaultSettings));
  }
}

function applyCompanySettingsUI() {
  const cfg = JSON.parse(localStorage.getItem('db_settings') || '{}');
  
  if (cfg.namaPerusahaan) {
    document.getElementById('authCompanyDisplay').textContent = cfg.namaPerusahaan;
    document.getElementById('sidebarCompanyDisplay').textContent = cfg.namaPerusahaan;
    document.getElementById('kopLogbookNamaPerusahaan').textContent = cfg.namaPerusahaan.toUpperCase();
    document.getElementById('kopNeracaNamaPerusahaan').textContent = cfg.namaPerusahaan.toUpperCase();
    document.getElementById('printNeracaPerusahaan').textContent = cfg.namaPerusahaan;
    document.getElementById('neracaPerusahaanAuto').value = cfg.namaPerusahaan;
  }

  if (cfg.bidangUsaha) {
    document.getElementById('printNeracaBidangUsaha').textContent = cfg.bidangUsaha;
    document.getElementById('neracaBidangUsahaAuto').value = cfg.bidangUsaha;
  }

  if (cfg.alamatKantor) {
    document.getElementById('authAddressDisplay').textContent = `${cfg.alamatKantor} • TPS LB3 01`;
    document.getElementById('kopLogbookAlamat').textContent = cfg.alamatKantor;
    document.getElementById('kopNeracaAlamat').textContent = cfg.alamatKantor;
  }

  if (cfg.telpPerusahaan || cfg.emailPerusahaan) {
    const kontakStr = `Telp: ${cfg.telpPerusahaan || '-'} • Email: ${cfg.emailPerusahaan || '-'}`;
    document.getElementById('kopLogbookKontak').textContent = kontakStr;
    document.getElementById('kopNeracaKontak').textContent = kontakStr;
  }

  if (cfg.lokasiTps) {
    document.getElementById('topbarLocationDisplay').textContent = cfg.lokasiTps.split('(')[0].trim();
  }

  if (cfg.kapasitasMaksTon) {
    document.getElementById('statCapTonLabel').textContent = cfg.kapasitasMaksTon;
  }

  if (cfg.logoBase64) {
    const sbLogoImg = document.getElementById('sidebarLogoImg');
    const sbLogoIcon = document.getElementById('sidebarLogoIcon');
    sbLogoImg.src = cfg.logoBase64;
    sbLogoImg.classList.remove('hidden');
    sbLogoIcon.classList.add('hidden');

    const lgnLogoImg = document.getElementById('loginLogoImg');
    const lgnLogoIcon = document.getElementById('loginLogoIcon');
    lgnLogoImg.src = cfg.logoBase64;
    lgnLogoImg.classList.remove('hidden');
    lgnLogoIcon.classList.add('hidden');

    document.getElementById('kopLogbookLogo').src = cfg.logoBase64;
    document.getElementById('kopNeracaLogo').src = cfg.logoBase64;

    const prev = document.getElementById('settingsLogoPreview');
    prev.innerHTML = `<img src="${cfg.logoBase64}" class="w-full h-full object-contain">`;
  }

  if (cfg.loginBgBase64) {
    const bgDiv = document.getElementById('authBackdropGraphic');
    if (bgDiv) bgDiv.style.backgroundImage = `url('${cfg.loginBgBase64}')`;
  }

  document.getElementById('setPerusahaan').value = cfg.namaPerusahaan || '';
  document.getElementById('setBidangUsaha').value = cfg.bidangUsaha || '';
  document.getElementById('setAlamatKantor').value = cfg.alamatKantor || '';
  document.getElementById('setTelp').value = cfg.telpPerusahaan || '';
  document.getElementById('setEmail').value = cfg.emailPerusahaan || '';
  document.getElementById('setLokasi').value = cfg.lokasiTps || '';
  document.getElementById('setLuas').value = cfg.luasTps || '';
  document.getElementById('setKapasitas').value = cfg.kapasitasMaksTon || '';
  document.getElementById('setPJ').value = cfg.pjTeknis || '';
}

// ==========================================================================
// 2. AUTHENTICATION & ROLE ACCESS CONTROL (RBAC - Revisi #5)
// ==========================================================================
function checkAuthSession() {
  const sessionStr = localStorage.getItem('enviromine_session');
  if (sessionStr) {
    try {
      STATE.currentUser = JSON.parse(sessionStr);
      showAppShell();
    } catch (e) {
      showAuthView();
    }
  } else {
    showAuthView();
  }
}

function handleLoginSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  const users = JSON.parse(localStorage.getItem('db_users') || '[]');
  const foundUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!foundUser) {
    showToast('Username tidak ditemukan.', 'error');
    return;
  }

  if (foundUser.password !== password) {
    showToast('Password salah.', 'error');
    return;
  }

  if (foundUser.status !== 'Aktif') {
    showToast('Akun Anda dinonaktifkan. Hubungi Admin HSE.', 'error');
    return;
  }

  STATE.currentUser = {
    id: foundUser.id,
    nama: foundUser.nama,
    username: foundUser.username,
    role: foundUser.role,
    fotoProfil: foundUser.fotoProfil || ''
  };

  localStorage.setItem('enviromine_session', JSON.stringify(STATE.currentUser));
  addAuditLog(STATE.currentUser.nama, 'LOGIN', 'Berhasil login ke sistem');
  showToast(`Selamat datang, ${STATE.currentUser.nama}!`, 'success');
  showAppShell();
}

function quickFillLogin(username, password) {
  document.getElementById('loginUsername').value = username;
  document.getElementById('loginPassword').value = password;
  const btn = document.getElementById('btnLoginSubmit');
  btn.classList.add('ring-4', 'ring-vault-lime/50');
  setTimeout(() => {
    btn.classList.remove('ring-4', 'ring-vault-lime/50');
    btn.click();
  }, 300);
}

function handleLogout() {
  if (confirm('Apakah Anda yakin ingin keluar dari sistem?')) {
    if (STATE.currentUser) {
      addAuditLog(STATE.currentUser.nama, 'LOGOUT', 'Keluar dari sistem');
    }
    localStorage.removeItem('enviromine_session');
    STATE.currentUser = null;
    showAuthView();
    showToast('Anda telah keluar dari sistem.', 'info');
  }
}

function showAuthView() {
  document.getElementById('authView').classList.remove('hidden');
  document.getElementById('appShell').classList.add('hidden');
}

function showAppShell() {
  document.getElementById('authView').classList.add('hidden');
  document.getElementById('appShell').classList.remove('hidden');
  
  updateUserSessionUI();
  applyRoleVisibility(); // Enforce RBAC
  navigateTo('dashboard');
  lucide.createIcons();
}

function updateUserSessionUI() {
  if (!STATE.currentUser) return;
  document.getElementById('userNameDisplay').textContent = STATE.currentUser.nama;
  document.getElementById('userRoleBadge').textContent = STATE.currentUser.role;

  const avEl = document.getElementById('userAvatar');
  if (STATE.currentUser.fotoProfil) {
    avEl.innerHTML = `<img src="${STATE.currentUser.fotoProfil}" class="w-full h-full object-cover">`;
  } else {
    avEl.textContent = STATE.currentUser.nama.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }
}

// RBAC: Operator tidak boleh mengakses manajemen pengguna & pengaturan TPS (Revisi #5)
function applyRoleVisibility() {
  if (!STATE.currentUser) return;
  const role = STATE.currentUser.role;

  const navUsers = document.getElementById('nav-users');
  const navSettings = document.getElementById('nav-settings');
  const adminSection = document.getElementById('sidebarSectionAdmin');

  if (role === 'Operator') {
    // Sembunyikan menu Users dan Settings untuk Operator
    if (navUsers) navUsers.style.display = 'none';
    if (navSettings) navSettings.style.display = 'none';
  } else if (role === 'Penanggung Jawab') {
    if (navUsers) navUsers.style.display = 'none';
    if (navSettings) navSettings.style.display = 'flex';
  } else {
    // Admin HSE & KTT
    if (navUsers) navUsers.style.display = 'flex';
    if (navSettings) navSettings.style.display = 'flex';
  }
}

function togglePasswordVisibility() {
  const pwdInput = document.getElementById('loginPassword');
  const icon = document.getElementById('eyeIcon');
  if (pwdInput.type === 'password') {
    pwdInput.type = 'text';
    icon.setAttribute('data-lucide', 'eye-off');
  } else {
    pwdInput.type = 'password';
    icon.setAttribute('data-lucide', 'eye');
  }
  lucide.createIcons();
}

function handleForgotPassword() {
  alert('Permintaan reset password telah dikirimkan ke Admin HSE / Lingkungan.');
  addAuditLog('User Guest', 'FORGOT_PASSWORD', 'Pengajuan reset password');
}

// --- MODAL PROFIL PENGGUNA ---
function openModalUserProfile() {
  if (!STATE.currentUser) return;
  const users = JSON.parse(localStorage.getItem('db_users') || '[]');
  const u = users.find(usr => usr.id === STATE.currentUser.id) || STATE.currentUser;

  document.getElementById('profNama').value = u.nama;
  document.getElementById('profUsername').value = u.username;
  document.getElementById('profRole').value = u.role;

  document.getElementById('profCurrentPass').value = '';
  document.getElementById('profNewPass').value = '';
  document.getElementById('profConfirmPass').value = '';
  STATE.tempProfilePhoto = u.fotoProfil || '';

  renderProfilePhotoPreview(STATE.tempProfilePhoto, u.nama);
  openModal('modalUserProfile');
}

function renderProfilePhotoPreview(photoUrl, name) {
  const container = document.getElementById('profilePhotoPreview');
  if (photoUrl) {
    container.innerHTML = `<img src="${photoUrl}" class="w-full h-full object-cover">`;
  } else {
    const initials = (name || 'User').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    container.innerHTML = initials;
  }
}

function handleProfilePhotoChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    STATE.tempProfilePhoto = event.target.result;
    renderProfilePhotoPreview(STATE.tempProfilePhoto, document.getElementById('profNama').value);
  };
  reader.readAsDataURL(file);
}

function handleSaveUserProfile(e) {
  e.preventDefault();
  const nama = document.getElementById('profNama').value.trim();
  const username = document.getElementById('profUsername').value.trim();
  const curPass = document.getElementById('profCurrentPass').value;
  const newPass = document.getElementById('profNewPass').value;
  const confPass = document.getElementById('profConfirmPass').value;

  const users = JSON.parse(localStorage.getItem('db_users') || '[]');
  const idx = users.findIndex(u => u.id === STATE.currentUser.id);

  if (idx === -1) {
    showToast('Data user tidak ditemukan.', 'error');
    return;
  }

  if (newPass) {
    if (users[idx].password !== curPass) {
      showToast('Password saat ini salah!', 'error');
      return;
    }
    if (newPass.length < 5) {
      showToast('Password baru minimal 5 karakter!', 'error');
      return;
    }
    if (newPass !== confPass) {
      showToast('Konfirmasi password baru tidak cocok!', 'error');
      return;
    }
    users[idx].password = newPass;
  }

  users[idx].nama = nama;
  users[idx].username = username;
  if (STATE.tempProfilePhoto !== null) {
    users[idx].fotoProfil = STATE.tempProfilePhoto;
  }

  localStorage.setItem('db_users', JSON.stringify(users));

  STATE.currentUser.nama = nama;
  STATE.currentUser.username = username;
  STATE.currentUser.fotoProfil = users[idx].fotoProfil;
  localStorage.setItem('enviromine_session', JSON.stringify(STATE.currentUser));

  updateUserSessionUI();
  addAuditLog(nama, 'UPDATE_PROFILE', 'Memperbarui profil akun & kata sandi');
  showToast('Profil pengguna berhasil diperbarui!', 'success');
  closeModal('modalUserProfile');
}

// ==========================================================================
// 3. NAVIGATION & ROUTING
// ==========================================================================
function navigateTo(viewName) {
  // Tutup drawer sidebar mobile jika sedang terbuka
  closeMobileSidebar();

  // Blokir akses role Operator ke users & settings (Revisi #5)
  if (STATE.currentUser && STATE.currentUser.role === 'Operator') {
    if (viewName === 'users' || viewName === 'settings') {
      showToast('Akses Dibatasi: Operator tidak memiliki wewenang untuk modul ini.', 'error');
      return;
    }
  }

  STATE.activeView = viewName;

  const views = [
    'dashboard', 'masuk', 'keluar', 'penanganan-khusus', 
    'inspeksi', 'logbook', 'neraca', 'ttd-online', 'rintek', 'pihak-ketiga', 'users', 'settings'
  ];

  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.add('hidden');

    const nav = document.getElementById(`nav-${v}`);
    if (nav) nav.classList.remove('active');
  });

  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.classList.remove('hidden');

  const targetNav = document.getElementById(`nav-${viewName}`);
  if (targetNav) targetNav.classList.add('active');

  switch (viewName) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'masuk':
      renderLimbahMasuk();
      break;
    case 'keluar':
      renderLimbahKeluar();
      break;
    case 'penanganan-khusus':
      renderPenangananKhusus();
      break;
    case 'inspeksi':
      renderInspeksi();
      break;
    case 'logbook':
      renderLogbook();
      break;
    case 'neraca':
      renderNeraca();
      break;
    case 'ttd-online':
      renderStudioTtd(); // Studio TTD Online
      break;
    case 'rintek':
      renderMasterRintek();
      break;
    case 'pihak-ketiga':
      renderMasterPihakKetiga();
      break;
    case 'users':
      renderMasterUsers();
      break;
    case 'settings':
      renderSettingsAndAudit();
      break;
  }

  lucide.createIcons();
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!sidebar) return;
  const isOpen = sidebar.classList.contains('mobile-open');
  if (isOpen) {
    closeMobileSidebar();
  } else {
    sidebar.classList.add('mobile-open');
    if (backdrop) backdrop.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
}

function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (backdrop) backdrop.classList.add('hidden');
  document.body.style.overflow = '';
}

function toggleSidebarCollapse() {
  const sb = document.getElementById('sidebar');
  STATE.sidebarCollapsed = !STATE.sidebarCollapsed;
  if (STATE.sidebarCollapsed) {
    sb.classList.add('collapsed');
  } else {
    sb.classList.remove('collapsed');
  }
}

// ==========================================================================
// 4. VIEW RENDERERS & LOGIC
// ==========================================================================

// --- 4.1 DASHBOARD ---
function renderDashboard() {
  const masuk = JSON.parse(localStorage.getItem('db_limbah_masuk') || '[]');
  const keluar = JSON.parse(localStorage.getItem('db_limbah_keluar') || '[]');
  const pkList = JSON.parse(localStorage.getItem('db_penanganan_khusus') || '[]');
  const neracaList = JSON.parse(localStorage.getItem('db_neraca') || '[]');
  const cfg = JSON.parse(localStorage.getItem('db_settings') || '{}');

  let totalStokKg = 0;
  let h7AlertCount = 0;
  const stokKategoriMap = {};
  const today = new Date();

  masuk.forEach(m => {
    if (m.statusStok === 'Tersedia') {
      const jlh = parseFloat(m.jumlah) || 0;
      totalStokKg += jlh;
      stokKategoriMap[m.namaLimbah] = (stokKategoriMap[m.namaLimbah] || 0) + jlh;

      if (m.tanggalJatuhTempo) {
        const tempoDate = new Date(m.tanggalJatuhTempo);
        const diffDays = Math.ceil((tempoDate - today) / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
          h7AlertCount++;
        }
      }
    }
  });

  const totalStokTon = (totalStokKg / 1000).toFixed(2);
  document.getElementById('statTotalStokKg').textContent = totalStokKg.toLocaleString('id-ID');
  document.getElementById('statTotalStokTon').textContent = `≈ ${totalStokTon} Ton`;

  const kapasitasTon = parseFloat(cfg.kapasitasMaksTon) || 20;
  const kapasitasMaksKg = kapasitasTon * 1000;
  const persenKapasitas = Math.min(100, ((totalStokKg / kapasitasMaksKg) * 100)).toFixed(1);
  document.getElementById('statPersenKapasitas').textContent = `${persenKapasitas}%`;

  const bar = document.getElementById('statProgressBar');
  const badgeKapasitas = document.getElementById('statKapasitasStatus');
  bar.style.width = `${persenKapasitas}%`;

  if (persenKapasitas >= 100) {
    bar.className = 'bg-rose-500 h-full rounded-full';
    badgeKapasitas.className = 'badge-status badge-red';
    badgeKapasitas.textContent = 'Penuh (100%)';
  } else if (persenKapasitas >= 80) {
    bar.className = 'bg-amber-500 h-full rounded-full';
    badgeKapasitas.className = 'badge-status badge-yellow';
    badgeKapasitas.textContent = 'Peringatan ≥80%';
  } else {
    bar.className = 'bg-vault-lime h-full rounded-full';
    badgeKapasitas.className = 'badge-status badge-green';
    badgeKapasitas.textContent = 'Aman (<80%)';
  }

  document.getElementById('statAlertH7Count').textContent = h7AlertCount;
  const alertBanner = document.getElementById('complianceAlertBanner');
  if (h7AlertCount > 0) {
    alertBanner.classList.remove('hidden');
    document.getElementById('complianceAlertText').textContent = 
      `Terdapat ${h7AlertCount} item limbah B3 di TPS 01 yang sisa masa simpannya ≤ 7 hari sebelum jatuh tempo. Segera jadwalkan pengangkutan ke pihak ketiga!`;
  } else {
    alertBanner.classList.add('hidden');
  }

  const pendingPK = pkList.filter(p => p.status === 'Pending').length;
  const pendingNeraca = neracaList.filter(n => n.status !== 'Final').length;
  document.getElementById('statPendingApproval').textContent = pendingPK + pendingNeraca;
  document.getElementById('badgePendingPK').textContent = pendingPK;

  const katContainer = document.getElementById('stokKategoriList');
  katContainer.innerHTML = '';
  const rintek = JSON.parse(localStorage.getItem('db_rintek') || '[]');
  document.getElementById('dashRintekCountBadge').textContent = `${rintek.length} Terdaftar`;

  rintek.slice(0, 5).forEach(r => {
    const currentStok = stokKategoriMap[r.namaLimbah] || 0;
    const itemEl = document.createElement('div');
    itemEl.className = 'flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs';
    itemEl.innerHTML = `
      <div class="overflow-hidden pr-2">
        <p class="font-semibold text-slate-200 truncate">${r.namaLimbah}</p>
        <span class="text-[10px] text-sky-400 font-mono">${r.kodeLimbah} &bull; ${r.karakteristik}</span>
      </div>
      <div class="text-right shrink-0">
        <p class="font-bold text-white font-mono">${currentStok.toLocaleString('id-ID')} ${r.satuan}</p>
        <span class="text-[10px] text-slate-400">Max ${r.batasSimpanHari} hari</span>
      </div>
    `;
    katContainer.appendChild(itemEl);
  });

  const recentTable = document.getElementById('dashboardRecentTableBody');
  recentTable.innerHTML = '';
  const recentItems = masuk.slice(-5).reverse();

  if (recentItems.length === 0) {
    recentTable.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-slate-500">Belum ada transaksi limbah.</td></tr>`;
  } else {
    recentItems.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="font-mono text-sky-400 font-medium">${item.id}</td>
        <td>
          <div class="font-semibold text-white">${item.namaLimbah}</div>
          <span class="text-xs text-slate-400 font-mono">${item.kodeLimbah}</span>
        </td>
        <td class="font-mono font-bold">${item.jumlah} ${item.satuan}</td>
        <td>
          <span class="badge-status ${item.statusRintek === 'Terdaftar' ? 'badge-green' : 'badge-yellow'}">
            ${item.statusRintek}
          </span>
        </td>
        <td>
          <span class="badge-status ${item.statusStok === 'Tersedia' ? 'badge-lime' : 'badge-blue'}">
            ${item.statusStok}
          </span>
        </td>
        <td class="text-slate-400">${item.operator}</td>
      `;
      recentTable.appendChild(tr);
    });
  }

  renderTimbulanChart(masuk, keluar);
}

function renderTimbulanChart(masuk, keluar) {
  const ctx = document.getElementById('timbulanChart');
  if (!ctx) return;

  if (STATE.chartInstance) {
    STATE.chartInstance.destroy();
  }

  const labels = ['Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober'];
  const dataMasuk = [1400, 1950, 2200, 1850, 2450, 2100];
  const dataKeluar = [1000, 1500, 1800, 1600, 2000, 1900];

  STATE.chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Limbah Masuk (Kg)',
          data: dataMasuk,
          borderColor: '#d4f933',
          backgroundColor: 'rgba(212, 249, 51, 0.08)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#d4f933',
          borderWidth: 2.5
        },
        {
          label: 'Diserahkan ke Pihak Ketiga (Kg)',
          data: dataKeluar,
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.04)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#38bdf8',
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#64748b' } },
        y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#64748b' } }
      }
    }
  });
}

// --- 4.2 LIMBAH MASUK ---
function renderLimbahMasuk(filteredData = null) {
  populateFilterMasukRintek();

  const table = document.getElementById('tableLimbahMasukBody');
  const rawData = JSON.parse(localStorage.getItem('db_limbah_masuk') || '[]');
  const data = filteredData || rawData;
  table.innerHTML = '';

  if (data.length === 0) {
    table.innerHTML = `<tr><td colspan="11" class="text-center py-6 text-slate-500">Tidak ada data limbah masuk yang cocok dengan filter.</td></tr>`;
    return;
  }

  const today = new Date();

  data.slice().reverse().forEach(item => {
    let sisaHari = '-';
    let sisaBadge = 'badge-green';

    if (item.tanggalJatuhTempo) {
      const diff = Math.ceil((new Date(item.tanggalJatuhTempo) - today) / (1000 * 60 * 60 * 24));
      sisaHari = `${diff} hari`;
      if (diff <= 7 && diff >= 0) {
        sisaBadge = 'badge-yellow animate-pulse';
      } else if (diff < 0) {
        sisaBadge = 'badge-red';
        sisaHari = `Overdue (${Math.abs(diff)} h)`;
      }
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="font-mono text-sky-400 font-medium">${item.id}</td>
      <td class="text-xs text-slate-300">${item.tanggalMasuk}</td>
      <td class="font-mono text-vault-lime font-bold">${item.kodeLimbah}</td>
      <td class="font-semibold text-white">${item.namaLimbah}</td>
      <td class="font-mono font-bold">${item.jumlah} ${item.satuan}</td>
      <td><span class="badge-status ${item.statusRintek === 'Terdaftar' ? 'badge-green' : 'badge-yellow'}">${item.statusRintek}</span></td>
      <td class="font-mono text-xs text-slate-300">${item.tanggalJatuhTempo || '-'}</td>
      <td><span class="badge-status ${sisaBadge}">${sisaHari}</span></td>
      <td class="text-slate-400">${item.operator}</td>
      <td><span class="badge-status ${item.statusStok === 'Tersedia' ? 'badge-lime' : 'badge-blue'}">${item.statusStok}</span></td>
      <td>
        <div class="flex items-center gap-1.5">
          ${item.statusStok === 'Tersedia' ? `
            <button onclick="quickKeluarLimbah('${item.id}')" class="btn-action-sm bg-sky-500/20 text-sky-300 border border-sky-500/40 hover:bg-sky-500/30" title="Keluarkan Limbah">Keluarkan</button>
          ` : ''}
          <button onclick="openModalEditLimbahMasuk('${item.id}')" class="btn-action-sm btn-edit" title="Edit Limbah Masuk"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i></button>
          <button onclick="deleteLimbahMasuk('${item.id}')" class="btn-action-sm btn-delete" title="Hapus Limbah Masuk"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
        </div>
      </td>
    `;
    table.appendChild(tr);
  });
  if (window.lucide) lucide.createIcons();
}

function populateFilterMasukRintek() {
  const sel = document.getElementById('filterMasukRintek');
  if (sel && sel.options.length <= 1) {
    const rintek = JSON.parse(localStorage.getItem('db_rintek') || '[]');
    rintek.forEach(r => {
      sel.innerHTML += `<option value="${r.kodeLimbah}">${r.namaLimbah} (${r.kodeLimbah})</option>`;
    });
  }
}

function applyFilterLimbahMasuk() {
  const search = (document.getElementById('filterMasukSearch').value || '').toLowerCase();
  const kode = document.getElementById('filterMasukRintek').value;
  const stok = document.getElementById('filterMasukStok').value;
  const tglDari = document.getElementById('filterMasukTglDari').value;
  const tglSampai = document.getElementById('filterMasukTglSampai').value;

  let list = JSON.parse(localStorage.getItem('db_limbah_masuk') || '[]');

  if (search) {
    list = list.filter(m => m.namaLimbah.toLowerCase().includes(search) || m.id.toLowerCase().includes(search) || m.kodeLimbah.toLowerCase().includes(search));
  }
  if (kode) list = list.filter(m => m.kodeLimbah === kode);
  if (stok) list = list.filter(m => m.statusStok === stok);
  if (tglDari) list = list.filter(m => m.tanggalMasuk.slice(0, 10) >= tglDari);
  if (tglSampai) list = list.filter(m => m.tanggalMasuk.slice(0, 10) <= tglSampai);

  renderLimbahMasuk(list);
}

function resetFilterLimbahMasuk() {
  document.getElementById('filterMasukSearch').value = '';
  document.getElementById('filterMasukRintek').value = '';
  document.getElementById('filterMasukStok').value = '';
  document.getElementById('filterMasukTglDari').value = '';
  document.getElementById('filterMasukTglSampai').value = '';
  renderLimbahMasuk();
}

function refreshLimbahMasuk() {
  resetFilterLimbahMasuk();
  showToast('Data Limbah Masuk disegarkan.', 'info');
}

function openModalLimbahMasuk() {
  populateRintekDropdown();
  document.getElementById('masukTanggal').value = new Date().toISOString().slice(0, 16);
  document.getElementById('formLimbahMasuk').reset();
  document.getElementById('nonRintekWarnBox').classList.add('hidden');
  openModal('modalLimbahMasuk');
}

function populateRintekDropdown() {
  const select = document.getElementById('masukJenisSelect');
  const rintek = JSON.parse(localStorage.getItem('db_rintek') || '[]');
  
  select.innerHTML = '<option value="">-- Pilih Limbah Terdaftar di Rintek --</option>';
  rintek.forEach(r => {
    select.innerHTML += `<option value="${r.kodeLimbah}">${r.namaLimbah} (${r.kodeLimbah})</option>`;
  });
  select.innerHTML += '<option value="CUSTOM_NON_RINTEK">+ Lainnya (Di Luar Rintek - Penanganan Khusus)</option>';
}

function handleSelectLimbahRintek(kode) {
  const rintekList = JSON.parse(localStorage.getItem('db_rintek') || '[]');
  const warnBox = document.getElementById('nonRintekWarnBox');

  if (kode === 'CUSTOM_NON_RINTEK') {
    warnBox.classList.remove('hidden');
    document.getElementById('masukKode').value = 'NON-RINTEK';
    document.getElementById('masukKarakteristik').value = 'Belum Terdaftar';
    document.getElementById('masukBatasHari').value = '90 (Standar)';
    return;
  }

  warnBox.classList.add('hidden');
  const found = rintekList.find(r => r.kodeLimbah === kode);
  if (found) {
    document.getElementById('masukKode').value = found.kodeLimbah;
    document.getElementById('masukKarakteristik').value = found.karakteristik;
    document.getElementById('masukSatuan').value = found.satuan;
    document.getElementById('masukBatasHari').value = `${found.batasSimpanHari} Hari`;
  }
}

function handleFormLimbahMasuk(e) {
  e.preventDefault();
  const selectVal = document.getElementById('masukJenisSelect').value;
  const kodeLimbah = document.getElementById('masukKode').value;
  const jumlah = parseFloat(document.getElementById('masukJumlah').value);
  const satuan = document.getElementById('masukSatuan').value;
  const tglMasuk = document.getElementById('masukTanggal').value;
  const batasHari = parseInt(document.getElementById('masukBatasHari').value) || 90;

  let namaLimbah = '';
  let statusRintek = 'Terdaftar';
  let sumber = 'Operasional Tambang';

  if (selectVal === 'CUSTOM_NON_RINTEK') {
    statusRintek = 'Penanganan Khusus';
    namaLimbah = prompt('Masukkan Nama Limbah Non-Rintek:', 'Residu Kimia Lab') || 'Limbah Khusus';
  } else {
    const rintekList = JSON.parse(localStorage.getItem('db_rintek') || '[]');
    const r = rintekList.find(item => item.kodeLimbah === kodeLimbah);
    namaLimbah = r ? r.namaLimbah : 'Limbah B3';
    sumber = r ? r.sumber : 'Operasional';
  }

  const tglMasukDate = new Date(tglMasuk);
  const tglTempo = new Date(tglMasukDate.getTime() + (batasHari * 24 * 60 * 60 * 1000));
  const tempoStr = tglTempo.toISOString().slice(0, 10);

  const newId = 'IN-' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 13);
  const operatorName = STATE.currentUser ? STATE.currentUser.nama : 'Operator Lapangan';

  const newEntry = {
    id: newId,
    tanggalMasuk: tglMasuk.replace('T', ' '),
    kodeLimbah: kodeLimbah,
    namaLimbah: namaLimbah,
    sumber: sumber,
    jumlah: jumlah,
    satuan: satuan,
    fotoUrl: '',
    statusRintek: statusRintek,
    batasSimpanHari: batasHari,
    tanggalJatuhTempo: tempoStr,
    operator: operatorName,
    statusStok: 'Tersedia'
  };

  const dbMasuk = JSON.parse(localStorage.getItem('db_limbah_masuk') || '[]');
  dbMasuk.push(newEntry);
  localStorage.setItem('db_limbah_masuk', JSON.stringify(dbMasuk));

  // Background Sync ke Google Apps Script
  syncMutationToGas('save_limbah_masuk', { data: newEntry });

  if (statusRintek === 'Penanganan Khusus') {
    const dbPK = JSON.parse(localStorage.getItem('db_penanganan_khusus') || '[]');
    dbPK.push({
      id: 'PK-' + newId,
      refIdMasuk: newId,
      kodeLimbah: kodeLimbah,
      namaLimbah: namaLimbah,
      alasan: document.getElementById('masukAlasanKhusus').value || 'Di luar rintek',
      status: 'Pending',
      approver: '-',
      catatan: '-'
    });
    localStorage.setItem('db_penanganan_khusus', JSON.stringify(dbPK));
    showToast('Peringatan: Masuk antrean Penanganan Khusus.', 'warning');
  } else {
    showToast('Limbah masuk berhasil dicatat.', 'success');
  }

  addAuditLog(operatorName, 'INPUT_LIMBAH_MASUK', `Mencatat limbah masuk: ${namaLimbah} (${jumlah} ${satuan})`);
  closeModal('modalLimbahMasuk');
  renderLimbahMasuk();
  renderDashboard();
}

function openModalEditLimbahMasuk(id) {
  const masukList = JSON.parse(localStorage.getItem('db_limbah_masuk') || '[]');
  const item = masukList.find(m => m.id === id);
  if (!item) {
    showToast('Data limbah masuk tidak ditemukan.', 'error');
    return;
  }

  // Populate Rintek dropdown
  const sel = document.getElementById('editMasukJenisSelect');
  const rintek = JSON.parse(localStorage.getItem('db_rintek') || '[]');
  sel.innerHTML = '<option value="">-- Pilih Limbah Rintek --</option>';
  rintek.forEach(r => {
    sel.innerHTML += `<option value="${r.kodeLimbah}" ${r.kodeLimbah === item.kodeLimbah ? 'selected' : ''}>${r.namaLimbah} (${r.kodeLimbah})</option>`;
  });
  sel.innerHTML += `<option value="CUSTOM_NON_RINTEK" ${item.statusRintek === 'Penanganan Khusus' ? 'selected' : ''}>+ Lainnya (Di Luar Rintek)</option>`;

  document.getElementById('editMasukId').value = item.id;
  document.getElementById('editMasukIdDisplay').value = item.id;
  document.getElementById('editMasukTanggal').value = (item.tanggalMasuk || '').replace(' ', 'T');
  document.getElementById('editMasukKode').value = item.kodeLimbah || '';
  document.getElementById('editMasukNama').value = item.namaLimbah || '';
  document.getElementById('editMasukSumber').value = item.sumber || '';
  document.getElementById('editMasukJumlah').value = item.jumlah || '';
  document.getElementById('editMasukSatuan').value = item.satuan || 'Kg';
  document.getElementById('editMasukBatasHari').value = item.batasSimpanHari || 90;
  document.getElementById('editMasukStatusStok').value = item.statusStok || 'Tersedia';

  openModal('modalEditLimbahMasuk');
}

function handleSelectEditLimbahRintek(kode) {
  if (!kode) return;
  if (kode === 'CUSTOM_NON_RINTEK') {
    document.getElementById('editMasukKode').value = 'NON-RINTEK';
    return;
  }
  const rintek = JSON.parse(localStorage.getItem('db_rintek') || '[]');
  const found = rintek.find(r => r.kodeLimbah === kode);
  if (found) {
    document.getElementById('editMasukKode').value = found.kodeLimbah;
    document.getElementById('editMasukNama').value = found.namaLimbah;
    document.getElementById('editMasukSumber').value = found.sumber;
    document.getElementById('editMasukSatuan').value = found.satuan;
    document.getElementById('editMasukBatasHari').value = found.batasSimpanHari;
  }
}

function handleSaveEditLimbahMasuk(e) {
  e.preventDefault();
  const id = document.getElementById('editMasukId').value;
  const list = JSON.parse(localStorage.getItem('db_limbah_masuk') || '[]');
  const idx = list.findIndex(m => m.id === id);
  if (idx === -1) {
    showToast('Data limbah masuk tidak ditemukan.', 'error');
    return;
  }

  const tglMasuk = document.getElementById('editMasukTanggal').value;
  const batasHari = parseInt(document.getElementById('editMasukBatasHari').value) || 90;
  const tglMasukDate = new Date(tglMasuk);
  const tglTempo = new Date(tglMasukDate.getTime() + (batasHari * 24 * 60 * 60 * 1000));

  list[idx].tanggalMasuk = tglMasuk.replace('T', ' ');
  list[idx].kodeLimbah = document.getElementById('editMasukKode').value.trim();
  list[idx].namaLimbah = document.getElementById('editMasukNama').value.trim();
  list[idx].sumber = document.getElementById('editMasukSumber').value.trim();
  list[idx].jumlah = parseFloat(document.getElementById('editMasukJumlah').value) || 0;
  list[idx].satuan = document.getElementById('editMasukSatuan').value;
  list[idx].batasSimpanHari = batasHari;
  list[idx].tanggalJatuhTempo = tglTempo.toISOString().slice(0, 10);
  list[idx].statusStok = document.getElementById('editMasukStatusStok').value;

  localStorage.setItem('db_limbah_masuk', JSON.stringify(list));
  syncMutationToGas('update_limbah_masuk', { id: id, data: list[idx] });

  addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Operator', 'EDIT_LIMBAH_MASUK', `Mengubah data limbah masuk: ${list[idx].namaLimbah} (${id})`);
  showToast('Data limbah masuk berhasil diperbarui.', 'success');
  closeModal('modalEditLimbahMasuk');
  renderLimbahMasuk();
  renderDashboard();
}

function deleteLimbahMasuk(id) {
  const list = JSON.parse(localStorage.getItem('db_limbah_masuk') || '[]');
  const item = list.find(m => m.id === id);
  if (!item) return;

  if (item.statusStok === 'Keluar') {
    if (!confirm(`Peringatan: Limbah masuk ${id} (${item.namaLimbah}) sudah tercatat berstatus Keluar. Menghapus limbah masuk ini dapat mempengaruhi riwayat pengeluaran. Tetap lanjutkan hapus?`)) {
      return;
    }
  } else {
    if (!confirm(`Apakah Anda yakin ingin menghapus data limbah masuk ${id} (${item.namaLimbah})?`)) {
      return;
    }
  }

  const updated = list.filter(m => m.id !== id);
  localStorage.setItem('db_limbah_masuk', JSON.stringify(updated));
  syncMutationToGas('delete_limbah_masuk', { id: id });
  addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Operator', 'DELETE_LIMBAH_MASUK', `Menghapus limbah masuk: ${item.namaLimbah} (${id})`);
  showToast('Data limbah masuk berhasil dihapus.', 'info');
  renderLimbahMasuk();
  renderDashboard();
}

// --- 4.3 LIMBAH KELUAR ---
function renderLimbahKeluar(filteredData = null) {
  populateFilterKeluarPK();

  const table = document.getElementById('tableLimbahKeluarBody');
  const rawData = JSON.parse(localStorage.getItem('db_limbah_keluar') || '[]');
  const data = filteredData || rawData;
  table.innerHTML = '';

  if (data.length === 0) {
    table.innerHTML = `<tr><td colspan="10" class="text-center py-6 text-slate-500">Tidak ada data limbah keluar yang cocok.</td></tr>`;
    return;
  }

  data.slice().reverse().forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="font-mono text-sky-400 font-medium">${item.id}</td>
      <td class="font-mono text-xs text-slate-400">${item.refIdMasuk}</td>
      <td class="text-xs text-slate-300">${item.tanggalKeluar}</td>
      <td class="font-semibold text-white">
        ${item.namaLimbah}
        <span class="text-xs text-slate-400 font-mono block">${item.kodeLimbah}</span>
      </td>
      <td class="font-mono font-bold">${item.jumlah} ${item.satuan}</td>
      <td class="text-slate-300">${item.tujuanPihakKetiga}</td>
      <td class="text-xs font-mono">
        <span class="text-sky-400 block">SJ: ${item.suratJalan}</span>
        <span class="text-emerald-400 block">Manifes: ${item.manifes}</span>
      </td>
      <td class="text-slate-400">${item.operator}</td>
      <td><span class="badge-status badge-lime"><i data-lucide="check" class="w-3 h-3"></i> Terkonfirmasi</span></td>
      <td>
        <div class="flex items-center gap-1.5">
          <button onclick="openModalEditLimbahKeluar('${item.id}')" class="btn-action-sm btn-edit" title="Edit Limbah Keluar"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i></button>
          <button onclick="deleteLimbahKeluar('${item.id}')" class="btn-action-sm btn-delete" title="Hapus Limbah Keluar"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
        </div>
      </td>
    `;
    table.appendChild(tr);
  });
  if (window.lucide) lucide.createIcons();
}

function populateFilterKeluarPK() {
  const sel = document.getElementById('filterKeluarPK');
  if (sel && sel.options.length <= 1) {
    const pkList = JSON.parse(localStorage.getItem('db_pihak_ketiga') || '[]');
    pkList.forEach(pk => {
      sel.innerHTML += `<option value="${pk.namaPerusahaan}">${pk.namaPerusahaan}</option>`;
    });
  }
}

function applyFilterLimbahKeluar() {
  const search = (document.getElementById('filterKeluarSearch').value || '').toLowerCase();
  const pk = document.getElementById('filterKeluarPK').value;
  const tglDari = document.getElementById('filterKeluarTglDari').value;
  const tglSampai = document.getElementById('filterKeluarTglSampai').value;

  let list = JSON.parse(localStorage.getItem('db_limbah_keluar') || '[]');

  if (search) {
    list = list.filter(k => (k.suratJalan && k.suratJalan.toLowerCase().includes(search)) || (k.manifes && k.manifes.toLowerCase().includes(search)) || k.namaLimbah.toLowerCase().includes(search));
  }
  if (pk) list = list.filter(k => k.tujuanPihakKetiga === pk);
  if (tglDari) list = list.filter(k => k.tanggalKeluar.slice(0, 10) >= tglDari);
  if (tglSampai) list = list.filter(k => k.tanggalKeluar.slice(0, 10) <= tglSampai);

  renderLimbahKeluar(list);
}

function resetFilterLimbahKeluar() {
  document.getElementById('filterKeluarSearch').value = '';
  document.getElementById('filterKeluarPK').value = '';
  document.getElementById('filterKeluarTglDari').value = '';
  document.getElementById('filterKeluarTglSampai').value = '';
  renderLimbahKeluar();
}

function refreshLimbahKeluar() {
  resetFilterLimbahKeluar();
  showToast('Data Limbah Keluar disegarkan.', 'info');
}

function openModalLimbahKeluar() {
  const select = document.getElementById('keluarRefMasukSelect');
  const masuk = JSON.parse(localStorage.getItem('db_limbah_masuk') || '[]');
  const tersedia = masuk.filter(m => m.statusStok === 'Tersedia');

  select.innerHTML = '<option value="">-- Pilih dari Stok Masuk yang Tersedia --</option>';
  tersedia.forEach(t => {
    select.innerHTML += `<option value="${t.id}">${t.id} - ${t.namaLimbah} (Sisa: ${t.jumlah} ${t.satuan})</option>`;
  });

  const pkSelect = document.getElementById('keluarPihakKetigaSelect');
  const pihakKetiga = JSON.parse(localStorage.getItem('db_pihak_ketiga') || '[]');
  pkSelect.innerHTML = '';
  pihakKetiga.forEach(pk => {
    pkSelect.innerHTML += `<option value="${pk.namaPerusahaan}">${pk.namaPerusahaan} (${pk.noIzin})</option>`;
  });

  document.getElementById('keluarTanggal').value = new Date().toISOString().slice(0, 16);
  openModal('modalLimbahKeluar');
}

function quickKeluarLimbah(idMasuk) {
  openModalLimbahKeluar();
  document.getElementById('keluarRefMasukSelect').value = idMasuk;
  handleSelectStokKeluar(idMasuk);
}

function handleSelectStokKeluar(idMasuk) {
  const masuk = JSON.parse(localStorage.getItem('db_limbah_masuk') || '[]');
  const item = masuk.find(m => m.id === idMasuk);
  if (item) {
    document.getElementById('keluarJumlah').value = item.jumlah;
  }
}

function handleFormLimbahKeluar(e) {
  e.preventDefault();
  const refId = document.getElementById('keluarRefMasukSelect').value;
  const jumlah = parseFloat(document.getElementById('keluarJumlah').value);
  const tanggal = document.getElementById('keluarTanggal').value;
  const tujuan = document.getElementById('keluarPihakKetigaSelect').value;
  const noSJ = document.getElementById('keluarNoSJ').value.trim();
  const noManifes = document.getElementById('keluarNoManifes').value.trim();

  const masukList = JSON.parse(localStorage.getItem('db_limbah_masuk') || '[]');
  const itemIdx = masukList.findIndex(m => m.id === refId);

  if (itemIdx === -1) {
    showToast('Referensi limbah tidak valid.', 'error');
    return;
  }

  const itemMasuk = masukList[itemIdx];
  itemMasuk.statusStok = 'Keluar';
  localStorage.setItem('db_limbah_masuk', JSON.stringify(masukList));

  const newOutId = 'OUT-' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 13);
  const operatorName = STATE.currentUser ? STATE.currentUser.nama : 'Operator Lapangan';

  const newOutEntry = {
    id: newOutId,
    refIdMasuk: refId,
    tanggalKeluar: tanggal.replace('T', ' '),
    kodeLimbah: itemMasuk.kodeLimbah,
    namaLimbah: itemMasuk.namaLimbah,
    jumlah: jumlah,
    satuan: itemMasuk.satuan,
    tujuanPihakKetiga: tujuan,
    suratJalan: noSJ,
    manifes: noManifes,
    operator: operatorName,
    status: 'Keluar Terkonfirmasi'
  };

  const keluarList = JSON.parse(localStorage.getItem('db_limbah_keluar') || '[]');
  keluarList.push(newOutEntry);
  localStorage.setItem('db_limbah_keluar', JSON.stringify(keluarList));

  // Sync to GAS
  syncMutationToGas('save_limbah_keluar', { data: newOutEntry });

  addAuditLog(operatorName, 'INPUT_LIMBAH_KELUAR', `Menyerahkan limbah ${itemMasuk.namaLimbah} (${jumlah} ${itemMasuk.satuan}) ke ${tujuan}`);
  showToast('Pengeluaran limbah berhasil dicatat.', 'success');

  closeModal('modalLimbahKeluar');
  renderLimbahKeluar();
  renderDashboard();
}

function openModalEditLimbahKeluar(id) {
  const keluarList = JSON.parse(localStorage.getItem('db_limbah_keluar') || '[]');
  const item = keluarList.find(k => k.id === id);
  if (!item) {
    showToast('Data limbah keluar tidak ditemukan.', 'error');
    return;
  }

  // Populate Pihak Ketiga dropdown
  const pkSelect = document.getElementById('editKeluarPihakKetiga');
  const pihakKetiga = JSON.parse(localStorage.getItem('db_pihak_ketiga') || '[]');
  pkSelect.innerHTML = '';
  pihakKetiga.forEach(pk => {
    pkSelect.innerHTML += `<option value="${pk.namaPerusahaan}" ${pk.namaPerusahaan === item.tujuanPihakKetiga ? 'selected' : ''}>${pk.namaPerusahaan} (${pk.noIzin})</option>`;
  });

  document.getElementById('editKeluarId').value = item.id;
  document.getElementById('editKeluarIdDisplay').value = item.id;
  document.getElementById('editKeluarRefMasuk').value = item.refIdMasuk || '-';
  document.getElementById('editKeluarNamaLimbah').value = `${item.namaLimbah} (${item.kodeLimbah})`;
  document.getElementById('editKeluarTanggal').value = (item.tanggalKeluar || '').replace(' ', 'T');
  document.getElementById('editKeluarJumlah').value = item.jumlah || '';
  document.getElementById('editKeluarNoSJ').value = item.suratJalan || '';
  document.getElementById('editKeluarNoManifes').value = item.manifes || '';

  openModal('modalEditLimbahKeluar');
}

function handleSaveEditLimbahKeluar(e) {
  e.preventDefault();
  const id = document.getElementById('editKeluarId').value;
  const list = JSON.parse(localStorage.getItem('db_limbah_keluar') || '[]');
  const idx = list.findIndex(k => k.id === id);
  if (idx === -1) {
    showToast('Data limbah keluar tidak ditemukan.', 'error');
    return;
  }

  const tglKeluar = document.getElementById('editKeluarTanggal').value;
  const jumlah = parseFloat(document.getElementById('editKeluarJumlah').value) || 0;
  const tujuan = document.getElementById('editKeluarPihakKetiga').value;
  const noSJ = document.getElementById('editKeluarNoSJ').value.trim();
  const noManifes = document.getElementById('editKeluarNoManifes').value.trim();

  list[idx].tanggalKeluar = tglKeluar.replace('T', ' ');
  list[idx].jumlah = jumlah;
  list[idx].tujuanPihakKetiga = tujuan;
  list[idx].suratJalan = noSJ;
  list[idx].manifes = noManifes;

  localStorage.setItem('db_limbah_keluar', JSON.stringify(list));
  syncMutationToGas('update_limbah_keluar', { id: id, data: list[idx] });

  addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Operator', 'EDIT_LIMBAH_KELUAR', `Mengubah transaksi limbah keluar: ${list[idx].namaLimbah} (${id})`);
  showToast('Data pengeluaran limbah berhasil diperbarui.', 'success');
  closeModal('modalEditLimbahKeluar');
  renderLimbahKeluar();
  renderDashboard();
}

function deleteLimbahKeluar(id) {
  const keluarList = JSON.parse(localStorage.getItem('db_limbah_keluar') || '[]');
  const item = keluarList.find(k => k.id === id);
  if (!item) return;

  if (!confirm(`Apakah Anda yakin ingin menghapus data limbah keluar ${id} (${item.namaLimbah})?\nStatus stok limbah masuk terkait (${item.refIdMasuk}) akan otomatis dikembalikan menjadi "Tersedia".`)) {
    return;
  }

  // Restore status in Limbah Masuk if refIdMasuk exists
  if (item.refIdMasuk) {
    const masukList = JSON.parse(localStorage.getItem('db_limbah_masuk') || '[]');
    const idxMasuk = masukList.findIndex(m => m.id === item.refIdMasuk);
    if (idxMasuk !== -1) {
      masukList[idxMasuk].statusStok = 'Tersedia';
      localStorage.setItem('db_limbah_masuk', JSON.stringify(masukList));
    }
  }

  const updatedKeluar = keluarList.filter(k => k.id !== id);
  localStorage.setItem('db_limbah_keluar', JSON.stringify(updatedKeluar));
  syncMutationToGas('delete_limbah_keluar', { id: id, refIdMasuk: item.refIdMasuk });

  addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Operator', 'DELETE_LIMBAH_KELUAR', `Menghapus limbah keluar: ${item.namaLimbah} (${id}), stok ${item.refIdMasuk} dikembalikan`);
  showToast('Data limbah keluar dihapus. Status stok limbah terkait kembali Tersedia.', 'info');

  renderLimbahKeluar();
  renderLimbahMasuk();
  renderDashboard();
}

// --- 4.4 PENANGANAN KHUSUS ---
function renderPenangananKhusus() {
  const table = document.getElementById('tablePenangananKhususBody');
  const data = JSON.parse(localStorage.getItem('db_penanganan_khusus') || '[]');
  table.innerHTML = '';

  if (data.length === 0) {
    table.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-slate-500">Tidak ada antrean limbah penanganan khusus. Seluruh limbah sesuai dengan Rintek TPS 01.</td></tr>`;
    return;
  }

  data.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="font-mono text-amber-400 font-medium">${item.id}</td>
      <td class="font-mono text-xs text-slate-400">${item.refIdMasuk}</td>
      <td class="font-semibold text-white">${item.namaLimbah}</td>
      <td class="text-xs text-slate-300">${item.alasan}</td>
      <td>
        <span class="badge-status ${item.status === 'Approved' ? 'badge-green' : item.status === 'Rejected' ? 'badge-red' : 'badge-yellow'}">
          ${item.status}
        </span>
      </td>
      <td class="text-slate-400">${item.approver}</td>
      <td class="text-xs text-slate-300">${item.catatan}</td>
      <td>
        ${item.status === 'Pending' ? `
          <div class="flex items-center gap-1.5">
            <button onclick="approvePK('${item.id}', true)" class="btn-action-sm btn-edit">Approve</button>
            <button onclick="approvePK('${item.id}', false)" class="btn-action-sm btn-delete">Tolak</button>
          </div>
        ` : `<span class="text-xs text-slate-500">Selesai</span>`}
      </td>
    `;
    table.appendChild(tr);
  });
}

function approvePK(id, isApproved) {
  if (STATE.currentUser && STATE.currentUser.role !== 'Penanggung Jawab' && STATE.currentUser.role !== 'Manajemen / KTT') {
    showToast('Akses ditolak: Hanya Penanggung Jawab TPS yang berwenang.', 'error');
    return;
  }

  const catatan = prompt(`Catatan telaah (${isApproved ? 'Persetujuan' : 'Penolakan'}):`, 'Disetujui untuk penyimpanan sementara.') || '-';
  const list = JSON.parse(localStorage.getItem('db_penanganan_khusus') || '[]');
  const item = list.find(p => p.id === id);

  if (item) {
    item.status = isApproved ? 'Approved' : 'Rejected';
    item.approver = STATE.currentUser ? STATE.currentUser.nama : 'Hermanto (PJ TPS)';
    item.catatan = catatan;
    localStorage.setItem('db_penanganan_khusus', JSON.stringify(list));

    // Sync to GAS
    syncMutationToGas('review_penanganan_khusus', {
      id: id,
      decision: isApproved ? 'approve' : 'reject',
      notes: catatan
    });

    addAuditLog(item.approver, 'APPROVAL_PENANGANAN_KHUSUS', `${item.status} untuk ${id}`);
    showToast(`Status penanganan khusus diperbarui: ${item.status}`, 'info');
    renderPenangananKhusus();
    renderDashboard();
  }
}

// --- 4.5 INSPEKSI TPS K3L ---
function renderInspeksi(filteredData = null) {
  const table = document.getElementById('tableInspeksiBody');
  const rawData = JSON.parse(localStorage.getItem('db_inspeksi') || '[]');
  const data = filteredData || rawData;
  table.innerHTML = '';

  if (data.length === 0) {
    table.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-500">Belum ada riwayat inspeksi yang cocok.</td></tr>`;
    return;
  }

  data.slice().reverse().forEach(item => {
    let kondisiHtml = `
      <span class="badge-status ${item.kondisi === 'Baik' ? 'badge-green' : 'badge-red'}">
        ${item.kondisi}
      </span>
    `;

    let repairActionBtn = '';

    if (item.kondisi === 'Rusak') {
      const perbaikan = item.perbaikan || { status: 'Menunggu Tindak Lanjut' };
      let badgeClass = 'badge-yellow';
      let icon = 'clock';
      if (perbaikan.status === 'Selesai Diperbaiki') {
        badgeClass = 'badge-green';
        icon = 'check-circle';
      } else if (perbaikan.status === 'Sedang Dikerjakan') {
        badgeClass = 'badge-yellow';
        icon = 'wrench';
      } else {
        badgeClass = 'badge-red';
        icon = 'alert-circle';
      }

      kondisiHtml += `
        <div class="mt-1">
          <span class="badge-status ${badgeClass} text-[10px] inline-flex items-center gap-1 font-sans">
            <i data-lucide="${icon}" class="w-3 h-3"></i>
            ${perbaikan.status}
          </span>
        </div>
      `;

      repairActionBtn = `
        <button onclick="openModalPerbaikanInspeksi('${item.id}')" class="btn-action-sm bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 flex items-center gap-1" title="Tindak Lanjut & Progres Perbaikan">
          <i data-lucide="wrench" class="w-3.5 h-3.5"></i>
          <span class="text-[11px] font-semibold">Perbaikan</span>
        </button>
      `;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="font-mono text-sky-400 font-medium">${item.id}</td>
      <td class="text-xs text-slate-300">${item.tanggal}</td>
      <td class="font-semibold text-white">${item.itemChecklist}</td>
      <td>${kondisiHtml}</td>
      <td class="text-xs text-slate-300">${item.catatan || '-'}</td>
      <td class="text-slate-400">${item.operator}</td>
      <td>
        <div class="flex items-center gap-1.5">
          ${repairActionBtn}
          <button onclick="openModalEditInspeksi('${item.id}')" class="btn-action-sm btn-edit" title="Edit Catatan"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i></button>
          <button onclick="deleteInspeksi('${item.id}')" class="btn-action-sm btn-delete" title="Hapus"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
        </div>
      </td>
    `;
    table.appendChild(tr);
  });
  if (window.lucide) lucide.createIcons();
}

function applyFilterInspeksi() {
  const kondisi = document.getElementById('filterInspeksiKondisi').value;
  const tgl = document.getElementById('filterInspeksiTgl').value;
  let list = JSON.parse(localStorage.getItem('db_inspeksi') || '[]');

  if (kondisi) list = list.filter(i => i.kondisi === kondisi);
  if (tgl) list = list.filter(i => i.tanggal.slice(0, 10) === tgl);

  renderInspeksi(list);
}

function resetFilterInspeksi() {
  document.getElementById('filterInspeksiKondisi').value = '';
  document.getElementById('filterInspeksiTgl').value = '';
  renderInspeksi();
}

function refreshInspeksi() {
  resetFilterInspeksi();
  showToast('Data Inspeksi TPS disegarkan.', 'info');
}

function openModalInspeksi() {
  const container = document.getElementById('inspeksiItemsContainer');
  container.innerHTML = '';

  INSPEKSI_ITEMS_DEFAULT.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2';
    div.innerHTML = `
      <div class="flex items-center justify-between">
        <label class="text-xs font-bold text-white">${idx + 1}. ${item}</label>
        <div class="flex items-center gap-2">
          <label class="flex items-center gap-1 text-xs text-emerald-400 cursor-pointer">
            <input type="radio" name="kondisi_${idx}" value="Baik" checked class="text-emerald-500"> Baik
          </label>
          <label class="flex items-center gap-1 text-xs text-rose-400 cursor-pointer">
            <input type="radio" name="kondisi_${idx}" value="Rusak" class="text-rose-500"> Rusak / Perbaikan
          </label>
        </div>
      </div>
      <input type="text" id="catatan_${idx}" placeholder="Catatan kondisi fisik / temuan..." class="auth-input !py-1.5 text-xs">
    `;
    container.appendChild(div);
  });

  openModal('modalInspeksi');
}

function handleFormInspeksi(e) {
  e.preventDefault();
  const operatorName = STATE.currentUser ? STATE.currentUser.nama : 'Operator Lapangan';
  const batchId = 'INSP-' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

  const currentInspeksi = JSON.parse(localStorage.getItem('db_inspeksi') || '[]');
  let foundRusak = false;

  INSPEKSI_ITEMS_DEFAULT.forEach((item, idx) => {
    const radios = document.getElementsByName(`kondisi_${idx}`);
    let selectedKondisi = 'Baik';
    for (let r of radios) {
      if (r.checked) selectedKondisi = r.value;
    }

    if (selectedKondisi === 'Rusak') foundRusak = true;
    const catatan = document.getElementById(`catatan_${idx}`).value;

    currentInspeksi.push({
      id: `${batchId}-${idx + 1}`,
      tanggal: now,
      itemChecklist: item,
      kondisi: selectedKondisi,
      catatan: catatan,
      operator: operatorName
    });
  });

  localStorage.setItem('db_inspeksi', JSON.stringify(currentInspeksi));
  
  // Background Sync batch inspeksi ke GAS
  currentInspeksi.slice(-INSPEKSI_ITEMS_DEFAULT.length).forEach(inspItem => {
    syncMutationToGas('save_inspeksi', { data: inspItem });
  });

  addAuditLog(operatorName, 'INSPEKSI_TPS', `Melakukan checklist inspeksi K3L (${batchId})`);

  if (foundRusak) {
    showToast('PERINGATAN K3L: Ditemukan sarana RUSAK. Notifikasi otomatis ke PJ TPS!', 'error');
  } else {
    showToast('Checklist inspeksi disimpan. Kondisi sarana BAIK.', 'success');
  }

  closeModal('modalInspeksi');
  renderInspeksi();
}

function openModalEditInspeksi(id) {
  const list = JSON.parse(localStorage.getItem('db_inspeksi') || '[]');
  const item = list.find(i => i.id === id);
  if (!item) return;

  document.getElementById('editInspeksiId').value = item.id;
  document.getElementById('editInspeksiItem').value = item.itemChecklist;
  document.getElementById('editInspeksiKondisi').value = item.kondisi;
  document.getElementById('editInspeksiCatatan').value = item.catatan || '';

  openModal('modalEditInspeksi');
}

function handleSaveEditInspeksi(e) {
  e.preventDefault();
  const id = document.getElementById('editInspeksiId').value;
  const kondisi = document.getElementById('editInspeksiKondisi').value;
  const catatan = document.getElementById('editInspeksiCatatan').value;

  const list = JSON.parse(localStorage.getItem('db_inspeksi') || '[]');
  const item = list.find(i => i.id === id);
  if (item) {
    item.kondisi = kondisi;
    item.catatan = catatan;
    localStorage.setItem('db_inspeksi', JSON.stringify(list));
    syncMutationToGas('update_inspeksi', { id: id, data: item });

    addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Operator', 'EDIT_INSPEKSI', `Mengubah inspeksi ${id}`);
    showToast('Catatan inspeksi berhasil diperbarui.', 'success');
    closeModal('modalEditInspeksi');
    renderInspeksi();
  }
}

function deleteInspeksi(id) {
  if (confirm(`Apakah Anda yakin ingin menghapus data inspeksi ${id}?`)) {
    let list = JSON.parse(localStorage.getItem('db_inspeksi') || '[]');
    list = list.filter(i => i.id !== id);
    localStorage.setItem('db_inspeksi', JSON.stringify(list));
    syncMutationToGas('delete_inspeksi', { id: id });
    addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Operator', 'DELETE_INSPEKSI', `Menghapus data inspeksi ${id}`);
    showToast('Data inspeksi berhasil dihapus.', 'info');
    renderInspeksi();
  }
}

// Global temp variable for foto bukti perbaikan
let tempPerbaikanFoto = null;

function openModalPerbaikanInspeksi(id) {
  const list = JSON.parse(localStorage.getItem('db_inspeksi') || '[]');
  const item = list.find(i => i.id === id);
  if (!item) {
    showToast('Data inspeksi tidak ditemukan.', 'error');
    return;
  }

  // Set ringkasan
  document.getElementById('perbaikanInspeksiId').value = item.id;
  document.getElementById('perbaikanBadgeId').textContent = item.id;
  document.getElementById('perbaikanBadgeTanggal').textContent = item.tanggal;
  document.getElementById('perbaikanItemFasilitas').textContent = item.itemChecklist;
  document.getElementById('perbaikanCatatanAwal').textContent = item.catatan || 'Kondisi fisik dilaporkan rusak / tidak standar';
  document.getElementById('perbaikanPetugasAwal').textContent = item.operator || '-';

  // Set existing perbaikan data or defaults
  const p = item.perbaikan || {
    status: 'Menunggu Tindak Lanjut',
    tindakan: '',
    targetSelesai: new Date().toISOString().slice(0, 10),
    pic: STATE.currentUser ? STATE.currentUser.nama : 'Tim Pemeliharaan K3L',
    fotoUrl: '',
    catatan: '',
    riwayat: []
  };

  document.getElementById('perbaikanStatus').value = p.status || 'Menunggu Tindak Lanjut';
  document.getElementById('perbaikanTindakan').value = p.tindakan || '';
  document.getElementById('perbaikanTanggalTarget').value = p.targetSelesai || new Date().toISOString().slice(0, 10);
  document.getElementById('perbaikanPic').value = p.pic || (STATE.currentUser ? STATE.currentUser.nama : 'Tim K3L');
  document.getElementById('perbaikanCatatan').value = p.catatan || '';

  // Foto bukti preview
  tempPerbaikanFoto = p.fotoUrl || null;
  const previewBox = document.getElementById('perbaikanFotoPreviewBox');
  const previewImg = document.getElementById('perbaikanFotoPreviewImg');
  if (tempPerbaikanFoto) {
    previewBox.classList.remove('hidden');
    previewImg.src = tempPerbaikanFoto;
  } else {
    previewBox.classList.add('hidden');
    previewImg.src = '';
  }
  document.getElementById('perbaikanFotoInput').value = '';

  // Render riwayat progres
  const riwayatContainer = document.getElementById('perbaikanRiwayatContainer');
  riwayatContainer.innerHTML = '';
  const riwayat = p.riwayat || [];
  if (riwayat.length === 0) {
    riwayatContainer.innerHTML = `<p class="text-slate-500 italic">Belum ada catatan progres perbaikan sebelumnya.</p>`;
  } else {
    riwayat.slice().reverse().forEach((r) => {
      let statusColor = 'text-amber-400';
      if (r.status === 'Selesai Diperbaiki') statusColor = 'text-emerald-400';
      if (r.status === 'Menunggu Tindak Lanjut') statusColor = 'text-rose-400';

      const div = document.createElement('div');
      div.className = 'p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-1';
      div.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="font-bold ${statusColor}">${r.status}</span>
          <span class="text-slate-500 text-[10px]">${r.tanggal}</span>
        </div>
        <p class="text-slate-300 text-[11px]">${r.keterangan || '-'}</p>
        <p class="text-[10px] text-slate-400">Oleh: <span class="text-white">${r.petugas || 'Petugas'}</span> ${r.target ? `&bull; Target: ${r.target}` : ''}</p>
      `;
      riwayatContainer.appendChild(div);
    });
  }

  openModal('modalPerbaikanInspeksi');
  if (window.lucide) lucide.createIcons();
}

function handlePerbaikanFotoChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    tempPerbaikanFoto = e.target.result;
    document.getElementById('perbaikanFotoPreviewBox').classList.remove('hidden');
    document.getElementById('perbaikanFotoPreviewImg').src = tempPerbaikanFoto;
  };
  reader.readAsDataURL(file);
}

function clearPerbaikanFoto() {
  tempPerbaikanFoto = null;
  document.getElementById('perbaikanFotoPreviewBox').classList.add('hidden');
  document.getElementById('perbaikanFotoPreviewImg').src = '';
  document.getElementById('perbaikanFotoInput').value = '';
}

function handleSavePerbaikanInspeksi(e) {
  e.preventDefault();
  const id = document.getElementById('perbaikanInspeksiId').value;
  const status = document.getElementById('perbaikanStatus').value;
  const tindakan = document.getElementById('perbaikanTindakan').value.trim();
  const target = document.getElementById('perbaikanTanggalTarget').value;
  const pic = document.getElementById('perbaikanPic').value.trim();
  const catatan = document.getElementById('perbaikanCatatan').value.trim();

  const list = JSON.parse(localStorage.getItem('db_inspeksi') || '[]');
  const item = list.find(i => i.id === id);
  if (!item) {
    showToast('Data temuan inspeksi tidak ditemukan.', 'error');
    return;
  }

  if (!item.perbaikan) {
    item.perbaikan = { riwayat: [] };
  }
  if (!item.perbaikan.riwayat) {
    item.perbaikan.riwayat = [];
  }

  const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const updaterName = STATE.currentUser ? STATE.currentUser.nama : 'Operator';

  // Tambahkan ke log riwayat
  item.perbaikan.riwayat.push({
    tanggal: nowStr,
    status: status,
    keterangan: tindakan + (catatan ? ` (Catatan: ${catatan})` : ''),
    target: target,
    pic: pic,
    petugas: updaterName
  });

  item.perbaikan.status = status;
  item.perbaikan.tindakan = tindakan;
  item.perbaikan.targetSelesai = target;
  item.perbaikan.pic = pic;
  item.perbaikan.catatan = catatan;
  if (tempPerbaikanFoto) {
    item.perbaikan.fotoUrl = tempPerbaikanFoto;
  }

  localStorage.setItem('db_inspeksi', JSON.stringify(list));
  syncMutationToGas('update_progres_inspeksi', { id: id, perbaikan: item.perbaikan });

  addAuditLog(updaterName, 'UPDATE_PERBAIKAN_INSPEKSI', `Update progres perbaikan ${item.itemChecklist} (${id}): ${status}`);
  showToast(`Progres perbaikan berhasil disimpan: ${status}`, 'success');

  closeModal('modalPerbaikanInspeksi');
  renderInspeksi();
}

// --- 4.6 LOGBOOK PERMEN LHK (DENGAN FILTER BULAN & TAHUN - Revisi #3) ---
function renderLogbook(filteredData = null) {
  populateFilterLogbookKode();

  const table = document.getElementById('tableLogbookBody');
  const masuk = filteredData || getFilteredLogbookData();
  const keluar = JSON.parse(localStorage.getItem('db_limbah_keluar') || '[]');

  table.innerHTML = '';

  if (masuk.length === 0) {
    table.innerHTML = `<tr><td colspan="10" class="text-center py-6 text-slate-500">Tidak ada data logbook pada periode yang dipilih.</td></tr>`;
    return;
  }

  const mapKeluar = {};
  keluar.forEach(k => { mapKeluar[k.refIdMasuk] = k; });

  masuk.forEach((m, idx) => {
    const k = mapKeluar[m.id];
    const jmlMasuk = parseFloat(m.jumlah) || 0;
    const jmlKeluar = k ? (parseFloat(k.jumlah) || 0) : 0;
    const sisa = Math.max(0, jmlMasuk - jmlKeluar);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="text-center font-mono">${idx + 1}</td>
      <td class="text-xs font-mono">${m.tanggalMasuk}</td>
      <td class="font-mono text-vault-lime font-bold">${m.kodeLimbah}</td>
      <td class="font-medium">${m.namaLimbah}</td>
      <td class="font-mono font-bold">${jmlMasuk} ${m.satuan}</td>
      <td class="text-xs font-mono">${k ? k.tanggalKeluar : '-'}</td>
      <td class="text-xs">${k ? k.tujuanPihakKetiga : '-'}</td>
      <td class="font-mono">${k ? `${jmlKeluar} ${m.satuan}` : '-'}</td>
      <td class="font-mono font-bold text-sky-400">${sisa} ${m.satuan}</td>
      <td class="text-xs text-slate-400">${m.operator}</td>
    `;
    table.appendChild(tr);
  });
}

function getFilteredLogbookData() {
  const bulan = document.getElementById('filterLogbookBulan') ? document.getElementById('filterLogbookBulan').value : '';
  const tahun = document.getElementById('filterLogbookTahun') ? document.getElementById('filterLogbookTahun').value : '';
  const kode = document.getElementById('filterLogbookKode') ? document.getElementById('filterLogbookKode').value : '';

  let list = JSON.parse(localStorage.getItem('db_limbah_masuk') || '[]');

  if (tahun) {
    list = list.filter(m => {
      if (!m.tanggalMasuk) return false;
      const d = new Date(m.tanggalMasuk);
      if (!isNaN(d.getTime())) {
        return d.getFullYear().toString() === tahun;
      }
      return m.tanggalMasuk.slice(0, 4) === tahun;
    });
  }
  if (bulan) {
    list = list.filter(m => {
      if (!m.tanggalMasuk) return false;
      const d = new Date(m.tanggalMasuk);
      if (!isNaN(d.getTime())) {
        const mStr = ('0' + (d.getMonth() + 1)).slice(-2);
        return mStr === bulan;
      }
      return m.tanggalMasuk.slice(5, 7) === bulan;
    });
  }
  if (kode) {
    list = list.filter(m => m.kodeLimbah === kode);
  }
  return list;
}

function populateFilterLogbookKode() {
  const sel = document.getElementById('filterLogbookKode');
  if (sel && sel.options.length <= 1) {
    const rintek = JSON.parse(localStorage.getItem('db_rintek') || '[]');
    rintek.forEach(r => {
      sel.innerHTML += `<option value="${r.kodeLimbah}">${r.namaLimbah} (${r.kodeLimbah})</option>`;
    });
  }
}

function applyFilterLogbook() {
  renderLogbook(getFilteredLogbookData());
}

function resetFilterLogbook() {
  if (document.getElementById('filterLogbookBulan')) document.getElementById('filterLogbookBulan').value = '';
  if (document.getElementById('filterLogbookTahun')) document.getElementById('filterLogbookTahun').value = '';
  if (document.getElementById('filterLogbookKode')) document.getElementById('filterLogbookKode').value = '';
  renderLogbook(JSON.parse(localStorage.getItem('db_limbah_masuk') || '[]'));
}

function refreshLogbook() {
  applyFilterLogbook();
  showToast('Logbook Permen LHK disegarkan sesuai filter.', 'info');
}

// --- CETAK LOGBOOK LANDSCAPE LAMPIRAN 1 (SESUAI PERIODE - Revisi #2 & #3) ---
function printOfficialLogbookLandscape() {
  const cfg = JSON.parse(localStorage.getItem('db_settings') || '{}');
  const masuk = getFilteredLogbookData(); // Sesuai periode yang ditentukan
  const keluar = JSON.parse(localStorage.getItem('db_limbah_keluar') || '[]');

  // KOP Align Left Text
  document.getElementById('kopLogbookNamaPerusahaan').textContent = (cfg.namaPerusahaan || 'PT. ETAM MANUNGGAL JAYA').toUpperCase();
  document.getElementById('kopLogbookAlamat').textContent = cfg.alamatKantor || 'Jalan S. Parman No. 6, Kota Samarinda, Kalimantan Timur';
  document.getElementById('kopLogbookKontak').textContent = `Telp: ${cfg.telpPerusahaan || '-'} • Email: ${cfg.emailPerusahaan || '-'}`;
  if (cfg.logoBase64) {
    document.getElementById('kopLogbookLogo').src = cfg.logoBase64;
    document.getElementById('kopLogbookLogo').style.display = 'block';
  } else {
    document.getElementById('kopLogbookLogo').style.display = 'none';
  }

  // Header Periode Terpilih
  const bVal = document.getElementById('filterLogbookBulan').value;
  const tVal = document.getElementById('filterLogbookTahun').value;
  let periodeStr = 'Semua Periode';
  if (bVal && tVal) {
    periodeStr = `${BULAN_NAMA[parseInt(bVal) - 1]} ${tVal}`;
  } else if (tVal) {
    periodeStr = `Tahun ${tVal}`;
  }
  document.getElementById('printLogbookPeriodeText').textContent = periodeStr;

  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const now = new Date();
  const tglFormatted = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  document.getElementById('printLogbookTanggal').textContent = tglFormatted;
  document.getElementById('printLogbookLokasi').textContent = 'Batuah';

  const opName = STATE.currentUser ? STATE.currentUser.nama : 'Operator Lapangan';
  document.getElementById('printLogbookOperatorName').textContent = opName;

  // Cek jika operator memiliki spesimen TTD tersimpan
  const savedTtd = getSavedUserSignature();
  const ttdBox = document.getElementById('printLogbookTtdBox');
  if (savedTtd) {
    ttdBox.innerHTML = `<img src="${savedTtd}" style="max-height: 50px;">`;
  } else {
    ttdBox.innerHTML = '';
  }

  const mapKeluar = {};
  keluar.forEach(k => { mapKeluar[k.refIdMasuk] = k; });

  const tbody = document.getElementById('printLogbookTableBody');
  tbody.innerHTML = '';

  if (masuk.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 20px;">Tidak ada catatan limbah B3 pada periode ${periodeStr}.</td></tr>`;
  } else {
    masuk.forEach((m, idx) => {
      const k = mapKeluar[m.id];
      const jmlMasuk = parseFloat(m.jumlah) || 0;
      const jmlKeluar = k ? (parseFloat(k.jumlah) || 0) : 0;
      const sisa = Math.max(0, jmlMasuk - jmlKeluar);

      const tglMasukFormatted = formatDateSlashes(m.tanggalMasuk);
      const tglTempoFormatted = formatDateSlashes(m.tanggalJatuhTempo);
      const tglKeluarFormatted = k ? formatDateSlashes(k.tanggalKeluar) : '-';
      const buktiDok = k ? `${k.suratJalan || ''} / ${k.manifes || ''}` : '-';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="text-align: center;">${idx + 1}</td>
        <td><strong>${m.namaLimbah}</strong><br><span style="font-size: 7.5pt; color: #555;">Kode: ${m.kodeLimbah}</span></td>
        <td style="text-align: center;">${tglMasukFormatted}</td>
        <td>${m.sumber || 'Workshop Tambang'}</td>
        <td style="text-align: right; font-weight: bold;">${jmlMasuk.toLocaleString('id-ID')} ${m.satuan}</td>
        <td style="text-align: center;">${tglTempoFormatted}</td>
        <td style="text-align: center;">${tglKeluarFormatted}</td>
        <td style="text-align: right;">${k ? `${jmlKeluar.toLocaleString('id-ID')} ${m.satuan}` : '-'}</td>
        <td>${k ? k.tujuanPihakKetiga : '-'}</td>
        <td style="font-size: 7.5pt;">${buktiDok}</td>
        <td style="text-align: right; font-weight: bold;">${sisa.toLocaleString('id-ID')} ${m.satuan}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.body.className = 'print-landscape';
  const printEl = document.getElementById('printLogbookLandscapeContainer');
  printEl.classList.add('active-print');

  setTimeout(() => {
    window.print();
    printEl.classList.remove('active-print');
    document.body.className = '';
  }, 200);
}

function formatDateSlashes(dateStr) {
  if (!dateStr || dateStr === '-') return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = ('0' + d.getDate()).slice(-2);
    const m = ('0' + (d.getMonth() + 1)).slice(-2);
    const y = d.getFullYear();
    return `${day}/${m}/${y}`;
  } catch(e) {
    return dateStr;
  }
}

function exportLogbookCSV() {
  const masuk = getFilteredLogbookData();
  const keluar = JSON.parse(localStorage.getItem('db_limbah_keluar') || '[]');
  const mapKeluar = {};
  keluar.forEach(k => { mapKeluar[k.refIdMasuk] = k; });

  const bVal = document.getElementById('filterLogbookBulan').value;
  const tVal = document.getElementById('filterLogbookTahun').value;
  const periodeLabel = (bVal && tVal) ? `${BULAN_NAMA[parseInt(bVal) - 1]}_${tVal}` : 'Semua';

  let csvContent = '\uFEFF';
  csvContent += 'No,Jenis Limbah B3 Masuk,Tanggal Masuk,Sumber Limbah B3,Jumlah Masuk,Satuan,Maksimal Penyimpanan s/d,Tanggal Keluar,Jumlah Keluar,Tujuan Penyerahan,Bukti Nomor Dokumen,Sisa Limbah di TPS,Paraf Petugas\n';

  masuk.forEach((m, idx) => {
    const k = mapKeluar[m.id];
    const jmlMasuk = parseFloat(m.jumlah) || 0;
    const jmlKeluar = k ? (parseFloat(k.jumlah) || 0) : 0;
    const sisa = Math.max(0, jmlMasuk - jmlKeluar);
    const buktiDok = k ? `${k.suratJalan} / ${k.manifes}` : '-';

    csvContent += `"${idx + 1}","${m.namaLimbah} (${m.kodeLimbah})","${m.tanggalMasuk}","${m.sumber || 'Workshop'}","${jmlMasuk}","${m.satuan}","${m.tanggalJatuhTempo || '-'}","${k ? k.tanggalKeluar : '-'}","${jmlKeluar}","${k ? k.tujuanPihakKetiga : '-'}","${buktiDok}","${sisa}","${m.operator}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Logbook_Lampiran1_PermenLHK_${periodeLabel}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast(`File CSV Logbook periode ${periodeLabel} berhasil diunduh.`, 'success');
}

// --- 4.7 NERACA LIMBAH B3 & GENERATE NOMOR OTOMATIS (Revisi #2 & #3) ---
function getRomanMonth(monthNum) {
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  return roman[parseInt(monthNum) - 1] || 'I';
}

function generateNomorNeraca(month, year) {
  const neracaList = JSON.parse(localStorage.getItem('db_neraca') || '[]');
  const nextNumber = ('00' + (neracaList.length + 1)).slice(-3);
  const roman = getRomanMonth(month);
  return `${nextNumber}/PLB3/ENV-HSE/${roman}/${year}`;
}

function openModalCreateNeraca() {
  const cfg = JSON.parse(localStorage.getItem('db_settings') || '{}');
  document.getElementById('neracaPerusahaanAuto').value = cfg.namaPerusahaan || 'PT. Etam Manunggal Jaya';
  document.getElementById('neracaBidangUsahaAuto').value = cfg.bidangUsaha || 'Pertambangan Batubara';

  const now = new Date();
  document.getElementById('neracaBulanSelect').value = now.getMonth() + 1;
  document.getElementById('neracaTahunInput').value = now.getFullYear();

  updateGeneratedNomorNeraca();
  openModal('modalCreateNeraca');
}

function updateGeneratedNomorNeraca() {
  const m = document.getElementById('neracaBulanSelect').value;
  const y = document.getElementById('neracaTahunInput').value || '2026';
  const autoNo = generateNomorNeraca(m, y);
  document.getElementById('neracaNomorDocAuto').value = autoNo;
}

function handleFormCreateNeraca(e) {
  e.preventDefault();
  const cfg = JSON.parse(localStorage.getItem('db_settings') || '{}');
  const mIndex = parseInt(document.getElementById('neracaBulanSelect').value);
  const tahun = document.getElementById('neracaTahunInput').value;
  const nomorDoc = document.getElementById('neracaNomorDocAuto').value;
  
  const radioDoc = document.querySelector('input[name="neracaDocKontrol"]:checked');
  const docKontrol = radioDoc ? radioDoc.value : 'Melampirkan Manifes Festronik';

  const periodeStr = `${BULAN_NAMA[mIndex - 1]} ${tahun}`;

  const masuk = JSON.parse(localStorage.getItem('db_limbah_masuk') || '[]');
  const keluar = JSON.parse(localStorage.getItem('db_limbah_keluar') || '[]');

  let totalMasukKg = 0;
  masuk.forEach(m => totalMasukKg += (parseFloat(m.jumlah) || 0));
  const dataATon = (totalMasukKg / 1000).toFixed(3);

  let totalKeluarKg = 0;
  keluar.forEach(k => totalKeluarKg += (parseFloat(k.jumlah) || 0));
  const diserahkanTon = (totalKeluarKg / 1000).toFixed(3);
  const disimpanTon = Math.max(0, (totalMasukKg - totalKeluarKg) / 1000).toFixed(3);

  const newNeraca = {
    id: 'NERACA-' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 11),
    nomorDokumen: nomorDoc,
    namaPerusahaan: cfg.namaPerusahaan || 'PT. Etam Manunggal Jaya',
    bidangUsaha: cfg.bidangUsaha || 'Pertambangan Batubara',
    periode: periodeStr,
    bulan: mIndex,
    tahun: tahun,
    dokumenKontrol: docKontrol,
    dataA: dataATon,
    dataB: {
      disimpan: disimpanTon,
      dimanfaatkan: '0.000',
      diolah: '0.000',
      ditimbun: '0.000',
      diserahkanPihakKetiga: diserahkanTon,
      ekspor: '0.000',
      lainnya: '0.000'
    },
    dataC: '0.000',
    dataD: '0.000',
    kinerja: '100.00%',
    status: 'Draft (Menunggu Paraf Operator)',
    ttdOperator: '',
    ttdPJ: '',
    ttdKTT: '',
    createdAt: new Date().toISOString().slice(0, 10)
  };

  const list = JSON.parse(localStorage.getItem('db_neraca') || '[]');
  list.unshift(newNeraca);
  localStorage.setItem('db_neraca', JSON.stringify(list));

  // Sync to GAS
  syncMutationToGas('generate_neraca', { data: newNeraca });

  addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Operator', 'GENERATE_NERACA', `Membuat Neraca ${nomorDoc} (${periodeStr})`);
  showToast(`Neraca baru berhasil dibuat dengan nomor: ${nomorDoc}`, 'success');
  closeModal('modalCreateNeraca');
  renderNeraca();
}

function renderNeraca(filteredData = null) {
  const container = document.getElementById('neracaListContainer');
  const rawList = JSON.parse(localStorage.getItem('db_neraca') || '[]');
  const neracaList = filteredData || rawList;
  container.innerHTML = '';

  if (neracaList.length === 0) {
    container.innerHTML = `
      <div class="data-card text-center py-12 text-slate-400">
        <i data-lucide="scale" class="w-12 h-12 mx-auto text-slate-600 mb-3"></i>
        <p class="font-bold text-white">Tidak Ada Neraca yang Cocok dengan Filter</p>
      </div>
    `;
    return;
  }

  neracaList.forEach(n => {
    const card = document.createElement('div');
    card.className = 'data-card space-y-6';
    card.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-vault-border gap-2">
        <div>
          <span class="text-[10px] font-mono font-bold text-vault-lime uppercase tracking-widest">NERACA LIMBAH B3 RESMI (LAMPIRAN IX)</span>
          <h3 class="text-lg font-bold text-white">${n.periode}</h3>
          <p class="text-xs text-slate-300 font-mono">No: <span class="text-vault-lime font-bold">${n.nomorDokumen || n.id}</span> &bull; Kontrol: <span class="text-sky-400 font-sans">${n.dokumenKontrol || 'Melampirkan Manifes'}</span></p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="badge-status ${n.status === 'Final' ? 'badge-green' : 'badge-yellow'} font-bold">
            ${n.status}
          </span>
          <button onclick="openModalPengaturanNeraca('${n.id}')" class="btn-primary-pill !w-auto !py-1.5 !px-3 text-xs bg-slate-800 hover:bg-slate-700" title="Cetak Neraca Portrait">
            <i data-lucide="printer" class="w-3.5 h-3.5"></i> Cetak Neraca (Portrait)
          </button>
          <button onclick="openModalEditNeraca('${n.id}')" class="btn-action-sm btn-edit flex items-center gap-1" title="Edit Dokumen Neraca">
            <i data-lucide="edit-2" class="w-3.5 h-3.5"></i> <span class="text-xs">Edit</span>
          </button>
          <button onclick="deleteNeraca('${n.id}')" class="btn-action-sm btn-delete flex items-center gap-1" title="Hapus Dokumen Neraca">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> <span class="text-xs">Hapus</span>
          </button>
        </div>
      </div>

      <div class="overflow-x-auto rounded-xl border border-vault-border">
        <table class="custom-table text-xs">
          <thead>
            <tr class="bg-slate-800">
              <th>Komponen</th>
              <th>Uraian</th>
              <th class="text-right">Jumlah (Ton)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="font-bold text-vault-lime font-mono">A. TOTAL DIHASILKAN</td>
              <td>Akumulasi limbah B3 masuk ke TPS 01</td>
              <td class="font-mono font-bold text-right text-white">${n.dataA} Ton</td>
            </tr>
            <tr>
              <td class="font-bold text-sky-400 font-mono">B. PERLAKUAN</td>
              <td>Diserahkan (${n.dataB.diserahkanPihakKetiga} Ton) & Disimpan (${n.dataB.disimpan} Ton)</td>
              <td class="font-mono font-bold text-right text-white">${(parseFloat(n.dataB.diserahkanPihakKetiga) + parseFloat(n.dataB.disimpan)).toFixed(3)} Ton</td>
            </tr>
            <tr class="bg-slate-900 font-bold">
              <td colspan="2" class="text-white">KINERJA PENGELOLAAN: [ (A - (C+D)) / A ] &times; 100%</td>
              <td class="text-right text-vault-lime font-mono text-sm">${n.kinerja}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Verifikasi & Pengesahan Digital Berjenjang (3 Tingkat)
        </h4>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <!-- Tier 1: Operator -->
          <div class="p-4 rounded-2xl bg-slate-900/80 border ${n.ttdOperator ? 'border-emerald-500/40' : 'border-slate-800'} text-center space-y-2">
            <span class="text-[10px] uppercase font-bold text-slate-400">1. Disusun Oleh</span>
            <p class="text-xs font-bold text-white">Operator TPS LB3</p>
            <div class="h-20 flex items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-950/60 p-1 overflow-hidden">
              ${n.ttdOperator ? `<img src="${safeSignatureUrl(n.ttdOperator)}" class="max-h-16 mx-auto object-contain">` : `<span class="text-[11px] text-slate-600 italic">Belum diparaf</span>`}
            </div>
            ${!n.ttdOperator ? `
              <button onclick="openSignatureModal('${n.id}', 'Operator')" class="btn-primary-pill !w-full !py-1.5 text-xs">
                Paraf Operator
              </button>
            ` : `<span class="text-[11px] text-emerald-400 font-mono font-bold flex items-center justify-center gap-1"><i data-lucide="check" class="w-3.5 h-3.5"></i> Terverifikasi</span>`}
          </div>

          <!-- Tier 2: Penanggung Jawab -->
          <div class="p-4 rounded-2xl bg-slate-900/80 border ${n.ttdPJ ? 'border-emerald-500/40' : 'border-slate-800'} text-center space-y-2">
            <span class="text-[10px] uppercase font-bold text-slate-400">2. Diperiksa Oleh</span>
            <p class="text-xs font-bold text-white">Penanggung Jawab TPS</p>
            <div class="h-20 flex items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-950/60 p-1 overflow-hidden">
              ${n.ttdPJ ? `<img src="${safeSignatureUrl(n.ttdPJ)}" class="max-h-16 mx-auto object-contain">` : `<span class="text-[11px] text-slate-600 italic">Menunggu Operator</span>`}
            </div>
            ${!n.ttdPJ && n.ttdOperator ? `
              <button onclick="openSignatureModal('${n.id}', 'Penanggung Jawab')" class="btn-lime-pill !w-full !py-1.5 text-xs justify-center">
                Tanda Tangan PJ
              </button>
            ` : n.ttdPJ ? `<span class="text-[11px] text-emerald-400 font-mono font-bold flex items-center justify-center gap-1"><i data-lucide="check" class="w-3.5 h-3.5"></i> Disetujui PJ</span>` : `<span class="text-[11px] text-slate-500">Antrean Level 2</span>`}
          </div>

          <!-- Tier 3: KTT -->
          <div class="p-4 rounded-2xl bg-slate-900/80 border ${n.ttdKTT ? 'border-emerald-500/40' : 'border-slate-800'} text-center space-y-2">
            <span class="text-[10px] uppercase font-bold text-slate-400">3. Disahkan Oleh</span>
            <p class="text-xs font-bold text-white">Kepala Teknik Tambang (KTT)</p>
            <div class="h-20 flex items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-950/60 p-1 overflow-hidden">
              ${n.ttdKTT ? `<img src="${safeSignatureUrl(n.ttdKTT)}" class="max-h-16 mx-auto object-contain">` : `<span class="text-[11px] text-slate-600 italic">Menunggu PJ</span>`}
            </div>
            ${!n.ttdKTT && n.ttdPJ ? `
              <button onclick="openSignatureModal('${n.id}', 'Manajemen / KTT')" class="btn-primary-pill !w-full !py-1.5 text-xs bg-purple-600 hover:bg-purple-500">
                Sahkan (KTT)
              </button>
            ` : n.ttdKTT ? `<span class="text-[11px] text-purple-400 font-mono font-bold flex items-center justify-center gap-1"><i data-lucide="award" class="w-3.5 h-3.5"></i> Disahkan KTT (Final)</span>` : `<span class="text-[11px] text-slate-500">Antrean Level 3</span>`}
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
  if (window.lucide) lucide.createIcons();
}

function applyFilterNeraca() {
  const status = document.getElementById('filterNeracaStatus').value;
  let list = JSON.parse(localStorage.getItem('db_neraca') || '[]');
  if (status) list = list.filter(n => n.status.includes(status));
  renderNeraca(list);
}

function resetFilterNeraca() {
  document.getElementById('filterNeracaStatus').value = '';
  renderNeraca();
}

function refreshNeraca() {
  resetFilterNeraca();
  showToast('Neraca Limbah disegarkan.', 'info');
}

function openModalEditNeraca(neracaId) {
  const neracaList = JSON.parse(localStorage.getItem('db_neraca') || '[]');
  const n = neracaList.find(item => item.id === neracaId);
  if (!n) {
    showToast('Dokumen Neraca tidak ditemukan.', 'error');
    return;
  }

  document.getElementById('editNeracaId').value = n.id;
  document.getElementById('editNeracaNomorDoc').value = n.nomorDokumen || n.id;
  document.getElementById('editNeracaBulan').value = n.bulan || 9;
  document.getElementById('editNeracaTahun').value = n.tahun || 2026;
  document.getElementById('editNeracaStatus').value = n.status || 'Draft (Menunggu Paraf Operator)';
  document.getElementById('editNeracaDocKontrol').value = n.dokumenKontrol || 'Melampirkan Manifes';
  document.getElementById('editNeracaNomorManifes').value = n.nomorManifes || '';

  document.getElementById('editNeracaDataA').value = n.dataA || '0.000';
  document.getElementById('editNeracaDataBDisimpan').value = (n.dataB && n.dataB.disimpan) || '0.000';
  document.getElementById('editNeracaDataBDiserahkan').value = (n.dataB && n.dataB.diserahkanPihakKetiga) || '0.000';
  document.getElementById('editNeracaKinerja').value = n.kinerja || '100.00%';

  openModal('modalEditNeraca');
}

function handleSaveEditNeraca(e) {
  e.preventDefault();
  const id = document.getElementById('editNeracaId').value;
  const neracaList = JSON.parse(localStorage.getItem('db_neraca') || '[]');
  const idx = neracaList.findIndex(n => n.id === id);
  if (idx === -1) {
    showToast('Dokumen Neraca tidak ditemukan.', 'error');
    return;
  }

  const noDoc = document.getElementById('editNeracaNomorDoc').value.trim();
  const bulan = parseInt(document.getElementById('editNeracaBulan').value) || 9;
  const tahun = parseInt(document.getElementById('editNeracaTahun').value) || 2026;
  const status = document.getElementById('editNeracaStatus').value;
  const docKontrol = document.getElementById('editNeracaDocKontrol').value;
  const noManifes = document.getElementById('editNeracaNomorManifes').value.trim();

  const dataA = parseFloat(document.getElementById('editNeracaDataA').value) || 0;
  const dataBDisimpan = parseFloat(document.getElementById('editNeracaDataBDisimpan').value) || 0;
  const dataBDiserahkan = parseFloat(document.getElementById('editNeracaDataBDiserahkan').value) || 0;
  const kinerja = document.getElementById('editNeracaKinerja').value.trim();

  neracaList[idx].nomorDokumen = noDoc;
  neracaList[idx].bulan = bulan;
  neracaList[idx].tahun = tahun;
  neracaList[idx].periode = `${BULAN_NAMA[bulan - 1]} ${tahun}`;
  neracaList[idx].status = status;
  neracaList[idx].dokumenKontrol = docKontrol;
  neracaList[idx].nomorManifes = noManifes;
  neracaList[idx].dataA = dataA.toFixed(3);
  if (!neracaList[idx].dataB) neracaList[idx].dataB = {};
  neracaList[idx].dataB.disimpan = dataBDisimpan.toFixed(3);
  neracaList[idx].dataB.diserahkanPihakKetiga = dataBDiserahkan.toFixed(3);
  neracaList[idx].kinerja = kinerja || '100.00%';

  localStorage.setItem('db_neraca', JSON.stringify(neracaList));
  syncMutationToGas('update_neraca', { id: id, data: neracaList[idx] });

  addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Operator', 'EDIT_NERACA', `Mengubah dokumen Neraca: ${noDoc} (${neracaList[idx].periode})`);
  showToast('Perubahan dokumen Neraca berhasil disimpan.', 'success');
  closeModal('modalEditNeraca');
  renderNeraca();
}

function deleteNeraca(id) {
  const neracaList = JSON.parse(localStorage.getItem('db_neraca') || '[]');
  const item = neracaList.find(n => n.id === id);
  if (!item) return;

  if (!confirm(`Apakah Anda yakin ingin menghapus dokumen Neraca nomor "${item.nomorDokumen || item.id}" (${item.periode})?`)) {
    return;
  }

  const updated = neracaList.filter(n => n.id !== id);
  localStorage.setItem('db_neraca', JSON.stringify(updated));
  syncMutationToGas('delete_neraca', { id: id });

  addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Operator', 'DELETE_NERACA', `Menghapus dokumen Neraca: ${item.nomorDokumen || item.id}`);
  showToast('Dokumen Neraca berhasil dihapus.', 'info');
  renderNeraca();
}

// --- CETAK NERACA PORTRAIT PERSIS LAMPIRAN 2 (KOP ALIGN LEFT - Revisi #3 & #4) ---
function printOfficialNeracaPortrait(neracaId) {
  const cfg = JSON.parse(localStorage.getItem('db_settings') || '{}');
  const neracaList = JSON.parse(localStorage.getItem('db_neraca') || '[]');
  const n = neracaList.find(item => item.id === neracaId) || neracaList[0];
  if (!n) return;

  const masuk = JSON.parse(localStorage.getItem('db_limbah_masuk') || '[]');

  // KOP Align Left Text
  document.getElementById('kopNeracaNamaPerusahaan').textContent = (cfg.namaPerusahaan || 'PT. ETAM MANUNGGAL JAYA').toUpperCase();
  document.getElementById('kopNeracaAlamat').textContent = cfg.alamatKantor || 'Jalan S. Parman No. 6, Kota Samarinda, Kalimantan Timur';
  document.getElementById('kopNeracaKontak').textContent = `Telp: ${cfg.telpPerusahaan || '-'} • Email: ${cfg.emailPerusahaan || '-'}`;
  if (cfg.logoBase64) {
    document.getElementById('kopNeracaLogo').src = cfg.logoBase64;
    document.getElementById('kopNeracaLogo').style.display = 'block';
  } else {
    document.getElementById('kopNeracaLogo').style.display = 'none';
  }

  // Metadata Lampiran 2 Termasuk Nomor Neraca & Dokumen Kontrol
  document.getElementById('printNeracaPerusahaan').textContent = n.namaPerusahaan || cfg.namaPerusahaan;
  document.getElementById('printNeracaBidangUsaha').textContent = n.bidangUsaha || cfg.bidangUsaha;
  document.getElementById('printNeracaNomorDoc').textContent = n.nomorDokumen || n.id;
  document.getElementById('printNeracaPeriode').textContent = n.periode;
  document.getElementById('printNeracaDocKontrol').textContent = n.dokumenKontrol || 'Melampirkan Manifes Festronik';

  // Bagian I: Jenis Awal Limbah Table
  const tbodyA = document.getElementById('printNeracaTableA');
  tbodyA.innerHTML = '';

  const rintekMap = {};
  masuk.forEach(m => {
    rintekMap[m.namaLimbah] = (rintekMap[m.namaLimbah] || 0) + (parseFloat(m.jumlah) || 0);
  });

  let counter = 1;
  for (let [nama, kg] of Object.entries(rintekMap)) {
    const ton = (kg / 1000).toFixed(3);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align: center;">${counter++}</td>
      <td>${nama}</td>
      <td style="text-align: right; font-weight: bold;">${ton}</td>
      <td colspan="3">Penyimpanan di TPS LB3 01</td>
    `;
    tbodyA.appendChild(tr);
  }
  document.getElementById('printNeracaTotalA').textContent = `A (+) ${n.dataA}`;

  // Bagian II: Perlakuan
  const tbodyB = document.getElementById('printNeracaTableB');
  tbodyB.innerHTML = '';

  const perlakuanList = [
    { no: '1', nama: 'DISIMPAN', jumlah: n.dataB.disimpan, jenis: 'Limbah B3 di TPS 01', izin: 'ADA' },
    { no: '2', nama: 'DIMANFAATKAN', jumlah: n.dataB.dimanfaatkan, jenis: '-', izin: '-' },
    { no: '3', nama: 'DIOLAH', jumlah: n.dataB.diolah, jenis: '-', izin: '-' },
    { no: '4', nama: 'DITIMBUN', jumlah: n.dataB.ditimbun, jenis: '-', izin: '-' },
    { no: '5', nama: 'DISERAHKAN KE PIHAK KETIGA', jumlah: n.dataB.diserahkanPihakKetiga, jenis: 'PT. Berkat Jaya Sukses', izin: 'ADA' },
    { no: '6', nama: 'EKSPOR', jumlah: n.dataB.ekspor, jenis: '-', izin: '-' },
    { no: '7', nama: 'PERLAKUAN LAINNYA', jumlah: n.dataB.lainnya, jenis: '-', izin: '-' }
  ];

  let totalB = 0;
  perlakuanList.forEach(p => {
    totalB += parseFloat(p.jumlah);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align: center;">${p.no}</td>
      <td><strong>${p.nama}</strong></td>
      <td style="text-align: right; font-weight: bold;">${p.jumlah}</td>
      <td>${p.jenis}</td>
      <td style="text-align: center;">${p.izin === 'ADA' ? '✓' : '-'}</td>
      <td style="text-align: center;">${p.izin === 'TIDAK ADA' ? '✓' : '-'}</td>
    `;
    tbodyB.appendChild(tr);
  });
  document.getElementById('printNeracaTotalB').textContent = `B (-) ${totalB.toFixed(3)}`;

  document.getElementById('printNeracaResiduC').textContent = n.dataC || '0.000';
  document.getElementById('printNeracaBelumD').textContent = n.dataD || '0.000';
  document.getElementById('printNeracaTotalSisaCD').textContent = (parseFloat(n.dataC || 0) + parseFloat(n.dataD || 0)).toFixed(3);
  document.getElementById('printNeracaKinerjaRumus').textContent = n.kinerja;

  const boxOp = document.getElementById('printNeracaTtdOp');
  boxOp.innerHTML = n.ttdOperator ? `<img src="${safeSignatureUrl(n.ttdOperator)}" style="max-height: 45px;">` : `<span style="font-size: 8pt; color: #888;">(Belum Paraf)</span>`;

  const boxPJ = document.getElementById('printNeracaTtdPJ');
  boxPJ.innerHTML = n.ttdPJ ? `<img src="${safeSignatureUrl(n.ttdPJ)}" style="max-height: 45px;">` : `<span style="font-size: 8pt; color: #888;">(Belum Disetujui)</span>`;

  const boxKTT = document.getElementById('printNeracaTtdKTT');
  boxKTT.innerHTML = n.ttdKTT ? `<img src="${safeSignatureUrl(n.ttdKTT)}" style="max-height: 45px;">` : `<span style="font-size: 8pt; color: #888;">(Belum Disahkan)</span>`;

  document.body.className = 'print-portrait';
  const printEl = document.getElementById('printNeracaPortraitContainer');
  printEl.classList.add('active-print');

  setTimeout(() => {
    window.print();
    printEl.classList.remove('active-print');
    document.body.className = '';
  }, 200);
}

// --- POP-UP PENGATURAN, MANIFES, PREVIEW, & ALUR PENGESAHAN NERACA (Sesuai Permintaan #1) ---
function openModalPengaturanNeraca(neracaId) {
  const neracaList = JSON.parse(localStorage.getItem('db_neraca') || '[]');
  const n = neracaList.find(item => item.id === neracaId);
  if (!n) {
    showToast('Dokumen Neraca tidak ditemukan.', 'error');
    return;
  }

  STATE.activeNeracaForModal = neracaId;
  document.getElementById('pengaturanNeracaId').value = neracaId;

  // Set nomor dokumen
  const autoNo = n.nomorDokumen || generateNomorNeraca(n.bulan || 9, n.tahun || 2026);
  document.getElementById('pengaturanNeracaNomorDoc').value = autoNo;

  // Set bulan & tahun
  const m = n.bulan || 9;
  const y = n.tahun || 2026;
  document.getElementById('pengaturanNeracaBulanSelect').value = m;
  document.getElementById('pengaturanNeracaTahunInput').value = y;

  // Set dokumen kontrol
  const isMelampirkan = !n.dokumenKontrol || n.dokumenKontrol.toLowerCase().includes('melampirkan');
  const radios = document.getElementsByName('pengaturanNeracaDocKontrol');
  for (let r of radios) {
    if (r.value === 'Melampirkan Manifes') r.checked = isMelampirkan;
    if (r.value === 'Tidak Melampirkan Manifes') r.checked = !isMelampirkan;
  }
  toggleUploadManifesArea();

  // Set nomor manifes
  document.getElementById('pengaturanNomorManifes').value = n.nomorManifes || '';

  // Set file manifes preview
  STATE.tempManifesFile = n.fileManifes ? { name: n.fileManifesName || 'Dokumen_Manifes.pdf', dataUrl: n.fileManifes } : null;
  const badge = document.getElementById('pengaturanManifesFileBadge');
  const nameSpan = document.getElementById('pengaturanManifesFileName');
  if (STATE.tempManifesFile) {
    badge.classList.remove('hidden');
    nameSpan.textContent = STATE.tempManifesFile.name;
  } else {
    badge.classList.add('hidden');
  }

  // Update tombol Kirim/Sahkan berdasarkan role pengguna aktif
  const role = STATE.currentUser ? STATE.currentUser.role : 'Operator';
  const btnKirim = document.getElementById('btnKirimSahkanNeraca');
  const textKirim = document.getElementById('textKirimSahkan');
  const iconKirim = document.getElementById('iconKirimSahkan');

  if (role === 'Operator') {
    textKirim.textContent = 'Kirim ke Penanggung Jawab';
    iconKirim.setAttribute('data-lucide', 'send');
    btnKirim.className = 'btn-lime-pill flex items-center justify-center gap-1.5';
  } else if (role === 'Penanggung Jawab') {
    textKirim.textContent = 'Kirim ke KTT';
    iconKirim.setAttribute('data-lucide', 'send');
    btnKirim.className = 'btn-lime-pill flex items-center justify-center gap-1.5';
  } else if (role === 'Manajemen / KTT' || role === 'KTT') {
    textKirim.textContent = 'Sahkan Dokumen (Final)';
    iconKirim.setAttribute('data-lucide', 'check-check');
    btnKirim.className = 'btn-primary-pill !bg-purple-600 hover:!bg-purple-500 flex items-center justify-center gap-1.5';
  } else {
    textKirim.textContent = 'Simpan Pengaturan';
    iconKirim.setAttribute('data-lucide', 'save');
    btnKirim.className = 'btn-lime-pill flex items-center justify-center gap-1.5';
  }

  openModal('modalPengaturanCetakNeraca');
  lucide.createIcons();
}

function regeneratePengaturanNomorNeraca() {
  const m = document.getElementById('pengaturanNeracaBulanSelect').value;
  const y = document.getElementById('pengaturanNeracaTahunInput').value || '2026';
  const no = generateNomorNeraca(m, y);
  document.getElementById('pengaturanNeracaNomorDoc').value = no;
  showToast('Nomor dokumen neraca diperbarui.', 'info');
}

function updatePengaturanNomorRomawi() {
  const m = document.getElementById('pengaturanNeracaBulanSelect').value;
  const y = document.getElementById('pengaturanNeracaTahunInput').value || '2026';
  const currNo = document.getElementById('pengaturanNeracaNomorDoc').value;
  const roman = getRomanMonth(m);
  const parts = currNo.split('/');
  if (parts.length >= 5) {
    parts[3] = roman;
    parts[4] = y;
    document.getElementById('pengaturanNeracaNomorDoc').value = parts.join('/');
  } else {
    document.getElementById('pengaturanNeracaNomorDoc').value = generateNomorNeraca(m, y);
  }
}

function toggleUploadManifesArea() {
  const radios = document.getElementsByName('pengaturanNeracaDocKontrol');
  let val = 'Melampirkan Manifes';
  for (let r of radios) {
    if (r.checked) val = r.value;
  }
  const area = document.getElementById('areaUploadManifesNeraca');
  if (val === 'Melampirkan Manifes') {
    area.classList.remove('hidden');
  } else {
    area.classList.add('hidden');
  }
}

function handleUploadManifesFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    STATE.tempManifesFile = {
      name: file.name,
      dataUrl: e.target.result,
      size: (file.size / 1024).toFixed(1) + ' KB'
    };
    const badge = document.getElementById('pengaturanManifesFileBadge');
    const nameSpan = document.getElementById('pengaturanManifesFileName');
    badge.classList.remove('hidden');
    nameSpan.textContent = `${file.name} (${STATE.tempManifesFile.size})`;
    showToast('File bukti manifes berhasil diunggah.', 'success');
  };
  reader.readAsDataURL(file);
}

function clearUploadedManifesFile() {
  STATE.tempManifesFile = null;
  const fileInput = document.getElementById('pengaturanUploadManifesFile');
  if (fileInput) fileInput.value = '';
  document.getElementById('pengaturanManifesFileBadge').classList.add('hidden');
  showToast('File bukti manifes dihapus.', 'info');
}

function saveNeracaSettingsFromModal(neracaId) {
  const neracaList = JSON.parse(localStorage.getItem('db_neraca') || '[]');
  const n = neracaList.find(item => item.id === neracaId);
  if (!n) return null;

  const noDoc = document.getElementById('pengaturanNeracaNomorDoc').value.trim();
  const m = parseInt(document.getElementById('pengaturanNeracaBulanSelect').value);
  const y = document.getElementById('pengaturanNeracaTahunInput').value.trim();
  
  const radios = document.getElementsByName('pengaturanNeracaDocKontrol');
  let docKontrol = 'Melampirkan Manifes';
  for (let r of radios) {
    if (r.checked) docKontrol = r.value;
  }

  const noManifes = document.getElementById('pengaturanNomorManifes').value.trim();

  n.nomorDokumen = noDoc;
  n.bulan = m;
  n.tahun = y;
  n.periode = `${BULAN_NAMA[m - 1]} ${y}`;
  n.dokumenKontrol = docKontrol === 'Melampirkan Manifes' ? (noManifes ? `Melampirkan Manifes (${noManifes})` : 'Melampirkan Manifes') : 'Tidak Melampirkan Manifes';
  n.nomorManifes = noManifes;

  if (STATE.tempManifesFile) {
    n.fileManifes = STATE.tempManifesFile.dataUrl;
    n.fileManifesName = STATE.tempManifesFile.name;
  } else if (docKontrol === 'Tidak Melampirkan Manifes') {
    delete n.fileManifes;
    delete n.fileManifesName;
  }

  localStorage.setItem('db_neraca', JSON.stringify(neracaList));
  return n;
}

function printNeracaFromModal() {
  const neracaId = document.getElementById('pengaturanNeracaId').value;
  saveNeracaSettingsFromModal(neracaId);
  renderNeraca();
  printOfficialNeracaPortrait(neracaId);
}

function previewNeracaFromModal() {
  const neracaId = document.getElementById('pengaturanNeracaId').value;
  const n = saveNeracaSettingsFromModal(neracaId);
  if (!n) return;
  renderNeraca();

  const cfg = JSON.parse(localStorage.getItem('db_settings') || '{}');
  const masuk = JSON.parse(localStorage.getItem('db_limbah_masuk') || '[]');

  // Bangun data tabel jenis awal limbah A
  const rintekMap = {};
  masuk.forEach(m => {
    rintekMap[m.namaLimbah] = (rintekMap[m.namaLimbah] || 0) + (parseFloat(m.jumlah) || 0);
  });

  let rowsAHtml = '';
  let counter = 1;
  for (let [nama, kg] of Object.entries(rintekMap)) {
    const ton = (kg / 1000).toFixed(3);
    rowsAHtml += `
      <tr>
        <td style="border: 1px solid #000; padding: 4px; text-align: center;">${counter++}</td>
        <td style="border: 1px solid #000; padding: 4px;">${nama}</td>
        <td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${ton}</td>
        <td colspan="3" style="border: 1px solid #000; padding: 4px;">Penyimpanan di TPS LB3 01</td>
      </tr>
    `;
  }

  const perlakuanList = [
    { no: '1', nama: 'DISIMPAN', jumlah: n.dataB.disimpan, jenis: 'Limbah B3 di TPS 01', izin: 'ADA' },
    { no: '2', nama: 'DIMANFAATKAN', jumlah: n.dataB.dimanfaatkan, jenis: '-', izin: '-' },
    { no: '3', nama: 'DIOLAH', jumlah: n.dataB.diolah, jenis: '-', izin: '-' },
    { no: '4', nama: 'DITIMBUN', jumlah: n.dataB.ditimbun, jenis: '-', izin: '-' },
    { no: '5', nama: 'DISERAHKAN KE PIHAK KETIGA', jumlah: n.dataB.diserahkanPihakKetiga, jenis: 'PT. Berkat Jaya Sukses', izin: 'ADA' },
    { no: '6', nama: 'EKSPOR', jumlah: n.dataB.ekspor, jenis: '-', izin: '-' },
    { no: '7', nama: 'PERLAKUAN LAINNYA', jumlah: n.dataB.lainnya, jenis: '-', izin: '-' }
  ];

  let totalB = 0;
  let rowsBHtml = '';
  perlakuanList.forEach(p => {
    totalB += parseFloat(p.jumlah);
    rowsBHtml += `
      <tr>
        <td style="border: 1px solid #000; padding: 4px; text-align: center;">${p.no}</td>
        <td style="border: 1px solid #000; padding: 4px;"><strong>${p.nama}</strong></td>
        <td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${p.jumlah}</td>
        <td style="border: 1px solid #000; padding: 4px;">${p.jenis}</td>
        <td style="border: 1px solid #000; padding: 4px; text-align: center;">${p.izin === 'ADA' ? '✓' : '-'}</td>
        <td style="border: 1px solid #000; padding: 4px; text-align: center;">${p.izin === 'TIDAK ADA' ? '✓' : '-'}</td>
      </tr>
    `;
  });

  const sigOp = safeSignatureUrl(n.ttdOperator);
  const sigPJ = safeSignatureUrl(n.ttdPJ);
  const sigKTT = safeSignatureUrl(n.ttdKTT);

  const previewEl = document.getElementById('previewPaperNeraca');
  previewEl.innerHTML = `
    <div style="display: flex; align-items: center; gap: 1rem; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 12px; text-align: left;">
      ${cfg.logoBase64 ? `<img src="${cfg.logoBase64}" style="width: 65px; height: 65px; object-fit: contain;">` : ''}
      <div style="flex: 1; text-align: left;">
        <h2 style="font-size: 12pt; font-weight: 900; text-transform: uppercase; margin: 0; color: #000;">${cfg.namaPerusahaan || 'PT. ETAM MANUNGGAL JAYA'}</h2>
        <p style="font-size: 8pt; margin: 2px 0; color: #333;">${cfg.alamatKantor || 'Jalan S. Parman No. 6, Kota Samarinda'}</p>
        <p style="font-size: 8pt; margin: 0; color: #333;">Telp: ${cfg.telpPerusahaan || '-'} &bull; Email: ${cfg.emailPerusahaan || '-'}</p>
      </div>
    </div>

    <table style="width: 100%; font-size: 8.5pt; margin-bottom: 10px; border: none; text-align: left;">
      <tr><td style="width: 25%; font-weight: bold;">Nama Perusahaan</td><td>: ${n.namaPerusahaan || cfg.namaPerusahaan}</td></tr>
      <tr><td style="font-weight: bold;">Bidang Usaha</td><td>: ${n.bidangUsaha || cfg.bidangUsaha}</td></tr>
      <tr><td style="font-weight: bold;">Nomor Dokumen</td><td>: <span style="font-family: monospace; font-weight: bold; color: #0284c7;">${n.nomorDokumen || n.id}</span></td></tr>
      <tr><td style="font-weight: bold;">Periode Waktu</td><td>: ${n.periode}</td></tr>
      <tr><td style="font-weight: bold;">Dokumen Kontrol</td><td>: <strong>${n.dokumenKontrol || 'Melampirkan Manifes'}</strong></td></tr>
    </table>

    <table style="width: 100%; border-collapse: collapse; font-size: 8pt; margin-bottom: 8px;">
      <thead>
        <tr style="background: #e2e8f0;">
          <th style="border: 1px solid #000; padding: 4px; width: 4%;">I</th>
          <th style="border: 1px solid #000; padding: 4px; width: 36%;">JENIS AWAL LIMBAH B3</th>
          <th style="border: 1px solid #000; padding: 4px; width: 15%;">JUMLAH (Ton)</th>
          <th colspan="3" style="border: 1px solid #000; padding: 4px;">CATATAN</th>
        </tr>
      </thead>
      <tbody>
        ${rowsAHtml}
        <tr style="font-weight: bold; background: #f8fafc;">
          <td colspan="2" style="border: 1px solid #000; padding: 4px; text-align: right;">TOTAL LIMBAH B3 DIHASILKAN</td>
          <td style="border: 1px solid #000; padding: 4px; text-align: right; color: #0284c7;">A (+) ${n.dataA}</td>
          <td colspan="3" style="border: 1px solid #000; padding: 4px;"></td>
        </tr>
      </tbody>
    </table>

    <table style="width: 100%; border-collapse: collapse; font-size: 8pt; margin-bottom: 8px;">
      <thead>
        <tr style="background: #e2e8f0;">
          <th rowspan="2" style="border: 1px solid #000; padding: 4px; width: 4%;">II</th>
          <th rowspan="2" style="border: 1px solid #000; padding: 4px; width: 36%;">PERLAKUAN</th>
          <th rowspan="2" style="border: 1px solid #000; padding: 4px; width: 15%;">JUMLAH (Ton)</th>
          <th rowspan="2" style="border: 1px solid #000; padding: 4px;">JENIS LIMBAH B3</th>
          <th colspan="2" style="border: 1px solid #000; padding: 4px;">PERSETUJUAN TEKNIS</th>
        </tr>
        <tr style="background: #e2e8f0;">
          <th style="border: 1px solid #000; padding: 3px;">ADA</th>
          <th style="border: 1px solid #000; padding: 3px;">TIDAK ADA</th>
        </tr>
      </thead>
      <tbody>
        ${rowsBHtml}
        <tr style="font-weight: bold; background: #f8fafc;">
          <td colspan="2" style="border: 1px solid #000; padding: 4px; text-align: right;">TOTAL LIMBAH B3 DIKELOLA</td>
          <td style="border: 1px solid #000; padding: 4px; text-align: right; color: #16a34a;">B (-) ${totalB.toFixed(3)}</td>
          <td colspan="3" style="border: 1px solid #000; padding: 4px;"></td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top: 15px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center; font-size: 8pt;">
      <div style="border: 1px solid #000; padding: 8px; border-radius: 4px;">
        <p style="font-weight: bold; margin-bottom: 4px;">1. Disusun Oleh</p>
        <p style="font-size: 7.5pt; color: #555;">Operator TPS LB3</p>
        <div style="height: 50px; display: flex; align-items: center; justify-content: center;">
          ${sigOp ? `<img src="${sigOp}" style="max-height: 42px;">` : '<span style="color: #999;">(Belum Paraf)</span>'}
        </div>
        <p style="font-weight: bold; margin-top: 4px;">( Operator Lapangan )</p>
      </div>

      <div style="border: 1px solid #000; padding: 8px; border-radius: 4px;">
        <p style="font-weight: bold; margin-bottom: 4px;">2. Diperiksa Oleh</p>
        <p style="font-size: 7.5pt; color: #555;">Penanggung Jawab TPS</p>
        <div style="height: 50px; display: flex; align-items: center; justify-content: center;">
          ${sigPJ ? `<img src="${sigPJ}" style="max-height: 42px;">` : '<span style="color: #999;">(Belum Disetujui)</span>'}
        </div>
        <p style="font-weight: bold; margin-top: 4px;">( Hermanto )</p>
      </div>

      <div style="border: 1px solid #000; padding: 8px; border-radius: 4px;">
        <p style="font-weight: bold; margin-bottom: 4px;">3. Disahkan Oleh</p>
        <p style="font-size: 7.5pt; color: #555;">Kepala Teknik Tambang (KTT)</p>
        <div style="height: 50px; display: flex; align-items: center; justify-content: center;">
          ${sigKTT ? `<img src="${sigKTT}" style="max-height: 42px;">` : '<span style="color: #999;">(Belum Disahkan)</span>'}
        </div>
        <p style="font-weight: bold; margin-top: 4px;">( Ronald Damopoli )</p>
      </div>
    </div>
  `;

  openModal('modalPreviewNeraca');
}

function submitWorkflowNeracaFromModal() {
  const neracaId = document.getElementById('pengaturanNeracaId').value;
  const neracaList = JSON.parse(localStorage.getItem('db_neraca') || '[]');
  const item = neracaList.find(n => n.id === neracaId);
  if (!item) return;

  saveNeracaSettingsFromModal(neracaId);

  const role = STATE.currentUser ? STATE.currentUser.role : 'Operator';
  const savedSig = getSavedUserSignature();

  if (role === 'Operator') {
    if (!item.ttdOperator) {
      item.ttdOperator = savedSig || ('data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="140" height="50" viewBox="0 0 140 50"><text x="10" y="34" font-family="Brush Script MT, cursive, sans-serif" font-size="24" font-weight="bold" fill="#0f172a">Operator</text></svg>'));
    }
    item.status = 'Menunggu Approval Penanggung Jawab';
    localStorage.setItem('db_neraca', JSON.stringify(neracaList));
    addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Operator', 'SUBMIT_NERACA_PJ', `Mengirim Neraca ${item.nomorDokumen || neracaId} ke Penanggung Jawab TPS`);
    showToast(`Dokumen Neraca ${item.nomorDokumen || neracaId} berhasil dikirim ke Penanggung Jawab TPS!`, 'success');
  } else if (role === 'Penanggung Jawab') {
    if (!item.ttdPJ) {
      item.ttdPJ = savedSig || ('data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="140" height="50" viewBox="0 0 140 50"><text x="10" y="34" font-family="Brush Script MT, cursive, sans-serif" font-size="24" font-weight="bold" fill="#0f172a">Hermanto</text></svg>'));
    }
    item.status = 'Menunggu Pengesahan KTT';
    localStorage.setItem('db_neraca', JSON.stringify(neracaList));
    addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Penanggung Jawab', 'SUBMIT_NERACA_KTT', `Mengirim Neraca ${item.nomorDokumen || neracaId} ke KTT`);
    showToast(`Dokumen Neraca ${item.nomorDokumen || neracaId} berhasil disetujui & diteruskan ke KTT!`, 'success');
  } else if (role === 'Manajemen / KTT' || role === 'KTT') {
    if (!item.ttdKTT) {
      item.ttdKTT = savedSig || ('data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="140" height="50" viewBox="0 0 140 50"><text x="10" y="34" font-family="Brush Script MT, cursive, sans-serif" font-size="24" font-weight="bold" fill="#0f172a">Ronald Damopoli</text></svg>'));
    }
    item.status = 'Final';
    localStorage.setItem('db_neraca', JSON.stringify(neracaList));
    addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'KTT', 'APPROVE_FINAL_KTT', `Mengesahkan Neraca ${item.nomorDokumen || neracaId} (Status Final)`);
    showToast(`Dokumen Neraca ${item.nomorDokumen || neracaId} telah RESMI DISAHKAN oleh KTT (Final)!`, 'success');
  } else {
    // Admin HSE
    localStorage.setItem('db_neraca', JSON.stringify(neracaList));
    showToast('Pengaturan Dokumen Neraca berhasil disimpan.', 'success');
  }

  closeModal('modalPengaturanCetakNeraca');
  renderNeraca();

  // Sync perubahan status / ttd neraca ke GAS
  syncMutationToGas('update_neraca', { id: neracaId, data: item });
}

// --- 4.8 STUDIO TANDA TANGAN ONLINE (Sesuai Permintaan #1) ---
let studioCanvas, studioCtx, isStudioDrawing = false;

function renderStudioTtd() {
  if (!STATE.currentUser) return;
  document.getElementById('ttdUserRoleBadge').textContent = STATE.currentUser.role;
  document.getElementById('ttdOwnerName').textContent = STATE.currentUser.nama;

  // Render spesimen tersimpan jika ada
  const savedTtd = getSavedUserSignature();
  const prevContainer = document.getElementById('savedSignaturePreview');
  if (savedTtd) {
    prevContainer.innerHTML = `<img src="${savedTtd}" class="max-h-32 object-contain mx-auto">`;
  } else {
    prevContainer.innerHTML = `<span class="text-xs text-slate-500 italic">Belum ada spesimen tanda tangan tersimpan. Goreskan di kanvas kiri lalu klik Simpan.</span>`;
  }

  // Inisialisasi Kanvas Studio
  setTimeout(() => {
    initStudioCanvas();
  }, 100);

  // Render Antrean Dokumen Menunggu Tanda Tangan User
  renderPendingSignatureQueue();
}

function initStudioCanvas() {
  studioCanvas = document.getElementById('studioSignatureCanvas');
  if (!studioCanvas) return;
  studioCtx = studioCanvas.getContext('2d');

  studioCanvas.width = studioCanvas.parentElement.clientWidth;
  studioCanvas.height = 180;

  studioCtx.lineWidth = 2.5;
  studioCtx.lineCap = 'round';
  studioCtx.strokeStyle = '#0f172a';

  clearStudioCanvas();

  studioCanvas.onmousedown = (e) => startStudioDrawing(e);
  studioCanvas.onmousemove = (e) => drawStudio(e);
  studioCanvas.onmouseup = () => stopStudioDrawing();

  studioCanvas.ontouchstart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    startStudioDrawing({ clientX: touch.clientX, clientY: touch.clientY });
  };
  studioCanvas.ontouchmove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    drawStudio({ clientX: touch.clientX, clientY: touch.clientY });
  };
  studioCanvas.ontouchend = () => stopStudioDrawing();
}

function startStudioDrawing(e) {
  isStudioDrawing = true;
  studioCtx.beginPath();
  const rect = studioCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  studioCtx.moveTo(x, y);
}

function drawStudio(e) {
  if (!isStudioDrawing) return;
  const rect = studioCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  studioCtx.lineTo(x, y);
  studioCtx.stroke();
}

function stopStudioDrawing() {
  isStudioDrawing = false;
}

function clearStudioCanvas() {
  if (!studioCtx || !studioCanvas) return;
  studioCtx.fillStyle = '#ffffff';
  studioCtx.fillRect(0, 0, studioCanvas.width, studioCanvas.height);
}

function setStudioPenColor(color) {
  if (!studioCtx) return;
  studioCtx.strokeStyle = color;
  showToast(`Warna tinta diubah (${color === '#1d4ed8' ? 'Biru' : 'Hitam'}).`, 'info');
}

function handleUploadStudioTtd(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      clearStudioCanvas();
      const hRatio = studioCanvas.width / img.width;
      const vRatio = studioCanvas.height / img.height;
      const ratio = Math.min(hRatio, vRatio, 1);
      const centerShiftX = (studioCanvas.width - img.width * ratio) / 2;
      const centerShiftY = (studioCanvas.height - img.height * ratio) / 2;
      studioCtx.drawImage(img, 0, 0, img.width, img.height,
                          centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);
      showToast('Spesimen TTD berhasil dimuat ke kanvas. Klik "Simpan Sebagai TTD Saya" untuk menyimpan.', 'info');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function saveUserDefaultSignature() {
  if (!studioCanvas || !STATE.currentUser) return;
  const sigDataUrl = studioCanvas.toDataURL('image/png');

  // Simpan ke local storage user profile
  localStorage.setItem('saved_ttd_' + STATE.currentUser.id, sigDataUrl);
  showToast('Spesimen tanda tangan digital Anda berhasil disimpan!', 'success');
  renderStudioTtd();
}

function getSavedUserSignature() {
  if (!STATE.currentUser) return null;
  return localStorage.getItem('saved_ttd_' + STATE.currentUser.id) || null;
}

function renderPendingSignatureQueue() {
  const table = document.getElementById('tablePendingSignatureBody');
  const neracaList = JSON.parse(localStorage.getItem('db_neraca') || '[]');
  const role = STATE.currentUser ? STATE.currentUser.role : '';
  table.innerHTML = '';

  // Filter neraca yang relevan dengan role saat ini
  let pendingList = [];
  if (role === 'Operator') {
    pendingList = neracaList.filter(n => !n.ttdOperator);
  } else if (role === 'Penanggung Jawab') {
    pendingList = neracaList.filter(n => n.ttdOperator && !n.ttdPJ);
  } else if (role === 'Manajemen / KTT' || role === 'KTT') {
    pendingList = neracaList.filter(n => n.ttdPJ && !n.ttdKTT);
  }

  if (pendingList.length === 0) {
    table.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-slate-500">Tidak ada dokumen yang sedang menunggu tanda tangan Anda sebagai ${role}.</td></tr>`;
    return;
  }

  pendingList.forEach(n => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="font-mono text-vault-lime font-bold">${n.nomorDokumen || n.id}</td>
      <td class="font-semibold text-white">${n.periode}</td>
      <td class="font-mono">${n.dataA} Ton</td>
      <td><span class="badge-status badge-yellow">${n.status}</span></td>
      <td>
        <button onclick="quickSignFromStudio('${n.id}')" class="btn-lime-pill !py-1 !px-3 text-xs">
          <i data-lucide="pen-tool" class="w-3.5 h-3.5"></i> Sahkan Sekarang
        </button>
      </td>
    `;
    table.appendChild(tr);
  });
}

function quickSignFromStudio(neracaId) {
  const savedTtd = getSavedUserSignature();
  const role = STATE.currentUser ? STATE.currentUser.role : 'Operator';

  if (!savedTtd) {
    showToast('Silakan goreskan tanda tangan Anda di kanvas terlebih dahulu lalu klik Simpan TTD!', 'warning');
    return;
  }

  const neracaList = JSON.parse(localStorage.getItem('db_neraca') || '[]');
  const item = neracaList.find(n => n.id === neracaId);
  if (!item) return;

  if (role === 'Operator') {
    item.ttdOperator = savedTtd;
    item.status = 'Menunggu Approval Penanggung Jawab';
  } else if (role === 'Penanggung Jawab') {
    item.ttdPJ = savedTtd;
    item.status = 'Menunggu Pengesahan KTT';
  } else if (role === 'Manajemen / KTT' || role === 'KTT') {
    item.ttdKTT = savedTtd;
    item.status = 'Final';
  }

  localStorage.setItem('db_neraca', JSON.stringify(neracaList));
  syncMutationToGas('sign_neraca', { id: neracaId, role: role, signatureBase64: savedTtd });

  addAuditLog(STATE.currentUser.nama, 'SIGN_NERACA', `Mengesahkan Neraca ${item.nomorDokumen || neracaId} sebagai ${role}`);
  showToast(`Dokumen Neraca ${item.nomorDokumen || neracaId} berhasil disahkan!`, 'success');
  renderStudioTtd();
}

// --- POPUP SIGNATURE CANVAS (MODAL) ---
let canvas, ctx, isDrawing = false;

function openSignatureModal(neracaId, role) {
  STATE.signatureTarget = { neracaId, role };
  document.getElementById('signatureRoleLabel').textContent = `Penandatangan: ${role} (${STATE.currentUser ? STATE.currentUser.nama : 'Pengguna'})`;
  openModal('modalSignature');

  setTimeout(() => {
    initSignatureCanvas();
  }, 150);
}

function initSignatureCanvas() {
  canvas = document.getElementById('signatureCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = 180;

  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#0f172a';

  clearSignatureCanvas();

  canvas.onmousedown = (e) => startDrawing(e);
  canvas.onmousemove = (e) => draw(e);
  canvas.onmouseup = () => stopDrawing();

  canvas.ontouchstart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    startDrawing({ clientX: touch.clientX, clientY: touch.clientY });
  };
  canvas.ontouchmove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    draw({ clientX: touch.clientX, clientY: touch.clientY });
  };
  canvas.ontouchend = () => stopDrawing();
}

function startDrawing(e) {
  isDrawing = true;
  ctx.beginPath();
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  ctx.moveTo(x, y);
}

function draw(e) {
  if (!isDrawing) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  ctx.lineTo(x, y);
  ctx.stroke();
}

function stopDrawing() { isDrawing = false; }

function clearSignatureCanvas() {
  if (!ctx || !canvas) return;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function submitDigitalSignature() {
  if (!canvas || !STATE.signatureTarget) return;
  const signatureDataUrl = canvas.toDataURL('image/png');

  const { neracaId, role } = STATE.signatureTarget;
  const neracaList = JSON.parse(localStorage.getItem('db_neraca') || '[]');
  const item = neracaList.find(n => n.id === neracaId);

  if (!item) {
    showToast('Data neraca tidak ditemukan.', 'error');
    return;
  }

  if (role === 'Operator') {
    item.ttdOperator = signatureDataUrl;
    item.status = 'Menunggu Approval Penanggung Jawab';
  } else if (role === 'Penanggung Jawab') {
    item.ttdPJ = signatureDataUrl;
    item.status = 'Menunggu Pengesahan KTT';
  } else if (role === 'Manajemen / KTT' || role === 'KTT') {
    item.ttdKTT = signatureDataUrl;
    item.status = 'Final';
  }

  localStorage.setItem('db_neraca', JSON.stringify(neracaList));
  syncMutationToGas('sign_neraca', { id: neracaId, role: role, signatureBase64: signatureDataUrl });

  addAuditLog(STATE.currentUser ? STATE.currentUser.nama : role, 'SIGN_NERACA', `Menandatangani Neraca ${neracaId} sebagai ${role}`);

  showToast(`Tanda tangan elektronik ${role} berhasil dibubuhkan!`, 'success');
  closeModal('modalSignature');
  renderNeraca();
}

// --- 4.9 MASTER RINTEK (CRUD) ---
function renderMasterRintek() {
  const table = document.getElementById('tableMasterRintekBody');
  const data = JSON.parse(localStorage.getItem('db_rintek') || '[]');
  table.innerHTML = '';

  data.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="font-mono text-vault-lime font-bold">${r.kodeLimbah}</td>
      <td class="font-semibold text-white">${r.namaLimbah}</td>
      <td class="text-xs text-slate-300">${r.sumber}</td>
      <td class="text-xs text-slate-300">${r.karakteristik}</td>
      <td class="text-xs font-mono text-slate-300">${r.jenisWadah}</td>
      <td class="font-mono">${r.kapasitasWadah} ${r.satuan}</td>
      <td>
        <span class="badge-status ${r.batasSimpanHari <= 90 ? 'badge-yellow' : 'badge-green'} font-mono">
          ${r.batasSimpanHari} Hari
        </span>
      </td>
      <td>
        <div class="flex items-center gap-1.5">
          <button onclick="openModalEditRintek('${r.kodeLimbah}')" class="btn-action-sm btn-edit" title="Edit"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i> Edit</button>
          <button onclick="deleteRintek('${r.kodeLimbah}')" class="btn-action-sm btn-delete" title="Hapus"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Hapus</button>
        </div>
      </td>
    `;
    table.appendChild(tr);
  });
}

function openModalTambahRintek() {
  const kode = prompt('Kode Limbah (misal: B106d):');
  if (!kode) return;
  const nama = prompt('Nama Limbah B3:');
  if (!nama) return;
  const sumber = prompt('Sumber Limbah B3:', 'Sumber spesifik operasional tambang');
  const kar = prompt('Karakteristik (Beracun, Mudah Terbakar, dsb):', 'Beracun');
  const wadah = prompt('Jenis Wadah:', 'Drum');
  const kap = prompt('Kapasitas Wadah:', '200');
  const satuan = prompt('Satuan (Kg/Liter):', 'Kg');
  const hari = prompt('Batas Waktu Simpan (90/180/365 hari):', '90');

  const rintek = JSON.parse(localStorage.getItem('db_rintek') || '[]');
  rintek.push({
    kodeLimbah: kode,
    namaLimbah: nama,
    sumber: sumber || 'Tambang',
    karakteristik: kar || 'Beracun',
    jenisWadah: wadah || 'Drum',
    kapasitasWadah: parseFloat(kap) || 200,
    satuan: satuan || 'Kg',
    batasSimpanHari: parseInt(hari) || 90
  });

  localStorage.setItem('db_rintek', JSON.stringify(rintek));
  syncMutationToGas('save_rintek', { data: rintek[rintek.length - 1] });

  addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Admin', 'ADD_RINTEK', `Menambahkan master rintek ${nama} (${kode})`);
  showToast('Data Rintek berhasil ditambahkan.', 'success');
  renderMasterRintek();
}

function openModalEditRintek(kode) {
  const rintek = JSON.parse(localStorage.getItem('db_rintek') || '[]');
  const item = rintek.find(r => r.kodeLimbah === kode);
  if (!item) return;

  document.getElementById('editRintekOriginalKode').value = item.kodeLimbah;
  document.getElementById('editRintekKode').value = item.kodeLimbah;
  document.getElementById('editRintekNama').value = item.namaLimbah;
  document.getElementById('editRintekSumber').value = item.sumber;
  document.getElementById('editRintekKarakteristik').value = item.karakteristik;
  document.getElementById('editRintekWadah').value = item.jenisWadah;
  document.getElementById('editRintekKapasitas').value = item.kapasitasWadah;
  document.getElementById('editRintekSatuan').value = item.satuan;
  document.getElementById('editRintekBatasHari').value = item.batasSimpanHari;

  openModal('modalEditRintek');
}

function handleSaveEditRintek(e) {
  e.preventDefault();
  const origKode = document.getElementById('editRintekOriginalKode').value;
  const kode = document.getElementById('editRintekKode').value.trim();
  const nama = document.getElementById('editRintekNama').value.trim();
  const sumber = document.getElementById('editRintekSumber').value.trim();
  const kar = document.getElementById('editRintekKarakteristik').value.trim();
  const wadah = document.getElementById('editRintekWadah').value.trim();
  const kap = parseFloat(document.getElementById('editRintekKapasitas').value) || 200;
  const sat = document.getElementById('editRintekSatuan').value;
  const hari = parseInt(document.getElementById('editRintekBatasHari').value) || 90;

  const rintek = JSON.parse(localStorage.getItem('db_rintek') || '[]');
  const idx = rintek.findIndex(r => r.kodeLimbah === origKode);

  if (idx !== -1) {
    rintek[idx] = {
      kodeLimbah: kode,
      namaLimbah: nama,
      sumber: sumber,
      karakteristik: kar,
      jenisWadah: wadah,
      kapasitasWadah: kap,
      satuan: sat,
      batasSimpanHari: hari
    };
    localStorage.setItem('db_rintek', JSON.stringify(rintek));
    syncMutationToGas('update_rintek', { kode: origKode, data: rintek[idx] });

    addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Admin', 'EDIT_RINTEK', `Mengubah rintek ${nama} (${kode})`);
    showToast('Data Rintek berhasil diperbarui.', 'success');
    closeModal('modalEditRintek');
    renderMasterRintek();
  }
}

function deleteRintek(kode) {
  if (confirm(`Apakah Anda yakin ingin menghapus limbah Rintek ${kode}?`)) {
    let rintek = JSON.parse(localStorage.getItem('db_rintek') || '[]');
    rintek = rintek.filter(r => r.kodeLimbah !== kode);
    localStorage.setItem('db_rintek', JSON.stringify(rintek));
    syncMutationToGas('delete_rintek', { kode: kode });

    addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Admin', 'DELETE_RINTEK', `Menghapus limbah rintek ${kode}`);
    showToast('Data Rintek berhasil dihapus.', 'info');
    renderMasterRintek();
  }
}

// --- 4.10 MASTER PIHAK KETIGA (CRUD) ---
function renderMasterPihakKetiga() {
  const table = document.getElementById('tablePihakKetigaBody');
  const data = JSON.parse(localStorage.getItem('db_pihak_ketiga') || '[]');
  table.innerHTML = '';

  data.forEach(pk => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="font-mono text-sky-400">${pk.id}</td>
      <td class="font-bold text-white">${pk.namaPerusahaan}</td>
      <td class="font-mono text-xs text-vault-lime">${pk.noIzin}</td>
      <td class="text-xs text-slate-300">${pk.alamat}</td>
      <td class="text-xs text-slate-400">${pk.kontak}</td>
      <td>
        <div class="flex items-center gap-1.5">
          <button onclick="openModalEditPK('${pk.id}')" class="btn-action-sm btn-edit"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i> Edit</button>
          <button onclick="deletePihakKetiga('${pk.id}')" class="btn-action-sm btn-delete"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Hapus</button>
        </div>
      </td>
    `;
    table.appendChild(tr);
  });
}

function openModalTambahPihakKetiga() {
  const nama = prompt('Nama Perusahaan Pihak Ketiga:');
  if (!nama) return;
  const izin = prompt('Nomor Izin Operasional KLHK:');
  const alamat = prompt('Alamat Operasional:', 'Balikpapan / Samarinda');
  const kontak = prompt('Kontak Person / Telepon:');

  const pkList = JSON.parse(localStorage.getItem('db_pihak_ketiga') || '[]');
  const newId = 'PK-' + ('00' + (pkList.length + 1)).slice(-3);

  pkList.push({
    id: newId,
    namaPerusahaan: nama,
    noIzin: izin || 'Dalam Proses',
    alamat: alamat || 'Kalimantan Timur',
    kontak: kontak || '-'
  });

  localStorage.setItem('db_pihak_ketiga', JSON.stringify(pkList));
  syncMutationToGas('save_pihak_ketiga', { data: pkList[pkList.length - 1] });

  addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Admin', 'ADD_PIHAK_KETIGA', `Menambahkan mitra pihak ketiga ${nama}`);
  showToast('Pihak ketiga berhasil ditambahkan.', 'success');
  renderMasterPihakKetiga();
}

function openModalEditPK(id) {
  const pkList = JSON.parse(localStorage.getItem('db_pihak_ketiga') || '[]');
  const item = pkList.find(p => p.id === id);
  if (!item) return;

  document.getElementById('editPKId').value = item.id;
  document.getElementById('editPKNama').value = item.namaPerusahaan;
  document.getElementById('editPKIzin').value = item.noIzin;
  document.getElementById('editPKAlamat').value = item.alamat;
  document.getElementById('editPKKontak').value = item.kontak;

  openModal('modalEditPK');
}

function handleSaveEditPK(e) {
  e.preventDefault();
  const id = document.getElementById('editPKId').value;
  const nama = document.getElementById('editPKNama').value.trim();
  const izin = document.getElementById('editPKIzin').value.trim();
  const alamat = document.getElementById('editPKAlamat').value.trim();
  const kontak = document.getElementById('editPKKontak').value.trim();

  const pkList = JSON.parse(localStorage.getItem('db_pihak_ketiga') || '[]');
  const idx = pkList.findIndex(p => p.id === id);

  if (idx !== -1) {
    pkList[idx] = { id, namaPerusahaan: nama, noIzin: izin, alamat, kontak };
    localStorage.setItem('db_pihak_ketiga', JSON.stringify(pkList));
    syncMutationToGas('update_pihak_ketiga', { id: id, data: pkList[idx] });

    addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Admin', 'EDIT_PIHAK_KETIGA', `Mengubah pihak ketiga ${nama}`);
    showToast('Data pihak ketiga berhasil diperbarui.', 'success');
    closeModal('modalEditPK');
    renderMasterPihakKetiga();
  }
}

function deletePihakKetiga(id) {
  if (confirm(`Apakah Anda yakin ingin menghapus pihak ketiga ${id}?`)) {
    let pkList = JSON.parse(localStorage.getItem('db_pihak_ketiga') || '[]');
    pkList = pkList.filter(p => p.id !== id);
    localStorage.setItem('db_pihak_ketiga', JSON.stringify(pkList));
    syncMutationToGas('delete_pihak_ketiga', { id: id });

    addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Admin', 'DELETE_PIHAK_KETIGA', `Menghapus pihak ketiga ${id}`);
    showToast('Pihak ketiga berhasil dihapus.', 'info');
    renderMasterPihakKetiga();
  }
}

// --- 4.11 MASTER USERS (CRUD) ---
function renderMasterUsers() {
  const table = document.getElementById('tableUsersBody');
  const data = JSON.parse(localStorage.getItem('db_users') || '[]');
  table.innerHTML = '';

  data.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="font-mono text-sky-400">${u.id}</td>
      <td class="font-bold text-white">${u.nama}</td>
      <td class="font-mono text-xs text-slate-300">${u.username}</td>
      <td><span class="badge-status badge-blue">${u.role}</span></td>
      <td><span class="badge-status ${u.status === 'Aktif' ? 'badge-green' : 'badge-red'}">${u.status}</span></td>
      <td>
        <div class="flex items-center gap-1.5">
          <button onclick="openModalEditUser('${u.id}')" class="btn-action-sm btn-edit"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i> Edit</button>
          <button onclick="resetUserPassword('${u.username}')" class="btn-action-sm role-quick-btn">Reset Pass</button>
          <button onclick="deleteUser('${u.id}')" class="btn-action-sm btn-delete"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Hapus</button>
        </div>
      </td>
    `;
    table.appendChild(tr);
  });
}

function openModalTambahUser() {
  const nama = prompt('Nama Lengkap:');
  if (!nama) return;
  const username = prompt('Username Login:');
  if (!username) return;
  const role = prompt('Pilih Role (Operator / Penanggung Jawab / Admin HSE / Manajemen / KTT):', 'Operator');
  const password = prompt('Password Awal:', 'password123');

  const users = JSON.parse(localStorage.getItem('db_users') || '[]');
  const newId = 'USR-' + ('00' + (users.length + 1)).slice(-2);

  users.push({
    id: newId,
    nama: nama,
    username: username,
    password: password || 'password123',
    role: role || 'Operator',
    status: 'Aktif',
    fotoProfil: ''
  });

  localStorage.setItem('db_users', JSON.stringify(users));
  syncMutationToGas('save_user', { data: users[users.length - 1] });

  addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Admin', 'ADD_USER', `Mendaftarkan pengguna baru: ${username} (${role})`);
  showToast('Pengguna baru berhasil didaftarkan.', 'success');
  renderMasterUsers();
}

function openModalEditUser(id) {
  const users = JSON.parse(localStorage.getItem('db_users') || '[]');
  const item = users.find(u => u.id === id);
  if (!item) return;

  document.getElementById('editUserId').value = item.id;
  document.getElementById('editUserNama').value = item.nama;
  document.getElementById('editUserUsername').value = item.username;
  document.getElementById('editUserRole').value = item.role;
  document.getElementById('editUserStatus').value = item.status || 'Aktif';

  openModal('modalEditUser');
}

function handleSaveEditUser(e) {
  e.preventDefault();
  const id = document.getElementById('editUserId').value;
  const nama = document.getElementById('editUserNama').value.trim();
  const username = document.getElementById('editUserUsername').value.trim();
  const role = document.getElementById('editUserRole').value;
  const status = document.getElementById('editUserStatus').value;

  const users = JSON.parse(localStorage.getItem('db_users') || '[]');
  const idx = users.findIndex(u => u.id === id);

  if (idx !== -1) {
    users[idx].nama = nama;
    users[idx].username = username;
    users[idx].role = role;
    users[idx].status = status;

    localStorage.setItem('db_users', JSON.stringify(users));
    syncMutationToGas('update_user', { id: id, data: users[idx] });

    addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Admin', 'EDIT_USER', `Mengubah data user ${username}`);
    showToast('Data pengguna berhasil diperbarui.', 'success');
    closeModal('modalEditUser');
    renderMasterUsers();
  }
}

function deleteUser(id) {
  if (confirm(`Apakah Anda yakin ingin menghapus pengguna ${id}?`)) {
    let users = JSON.parse(localStorage.getItem('db_users') || '[]');
    users = users.filter(u => u.id !== id);
    localStorage.setItem('db_users', JSON.stringify(users));
    syncMutationToGas('delete_user', { id: id });

    addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Admin', 'DELETE_USER', `Menghapus pengguna ${id}`);
    showToast('Pengguna berhasil dihapus.', 'info');
    renderMasterUsers();
  }
}

function resetUserPassword(username) {
  const newPass = prompt(`Reset password untuk pengguna ${username}:`, 'password123');
  if (!newPass) return;

  const users = JSON.parse(localStorage.getItem('db_users') || '[]');
  const u = users.find(user => user.username === username);
  if (u) {
    u.password = newPass;
    localStorage.setItem('db_users', JSON.stringify(users));
    syncMutationToGas('reset_password', { username: username, newPassword: newPass });

    addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Admin', 'RESET_PASSWORD', `Mereset password user ${username}`);
    showToast(`Password untuk ${username} berhasil diubah.`, 'info');
  }
}

// --- 4.12 SETTINGS, UPLOAD LOGO & BACKGROUND ---
function renderSettingsAndAudit() {
  document.getElementById('inputGasUrl').value = STATE.gasApiUrl;
  const auditTable = document.getElementById('tableAuditLogsBody');
  const logs = JSON.parse(localStorage.getItem('db_audit') || '[]');
  auditTable.innerHTML = '';

  logs.slice().reverse().slice(0, 30).forEach(log => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="font-mono text-slate-400 whitespace-nowrap">${log.timestamp}</td>
      <td class="font-medium text-white">${log.user}</td>
      <td class="font-mono text-sky-400 font-bold">${log.aksi}</td>
      <td class="text-slate-300">${log.keterangan}</td>
    `;
    auditTable.appendChild(tr);
  });
}

function handleUploadLogo(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const base64 = event.target.result;
    const cfg = JSON.parse(localStorage.getItem('db_settings') || '{}');
    cfg.logoBase64 = base64;
    localStorage.setItem('db_settings', JSON.stringify(cfg));

    applyCompanySettingsUI();
    addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Admin', 'UPLOAD_LOGO', 'Mengunggah logo resmi perusahaan');
    showToast('Logo perusahaan berhasil diperbarui dan diterapkan ke seluruh dokumen!', 'success');
  };
  reader.readAsDataURL(file);
}

function handleUploadBgLogin(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const base64 = event.target.result;
    const cfg = JSON.parse(localStorage.getItem('db_settings') || '{}');
    cfg.loginBgBase64 = base64;
    localStorage.setItem('db_settings', JSON.stringify(cfg));

    applyCompanySettingsUI();
    addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Admin', 'UPLOAD_LOGIN_BG', 'Mengubah wallpaper background halaman login');
    showToast('Foto background halaman login berhasil diperbarui!', 'success');
  };
  reader.readAsDataURL(file);
}

function saveSettingsForm() {
  const cfg = JSON.parse(localStorage.getItem('db_settings') || '{}');

  cfg.namaPerusahaan = document.getElementById('setPerusahaan').value.trim();
  cfg.bidangUsaha = document.getElementById('setBidangUsaha').value.trim();
  cfg.alamatKantor = document.getElementById('setAlamatKantor').value.trim();
  cfg.telpPerusahaan = document.getElementById('setTelp').value.trim();
  cfg.emailPerusahaan = document.getElementById('setEmail').value.trim();
  cfg.lokasiTps = document.getElementById('setLokasi').value.trim();
  cfg.luasTps = document.getElementById('setLuas').value.trim();
  cfg.kapasitasMaksTon = document.getElementById('setKapasitas').value.trim();
  cfg.pjTeknis = document.getElementById('setPJ').value.trim();

  localStorage.setItem('db_settings', JSON.stringify(cfg));
  applyCompanySettingsUI();

  // Sync settings ke GAS
  syncMutationToGas('save_settings', { data: cfg });

  addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Admin', 'UPDATE_SETTINGS', 'Menyimpan konfigurasi identitas perusahaan');
  showToast('Identitas dan profil perusahaan berhasil disimpan!', 'success');
}

// ==========================================================================
// 4.13 GOOGLE APPS SCRIPT (GAS) INTEGRATION CLIENT ENGINE
// ==========================================================================

function sanitizeGasUrlInput(inputEl) {
  let val = '';
  if (typeof inputEl === 'string') {
    val = inputEl.trim();
  } else if (inputEl && inputEl.value !== undefined) {
    val = inputEl.value.trim();
  }

  // Auto-rewrite /dev into /exec if user accidentally copied dev link
  if (val.endsWith('/dev')) {
    val = val.replace(/\/dev$/, '/exec');
    if (inputEl && inputEl.value !== undefined) {
      inputEl.value = val;
    }
    showToast('Info: URL berakhiran /dev otomatis diubah menjadi /exec agar dapat diakses publik.', 'info');
  }

  // Sync inputs across both view-pengaturan and modalGasConfig
  const modalInput = document.getElementById('modalGasUrlInput');
  const viewInput = document.getElementById('inputGasUrl');
  if (modalInput && modalInput !== inputEl && modalInput.value !== val) modalInput.value = val;
  if (viewInput && viewInput !== inputEl && viewInput.value !== val) viewInput.value = val;

  // Validation notice feedback
  const modalNotice = document.getElementById('modalGasUrlNotice');
  const cfgNotice = document.getElementById('cfgGasUrlNotice');
  const updateNotice = (el) => {
    if (!el) return;
    if (!val) {
      el.innerHTML = 'Harus berakhiran <strong>/exec</strong> dari menu Deploy &gt; New deployment &gt; Web app.';
    } else if (!val.includes('script.google.com/macros/s/')) {
      el.innerHTML = '<span class="text-rose-400 font-semibold">Format URL tidak valid! Harus diawali: https://script.google.com/macros/s/...</span>';
    } else if (!val.endsWith('/exec')) {
      el.innerHTML = '<span class="text-amber-400 font-semibold">Peringatan: URL harus berakhiran <strong>/exec</strong> (Bukan /dev atau /edit).</span>';
    } else {
      el.innerHTML = '<span class="text-emerald-400 font-semibold">✓ Format Web App URL Valid (Google Apps Script).</span>';
    }
  };

  updateNotice(modalNotice);
  updateNotice(cfgNotice);

  return val;
}

async function callGasApi(action, payload = {}, options = {}) {
  let url = (options.url || STATE.gasApiUrl || '').trim();
  if (!url) {
    return { status: 'error', message: 'URL Google Apps Script belum dikonfigurasi.' };
  }

  if (url.endsWith('/dev')) {
    url = url.replace(/\/dev$/, '/exec');
  }

  const timeoutMs = options.timeout || 25000;
  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

  const requestBody = JSON.stringify({
    action: action,
    user: STATE.currentUser ? STATE.currentUser.nama : 'Operator',
    ...payload
  });

  try {
    // IMPORTANT: Send POST with Content-Type text/plain;charset=utf-8 and redirect follow.
    // This executes without a CORS preflight OPTIONS request on GAS Web Apps.
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: requestBody,
      redirect: 'follow',
      signal: controller.signal
    });

    clearTimeout(timeoutTimer);

    const responseText = await response.text();

    // Check if Google returned an HTML login or permission denied page
    if (responseText.includes('<!DOCTYPE') || responseText.includes('<html') || responseText.includes('accounts.google.com') || responseText.includes('Google Drive – Page Not Found')) {
      return {
        status: 'error',
        message: 'Akses Ditolak / Butuh Login: Pastikan deployment Web App di Apps Script diset "Who has access: Anyone". Jika diset "Only myself", browser publik tidak diizinkan mengakses.',
        raw: responseText
      };
    }

    try {
      const json = JSON.parse(responseText);
      return json;
    } catch (parseErr) {
      return {
        status: 'error',
        message: 'Respon dari Google Apps Script bukan JSON valid: ' + parseErr.message,
        raw: responseText
      };
    }
  } catch (err) {
    clearTimeout(timeoutTimer);
    if (err.name === 'AbortError') {
      return { status: 'error', message: `Permintaan ke GAS timeout setelah ${timeoutMs / 1000} detik. Periksa koneksi internet.` };
    }
    return {
      status: 'error',
      message: 'Gagal terhubung ke GAS (CORS / Network Error). Pastikan deployment diset "Who has access: Anyone" dan URL berakhiran "/exec". Detail: ' + err.message
    };
  }
}

function updateGasDiagnosticUI(state, statusLabel, latency, serverMsg) {
  // Update modal elements
  const badge = document.getElementById('gasStatusBadge');
  const latEl = document.getElementById('gasLatencyText');
  const msgEl = document.getElementById('gasServerMsgText');

  if (badge) {
    badge.textContent = statusLabel;
    if (state === true) {
      badge.className = 'badge-status badge-green';
    } else if (state === false) {
      badge.className = 'badge-status badge-red';
    } else if (state === 'testing') {
      badge.className = 'badge-status badge-yellow animate-pulse';
    } else {
      badge.className = 'badge-status badge-blue';
    }
  }
  if (latEl) latEl.textContent = latency;
  if (msgEl) msgEl.textContent = serverMsg;

  // Update view-pengaturan elements
  const cfgBadge = document.getElementById('cfgGasStatusBadge');
  const cfgLatEl = document.getElementById('cfgGasLatencyText');
  const cfgMsgEl = document.getElementById('cfgGasServerMsgText');
  const cfgDbStatus = document.getElementById('cfgDbStatus');

  if (cfgBadge) {
    cfgBadge.textContent = statusLabel;
    if (state === true) {
      cfgBadge.className = 'badge-status badge-green';
    } else if (state === false) {
      cfgBadge.className = 'badge-status badge-red';
    } else if (state === 'testing') {
      cfgBadge.className = 'badge-status badge-yellow animate-pulse';
    } else {
      cfgBadge.className = 'badge-status badge-blue';
    }
  }
  if (cfgLatEl) cfgLatEl.textContent = latency;
  if (cfgMsgEl) cfgMsgEl.textContent = serverMsg;
  if (cfgDbStatus) {
    cfgDbStatus.textContent = state === true ? 'GAS Cloud Terhubung' : 'Local Storage Engine';
    cfgDbStatus.className = state === true ? 'text-emerald-400 font-mono font-bold' : 'text-vault-lime font-mono';
  }

  // Update Topbar Badge
  const topText = document.getElementById('backendStatusText');
  if (topText) {
    if (state === true) {
      topText.textContent = 'GAS API: Terhubung';
      topText.parentElement.className = 'cursor-pointer text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 flex items-center gap-1.5';
    } else if (state === 'testing') {
      topText.textContent = 'GAS API: Menghubungkan...';
      topText.parentElement.className = 'cursor-pointer text-[11px] font-mono px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-400 flex items-center gap-1.5';
    } else {
      if (STATE.gasApiUrl) {
        topText.textContent = 'GAS API: Terputus';
        topText.parentElement.className = 'cursor-pointer text-[11px] font-mono px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/40 text-rose-400 flex items-center gap-1.5';
      } else {
        topText.textContent = 'Mode: Local Engine';
        topText.parentElement.className = 'cursor-pointer text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-sky-400 flex items-center gap-1.5 hover:border-sky-400';
      }
    }
  }
}

async function testGasConnection(customUrl = null) {
  const modalInput = document.getElementById('modalGasUrlInput');
  const viewInput = document.getElementById('inputGasUrl');

  let testUrl = customUrl || (modalInput ? modalInput.value.trim() : '') || (viewInput ? viewInput.value.trim() : '') || STATE.gasApiUrl;

  if (testUrl) {
    testUrl = sanitizeGasUrlInput(testUrl);
  }

  if (!testUrl) {
    showToast('Masukkan Web App URL Google Apps Script terlebih dahulu.', 'warning');
    updateGasDiagnosticUI(false, 'URL Kosong', '-', 'Belum ada Web App URL yang dimasukkan');
    return false;
  }

  updateGasDiagnosticUI('testing', 'Menguji Koneksi...', '...', 'Mengirim ping ke Google Apps Script backend...');

  const btn = document.getElementById('btnTestGasConn');
  if (btn) btn.disabled = true;

  const t0 = performance.now();
  const res = await callGasApi('ping', {}, { url: testUrl, timeout: 15000 });
  const latency = Math.round(performance.now() - t0);

  if (btn) btn.disabled = false;

  if (res && res.status === 'success') {
    STATE.gasApiUrl = testUrl;
    localStorage.setItem('enviromine_gas_url', testUrl);

    updateGasDiagnosticUI(true, 'Terhubung (Online)', `${latency} ms`, res.message || 'API EnviroMine Siap Digunakan');
    showToast(`Koneksi ke Google Apps Script BERHASIL! (Latensi: ${latency} ms)`, 'success');
    addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'System', 'GAS_CONNECT_SUCCESS', `Berhasil terhubung ke GAS backend (${latency} ms)`);
    return true;
  } else {
    const errorMsg = res && res.message ? res.message : 'Tidak ada respon dari server GAS';
    updateGasDiagnosticUI(false, 'Gagal Terhubung', `${latency} ms`, errorMsg);
    showToast('Uji Koneksi GAS Gagal: ' + errorMsg, 'error');
    addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'System', 'GAS_CONNECT_FAIL', `Gagal koneksi GAS: ${errorMsg}`);
    return false;
  }
}

async function syncFromGasCloud() {
  if (!STATE.gasApiUrl) {
    showToast('URL Google Apps Script belum dikonfigurasi. Lakukan uji koneksi terlebih dahulu.', 'warning');
    openGasSettingsModal();
    return;
  }

  showToast('Sedang menarik seluruh data dari Google Spreadsheet...', 'info');

  const res = await callGasApi('get_all_data', {}, { timeout: 35000 });

  if (res && res.status === 'success' && res.data) {
    const d = res.data;
    let countItems = 0;

    if (Array.isArray(d.rintek) && d.rintek.length > 0) {
      localStorage.setItem('db_rintek', JSON.stringify(d.rintek));
      countItems += d.rintek.length;
    }
    if (Array.isArray(d.pihakKetiga) && d.pihakKetiga.length > 0) {
      localStorage.setItem('db_pihak_ketiga', JSON.stringify(d.pihakKetiga));
      countItems += d.pihakKetiga.length;
    }
    if (Array.isArray(d.users) && d.users.length > 0) {
      localStorage.setItem('db_users', JSON.stringify(d.users));
      countItems += d.users.length;
    }
    if (Array.isArray(d.limbahMasuk) && d.limbahMasuk.length > 0) {
      localStorage.setItem('db_limbah_masuk', JSON.stringify(d.limbahMasuk));
      countItems += d.limbahMasuk.length;
    }
    if (Array.isArray(d.limbahKeluar) && d.limbahKeluar.length > 0) {
      localStorage.setItem('db_limbah_keluar', JSON.stringify(d.limbahKeluar));
      countItems += d.limbahKeluar.length;
    }
    if (Array.isArray(d.penangananKhusus)) {
      localStorage.setItem('db_penanganan_khusus', JSON.stringify(d.penangananKhusus));
      countItems += d.penangananKhusus.length;
    }
    if (Array.isArray(d.inspeksi) && d.inspeksi.length > 0) {
      localStorage.setItem('db_inspeksi', JSON.stringify(d.inspeksi));
      countItems += d.inspeksi.length;
    }
    if (Array.isArray(d.neraca) && d.neraca.length > 0) {
      localStorage.setItem('db_neraca', JSON.stringify(d.neraca));
      countItems += d.neraca.length;
    }
    if (d.settings && d.settings.namaPerusahaan) {
      const curSettings = JSON.parse(localStorage.getItem('db_settings') || '{}');
      const mergedSettings = { ...curSettings, ...d.settings };
      localStorage.setItem('db_settings', JSON.stringify(mergedSettings));
    }

    applyCompanySettingsUI();
    navigateTo(STATE.activeView || 'dashboard');

    showToast(`Sinkronisasi Cloud Berhasil! (${countItems} data termuat)`, 'success');
    addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Operator', 'SYNC_CLOUD_DOWNLOAD', `Tarik data dari Google Sheets: ${countItems} entri`);
  } else {
    const errorMsg = res && res.message ? res.message : 'Gagal mengunduh data dari Cloud.';
    showToast('Gagal Tarik Data Cloud: ' + errorMsg, 'error');
  }
}

async function pushDataToGasCloud() {
  if (!STATE.gasApiUrl) {
    showToast('URL Google Apps Script belum dikonfigurasi.', 'warning');
    openGasSettingsModal();
    return;
  }

  if (!confirm('Apakah Anda ingin mengirim SELURUH data lokal saat ini untuk mengisi / mengupdate Google Spreadsheet?')) {
    return;
  }

  showToast('Sedang mengirim data lokal ke Google Spreadsheet...', 'info');

  const payloadData = {
    rintek: JSON.parse(localStorage.getItem('db_rintek') || '[]'),
    pihakKetiga: JSON.parse(localStorage.getItem('db_pihak_ketiga') || '[]'),
    users: JSON.parse(localStorage.getItem('db_users') || '[]'),
    limbahMasuk: JSON.parse(localStorage.getItem('db_limbah_masuk') || '[]'),
    limbahKeluar: JSON.parse(localStorage.getItem('db_limbah_keluar') || '[]'),
    penangananKhusus: JSON.parse(localStorage.getItem('db_penanganan_khusus') || '[]'),
    inspeksi: JSON.parse(localStorage.getItem('db_inspeksi') || '[]'),
    neraca: JSON.parse(localStorage.getItem('db_neraca') || '[]'),
    settings: JSON.parse(localStorage.getItem('db_settings') || '{}')
  };

  const res = await callGasApi('push_all_data', { data: payloadData }, { timeout: 40000 });

  if (res && res.status === 'success') {
    showToast('Seluruh data lokal berhasil disimpan ke Google Spreadsheet!', 'success');
    addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Operator', 'SYNC_CLOUD_UPLOAD', 'Kirim seluruh data lokal ke Google Spreadsheet');
  } else {
    const errorMsg = res && res.message ? res.message : 'Gagal mengirim data lokal ke Spreadsheet.';
    showToast('Gagal Kirim Data: ' + errorMsg, 'error');
  }
}

async function setupGasSpreadsheet() {
  if (!STATE.gasApiUrl) {
    showToast('URL Google Apps Script belum dikonfigurasi.', 'warning');
    openGasSettingsModal();
    return;
  }

  showToast('Sedang menginisialisasi 11 Sheet & folder Google Drive di Spreadsheet Anda...', 'info');

  const res = await callGasApi('setup_environment', {}, { timeout: 45000 });

  if (res && res.status === 'success') {
    showToast('Database Google Sheets & Folder Drive BERHASIL diinisialisasi!', 'success');
    addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Admin', 'SETUP_GAS_SPREADSHEET', 'Inisialisasi 11 sheet & Drive folder');
  } else {
    const errorMsg = res && res.message ? res.message : 'Gagal menginisialisasi spreadsheet.';
    showToast('Gagal Inisialisasi: ' + errorMsg, 'error');
  }
}

function syncMutationToGas(action, payload = {}) {
  if (!STATE.gasApiUrl) return;

  // Background non-blocking execution
  callGasApi(action, payload)
    .then(res => {
      if (res && res.status === 'success') {
        console.log(`[GAS Sync] ${action} sukses:`, res);
      } else {
        console.warn(`[GAS Sync] ${action} warning:`, res);
      }
    })
    .catch(err => {
      console.warn(`[GAS Sync] ${action} network error:`, err);
    });
}

function checkGasStatusBackground() {
  if (!STATE.gasApiUrl) return;
  callGasApi('ping', {}, { timeout: 10000 })
    .then(res => {
      if (res && res.status === 'success') {
        updateGasDiagnosticUI(true, 'Terhubung (Online)', 'OK', res.message || 'API Aktif');
      } else {
        updateGasDiagnosticUI(false, 'Terputus', '-', res.message || 'Tidak ada respon');
      }
    })
    .catch(() => {
      updateGasDiagnosticUI(false, 'Terputus', '-', 'Koneksi gagal');
    });
}

async function saveGasUrlConfig() {
  const urlInput = document.getElementById('inputGasUrl');
  let url = urlInput ? urlInput.value.trim() : '';
  url = sanitizeGasUrlInput(url);

  if (!url) {
    showToast('Masukkan URL Web App Google Apps Script.', 'warning');
    return;
  }

  STATE.gasApiUrl = url;
  localStorage.setItem('enviromine_gas_url', url);
  updateGasStatusBadge();

  await testGasConnection(url);
}

function resetToLocalEngine() {
  STATE.gasApiUrl = '';
  localStorage.removeItem('enviromine_gas_url');
  const viewInput = document.getElementById('inputGasUrl');
  const modalInput = document.getElementById('modalGasUrlInput');
  if (viewInput) viewInput.value = '';
  if (modalInput) modalInput.value = '';
  updateGasDiagnosticUI(null, 'Mode Local Demo', '-', 'Menggunakan Local Storage');
  updateGasStatusBadge();
  showToast('Kembali ke Local Demo Engine.', 'info');
  addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'System', 'RESET_LOCAL_ENGINE', 'Beralih ke Local Storage Engine');
}

function updateGasStatusBadge() {
  const badgeText = document.getElementById('backendStatusText');
  if (!badgeText) return;

  if (STATE.gasApiUrl) {
    badgeText.textContent = 'GAS API: Terhubung';
    badgeText.parentElement.className = 'cursor-pointer text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 flex items-center gap-1.5';
  } else {
    badgeText.textContent = 'Mode: Local Engine';
    badgeText.parentElement.className = 'cursor-pointer text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-sky-400 flex items-center gap-1.5 hover:border-sky-400';
  }
}

function openGasSettingsModal() {
  const modalInput = document.getElementById('modalGasUrlInput');
  if (modalInput) modalInput.value = STATE.gasApiUrl;
  sanitizeGasUrlInput(modalInput);
  openModal('modalGasConfig');
}

async function saveModalGasUrl() {
  const urlInput = document.getElementById('modalGasUrlInput');
  let val = urlInput ? urlInput.value.trim() : '';
  val = sanitizeGasUrlInput(val);

  if (!val) {
    showToast('Masukkan URL Web App Google Apps Script.', 'warning');
    return;
  }

  STATE.gasApiUrl = val;
  localStorage.setItem('enviromine_gas_url', val);
  updateGasStatusBadge();
  closeModal('modalGasConfig');

  await testGasConnection(val);
}

// ==========================================================================
// 5. HELPER & UI UTILITIES
// ==========================================================================
function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('hidden');
    lucide.createIcons();
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  
  let bgClass = 'bg-slate-900 border-slate-700 text-white';
  let iconName = 'info';

  if (type === 'success') {
    bgClass = 'bg-slate-900 border-emerald-500/50 text-emerald-300';
    iconName = 'check-circle';
  } else if (type === 'warning') {
    bgClass = 'bg-slate-900 border-amber-500/50 text-amber-300';
    iconName = 'alert-triangle';
  } else if (type === 'error') {
    bgClass = 'bg-slate-900 border-rose-500/50 text-rose-300';
    iconName = 'x-circle';
  }

  toast.className = `p-3.5 px-4 rounded-2xl border shadow-2xl flex items-center gap-3 text-xs font-medium pointer-events-auto transform transition-all duration-300 translate-y-2 opacity-0 ${bgClass}`;
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-4 h-4 shrink-0"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function addAuditLog(user, aksi, keterangan) {
  const logs = JSON.parse(localStorage.getItem('db_audit') || '[]');
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
  logs.push({
    id: 'LOG-' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14),
    user: user || 'System',
    aksi: aksi,
    timestamp: now,
    keterangan: keterangan
  });
  localStorage.setItem('db_audit', JSON.stringify(logs));
}



function toggleNotificationPopover() {
  const popover = document.getElementById('notifPopover');
  popover.classList.toggle('hidden');
}

function setupGlobalShortcuts() {
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const search = document.getElementById('globalSearchInput');
      if (search) search.focus();
    }
  });
}

function handleGlobalSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  if (e.key === 'Enter' && query) {
    navigateTo('logbook');
  }
}
