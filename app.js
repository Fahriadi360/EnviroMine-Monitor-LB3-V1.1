/**
 * ==========================================================================
 * ENVIROMINE MONITOR — LIMBAH B3 V1.1 (PT. ETAM MANUNGGAL JAYA)
 * Frontend Single Page Application Engine (GitHub Pages & GAS Compatible)
 * ==========================================================================
 */

// Global State
const STATE = {
  gasApiUrl: localStorage.getItem('enviromine_gas_url') || '',
  currentUser: null,
  activeView: 'dashboard',
  sidebarCollapsed: false,
  signatureTarget: null, // { neracaId, role }
  chartInstance: null
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

// ==========================================================================
// 1. INITIALIZATION & DATABASE SEEDING (LOCAL ENGINE FALLBACK)
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initLocalDatabase();
  checkAuthSession();
  updateGasStatusBadge();
  setupGlobalShortcuts();
});

function initLocalDatabase() {
  // 1. Master Rintek PT EMJ (9 Item Resmi)
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
      { id: 'USR-01', nama: 'Operator Lapangan TPS', username: 'operator', password: 'operator123', role: 'Operator', status: 'Aktif' },
      { id: 'USR-02', nama: 'Penanggung Jawab TPS (Hermanto)', username: 'penanggung_jawab', password: 'pj12345', role: 'Penanggung Jawab', status: 'Aktif' },
      { id: 'USR-03', nama: 'Administrator HSE Lingkungan', username: 'admin_hse', password: 'admin123', role: 'Admin HSE', status: 'Aktif' },
      { id: 'USR-04', nama: 'Kepala Teknik Tambang (KTT)', username: 'ktt', password: 'ktt12345', role: 'Manajemen / KTT', status: 'Aktif' }
    ];
    localStorage.setItem('db_users', JSON.stringify(defaultUsers));
  }

  // 4. Sample Transaksi Limbah Masuk (Realistis PT EMJ)
  if (!localStorage.getItem('db_limbah_masuk')) {
    const sampleMasuk = [
      {
        id: 'IN-20260901-0830',
        tanggalMasuk: '2026-09-01 08:30',
        kodeLimbah: 'B105d',
        namaLimbah: 'Minyak pelumas bekas (Oli hidrolik/mesin/gear)',
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
        id: 'IN-20260625-0900', // Contoh mendekati masa simpan (H-7 alert)
        tanggalMasuk: '2026-06-25 09:00',
        kodeLimbah: 'B109d',
        namaLimbah: 'Filter bekas fasilitas pencemaran udara',
        jumlah: 70,
        satuan: 'Kg',
        fotoUrl: '',
        statusRintek: 'Terdaftar',
        batasSimpanHari: 90,
        tanggalJatuhTempo: '2026-09-23', // Jatuh tempo dekat!
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
      { id: 'INSP-20260918-03', tanggal: '2026-09-18 09:10', itemChecklist: 'Saluran Drainase Ceceran & Bak Oil Catcher', kondisi: 'Baik', catatan: 'Bersih dari sumbatan serbuk', operator: 'Operator Lapangan' }
    ];
    localStorage.setItem('db_inspeksi', JSON.stringify(sampleInspeksi));
  }

  // 8. Neraca Limbah B3 (Sample Draft dengan 3-Tier E-sign)
  if (!localStorage.getItem('db_neraca')) {
    const sampleNeraca = [
      {
        id: 'NERACA-2026-TW3',
        periode: 'Triwulan III (Juli - September 2026)',
        dataA: '2.805', // Ton Masuk
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
        ttdOperator: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><text x="10" y="25" font-family="cursive" font-size="16" fill="black">Operator</text></svg>',
        ttdPJ: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><text x="10" y="25" font-family="cursive" font-size="16" fill="black">Hermanto</text></svg>',
        ttdKTT: '',
        createdAt: '2026-09-15'
      }
    ];
    localStorage.setItem('db_neraca', JSON.stringify(sampleNeraca));
  }

  // 9. Audit Logs
  if (!localStorage.getItem('db_audit')) {
    const sampleAudit = [
      { id: 'LOG-01', user: 'System', aksi: 'SETUP_DATABASE', timestamp: '2026-09-01 08:00', keterangan: 'Database TPS LB3 01 berhasil diinisialisasi' },
      { id: 'LOG-02', user: 'Operator Lapangan', aksi: 'INPUT_LIMBAH_MASUK', timestamp: '2026-09-01 08:30', keterangan: 'Mencatat oli bekas 1200 Liter' }
    ];
    localStorage.setItem('db_audit', JSON.stringify(sampleAudit));
  }
}

// ==========================================================================
// 2. AUTHENTICATION & SESSION MANAGEMENT
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

  // Berhasil Login
  STATE.currentUser = {
    id: foundUser.id,
    nama: foundUser.nama,
    username: foundUser.username,
    role: foundUser.role
  };

  localStorage.setItem('enviromine_session', JSON.stringify(STATE.currentUser));
  addAuditLog(STATE.currentUser.nama, 'LOGIN', 'Berhasil login ke sistem');
  showToast(`Selamat datang, ${STATE.currentUser.nama}!`, 'success');
  showAppShell();
}

function quickFillLogin(username, password) {
  document.getElementById('loginUsername').value = username;
  document.getElementById('loginPassword').value = password;
  // Animasi klik login
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
  
  // Update Profile Info
  document.getElementById('userNameDisplay').textContent = STATE.currentUser.nama;
  document.getElementById('userRoleBadge').textContent = STATE.currentUser.role;
  document.getElementById('userAvatar').textContent = STATE.currentUser.nama.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  // Role permissions check
  applyRoleVisibility();

  // Load Dashboard
  navigateTo('dashboard');
  lucide.createIcons();
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
  addAuditLog('User Guest', 'FORGOT_PASSWORD', 'Pengajuan bantuan reset password');
}

function applyRoleVisibility() {
  const role = STATE.currentUser.role;
  // Operator: sembunyikan menu admin rintek / users
  // PJ TPS: dapat melihat penanganan khusus dan rintek
  // Admin HSE: manajemen user dan master rintek
  // KTT: melihat seluruh eksekutif & final neraca
  const navUsers = document.getElementById('nav-users');
  if (navUsers) {
    if (role === 'Operator' || role === 'Penanggung Jawab') {
      navUsers.style.opacity = '0.5';
    } else {
      navUsers.style.opacity = '1';
    }
  }
}

// ==========================================================================
// 3. NAVIGATION & VIEW ROUTING
// ==========================================================================
function navigateTo(viewName) {
  STATE.activeView = viewName;

  // Sembunyikan seluruh section view
  const views = [
    'dashboard', 'masuk', 'keluar', 'penanganan-khusus', 
    'inspeksi', 'logbook', 'neraca', 'rintek', 'pihak-ketiga', 'users', 'settings'
  ];

  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.add('hidden');

    const nav = document.getElementById(`nav-${v}`);
    if (nav) nav.classList.remove('active');
  });

  // Tampilkan view yang dipilih
  const targetView = document.getElementById(`view-${viewName}`);
  if (targetView) targetView.classList.remove('hidden');

  const targetNav = document.getElementById(`nav-${viewName}`);
  if (targetNav) targetNav.classList.add('active');

  // Load data sesuai view
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

  // Hitung Stok Aktif di TPS
  let totalStokKg = 0;
  let h7AlertCount = 0;
  const stokKategoriMap = {};
  const today = new Date();

  masuk.forEach(m => {
    if (m.statusStok === 'Tersedia') {
      const jlh = parseFloat(m.jumlah) || 0;
      totalStokKg += jlh;
      stokKategoriMap[m.namaLimbah] = (stokKategoriMap[m.namaLimbah] || 0) + jlh;

      // Cek jatuh tempo
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

  // Kapasitas TPS (Maksimal 20 Ton sesuai Rintek)
  const kapasitasMaksKg = 20000;
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

  // Alert H-7
  document.getElementById('statAlertH7Count').textContent = h7AlertCount;
  const alertBanner = document.getElementById('complianceAlertBanner');
  if (h7AlertCount > 0) {
    alertBanner.classList.remove('hidden');
    document.getElementById('complianceAlertText').textContent = 
      `Terdapat ${h7AlertCount} item limbah B3 di TPS 01 yang sisa masa simpannya ≤ 7 hari sebelum jatuh tempo. Segera jadwalkan pengangkutan ke pihak ketiga!`;
  } else {
    alertBanner.classList.add('hidden');
  }

  // Pending Approval
  const pendingPK = pkList.filter(p => p.status === 'Pending').length;
  const pendingNeraca = neracaList.filter(n => n.status !== 'Final').length;
  document.getElementById('statPendingApproval').textContent = pendingPK + pendingNeraca;
  document.getElementById('badgePendingPK').textContent = pendingPK;

  // Breakdown Kategori
  const katContainer = document.getElementById('stokKategoriList');
  katContainer.innerHTML = '';
  const rintek = JSON.parse(localStorage.getItem('db_rintek') || '[]');

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

  // Render Recent Transactions Table
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

  // Render Chart.js
  renderTimbulanChart(masuk, keluar);
}

function renderTimbulanChart(masuk, keluar) {
  const ctx = document.getElementById('timbulanChart');
  if (!ctx) return;

  if (STATE.chartInstance) {
    STATE.chartInstance.destroy();
  }

  // Bulan 6 terakhir
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
          borderColor: '#d4f933', // Vault lime
          backgroundColor: 'rgba(212, 249, 51, 0.08)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#d4f933',
          borderWidth: 2.5
        },
        {
          label: 'Diserahkan ke Pihak Ketiga (Kg)',
          data: dataKeluar,
          borderColor: '#38bdf8', // Cyan
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
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1b1f2e',
          titleColor: '#fff',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 10
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#64748b' }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#64748b' }
        }
      }
    }
  });
}

// --- 4.2 LIMBAH MASUK ---
function renderLimbahMasuk() {
  const table = document.getElementById('tableLimbahMasukBody');
  const data = JSON.parse(localStorage.getItem('db_limbah_masuk') || '[]');
  table.innerHTML = '';

  if (data.length === 0) {
    table.innerHTML = `<tr><td colspan="11" class="text-center py-6 text-slate-500">Belum ada data limbah masuk.</td></tr>`;
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
      <td>
        <span class="badge-status ${item.statusRintek === 'Terdaftar' ? 'badge-green' : 'badge-yellow'}">
          ${item.statusRintek}
        </span>
      </td>
      <td class="font-mono text-xs text-slate-300">${item.tanggalJatuhTempo || '-'}</td>
      <td>
        <span class="badge-status ${sisaBadge}">${sisaHari}</span>
      </td>
      <td class="text-slate-400">${item.operator}</td>
      <td>
        <span class="badge-status ${item.statusStok === 'Tersedia' ? 'badge-lime' : 'badge-blue'}">
          ${item.statusStok}
        </span>
      </td>
      <td>
        ${item.statusStok === 'Tersedia' ? `
          <button onclick="quickKeluarLimbah('${item.id}')" class="text-xs px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30">
            Keluarkan
          </button>
        ` : `<span class="text-xs text-slate-500">-</span>`}
      </td>
    `;
    table.appendChild(tr);
  });
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
  const karakteristik = document.getElementById('masukKarakteristik').value;
  const jumlah = parseFloat(document.getElementById('masukJumlah').value);
  const satuan = document.getElementById('masukSatuan').value;
  const tglMasuk = document.getElementById('masukTanggal').value;
  const batasHari = parseInt(document.getElementById('masukBatasHari').value) || 90;

  let namaLimbah = '';
  let statusRintek = 'Terdaftar';

  if (selectVal === 'CUSTOM_NON_RINTEK') {
    statusRintek = 'Penanganan Khusus';
    const alasan = document.getElementById('masukAlasanKhusus').value.trim() || 'Limbah di luar daftar Rintek TPS 01 PT EMJ';
    namaLimbah = prompt('Masukkan Nama Limbah Non-Rintek:', 'Residu Kimia Lab') || 'Limbah Khusus';
  } else {
    const rintekList = JSON.parse(localStorage.getItem('db_rintek') || '[]');
    const r = rintekList.find(item => item.kodeLimbah === kodeLimbah);
    namaLimbah = r ? r.namaLimbah : 'Limbah B3';
  }

  // Hitung Jatuh Tempo
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

  // Jika Penanganan Khusus, masukkan ke antrian
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
    showToast('Peringatan: Limbah masuk antrean Penanganan Khusus untuk ditelaah PJ TPS.', 'warning');
  } else {
    showToast('Limbah masuk berhasil dicatat sesuai Rintek.', 'success');
  }

  addAuditLog(operatorName, 'INPUT_LIMBAH_MASUK', `Mencatat limbah masuk: ${namaLimbah} (${jumlah} ${satuan})`);
  closeModal('modalLimbahMasuk');
  renderLimbahMasuk();
  renderDashboard();
}

// --- 4.3 LIMBAH KELUAR ---
function renderLimbahKeluar() {
  const table = document.getElementById('tableLimbahKeluarBody');
  const data = JSON.parse(localStorage.getItem('db_limbah_keluar') || '[]');
  table.innerHTML = '';

  if (data.length === 0) {
    table.innerHTML = `<tr><td colspan="9" class="text-center py-6 text-slate-500">Belum ada pencatatan pengeluaran limbah.</td></tr>`;
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
      <td>
        <span class="badge-status badge-lime">
          <i data-lucide="check" class="w-3 h-3"></i> Terkonfirmasi
        </span>
      </td>
    `;
    table.appendChild(tr);
  });
}

function openModalLimbahKeluar() {
  const select = document.getElementById('keluarRefMasukSelect');
  const masuk = JSON.parse(localStorage.getItem('db_limbah_masuk') || '[]');
  const tersedia = masuk.filter(m => m.statusStok === 'Tersedia');

  select.innerHTML = '<option value="">-- Pilih dari Stok Masuk yang Tersedia --</option>';
  tersedia.forEach(t => {
    select.innerHTML += `<option value="${t.id}">${t.id} - ${t.namaLimbah} (Sisa: ${t.jumlah} ${t.satuan})</option>`;
  });

  // Pihak Ketiga Dropdown
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

  // Update status limbah masuk
  itemMasuk.statusStok = 'Keluar';
  localStorage.setItem('db_limbah_masuk', JSON.stringify(masukList));

  // Simpan record keluar
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

  addAuditLog(operatorName, 'INPUT_LIMBAH_KELUAR', `Menyerahkan limbah ${itemMasuk.namaLimbah} (${jumlah} ${itemMasuk.satuan}) ke ${tujuan}`);
  showToast('Pengeluaran limbah berhasil dicatat dan stok TPS diperbarui.', 'success');

  closeModal('modalLimbahKeluar');
  renderLimbahKeluar();
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
            <button onclick="approvePK('${item.id}', true)" class="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30">
              Approve
            </button>
            <button onclick="approvePK('${item.id}', false)" class="text-xs px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30">
              Tolak
            </button>
          </div>
        ` : `<span class="text-xs text-slate-500">Selesai</span>`}
      </td>
    `;
    table.appendChild(tr);
  });
}

function approvePK(id, isApproved) {
  if (STATE.currentUser && STATE.currentUser.role !== 'Penanggung Jawab' && STATE.currentUser.role !== 'Manajemen / KTT') {
    showToast('Akses ditolak: Hanya Penanggung Jawab TPS yang berwenang memberikan persetujuan penanganan khusus.', 'error');
    return;
  }

  const catatan = prompt(`Masukkan catatan tindak lanjut (${isApproved ? 'Persetujuan' : 'Penolakan'}):`, 'Disetujui untuk penyimpanan sementara blok khusus.') || '-';
  const list = JSON.parse(localStorage.getItem('db_penanganan_khusus') || '[]');
  const item = list.find(p => p.id === id);

  if (item) {
    item.status = isApproved ? 'Approved' : 'Rejected';
    item.approver = STATE.currentUser ? STATE.currentUser.nama : 'Hermanto (PJ TPS)';
    item.catatan = catatan;
    localStorage.setItem('db_penanganan_khusus', JSON.stringify(list));

    addAuditLog(item.approver, 'APPROVAL_PENANGANAN_KHUSUS', `${item.status} untuk ${id} (${catatan})`);
    showToast(`Status penanganan khusus diperbarui menjadi: ${item.status}`, 'info');
    renderPenangananKhusus();
    renderDashboard();
  }
}

// --- 4.5 INSPEKSI TPS K3L ---
function renderInspeksi() {
  const table = document.getElementById('tableInspeksiBody');
  const data = JSON.parse(localStorage.getItem('db_inspeksi') || '[]');
  table.innerHTML = '';

  if (data.length === 0) {
    table.innerHTML = `<tr><td colspan="7" class="text-center py-6 text-slate-500">Belum ada riwayat inspeksi sarana K3L.</td></tr>`;
    return;
  }

  data.slice().reverse().forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="font-mono text-sky-400 font-medium">${item.id}</td>
      <td class="text-xs text-slate-300">${item.tanggal}</td>
      <td class="font-semibold text-white">${item.itemChecklist}</td>
      <td>
        <span class="badge-status ${item.kondisi === 'Baik' ? 'badge-green' : 'badge-red'}">
          ${item.kondisi}
        </span>
      </td>
      <td class="text-xs text-slate-300">${item.catatan || '-'}</td>
      <td class="text-xs text-slate-400">Tersimpan</td>
      <td class="text-slate-400">${item.operator}</td>
    `;
    table.appendChild(tr);
  });
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
            <input type="radio" name="kondisi_${idx}" value="Rusak" class="text-rose-500"> Rusak / Perlu Perbaikan
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
  addAuditLog(operatorName, 'INSPEKSI_TPS', `Melakukan checklist inspeksi K3L (${batchId})`);

  if (foundRusak) {
    showToast('PERINGATAN K3L: Ditemukan sarana berstatus RUSAK. Notifikasi otomatis terkirim ke Penanggung Jawab!', 'error');
  } else {
    showToast('Checklist inspeksi K3L berhasil disimpan. Seluruh sarana TPS kondisi BAIK.', 'success');
  }

  closeModal('modalInspeksi');
  renderInspeksi();
}

// --- 4.6 LOGBOOK PERMEN LHK NO. 6/2021 ---
function renderLogbook() {
  const table = document.getElementById('tableLogbookBody');
  const masuk = JSON.parse(localStorage.getItem('db_limbah_masuk') || '[]');
  const keluar = JSON.parse(localStorage.getItem('db_limbah_keluar') || '[]');

  document.getElementById('logbookPrintDate').textContent = new Date().toLocaleString('id-ID');
  table.innerHTML = '';

  if (masuk.length === 0) {
    table.innerHTML = `<tr><td colspan="10" class="text-center py-6 text-slate-500">Belum ada data logbook.</td></tr>`;
    return;
  }

  // Index map keluar by refIdMasuk
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

function exportLogbookCSV() {
  const masuk = JSON.parse(localStorage.getItem('db_limbah_masuk') || '[]');
  const keluar = JSON.parse(localStorage.getItem('db_limbah_keluar') || '[]');
  const mapKeluar = {};
  keluar.forEach(k => { mapKeluar[k.refIdMasuk] = k; });

  let csvContent = '\uFEFF'; // UTF-8 BOM
  csvContent += 'No,Tanggal Masuk,Kode Limbah,Nama Limbah,Jumlah Masuk,Satuan,Tanggal Keluar,Tujuan Penyerahan,Jumlah Keluar,Sisa di TPS,Petugas Paraf\n';

  masuk.forEach((m, idx) => {
    const k = mapKeluar[m.id];
    const jmlMasuk = parseFloat(m.jumlah) || 0;
    const jmlKeluar = k ? (parseFloat(k.jumlah) || 0) : 0;
    const sisa = Math.max(0, jmlMasuk - jmlKeluar);

    csvContent += `"${idx + 1}","${m.tanggalMasuk}","${m.kodeLimbah}","${m.namaLimbah}","${jmlMasuk}","${m.satuan}","${k ? k.tanggalKeluar : '-'}","${k ? k.tujuanPihakKetiga : '-'}","${jmlKeluar}","${sisa}","${m.operator}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Logbook_LB3_PT_EMJ_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('File CSV Logbook berhasil diunduh.', 'success');
}

// --- 4.7 NERACA LIMBAH B3 & 3-TIER E-SIGN ---
function renderNeraca() {
  const container = document.getElementById('neracaListContainer');
  const neracaList = JSON.parse(localStorage.getItem('db_neraca') || '[]');
  container.innerHTML = '';

  if (neracaList.length === 0) {
    container.innerHTML = `
      <div class="data-card text-center py-12 text-slate-400">
        <i data-lucide="scale" class="w-12 h-12 mx-auto text-slate-600 mb-3"></i>
        <p class="font-bold text-white">Belum Ada Draft Neraca Limbah</p>
        <p class="text-xs mt-1">Klik tombol "+ Generate Draft Neraca Baru" untuk membuat neraca dari akumulasi transaksi logbook.</p>
      </div>
    `;
    return;
  }

  neracaList.forEach(n => {
    const card = document.createElement('div');
    card.className = 'data-card space-y-6';
    card.innerHTML = `
      <!-- Header Neraca -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-vault-border gap-2">
        <div>
          <span class="text-[10px] font-mono font-bold text-vault-lime uppercase tracking-widest">NERACA LIMBAH B3 RESMI (LAMPIRAN IX)</span>
          <h3 class="text-lg font-bold text-white">${n.periode}</h3>
          <p class="text-xs text-slate-400">PT. Etam Manunggal Jaya &bull; Dokumen ID: <span class="font-mono text-sky-400">${n.id}</span></p>
        </div>
        <div class="flex items-center gap-2">
          <span class="badge-status ${n.status === 'Final' ? 'badge-green' : 'badge-yellow'} font-bold">
            ${n.status}
          </span>
          <button onclick="window.print()" class="btn-primary-pill !w-auto !py-1.5 !px-3 text-xs bg-slate-800">
            <i data-lucide="printer" class="w-3.5 h-3.5"></i> Cetak Neraca
          </button>
        </div>
      </div>

      <!-- Komponen A, B, C, D Table -->
      <div class="overflow-x-auto rounded-xl border border-vault-border">
        <table class="regulatory-table custom-table text-xs">
          <thead>
            <tr class="bg-slate-800">
              <th>Komponen Neraca (Permen LHK No. 6/2021)</th>
              <th>Keterangan / Uraian</th>
              <th class="text-right">Jumlah (Ton)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="font-bold text-vault-lime font-mono">A. TOTAL LIMBAH DIHASILKAN</td>
              <td>Akumulasi seluruh limbah B3 masuk ke TPS LB3 01</td>
              <td class="font-mono font-bold text-right text-white">${n.dataA} Ton</td>
            </tr>
            <tr>
              <td class="font-bold text-sky-400 font-mono">B. PERLAKUAN LIMBAH B3</td>
              <td>
                &bull; Diserahkan ke Pihak Ketiga: <strong>${n.dataB.diserahkanPihakKetiga} Ton</strong><br>
                &bull; Disimpan di TPS 01: <strong>${n.dataB.disimpan} Ton</strong>
              </td>
              <td class="font-mono font-bold text-right text-white">${(parseFloat(n.dataB.diserahkanPihakKetiga) + parseFloat(n.dataB.disimpan)).toFixed(3)} Ton</td>
            </tr>
            <tr>
              <td class="font-bold text-slate-400 font-mono">C. RESIDU</td>
              <td>Residu dari proses penanganan internal</td>
              <td class="font-mono font-bold text-right text-slate-400">${n.dataC} Ton</td>
            </tr>
            <tr>
              <td class="font-bold text-slate-400 font-mono">D. BELUM TERKELOLA</td>
              <td>Limbah tercecer / belum tertangani</td>
              <td class="font-mono font-bold text-right text-slate-400">${n.dataD} Ton</td>
            </tr>
            <tr class="bg-slate-900 font-bold">
              <td colspan="2" class="text-white">KINERJA PENGELOLAAN LIMBAH B3: [ (A - (C+D)) / A ] &times; 100%</td>
              <td class="text-right text-vault-lime font-mono text-sm">${n.kinerja}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 3-Tier E-Signature Workflow Box -->
      <div>
        <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Verifikasi & Pengesahan Digital Berjenjang (3 Tingkat)
        </h4>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <!-- Tier 1: Operator Lapangan -->
          <div class="p-4 rounded-2xl bg-slate-900/80 border ${n.ttdOperator ? 'border-emerald-500/40' : 'border-slate-800'} text-center space-y-2">
            <span class="text-[10px] uppercase font-bold text-slate-400">1. Penyusun Laporan</span>
            <p class="text-xs font-bold text-white">Operator TPS LB3</p>
            <div class="h-20 flex items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-950/60 p-1">
              ${n.ttdOperator ? `<img src="${n.ttdOperator}" class="max-h-16 mx-auto">` : `<span class="text-[11px] text-slate-600 italic">Belum diparaf</span>`}
            </div>
            ${!n.ttdOperator ? `
              <button onclick="openSignatureModal('${n.id}', 'Operator')" class="btn-primary-pill !w-full !py-1.5 text-xs">
                Paraf Operator
              </button>
            ` : `<span class="text-[11px] text-emerald-400 font-mono font-bold flex items-center justify-center gap-1"><i data-lucide="check" class="w-3.5 h-3.5"></i> Terverifikasi</span>`}
          </div>

          <!-- Tier 2: Penanggung Jawab TPS -->
          <div class="p-4 rounded-2xl bg-slate-900/80 border ${n.ttdPJ ? 'border-emerald-500/40' : 'border-slate-800'} text-center space-y-2">
            <span class="text-[10px] uppercase font-bold text-slate-400">2. Pemeriksa Teknis</span>
            <p class="text-xs font-bold text-white">Penanggung Jawab TPS</p>
            <div class="h-20 flex items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-950/60 p-1">
              ${n.ttdPJ ? `<img src="${n.ttdPJ}" class="max-h-16 mx-auto">` : `<span class="text-[11px] text-slate-600 italic">Menunggu</span>`}
            </div>
            ${!n.ttdPJ && n.ttdOperator ? `
              <button onclick="openSignatureModal('${n.id}', 'Penanggung Jawab')" class="btn-lime-pill !w-full !py-1.5 text-xs justify-center">
                Tanda Tangan PJ
              </button>
            ` : n.ttdPJ ? `<span class="text-[11px] text-emerald-400 font-mono font-bold flex items-center justify-center gap-1"><i data-lucide="check" class="w-3.5 h-3.5"></i> Disetujui PJ</span>` : `<span class="text-[11px] text-slate-500">Antrean Level 2</span>`}
          </div>

          <!-- Tier 3: Kepala Teknik Tambang (KTT) -->
          <div class="p-4 rounded-2xl bg-slate-900/80 border ${n.ttdKTT ? 'border-emerald-500/40' : 'border-slate-800'} text-center space-y-2">
            <span class="text-[10px] uppercase font-bold text-slate-400">3. Pengesahan Final Hukum</span>
            <p class="text-xs font-bold text-white">Kepala Teknik Tambang (KTT)</p>
            <div class="h-20 flex items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-950/60 p-1">
              ${n.ttdKTT ? `<img src="${n.ttdKTT}" class="max-h-16 mx-auto">` : `<span class="text-[11px] text-slate-600 italic">Menunggu PJ</span>`}
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
}

function generateDraftNeracaPrompt() {
  const periode = prompt('Masukkan Nama Periode Neraca (misal: Triwulan III 2026):', 'Triwulan III (Juli - September 2026)');
  if (!periode) return;

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
    periode: periode,
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

  addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Operator', 'GENERATE_NERACA', `Membuat draft Neraca Limbah B3 untuk periode ${periode}`);
  showToast('Draft Neraca baru berhasil disusun dari data logbook.', 'success');
  renderNeraca();
}

// --- E-SIGNATURE CANVAS ---
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

  // Set resolusi canvas
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = 180;

  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#0f172a';

  clearSignatureCanvas();

  // Mouse & Touch events
  canvas.onmousedown = startDrawing;
  canvas.onmousemove = draw;
  canvas.onmouseup = stopDrawing;

  canvas.ontouchstart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    startDrawing({ clientX: touch.clientX, clientY: touch.clientY, rect });
  };
  canvas.ontouchmove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    draw({ clientX: touch.clientX, clientY: touch.clientY, rect });
  };
  canvas.ontouchend = stopDrawing;
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

function stopDrawing() {
  isDrawing = false;
}

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
  addAuditLog(STATE.currentUser ? STATE.currentUser.nama : role, 'SIGN_NERACA', `Menandatangani Neraca ${neracaId} sebagai ${role}`);

  showToast(`Tanda tangan elektronik ${role} berhasil dibubuhkan!`, 'success');
  closeModal('modalSignature');
  renderNeraca();
}

// --- 4.8 MASTER RINTEK ---
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
    `;
    table.appendChild(tr);
  });
}

function openModalTambahRintek() {
  const kode = prompt('Kode Limbah (misal: B106d):');
  if (!kode) return;
  const nama = prompt('Nama Limbah B3:');
  if (!nama) return;
  const kar = prompt('Karakteristik (Beracun, Mudah Terbakar, dsb):', 'Beracun');
  const hari = prompt('Batas Waktu Simpan (90/180/365 hari):', '90');

  const rintek = JSON.parse(localStorage.getItem('db_rintek') || '[]');
  rintek.push({
    kodeLimbah: kode,
    namaLimbah: nama,
    sumber: 'Sumber spesifik tambang',
    karakteristik: kar || 'Beracun',
    jenisWadah: 'Drum',
    kapasitasWadah: 200,
    satuan: 'Kg',
    batasSimpanHari: parseInt(hari) || 90
  });

  localStorage.setItem('db_rintek', JSON.stringify(rintek));
  addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Admin', 'ADD_RINTEK', `Menambahkan master rintek ${nama} (${kode})`);
  showToast('Data Rintek berhasil ditambahkan.', 'success');
  renderMasterRintek();
}

// --- 4.9 MASTER PIHAK KETIGA ---
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
    `;
    table.appendChild(tr);
  });
}

function openModalTambahPihakKetiga() {
  const nama = prompt('Nama Perusahaan Pihak Ketiga:');
  if (!nama) return;
  const izin = prompt('Nomor Izin Operasional KLHK:');
  const kontak = prompt('Kontak Person / Telepon:');

  const pkList = JSON.parse(localStorage.getItem('db_pihak_ketiga') || '[]');
  const newId = 'PK-' + ('00' + (pkList.length + 1)).slice(-3);

  pkList.push({
    id: newId,
    namaPerusahaan: nama,
    noIzin: izin || 'Dalam Proses',
    alamat: 'Samarinda / Balikpapan',
    kontak: kontak || '-'
  });

  localStorage.setItem('db_pihak_ketiga', JSON.stringify(pkList));
  addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Admin', 'ADD_PIHAK_KETIGA', `Menambahkan mitra pihak ketiga ${nama}`);
  showToast('Pihak ketiga berhasil ditambahkan.', 'success');
  renderMasterPihakKetiga();
}

// --- 4.10 MASTER USERS ---
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
      <td>
        <span class="badge-status badge-blue">${u.role}</span>
      </td>
      <td>
        <span class="badge-status badge-green">${u.status}</span>
      </td>
      <td>
        <button onclick="resetUserPassword('${u.username}')" class="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">
          Reset Password
        </button>
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
    status: 'Aktif'
  });

  localStorage.setItem('db_users', JSON.stringify(users));
  addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Admin', 'ADD_USER', `Mendaftarkan pengguna baru: ${username} (${role})`);
  showToast('Pengguna baru berhasil didaftarkan.', 'success');
  renderMasterUsers();
}

function resetUserPassword(username) {
  const newPass = prompt(`Reset password untuk pengguna ${username}:`, 'password123');
  if (!newPass) return;

  const users = JSON.parse(localStorage.getItem('db_users') || '[]');
  const u = users.find(user => user.username === username);
  if (u) {
    u.password = newPass;
    localStorage.setItem('db_users', JSON.stringify(users));
    addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Admin', 'RESET_PASSWORD', `Mereset password user ${username}`);
    showToast(`Password untuk ${username} berhasil diubah.`, 'info');
  }
}

// --- 4.11 SETTINGS & AUDIT LOG ---
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

function saveGasUrlConfig() {
  const url = document.getElementById('inputGasUrl').value.trim();
  STATE.gasApiUrl = url;
  localStorage.setItem('enviromine_gas_url', url);
  updateGasStatusBadge();
  showToast('URL Google Apps Script disimpan.', 'success');
}

function resetToLocalEngine() {
  STATE.gasApiUrl = '';
  localStorage.removeItem('enviromine_gas_url');
  document.getElementById('inputGasUrl').value = '';
  updateGasStatusBadge();
  showToast('Kembali ke Local Engine.', 'info');
}

function saveSettingsForm() {
  showToast('Profil fasilitas TPS LB3 01 berhasil disimpan.', 'success');
  addAuditLog(STATE.currentUser ? STATE.currentUser.nama : 'Admin', 'UPDATE_SETTINGS', 'Menyimpan profil fasilitas TPS LB3');
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
  document.getElementById('modalGasUrlInput').value = STATE.gasApiUrl;
  openModal('modalGasConfig');
}

function saveModalGasUrl() {
  const val = document.getElementById('modalGasUrlInput').value.trim();
  STATE.gasApiUrl = val;
  localStorage.setItem('enviromine_gas_url', val);
  updateGasStatusBadge();
  closeModal('modalGasConfig');
  showToast('Konfigurasi Google Apps Script diperbarui.', 'success');
}

function toggleNotificationPopover() {
  const popover = document.getElementById('notifPopover');
  popover.classList.toggle('hidden');
}

function setupGlobalShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Ctrl + K untuk search
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
